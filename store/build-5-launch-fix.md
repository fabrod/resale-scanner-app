# Build 5: iOS 27 launch crash

Apple rejected version 1.0 (4) on October 21, 2026, submission
`a61af99f-d837-445b-b7e1-ec08df980415`.

## Confirmed cause

Both review attachments report `EXC_BREAKPOINT` / `SIGTRAP` on the main thread:

```
___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke
```

- `F4D5E4DC-1F82-4AC2-AB41-B1915CD57217`: iPhone 17 Pro Max, iOS 27.0.1.
- `CF124FF3-F9A6-4512-BFB8-8F7F4F2011C5`: iPad Air 11-inch (M3), iPadOS 27.0.

The reports already identify the UIKit function responsible for termination.
The app's own entry frame is unsymbolicated, but it is below the system assertion
and is not needed to identify this failure. Matching build 4 dSYMs would still
be required to fully symbolicate that frame.

The app used Expo SDK 57's legacy application lifecycle. Builds using the iOS 27
SDK must adopt the scene lifecycle. This is a native lifecycle failure during
launch, independent of scanner logic; the earlier JavaScript startup fixes did
not address it.

References: [Apple's migration guide](https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle)
and [Expo's SDK 57 opt-in instructions](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md#staying-on-sdk-57-with-xcode-27).

## Fix

- Added SDK-compatible `expo-build-properties` 57.0.22.
- Enabled `ios.enableSceneSupport` in `app.json`.
- Increased the iOS build number to 5.

A clean prebuild now declares `EXExpoAppSceneDelegate` in
`UIApplicationSceneManifest`, makes AppDelegate conform to
`ExpoReactNativeFactoryProvider`, and removes legacy window creation and React
Native startup from `didFinishLaunchingWithOptions`. Expo's scene delegate
creates the window from the connecting scene and starts React Native.

Use a new native build; a JavaScript-only update cannot apply this fix.

## Validation

- `npm test`: 10 tests pass, including a real native-config generation test.
- The native regression test compiles config plugins against the installed Expo
  template and checks the generated plist and Swift startup code. It also checks
  repeated generation. Removing the scene opt-in makes this test fail.
- A separate clean iOS prebuild produced the expected scene manifest and AppDelegate.
- Production iOS JavaScript/Hermes export passed with the production API URL.
- Local release simulator build succeeded. On an iPhone 17 Pro Max simulator,
  verified launch, manual item entry and profit calculation, background/resume,
  and a second cold launch. On an iPad Air 11-inch (M4) simulator, verified
  launch, manual entry, and manual entry after denying camera permission.
  Both simulators run iOS/iPadOS 26.5; these are smoke tests, not validation of
  the original iOS 27 assertion.
- Signed production build 5 succeeded locally with Xcode 26.6 / iOS SDK 26.5.
  The packaged IPA has build number 5, the correct scene manifest, and the
  `EXExpoAppSceneDelegate` class in its executable. All 21 Expo Doctor checks passed.
- Expo's free cloud iOS build quota is exhausted until November 1, 2026. The
  local build avoids this quota. The production EAS profile still uses `latest`;
  the scene-support plugin applies to future builds using Xcode 27 as well.
- Physical-device testing on iOS 27 and iPadOS 27 remains required before resubmission.

Local artifacts (ignored by Git):

- `build-artifacts/resale-scanner-1.0.0-5.ipa`: signed App Store build.
- `build-artifacts/resale-scanner-build-5.dSYM.zip`: matching app debug symbols.
- `build-artifacts/build-5-iphone-launch.png`: release launch screenshot.
- `build-artifacts/build-5-ipad-manual-entry.png`: manual entry after camera denial.

Build 5 was successfully uploaded to App Store Connect on October 21, 2026:
[EAS submission record](https://expo.dev/accounts/fabrod/projects/resale-scanner/submissions/284e38cb-ace4-430a-871f-9bb265522cb7).
Physical-device testing and App Review resubmission remain pending.

## Before resubmitting

Install build 5 through TestFlight on an iPhone running iOS 27 and an iPad running
iPadOS 27. Verify clean launch before camera access, denied camera access and
manual entry, granted camera access and barcode scanning, background/resume,
and launch again with camera permission already granted. Verify manual entry
also works offline. Select build 5 in App Store Connect after this testing.

Suggested review reply after those checks pass:

> Hello,
>
> Thank you for providing the crash reports. We identified the launch failure
> as a missing UIScene lifecycle configuration. Version 1.0.0, build 5 adopts
> the scene lifecycle using Expo's supported configuration and replaces build 4.
>
> We tested build 5 on iPhone and iPad, verifying cold launch, background/resume,
> camera access allowed and denied, barcode scanning, and manual entry.
>
> We have selected build 5 for review. Please review the updated build.
>
> Thank you.
