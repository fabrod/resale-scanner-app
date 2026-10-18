import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { lookupUpc } from '../lib/upc';

export default function ScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const scanInFlight = useRef(false);
  const scanSession = useRef(0);
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState('');
  const [cameraError, setCameraError] = useState('');

  useFocusEffect(useCallback(() => {
    scanInFlight.current = false;
    setScanned(false);
    setStatus('');
    setCameraError('');
    return () => { scanSession.current += 1; };
  }, []));

  if (!permission) return <View style={styles.center}><Text>Requesting camera…</Text></View>;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera access is needed to scan barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('ManualEntry')}>
          <Text style={styles.buttonText}>Enter manually instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const onScanned = async ({ data, type }) => {
    if (scanInFlight.current || !navigation.isFocused()) return;
    // QR codes usually hold URLs, not product IDs — route those to manual entry.
    if (String(type).toLowerCase().includes('qr')) {
      setStatus('That looks like a QR code (usually a link, not a product ID). Use manual entry for these.');
      return;
    }
    scanInFlight.current = true;
    const session = scanSession.current;
    setScanned(true);
    setStatus('Looking up product…');
    let product = null;
    try {
      product = await lookupUpc(data);
    } catch {
      // An unavailable lookup service still allows a manual price check.
    }
    if (session !== scanSession.current || !navigation.isFocused()) return;
    navigation.navigate('Verdict', {
      upc: data,
      product: product || { title: '', brand: '' },
      productUnknown: !product,
    });
  };

  return (
    <View style={styles.container}>
      {isFocused && !cameraError ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
          onBarcodeScanned={scanned ? undefined : onScanned}
          onMountError={() => setCameraError('Camera could not start. You can enter the product manually.')}
        />
      ) : (
        <View style={styles.center}><Text style={styles.text}>{cameraError}</Text></View>
      )}
      <View style={styles.footer}>
        {!!status && <Text style={styles.status}>{status}</Text>}
        <Text style={styles.hint}>Point at the product barcode (the striped one).</Text>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('ManualEntry')}>
          <Text style={styles.buttonText}>Enter manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  footer: { padding: 20, backgroundColor: '#111827' },
  text: { fontSize: 16, marginBottom: 16, textAlign: 'center' },
  hint: { color: '#9ca3af', textAlign: 'center', marginBottom: 12 },
  status: { color: '#fbbf24', textAlign: 'center', marginBottom: 8 },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  secondary: { backgroundColor: '#374151' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
