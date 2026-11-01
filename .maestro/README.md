# Local iOS end-to-end tests

With an iOS Simulator running, start Metro in one terminal:

```sh
npm run start
```

Then build, install, and test in another terminal:

```sh
npm run ios -- --no-bundler
maestro test .maestro
```

The flows cover the first camera request and denial, the manual-entry fallback,
an already-granted camera permission, and returning from Settings after access
is enabled. Camera barcode decoding still requires a physical device.
