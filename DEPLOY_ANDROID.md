# Android Build & Deploy Guide — Piss Protocol

This document describes how to build a signed Android App Bundle (AAB) and upload it to Google Play Console.

## Prerequisites

- **Android Studio** (latest stable) installed on your local machine
- **Java Development Kit (JDK) 17+**
- **Node.js 20+** and npm
- A **Google Play Developer account** ($25 one-time registration fee)
- A **signing keystore** file (see *Create a Signing Keystore* below)

## 1. Build the Web App

The Capacitor Android shell loads the compiled web app. Build it first:

```bash
npm run build
```

This outputs the static site to `dist/public/`.

## 2. Sync Web Assets to Android

Copy the compiled web assets into the Android project:

```bash
npx cap sync android
```

This also updates any Capacitor plugins.

## 3. Open in Android Studio

```bash
npx cap open android
```

This opens the `android/` directory in Android Studio.

## 4. Create a Signing Keystore (first time only)

In Android Studio: **Build → Generate Signed Bundle/APK → Android App Bundle → Create new…**

Or via the command line:

```bash
keytool -genkey -v \
  -keystore pissprotocol-release.jks \
  -alias pissprotocol \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Keep this keystore file safe and backed up. Losing it means you can never update your app on the Play Store.**

Store the keystore password and key alias password securely (e.g., a password manager).

## 5. Configure Signing in Android Studio

1. Open **Build → Generate Signed Bundle/APK**
2. Select **Android App Bundle**
3. Choose your keystore file, enter passwords
4. Select **Release** build variant
5. Click **Finish**

The signed `.aab` file will be in `android/app/release/app-release.aab`.

### Command-line build with env-driven signing

`android/app/build.gradle` already contains env-driven signing config. Set these environment variables then run:

```bash
export KEYSTORE_PATH=/path/to/pissprotocol-release.jks
export KEYSTORE_PASSWORD=your_store_password
export KEY_ALIAS=pissprotocol
export KEY_PASSWORD=your_key_password

# Build the web app first
npm run build
npx cap sync android

# Build signed AAB
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

The Gradle signing config reads from env vars:
```groovy
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

Then build from command line:

```bash
cd android
./gradlew bundleRelease
```

## 6. Update Version Numbers

Before each release, update the version in `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2        // Increment by 1 for each release
    versionName "1.1"    // Human-readable version
}
```

## 7. Upload to Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Select your app (or create a new one: **Create app**)
3. Navigate to **Production → Releases → Create new release**
4. Upload the `.aab` file
5. Add release notes
6. **Review and roll out**

### First Upload — Store Listing Requirements

Before your first release, complete:
- App name: **Piss Protocol**
- Short description: *Navigate the unwritten rules of urinal etiquette* (≤80 chars)
- Full description: See `PLAY_STORE_ASSETS.md`
- App icon: 512×512 PNG (see `attached_assets/ic_launcher_1024.png`, resize to 512×512)
- Feature graphic: 1024×500 PNG (see `attached_assets/play_store_feature_graphic.png`)
- Screenshots: At least 2 phone screenshots (see `PLAY_STORE_ASSETS.md`)
- Content rating: Complete the IARC questionnaire → **Everyone (Crude Humor)**
- Category: **Puzzle**
- Privacy policy URL: Host `privacy_policy.md` at a public URL (e.g., GitHub Pages)
- Target audience: 13+ (due to crude humor)

## 8. App Signing by Google Play (recommended)

When creating your first release, enrol in **Play App Signing**. Google will manage your signing key in their secure infrastructure. You upload your upload key (what you created above); Google re-signs with their key.

## 9. Testing Before Production

Use these tracks before pushing to Production:

- **Internal testing** — share with up to 100 testers immediately
- **Closed testing (Alpha/Beta)** — invite specific users or groups
- **Open testing** — any user can opt in

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `sync could not run--missing dist/public directory` | Run `npm run build` first |
| `AAPT2 error` | Check `android/app/build.gradle` for syntax errors |
| White screen on device | Check `capacitor.config.ts` — `webDir` must match build output |
| Haptics not working | Ensure `VIBRATE` permission is in `AndroidManifest.xml` |
| Offline scores not loading | Verify Cache API is available; HTTPS is required |
