// Layar mode offline untuk APK. Sengaja script biasa (bukan module) dan tanpa import,
// supaya tetap jalan walau shared.js gagal dimuat karena tidak ada internet.
(function () {
  var NATIVE = !!(window.Capacitor && ((window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || window.Capacitor.platform === 'android'));
  var PING = (NATIVE || location.hostname === 'appassets.androidplatform.net' ? 'https://circle-media-nyr-app.vercel.app' : '') + '/api/config';
  var TEXT = 'anda dalam mode offline & tidak dapat menerima pesan';
  var box = null, wasOffline = false, busy = false, timer = null;

  function show() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'coa-offline';
    box.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:32px;text-align:center;background:#0c0a1f;color:#f3f1ff;font:700 17px/1.5 system-ui,sans-serif';
    var img = new Image();
    img.src = '/logo.png';
    img.alt = '';
    img.style.cssText = 'width:96px;height:96px;border-radius:22px;opacity:.9';
    var p = document.createElement('p');
    p.textContent = TEXT;
    p.style.cssText = 'margin:0;max-width:320px';
    box.appendChild(img);
    box.appendChild(p);
    (document.body || document.documentElement).appendChild(box);
  }

  function set(online) {
    if (online) {
      if (box) { box.remove(); box = null; }
      // Halaman bisa saja gagal dimuat saat offline, jadi muat ulang begitu internet kembali
      if (wasOffline) { wasOffline = false; location.reload(); }
    } else {
      wasOffline = true;
      show();
    }
  }

  function check() {
    if (busy) return;
    busy = true;
    if (navigator.onLine === false) { set(false); busy = false; return; }
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    fetch(PING + '?_=' + Date.now(), { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function () { set(true); })
      .catch(function () { set(false); })
      .then(function () { clearTimeout(t); busy = false; });
  }

  function loop() {
    check();
    clearTimeout(timer);
    timer = setTimeout(loop, wasOffline ? 4000 : 20000);
  }

  if (navigator.onLine === false) show();
  window.addEventListener('offline', function () { set(false); });
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  loop();
})();
