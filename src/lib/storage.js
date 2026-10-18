import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'resale-scanner:settings';
const HISTORY_KEY = 'resale-scanner:history';

export const DEFAULT_SETTINGS = {
  feePct: 13.25,
  shippingCost: 0,
  minProfit: 5,
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(history)) return [];
    return history.filter((record) => (
      record !== null &&
      typeof record === 'object' &&
      typeof record.id === 'string' &&
      typeof record.product === 'string' &&
      typeof record.verdict === 'string'
    ));
  } catch {
    return [];
  }
}

/** Prepend a scan record; keeps the newest 200. */
export async function addHistoryRecord(record) {
  const history = await loadHistory();
  const next = [{ ...record, id: Date.now().toString() }, ...history].slice(0, 200);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function deleteHistoryRecord(id) {
  const history = await loadHistory();
  const next = history.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
  return [];
}
