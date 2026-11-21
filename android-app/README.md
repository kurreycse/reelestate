# ReelEstate Android

Standalone Android wrapper for ReelEstate. It loads the production site by default and supports authenticated sessions, media playback, file uploads, deep links, phone links, and WhatsApp links.

## Open and run

1. Open this `android-app` folder in Android Studio.
2. Allow Gradle to sync and install Android SDK 35 if prompted.
3. Select an emulator or connected Android device.
4. Run the `app` configuration.

The default URL is `https://reelestate.co.in`.

To use the website running on the host machine from an Android emulator, pass this Gradle property:

```text
-PappUrl=http://10.0.2.2:3000
```

For a physical device, use an HTTPS development URL or replace `10.0.2.2` with the computer’s LAN address and explicitly allow that domain in `network_security_config.xml`.

## Release

Configure an Android signing key in Android Studio, then use **Build > Generate Signed Bundle / APK**. Use an Android App Bundle (`.aab`) for Google Play.

