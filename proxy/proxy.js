// Daftar host resmi. Backend menolak request dari origin lain (web hasil clone).
export const APP_HOSTS = ['circle-media-nyr-app.vercel.app', 'localhost', '127.0.0.1'];

export function isAllowedOrigin(origin) {
  try {
    return APP_HOSTS.includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}
