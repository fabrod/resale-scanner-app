import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MARKETPLACES, buildListingCopy } from '../lib/listing';

/** After a BUY verdict: pre-filled listing copy + marketplace handoffs. */
export default function ListItScreen({ route }) {
  const { product, resalePrice, storePrice } = route.params;
  const [title, setTitle] = useState(`${product.brand ? product.brand + ' ' : ''}${product.title || 'Item'}`);
  const [price, setPrice] = useState(String(resalePrice ?? ''));
  const [condition, setCondition] = useState('New with tags');

  const copy = buildListingCopy({ title, brand: product.brand, resalePrice: parseFloat(price), storePrice, condition });

  const copyFor = async (marketplace) => {
    await Clipboard.setStringAsync(`${copy.title}\n\n${copy.body}`);
    Alert.alert('Copied', `${marketplace} listing is in your clipboard — paste it after tapping Open.`);
  };

  const open = (m) => {
    if (m.hint) Alert.alert(m.name, m.hint);
    Linking.openURL(m.createUrl);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Your listing</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} multiline />

      <Text style={styles.label}>List price ($)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

      <Text style={styles.label}>Condition</Text>
      <TextInput style={styles.input} value={condition} onChangeText={setCondition} />

      <Text style={styles.previewLabel}>Preview</Text>
      <View style={styles.preview}>
        <Text style={styles.previewTitle}>{copy.title}</Text>
        <Text style={styles.previewBody}>{copy.body}</Text>
      </View>

      {MARKETPLACES.map((m) => (
        <View key={m.id} style={styles.mpRow}>
          <TouchableOpacity style={[styles.button, styles.copy]} onPress={() => copyFor(m.name)}>
            <Text style={styles.buttonText}>Copy for {m.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.open]} onPress={() => open(m)}>
            <Text style={styles.buttonText}>Open</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, color: '#6b7280', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 16, color: '#111' },
  previewLabel: { fontSize: 14, color: '#6b7280', marginTop: 20, marginBottom: 6 },
  preview: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16 },
  previewTitle: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  previewBody: { color: '#374151', lineHeight: 22 },
  mpRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', flex: 1 },
  copy: { backgroundColor: '#16a34a' },
  open: { backgroundColor: '#2563eb' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
