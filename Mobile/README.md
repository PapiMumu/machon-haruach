<img align="right" width="150" src="https://raw.githubusercontent.com/ChurchApps/Mobile/main/public/images/logo.png">

# Machon HaRuach Mobile

> **Machon HaRuach Mobile** is the mobile app companion to the [B1.church](https://github.com/ChurchApps/App) app. It runs on both iOS and Android and provides the same features as the web version including online giving, self-check-in for attendance, live streaming of services, and an interactive member directory. Visit [B1.church](https://b1.church/) to learn more.

## Preview

<div style="display: flex;gap: 10px;">
    <img style="width: 24%;" src="https://github.com/ChurchApps/Mobile/assets/1447203/69cec397-ac87-4bad-a4c4-f9505b8b5f2c">  
    <img style="width: 24%;" src="https://github.com/ChurchApps/Mobile/assets/1447203/0f1ee735-f6be-4d05-9737-a13dac5be89b">
    <img style="width: 24%;" src="https://github.com/ChurchApps/Mobile/assets/1447203/ba23768c-1e8b-449a-8c56-a8bdf5d8dbd9">
    <img style="width: 24%;" src="https://github.com/ChurchApps/Mobile/assets/1447203/14b79a9c-08e8-4870-9587-2b03e050deb5">  
</div>

## Get Involved

### 🤝 Help Support Us

The only reason this program is free is because of the generous support from users. If you want to support us to keep this free, please head over to [ChurchApps](https://churchapps/partner) or [sponsor us on GitHub](https://github.com/sponsors/ChurchApps/). Thank you so much!

### 🏘️ Join the Community

We have a great community for end-users on [Facebook](https://www.facebook.com/churchapps.org). It's a good way to ask questions, get tips and follow new updates. Come join us!

### ⚠️ Report an Issue

If you discover an issue or have a feature request, simply submit it to our [issues log](https://github.com/ChurchApps/ChurchAppsSupport/issues). Don't be shy, that's how the program gets better.

### 💬 Join us on Slack

If you would like to contribute in any way, head over to our [Slack Channel](https://join.slack.com/t/livechurchsolutions/shared_invite/zt-i88etpo5-ZZhYsQwQLVclW12DKtVflg) and introduce yourself. We'd love to hear from you.

### 🏗️ Start Coding

If you'd like to set up the project locally, see our [development guide](https://churchapps.org/dev). For this app:

1. Copy `dotenv.sample.txt` to `.env` and set `STAGE=staging` plus your API URLs (see Admin `.env` for the same staging host).
2. Run `npm install` in `Mobile/`.

#### Android (development build — not Expo Go)

This app uses **native modules** (`expo-dev-client`, Firebase, Stripe, etc.), so **Expo Go cannot run it**. Pressing `a` in `expo start` only works after a **development build** is installed (`org.machonharuach.mobile`).

**First time (emulator or USB device):**

1. Install [Android Studio](https://developer.android.com/studio) and ensure an emulator is running (or a phone with USB debugging).
2. Set `ANDROID_HOME` (SDK path) in your environment.
3. From `Mobile/`:

```powershell
npm run android
```

This runs `expo run:android`, compiles the native app, installs it, and starts Metro. The first build can take several minutes.

**Later runs:**

```powershell
npm start
```

Metro starts with `--dev-client`. Open the **Machon HaRuach** app on the device (not Expo Go); it connects to Metro automatically.

**Physical device on Wi‑Fi:** use your PC’s LAN IP in `.env` instead of `localhost` for any local URLs. The emulator uses `10.0.2.2` for host machine (handled in `EnvironmentHelper` for Android).

**Windows `compressDebugAssets` / “Unable to delete directory”:** another Gradle or Metro process is locking `android/app/build`. Stop everything, then:

```powershell
cd Mobile\android
.\gradlew.bat --stop
cd ..
# Close Android Studio emulator extra Gradle daemons if needed
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
npm run android
```

Run only one `npm run android` at a time.

**Cloud build (no local Android SDK):**

```powershell
npx eas build --profile development --platform android
```

Install the APK from the EAS dashboard, then run `npm start`.

#### Firebase / `google-services.json`

Android package id is `org.machonharuach.mobile`. `android/app/google-services.json` must include a **client** entry with that `package_name`. If Gradle fails with `No matching client found for package name 'org.machonharuach.mobile'`, add the app in [Firebase Console](https://console.firebase.google.com/) (project `b1mobile`) → Android app → package `org.machonharuach.mobile`, then download an updated `google-services.json` and replace `android/app/google-services.json`.

## Release build

1. Hardcode stage to prod EnvironmentHelper.ts
2. Increment the version number in these files:
   - `package.json` - `version`
   - `app.config.js` - `version` and `runtimeVersion`
   - `android/app/build.gradle` - `versionCode` (increment integer) and `versionName`
   - `ios/Mobile/Info.plist` - `CFBundleShortVersionString` and `CFBundleVersion`
   - `ios/Mobile.xcodeproj/project.pbxproj` - `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` (both Debug and Release configs)
3. Run `npm run build:android` to generate a Google Play release
4. Run `npm run build:ios` to generate an iOS release

## iOS Versioning and Submission

To avoid App Store rejections after the Expo eject, keep the native project in sync before each iOS release.

1. Update `expo.version` and `expo.ios.buildNumber` in `app.config.js` (and bump `package.json` if needed).
2. Mirror those values into the native project:
   - Set `CFBundleShortVersionString` and `CFBundleVersion` in `ios/Mobile/Info.plist`.
   - Update `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `ios/Mobile.xcodeproj/project.pbxproj`.
3. Commit the changes so the release history is tracked.
4. Run `eas build --platform ios --profile production` and wait for the build to finish.
5. Submit with `eas submit --platform ios --profile production` (or use the Expo dashboard).
6. If App Store Connect reports a duplicate version/build, repeat the steps with higher numbers and rebuild.

