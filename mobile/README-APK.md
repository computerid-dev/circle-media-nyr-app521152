# Build APK Claude of Anarchy

Package name: `com.circlemedia.nyr.app`

## Sekali saja: isi GitHub Secrets
Repo > Settings > Secrets and variables > Actions > New repository secret

| Secret | Isi | Wajib |
|---|---|---|
| `GOOGLE_SERVICES_JSON_BASE64` | isi file `google-services.base64.txt` | ya |
| `KEYSTORE_BASE64` | keystore release dalam base64 | tidak (kalau kosong, hasilnya debug APK) |
| `KEYSTORE_PASSWORD` | password keystore (dipakai juga sebagai password key) | kalau pakai keystore |
| `KEY_ALIAS` | alias key, misal `coa` | kalau pakai keystore |

Bikin keystore (simpan baik-baik, kalau hilang APK tidak bisa di-update di atas versi lama):
```
keytool -genkeypair -v -keystore coa.jks -alias coa -keyalg RSA -keysize 2048 -validity 10000 -storepass GANTI_PASSWORD -keypass GANTI_PASSWORD
base64 -w0 coa.jks   # hasilnya masuk ke KEYSTORE_BASE64
```

## Build
Tab Actions > Build APK > Run workflow. Hasil: artifact `COA-apk` (COA-release.apk atau COA-debug.apk).
Atau push tag, misalnya `git tag v1.0.0 && git push --tags`.

## Yang dikerjakan workflow
1. `prepare-www.py` menyalin `public/` ke `www/`, merapikan path halaman (/chat/ jadi /chat/index.html) dan menyisipkan layar offline.
2. `npx cap add android` lalu `patch-android.py`: izin, KeepAliveService, BootReceiver, ikon, versionCode.
3. Gradle build, tanda tangan APK, upload artifact.

## Checklist di luar repo
- Bucket B2: tambahkan `https://localhost`, `http://localhost`, dan `https://appassets.androidplatform.net` ke CORS rules (upload dan unduh file dari APK berasal dari origin ini).
- Firebase > Project settings > Cloud Messaging: pastikan Firebase Cloud Messaging API (V1) Enabled.
- Kalau Web API key Firebase dibatasi HTTP referrer, tambahkan `https://localhost/*` dan `https://appassets.androidplatform.net/*`.
