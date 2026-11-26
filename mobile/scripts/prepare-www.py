#!/usr/bin/env python3
"""Salin ../public ke www/ lalu sesuaikan untuk APK:
1. Path halaman dibuat eksplisit (/chat/ -> /chat/index.html). Server lokal Capacitor
   menganggap path tanpa ekstensi sebagai SPA dan menyajikan index.html ROOT, sehingga
   /chat/ akan membuka halaman login terus-menerus.
2. Menyisipkan layar offline (offline.js) di semua halaman HTML.
"""
import pathlib, re, shutil, sys

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = HERE.parent / 'public'
DST = HERE / 'www'

if not SRC.is_dir():
    sys.exit('Folder public/ tidak ditemukan: %s' % SRC)

shutil.rmtree(DST, ignore_errors=True)
shutil.copytree(SRC, DST)
shutil.copy(HERE / 'web' / 'offline.js', DST / 'offline.js')

PAGES = 'chat|channel|admin|voice|profile|settings|members|dm'
PATH = re.compile(r"""(['"`])/(%s)/(?=['"`?])""" % PAGES)
INJECT = '<script src="/offline.js"></script>'

replaced = 0
html_count = 0
for f in DST.rglob('*'):
    if f.suffix not in ('.js', '.html'):
        continue
    s = f.read_text(encoding='utf-8')
    s2, n = PATH.subn(r'\1/\2/index.html', s)
    replaced += n
    if f.suffix == '.html':
        html_count += 1
        marker = '<meta charset="utf-8">'
        if INJECT not in s2:
            if marker not in s2:
                sys.exit('Tidak menemukan <meta charset> di %s' % f)
            s2 = s2.replace(marker, marker + '\n' + INJECT, 1)
    if s2 != s:
        f.write_text(s2, encoding='utf-8')

print('www siap: %d path diperbaiki, offline.js disisipkan ke %d halaman HTML' % (replaced, html_count))
