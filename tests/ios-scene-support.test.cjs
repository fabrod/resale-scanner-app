const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { getConfig } = require('@expo/config');
const { compileModsAsync } = require('expo/config-plugins');
const plist = require('@expo/plist').default;

const projectRoot = path.resolve(__dirname, '..');
const templatePath = path.join(path.dirname(require.resolve('expo/package.json')), 'template.tgz');

test('the app config generates scene-based native startup for iOS 27', async () => {
  const nativeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'resale-ios-scene-'));
  try {
    // Use Expo's installed native template and real config plugins, without fetching
    // a template, installing pods, or changing the project's native directories.
    execFileSync('tar', [
      '-xzf', templatePath, '--strip-components=1', '-C', nativeRoot, 'package/ios',
    ]);

    const appDelegatePath = path.join(nativeRoot, 'ios/HelloWorld/AppDelegate.swift');
    const infoPlistPath = path.join(nativeRoot, 'ios/HelloWorld/Info.plist');
    let firstOutput;

    // Re-evaluate the actual app config on each pass. Removing the scene-support
    // opt-in must fail these native-output checks even if a prior prebuild worked.
    for (let pass = 0; pass < 2; pass++) {
      const { exp } = getConfig(projectRoot, { isModdedConfig: true });
      await compileModsAsync(exp, { projectRoot: nativeRoot, platforms: ['ios'] });

      const infoPlist = plist.parse(fs.readFileSync(infoPlistPath, 'utf8'));
      const manifest = infoPlist.UIApplicationSceneManifest;
      assert.ok(manifest, 'Generated Info.plist must opt into the UIKit scene lifecycle');
      assert.equal(manifest.UIApplicationSupportsMultipleScenes, false);
      const scenes = manifest.UISceneConfigurations?.UIWindowSceneSessionRoleApplication;
      assert.equal(scenes?.length, 1);
      assert.equal(scenes[0].UISceneDelegateClassName, 'EXExpoAppSceneDelegate');

      const appDelegate = fs.readFileSync(appDelegatePath, 'utf8');
      assert.match(appDelegate, /class AppDelegate:\s*ExpoAppDelegate,\s*ExpoReactNativeFactoryProvider\s*\{/);
      assert.match(appDelegate, /reactNativeFactory\s*=\s*factory/);
      assert.match(appDelegate, /super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/);
      assert.doesNotMatch(appDelegate, /UIWindow\(frame:/);
      assert.doesNotMatch(appDelegate, /factory\.startReactNative\(/);

      const output = { manifest, appDelegate };
      if (pass === 0) firstOutput = output;
      else assert.deepEqual(output, firstOutput, 'Repeated prebuilds must preserve scene startup');
    }
  } finally {
    fs.rmSync(nativeRoot, { recursive: true, force: true });
  }
});
