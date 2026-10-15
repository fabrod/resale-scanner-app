import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadHistory, deleteHistoryRecord, clearHistory } from '../lib/storage';
import { formatMoney, VERDICT_COLORS } from '../lib/verdict';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);

  useFocusEffect(useCallback(() => { loadHistory().then(setHistory); }, []));

  const remove = (id) => {
    Alert.alert('Delete this check?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setHistory(await deleteHistoryRecord(id)) },
    ]);
  };

  const clearAll = () => {
    Alert.alert('Clear all history?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => setHistory(await clearHistory()) },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onLongPress={() => remove(item.id)}>
      <View style={styles.cardHeader}>
        <Text style={[styles.verdict, { color: VERDICT_COLORS[item.verdict] || '#6b7280' }]}>{item.verdict}</Text>
        <Text style={styles.money}>{formatMoney(item.profit)}</Text>
      </View>
      <Text style={styles.product} numberOfLines={2}>{item.product}</Text>
      <Text style={styles.detail}>
        Store {formatMoney(item.storePrice)} → Resale {formatMoney(item.resalePrice)} · {new Date(item.date).toLocaleDateString()}
      </Text>
      <Text style={styles.hint}>Long-press to delete</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No checks yet. Scan something in the store!</Text>
        </View>
      ) : (
        <FlatList data={history} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ padding: 16 }} />
      )}
      {history.length > 0 && (
        <TouchableOpacity style={styles.clear} onPress={clearAll}>
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verdict: { fontSize: 18, fontWeight: '800' },
  money: { fontSize: 18, fontWeight: '700' },
  product: { fontSize: 15, marginTop: 6 },
  detail: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  hint: { color: '#d1d5db', fontSize: 11, marginTop: 6 },
  clear: { padding: 16, alignItems: 'center' },
  clearText: { color: '#dc2626', fontSize: 16 },
});
