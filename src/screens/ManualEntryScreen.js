import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { lookupUpc } from '../lib/upc';

/**
 * Manual fallback: typed UPC digits, or brand + item keywords
 * (the clothing path for stickered-over TJ Maxx barcodes).
 */
export default function ManualEntryScreen({ navigation }) {
  const [upc, setUpc] = useState('');
  const [brand, setBrand] = useState('');
  const [keywords, setKeywords] = useState('');
  const [status, setStatus] = useState('');

  const submitUpc = async () => {
    const code = upc.replace(/\D/g, '');
    if (!code) return;
    setStatus('Looking up…');
    const product = await lookupUpc(code).catch(() => null);
    setStatus('');
    navigation.navigate('Verdict', {
      upc: code,
      product: product || { title: '', brand: '' },
      productUnknown: !product,
    });
  };

  const submitKeywords = () => {
    if (!keywords.trim() && !brand.trim()) return;
    navigation.navigate('Verdict', {
      upc: '',
      product: { title: keywords.trim(), brand: brand.trim() },
      productUnknown: false,
      manualProduct: true,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Type the UPC digits</Text>
      <TextInput style={styles.input} value={upc} onChangeText={setUpc}
        keyboardType="number-pad" placeholder="e.g. 012345678905" placeholderTextColor="#9ca3af" />
      <TouchableOpacity style={styles.button} onPress={submitUpc}>
        <Text style={styles.buttonText}>Look up UPC</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { marginTop: 32 }]}>Or describe the item (clothing)</Text>
      <Text style={styles.label}>Brand</Text>
      <TextInput style={styles.input} value={brand} onChangeText={setBrand}
        placeholder="e.g. Nike" placeholderTextColor="#9ca3af" autoCapitalize="words" />
      <Text style={styles.label}>Item keywords</Text>
      <TextInput style={styles.input} value={keywords} onChangeText={setKeywords}
        placeholder="e.g. Dri-FIT polo shirt navy M" placeholderTextColor="#9ca3af" />
      <TouchableOpacity style={styles.button} onPress={submitKeywords}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      {!!status && <Text style={styles.status}>{status}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, color: '#6b7280', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 17, color: '#111' },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  status: { color: '#ca8a04', textAlign: 'center', marginTop: 12 },
});
