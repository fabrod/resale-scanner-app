const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSource, createHooks, nodes } = require('./helpers/runtime.cjs');

function storageWith(adapter) {
  return loadSource('src/lib/storage.js', { '@react-native-async-storage/async-storage': adapter });
}

const savedRecord = {
  id: 'saved', product: 'Nike shirt', verdict: 'BUY', date: '2026-10-18T12:00:00Z',
  storePrice: 10, resalePrice: 30, profit: 16,
};

test('missing, malformed, null, and non-array history load safely', async () => {
  for (const raw of [null, '', '{broken', 'null', '{}', '1', '"history"']) {
    const storage = storageWith({ getItem: async () => raw });
    assert.deepEqual(await storage.loadHistory(), [], `stored value: ${raw}`);
  }
  const storage = storageWith({ getItem: async () => { throw new Error('read failed'); } });
  assert.deepEqual(await storage.loadHistory(), []);
  assert.deepEqual(await storage.loadSettings(), storage.DEFAULT_SETTINGS);
});

test('malformed history rows are skipped while valid checks remain', async () => {
  const records = [null, 1, [], {}, { ...savedRecord, product: {} }, { ...savedRecord, verdict: {} }, savedRecord];
  const storage = storageWith({ getItem: async () => JSON.stringify(records) });
  assert.deepEqual(await storage.loadHistory(), [savedRecord]);
});

test('new checks and deletions recover from invalid stored history', async () => {
  let raw = 'null';
  const storage = storageWith({
    getItem: async () => raw,
    setItem: async (_key, value) => { raw = value; },
  });
  const next = await storage.addHistoryRecord(savedRecord);
  assert.equal(next.length, 1);
  assert.equal(next[0].product, savedRecord.product);
  assert.deepEqual(await storage.loadHistory(), next);
  assert.deepEqual(await storage.deleteHistoryRecord(next[0].id), []);
});

function runButton(tree) {
  return nodes(tree, (node) => node.type === 'TouchableOpacity' &&
    nodes(node, (child) => child.type === 'Text' && child.props.children.join('') === 'Run the numbers').length > 0)[0];
}

test('verdict waits for saved settings and keeps its result when history cannot be saved', async () => {
  const hooks = createHooks();
  const alerts = [];
  let resolveSettings;
  let saveAttempts = 0;
  const pendingSettings = new Promise((resolve) => { resolveSettings = resolve; });
  const native = Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'ScrollView'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  native.Alert = { alert: (...args) => alerts.push(args) };
  const VerdictScreen = loadSource('src/screens/VerdictScreen.js', {
    react: hooks.react,
    'react-native': native,
    '../lib/verdict': loadSource('src/lib/verdict.js'),
    '../lib/upc': { ebaySoldUrl: () => '' },
    '../lib/comps': { getSoldComps: async () => ({ manual: true }) },
    '../lib/storage': {
      loadSettings: () => pendingSettings,
      addHistoryRecord: async () => { saveAttempts++; throw new Error('disk full'); },
    },
  }).default;
  const render = () => hooks.render(() => VerdictScreen({
    route: { params: { product: { brand: 'Nike', title: 'shirt' } } },
    navigation: {},
  }));

  let tree = render();
  const inputs = nodes(tree, (node) => node.type === 'TextInput');
  inputs[0].props.onChangeText('10');
  inputs[1].props.onChangeText('30');
  tree = render();
  assert.equal(runButton(tree).props.disabled, true);
  await assert.doesNotReject(runButton(tree).props.onPress());
  assert.equal(saveAttempts, 0);

  resolveSettings({ feePct: 20, shippingCost: 2, minProfit: 5 });
  await pendingSettings;
  tree = render();
  assert.equal(runButton(tree).props.disabled, false);
  await assert.doesNotReject(runButton(tree).props.onPress());
  tree = render();
  assert.equal(saveAttempts, 1);
  assert.equal(nodes(tree, (node) => node.type === 'Text' && node.props.children.join('') === 'Profit: $12.00').length, 1);
  assert.equal(alerts[0][0], 'Could not save history');
});
