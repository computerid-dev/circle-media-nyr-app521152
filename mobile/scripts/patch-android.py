#!/usr/bin/env python3
"""Dijalankan setelah `npx cap add android`: pasang izin, service, boot receiver,
ikon, versi, dan kode Java kustom ke proyek android/ hasil generate Capacitor."""
import json, os, pathlib, re, shutil, sys

HERE = pathlib.Path(__file__).resolve().parent.parent
ANDROID = HERE / 'android'
APP = ANDROID / 'app'
MAIN = APP / 'src' / 'main'
MANIFEST = MAIN / 'AndroidManifest.xml'

if not MANIFEST.is_file():
    sys.exit('android/ belum ada. Jalankan "npx cap add android" dulu.')

cfg = json.loads((HERE / 'capacitor.config.json').read_text(encoding='utf-8'))
app_id = cfg['appId']
MARK = '<!-- COA-PATCH -->'

# ---------- AndroidManifest ----------
PERMS = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.RECORD_AUDIO',            # VN dan voice room
    'android.permission.MODIFY_AUDIO_SETTINGS',   # WebRTC
    'android.permission.POST_NOTIFICATIONS',      # notifikasi (Android 13+)
    'android.permission.VIBRATE',
]
m = MANIFEST.read_text(encoding='utf-8')
if MARK not in m:
    perm_xml = ''.join(
        '    <uses-permission android:name="%s" />\n' % p
        for p in PERMS if ('"%s"' % p) not in m
    )
    perm_xml += '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n'
    comps = f'''
        {MARK}
        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="coa_messages" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_coa" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/coa_notif_color" />
'''
    if '</application>' not in m or '</manifest>' not in m:
        sys.exit('Format AndroidManifest.xml tidak dikenali')
    m = m.replace('</application>', comps + '    </application>', 1)
    m = m.replace('</manifest>', perm_xml + '</manifest>', 1)
    MANIFEST.write_text(m, encoding='utf-8')
    print('AndroidManifest dipatch')

# ---------- warna (nama sendiri supaya tidak bentrok dengan resource template Capacitor) ----------
values = MAIN / 'res' / 'values'
values.mkdir(parents=True, exist_ok=True)
(values / 'coa_colors.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    '    <color name="coa_notif_color">#7C5CFF</color>\n'
    '    <color name="coa_launcher_bg">#0C0A1F</color>\n'
    '</resources>\n', encoding='utf-8')

# ikon adaptive: tulis sendiri agar pasti memakai foreground PNG hasil generate di bawah
anydpi = MAIN / 'res' / 'mipmap-anydpi-v26'
anydpi.mkdir(parents=True, exist_ok=True)
ADAPTIVE = ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/coa_launcher_bg"/>\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
            '</adaptive-icon>\n')
(anydpi / 'ic_launcher.xml').write_text(ADAPTIVE, encoding='utf-8')
(anydpi / 'ic_launcher_round.xml').write_text(ADAPTIVE, encoding='utf-8')

# ---------- kode Java ----------
pkg_dir = MAIN / 'java' / pathlib.Path(*app_id.split('.'))
pkg_dir.mkdir(parents=True, exist_ok=True)
for f in (HERE / 'android-overlay' / 'java').glob('*.java'):
    src = f.read_text(encoding='utf-8')
    src = re.sub(r'^package\s+[\w.]+;', 'package %s;' % app_id, src, count=1, flags=re.M)
    (pkg_dir / f.name).write_text(src, encoding='utf-8')
print('Java dipasang ke', pkg_dir)

# ---------- build.gradle: versi, lint, memori ----------
gradle = APP / 'build.gradle'
g = gradle.read_text(encoding='utf-8')
run = os.environ.get('RUN_NUMBER', '1')
g, n1 = re.subn(r'versionCode\s*=?\s*\d+', 'versionCode %s' % run, g, count=1)
g, n2 = re.subn(r'versionName\s*=?\s*"[^"]*"', 'versionName "1.0.%s"' % run, g, count=1)
if 'COA-LINT' not in g:
    g += '\n// COA-LINT\nandroid {\n    lint {\n        checkReleaseBuilds = false\n        abortOnError = false\n    }\n}\n'
gradle.write_text(g, encoding='utf-8')
print('build.gradle: versionCode=%s (%s), versionName (%s)' % (run, 'ok' if n1 else 'TIDAK ketemu', 'ok' if n2 else 'TIDAK ketemu'))

props = ANDROID / 'gradle.properties'
if props.exists():
    p = props.read_text(encoding='utf-8')
    p = re.sub(r'org\.gradle\.jvmargs=.*', 'org.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8', p) if 'org.gradle.jvmargs' in p else p + '\norg.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8\n'
    props.write_text(p, encoding='utf-8')

# ---------- ikon ----------
try:
    from PIL import Image, ImageDraw
except ImportError:
    print('Pillow tidak ada, ikon dilewati')
    sys.exit(0)

logo_path = HERE.parent / 'public' / 'icon-512.png'
logo = Image.open(logo_path).convert('RGBA')
res = MAIN / 'res'
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

for d, k in DENS.items():
    folder = res / ('mipmap-' + d)
    folder.mkdir(parents=True, exist_ok=True)
    s = int(48 * k)
    sq = logo.resize((s, s), Image.LANCZOS)
    sq.save(folder / 'ic_launcher.png')
    mask = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    mask = mask.resize((s, s), Image.LANCZOS)
    rd = sq.copy()
    rd.putalpha(mask)
    rd.save(folder / 'ic_launcher_round.png')
    # foreground adaptive icon: 108dp, isi di zona aman
    f = int(108 * k)
    canvas = Image.new('RGBA', (f, f), (0, 0, 0, 0))
    inner = int(f * 0.62)
    canvas.paste(logo.resize((inner, inner), Image.LANCZOS), ((f - inner) // 2, (f - inner) // 2))
    canvas.save(folder / 'ic_launcher_foreground.png')

# ikon status bar notifikasi: gelembung chat putih polos
for d, k in DENS.items():
    s = int(24 * k)
    big = s * 4
    im = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.ellipse((big * 0.10, big * 0.12, big * 0.90, big * 0.78), fill=(255, 255, 255, 255))
    dr.polygon([(big * 0.22, big * 0.66), (big * 0.18, big * 0.92), (big * 0.48, big * 0.74)], fill=(255, 255, 255, 255))
    folder = res / ('drawable-' + d)
    folder.mkdir(parents=True, exist_ok=True)
    im.resize((s, s), Image.LANCZOS).save(folder / 'ic_stat_coa.png')
print('Ikon dibuat')
