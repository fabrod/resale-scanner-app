const assert = require('node:assert/strict');
const test = require('node:test');
const { loadSource, createHooks, nodes } = require('./helpers/runtime.cjs');

test('the configured entry registers App as the native root', () => {
  const registered = [];
  const App = () => null;
  loadSource(require('../package.json').main, {
    expo: { registerRootComponent: (component) => registered.push(component) },
    './App': App,
  });
  assert.deepEqual(registered, [App]);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function scannerHarness(lookupUpc, permission = { granted: true, status: 'granted' }) {
  const hooks = createHooks();
  let focused = true;
  let focusEffect;
  let focusCleanup;
  const navigations = [];
  const openedSettings = [];
  let appStateHandler;
  const native = Object.fromEntries(['View', 'Text', 'TouchableOpacity'].map((name) => [name, name]));
  native.StyleSheet = { create: (styles) => styles };
  native.AppState = {
    addEventListener: (_event, handler) => {
      appStateHandler = handler;
      return { remove: () => {} };
    },
  };
  native.Linking = { openSettings: async () => { openedSettings.push(true); } };
  let permissionRequests = 0;
  let permissionChecks = 0;
  const ScannerScreen = loadSource('src/screens/ScannerScreen.js', {
    react: hooks.react,
    '@react-navigation/native': {
      useIsFocused: () => focused,
      useFocusEffect: (effect) => { focusEffect = effect; },
    },
    'react-native': native,
    'expo-camera': {
      CameraView: 'CameraView',
      useCameraPermissions: () => [
        permission,
        async () => { permissionRequests += 1; return permission; },
        async () => { permissionChecks += 1; return permission; },
      ],
    },
    '../lib/upc': { lookupUpc },
  }).default;
  const navigation = {
    isFocused: () => focused,
    navigate: (...args) => navigations.push(args),
  };
  const render = () => hooks.render(() => ScannerScreen({ navigation }));
  const setFocused = (next) => {
    focusCleanup?.();
    focused = next;
    render();
    focusCleanup = focused ? focusEffect() : undefined;
    return render();
  };
  render();
  focusCleanup = focusEffect();
  return {
    render,
    setFocused,
    navigations,
    openedSettings,
    activateApp: () => appStateHandler('active'),
    permissionRequestCount: () => permissionRequests,
    permissionCheckCount: () => permissionChecks,
  };
}

function camera(tree) {
  return nodes(tree, (node) => node.type === 'CameraView')[0];
}

const barcode = { data: '012345678905', type: 'upc_a' };

test('a burst of barcode events starts one lookup and one navigation', async () => {
  const lookup = deferred();
  let calls = 0;
  const screen = scannerHarness(() => { calls++; return lookup.promise; });
  const callback = camera(screen.render()).props.onBarcodeScanned;
  const first = callback(barcode);
  const duplicate = callback(barcode);
  assert.equal(calls, 1);
  assert.equal(camera(screen.render()).props.onBarcodeScanned, undefined);
  lookup.resolve({ title: 'Shirt', brand: 'Nike' });
  await Promise.all([first, duplicate]);
  await callback(barcode);
  assert.equal(calls, 1);
  assert.equal(screen.navigations.length, 1);
  assert.equal(screen.navigations[0][0], 'Verdict');
  assert.equal(screen.navigations[0][1].productUnknown, false);
});

test('blur unmounts the camera and stale lookups cannot navigate after refocus', async () => {
  const oldLookup = deferred();
  const currentLookup = deferred();
  let calls = 0;
  const screen = scannerHarness(() => (++calls === 1 ? oldLookup.promise : currentLookup.promise));
  const oldCallback = camera(screen.render()).props.onBarcodeScanned;
  const oldRequest = oldCallback(barcode);
  assert.equal(camera(screen.setFocused(false)), undefined);
  await oldCallback(barcode);
  assert.equal(calls, 1);

  const currentCallback = camera(screen.setFocused(true)).props.onBarcodeScanned;
  assert.equal(typeof currentCallback, 'function');
  const currentRequest = currentCallback({ ...barcode, data: '123456789012' });
  oldLookup.resolve({ title: 'Old item' });
  await oldRequest;
  assert.equal(screen.navigations.length, 0);
  currentLookup.resolve({ title: 'Current item' });
  await currentRequest;
  assert.equal(screen.navigations.length, 1);
  assert.equal(screen.navigations[0][1].product.title, 'Current item');
});

test('lookup failure keeps the unknown-product fallback usable', async () => {
  const screen = scannerHarness(async () => { throw new Error('offline'); });
  await assert.doesNotReject(camera(screen.render()).props.onBarcodeScanned(barcode));
  assert.equal(screen.navigations[0][1].productUnknown, true);
  assert.deepEqual(screen.navigations[0][1].product, { title: '', brand: '' });
});

test('first-run explanation uses neutral actions and requests permission only after Continue', async () => {
  const firstRun = scannerHarness(async () => null, { granted: false, status: 'undetermined' });
  const tree = firstRun.render();
  const copy = nodes(tree, (node) => node.type === 'Text').flatMap((node) => node.props.children).join(' ');
  assert.match(copy, /Real Scanner uses your camera to scan documents/);
  assert.match(copy, /Continue/);
  assert.match(copy, /Not now/);
  const actions = nodes(tree, (node) => node.type === 'TouchableOpacity');
  const buttonLabels = actions.flatMap((action) => nodes(action, (node) => node.type === 'Text'))
    .flatMap((node) => node.props.children)
    .join(' ');
  assert.doesNotMatch(buttonLabels, /Allow camera|Enable camera/i);
  assert.equal(firstRun.permissionRequestCount(), 0);
  await actions[0].props.onPress();
  assert.equal(firstRun.permissionRequestCount(), 1);
  actions[1].props.onPress();
  assert.deepEqual(firstRun.navigations, [['ManualEntry']]);
});

test('denied permission offers Settings without requesting again and refreshes on app return', async () => {
  const denied = scannerHarness(async () => null, { granted: false, status: 'denied', canAskAgain: false });
  assert.equal(camera(denied.render()), undefined);
  const actions = nodes(denied.render(), (node) => node.type === 'TouchableOpacity');
  assert.equal(actions.length, 2);
  await actions[0].props.onPress();
  assert.equal(denied.openedSettings.length, 1);
  assert.equal(denied.permissionRequestCount(), 0);
  await denied.activateApp();
  assert.equal(denied.permissionCheckCount(), 1);
});

test('camera mount errors retain manual entry', () => {
  const screen = scannerHarness(async () => null);
  camera(screen.render()).props.onMountError({ message: 'Camera unavailable' });
  const tree = screen.render();
  assert.equal(camera(tree), undefined);
  const manualEntry = nodes(tree, (node) => node.type === 'TouchableOpacity')[0];
  manualEntry.props.onPress();
  assert.deepEqual(screen.navigations, [['ManualEntry']]);
});
