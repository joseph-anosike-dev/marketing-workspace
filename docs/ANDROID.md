# Re-Search on Android

The app is wrapped with Capacitor. Every push to `main` builds a signed APK on
GitHub and publishes it as the **latest** pre-release.

- App name: **Re-Search**
- App id: `app.resrch.workspace` (set in `capacitor.config.ts`). It is permanent
  once published: a different id is a different app. Change it now if you want a
  different one, before you first install.

## One-time setup

### 1. Make a signing key

Every build must be signed with the **same** key, or Android refuses to update
the installed app in place and you would have to uninstall it, which deletes its
data. Make the key once and keep a copy somewhere safe (not in the repo).

`keytool` comes with Android Studio, in its `jbr\bin` folder, for example
`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`.

```
keytool -genkeypair -v -keystore re-search.keystore -alias research -keyalg RSA -keysize 2048 -validity 10000
```

Choose one password. The key password must be the same as the keystore
password (just press Enter when it asks for the key password).

Turn the file into text. In PowerShell:

```
[Convert]::ToBase64String([IO.File]::ReadAllBytes("re-search.keystore")) | Set-Clipboard
```

### 2. Add three secrets on GitHub

Repository → Settings → Secrets and variables → Actions → New repository secret.

| Name                         | Value                                  |
| ---------------------------- | -------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`    | the text you just copied               |
| `ANDROID_KEYSTORE_PASSWORD`  | the password you chose                 |
| `ANDROID_KEY_ALIAS`          | `research` (or the alias you used)     |

(The key password is read from `ANDROID_KEYSTORE_PASSWORD`.)

### 3. Push to `main`

The **Android build** workflow runs (Actions tab). The first run takes longest.
When it finishes, the APK is under **Releases → latest**. You can also run it by
hand: Actions → Android build → Run workflow.

## Installing on your phone

1. Open the repository's Releases page on the phone and download `Re-Search.apk`.
2. Open it. Android asks you to allow installs from that app (your browser).
   Allow it. Play Protect may warn about an unknown app: choose to install anyway.
3. Later builds install over the earlier one and keep your data.

## Your data on the phone

Data lives inside the app on the phone. Uninstalling the app deletes it, and
Android can clear it if storage runs very low. Use **Settings → Backup**
regularly. In the app, exports and backups open Android's share sheet, from
where you save them to Files or Drive.

## Building on your own computer

You need Node 22 and Android Studio.

```
npm install
npm run android:sync     # builds the web app and copies it into android/
npm run android:open     # opens the project in Android Studio
```

Run it on an emulator or a USB-connected phone from Android Studio. This makes a
debug build, which is signed with a different key than the GitHub builds, so
uninstall one before installing the other.

## Not covered here

iOS (needs a Mac) and publishing to the Play Store (a separate release build,
store listing and one-time developer fee).
