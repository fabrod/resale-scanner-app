import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../lib/storage';

export default function SettingsScreen() {
  const [feePct, setFeePct] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [minProfit, setMinProfit] = useState('');

  useEffect(() => {
    loadSettings().then((s) => {
      setFeePct(String(s.feePct));
      setShippingCost(String(s.shippingCost));
      setMinProfit(String(s.minProfit));
    });
  }, []);

  const save = async () => {
    await saveSettings({
      feePct: parseFloat(feePct) || DEFAULT_SETTINGS.feePct,
      shippingCost: parseFloat(shippingCost) || 0,
      minProfit: parseFloat(minProfit) || DEFAULT_SETTINGS.minProfit,
    });
    Alert.alert('Saved', 'Your numbers will be used for every verdict.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Your numbers</Text>
      <Text style={styles.blurb}>The verdict engine uses these on every scan.</Text>

      <Text style={styles.label}>Marketplace fee (%)</Text>
      <TextInput style={styles.input} value={feePct} onChangeText={setFeePct} keyboardType="decimal-pad" />

      <Text style={styles.label}>Typical shipping cost ($)</Text>
      <TextInput style={styles.input} value={shippingCost} onChangeText={setShippingCost} keyboardType="decimal-pad" />

      <Text style={styles.label}>Minimum profit for a BUY ($)</Text>
      <TextInput style={styles.input} value={minProfit} onChangeText={setMinProfit} keyboardType="decimal-pad" />

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700' },
  blurb: { color: '#6b7280', marginTop: 4, marginBottom: 12 },
  label: { fontSize: 14, color: '#6b7280', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 16, fontSize: 20, color: '#111' },
  button: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
