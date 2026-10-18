import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { computeVerdict, formatMoney, VERDICT_COLORS } from '../lib/verdict';
import { ebaySoldUrl } from '../lib/upc';
import { getSoldComps } from '../lib/comps';
import { loadSettings, addHistoryRecord } from '../lib/storage';

/**
 * The core screen: product identity + store price + resale price
 * → BUY / MAYBE / SKIP verdict with profit math.
 */
export default function VerdictScreen({ route, navigation }) {
  const { product, productUnknown, manualProduct } = route.params;
  const [settings, setSettings] = useState(null);
  const [storePrice, setStorePrice] = useState('');
  const [resalePrice, setResalePrice] = useState('');
  const [autoComps, setAutoComps] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => { loadSettings().then(setSettings); }, []);

  const productLabel = [product.brand, product.title].filter(Boolean).join(' ') || 'Unknown product';
  const canCalculate = settings !== null && !!storePrice && !!resalePrice;

  const checkComps = async () => {
    try {
      const comps = await getSoldComps(productLabel);
      if (comps.manual) {
        Alert.alert(
          'Manual check',
          'Automatic sold-price data is not connected yet. Tap "Check eBay sold" to see real sold listings, then type the typical sold price below.'
        );
      } else {
        setAutoComps(comps);
        if (comps.median) setResalePrice(String(comps.median));
      }
    } catch {
      Alert.alert('Could not reach the comps service — enter the resale price manually.');
    }
  };

  const runVerdict = async () => {
    if (!settings) return;
    const r = computeVerdict({
      storePrice: parseFloat(storePrice),
      resalePrice: parseFloat(resalePrice),
      feePct: settings.feePct,
      shippingCost: settings.shippingCost,
      minProfit: settings.minProfit,
    });
    setResult(r);
    try {
      await addHistoryRecord({
        date: new Date().toISOString(),
        product: productLabel,
        storePrice: parseFloat(storePrice),
        resalePrice: parseFloat(resalePrice),
        ...r,
      });
    } catch {
      Alert.alert('Could not save history', 'Your result is shown, but this check could not be saved to history.');
    }
  };

  const openEbaySold = () => Linking.openURL(ebaySoldUrl(productLabel));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.product}>{productLabel}</Text>
      {productUnknown && <Text style={styles.warn}>Product not found in the catalog — verify the name is right.</Text>}
      {manualProduct && <Text style={styles.note}>Entered manually — double-check the item matches.</Text>}

      <Text style={styles.label}>Store price ($)</Text>
      <TextInput style={styles.input} value={storePrice} onChangeText={setStorePrice}
        keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9ca3af" />

      <Text style={styles.label}>Resale price — what it sells for ($)</Text>
      <TextInput style={styles.input} value={resalePrice} onChangeText={setResalePrice}
        keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#9ca3af" />

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={checkComps}>
          <Text style={styles.buttonText}>Auto comps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={openEbaySold}>
          <Text style={styles.buttonText}>Check eBay sold</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, !canCalculate && styles.disabled]}
        disabled={!canCalculate}
        onPress={runVerdict}
      >
        <Text style={styles.buttonText}>Run the numbers</Text>
      </TouchableOpacity>

      {result && (
        <View style={[styles.result, { borderColor: VERDICT_COLORS[result.verdict] }]}>
          <Text style={[styles.verdict, { color: VERDICT_COLORS[result.verdict] }]}>{result.verdict}</Text>
          <Text style={styles.money}>Profit: {formatMoney(result.profit)}</Text>
          <Text style={styles.detail}>Margin: {result.margin.toFixed(1)}% · Fees: {formatMoney(result.fees)}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: VERDICT_COLORS[result.verdict], marginTop: 16 }]}
            onPress={() => navigation.navigate('ListIt', {
              product, resalePrice: parseFloat(resalePrice), storePrice: parseFloat(storePrice),
            })}
          >
            <Text style={styles.buttonText}>
              {result.verdict === 'BUY' ? 'List it for sale →' : 'Build a listing anyway →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  product: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  warn: { color: '#dc2626', marginBottom: 8 },
  note: { color: '#6b7280', marginBottom: 8 },
  label: { fontSize: 14, color: '#6b7280', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 20, color: '#111' },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16, flex: 1 },
  secondary: { backgroundColor: '#374151' },
  disabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  result: { borderWidth: 3, borderRadius: 16, padding: 20, marginTop: 24, alignItems: 'center' },
  verdict: { fontSize: 40, fontWeight: '800' },
  money: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  detail: { color: '#6b7280', marginTop: 4 },
});
