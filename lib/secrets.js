// Semua nilai ditanam di backend (permintaan customer), tanpa environment variable.
// File ini hanya dibaca oleh folder api/ dan lib/. Vercel hanya menyajikan folder public/,
// jadi file ini tidak bisa dibuka dari browser. Repo WAJIB privat.
// Semua bagian sudah terisi.
export const SECRETS = {
  B2_KEY_ID: '0052badc0c5c9d60000000001', // keyID Application Key "circle-app" (bukan master key)
  B2_APPLICATION_KEY: 'K005bNRWMmssusCpZvmI/zVR2eLH1HQ', // applicationKey Application Key "circle-app"
  B2_BUCKET: 'circle-media-nyr-2611',
  B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
  B2_REGION: 'us-east-005',

  FIREBASE_PROJECT_ID: 'circle-media-nyr-2611',
  FIREBASE_WEB_API_KEY: 'AIzaSyB8cVldP6E9aohyM51g2RYIRx4NwlMs8OA',
  FIREBASE_AUTH_DOMAIN: 'circle-media-nyr-2611.firebaseapp.com',
  FIREBASE_APP_ID: '1:314167177695:web:fc214aea32c7505288946a',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-fbsvc@circle-media-nyr-2611.iam.gserviceaccount.com', // client_email dari JSON service account
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChYiGWPtznJ4Mz\ncWMmS1Hlnf1wUR+YewoDBKGARJgQJNqzi9zm4TgxAedDXn55MXF7J4xyC62JZobP\ncXRBBVmQ0iIjsj++AI9zpd2oW4lhvUy+fNcydKv+YyPTbyGkoZZTQ6RZmsOzO1F2\n9p4j/bD+K/6yaX/G+Ok45SS3UN9YRxHwrToEbDMkT1vHrLlV43+k+Cbtl2coJQuy\nM1gnycoEMnjB0gWGi6Z8w5yoL2UqZABMWd2XNLFROq14p48pEN0CuZ9zcCEzNLk9\nLd2Prat+3FfDsTZvHqJcLFLDrfcWFyRX8G4K++aHT9hFm1hKF9bz04IvORC9NOlr\nUJ7N8PPnAgMBAAECggEAMkSMPK3hBflHQzdO0GdGn7SZ9Cm4oziz8iO3oGn9SY4J\nN0LZ8Gp3o8A5hkEBOQO/GsLDWuSrTbCLTkNDGFuvvc3OR3smoqqvBDFGfUHh5Xle\n1biyGSvBRRAhYSLtAkg4uD/KCgUMbyALbHg94u0K++i9QVpeLB5tGsU5LgZ5QxgF\nVS0zKHXAUMX/hXmfyyGiBsYXfL/tS0ycbwkbSAgfg/dDMo3XrYOTNDfnpEKMkdXN\nOXxQ1ATVxqsV/ixkkn2fDycAd1Qzl8d68n4Rd8wlVY49bfqEOPIXBRiApicWbNEb\n1fH5YiDVLsZYUIZqCzUHtcH57wO7hS7lwZgwt+tneQKBgQDTPY4LDeG3BWhZU7n5\nb+0jCDBPbGqr6QqpGLu/CbLBp80Hg58Rucr2kjjKL3tOEfgFeGldelResHQifxFS\nkEiG1fPI6HshpB64uiXVpY7S9HXsRncYRvlMZY69I38ThcE5p0E6sRCqBTF40j3k\nw6sNavOgv68Xxphr9ANRIKVTGQKBgQDDlCVUmh3ynh/CSErLbSCNlC63Yi5xVCKS\nQjbwwbKJeQkoz2BNjjiy+oyUYVzgvtBOCC7/3GVmtKeCQx1SgCmm6JthRTdKHR8I\n5UmoMWG3tNyt1uGdi8JW+6tQQTjLjK34MiNq58VCWDncag6U8dEFHkhHmuV7UaOe\nyWzwksBe/wKBgH3bc/EEIVKRZz2pk+mZFTnFHDuGBfxNCev774h/98BIAPGUK0c9\nYj8MmcdlCNtX+2UO/AAU7YXJLjiLar+9dWjYuroeQZammSNIzVgAnxrzSfsvdK/D\nQa+R5rysFH+GNrzp+QRGEP6rv3EUGopdRmHlMii5bFIHIjNXnE5O3BGpAoGAFDEB\nQaC/osKsaLRp9GKJz9QSlqAuR0j2YL8xSN3WftbeGTZ/rMIYHHI9fTwoCJPqkYPK\nxmOMnHPeL1aael/87Nxq3jn1IVOsVpDFb/XZLswfVFsw48EACVbmMtzo7irR8yPK\nAEl5VgYhwx2376yfdbXQpIPbWUXubIBDHPspnSUCgYAmhaxhHxJgMU0kexbtPdVL\nI/YmA4P7ijPa/QVXsgOx6hwxGlnzbEmyMwyaxscXX80pxaLjrUG2ELdfBrGcyDnP\njgcg8IvQ7GqTO0yqrGKKfX5nzkR1dx2iWV85NAOJfO0ntHA1WvXE4K8AQX5qGL9Q\nrz+LVpGRTzlQE9c+jpFOiQ==\n-----END PRIVATE KEY-----\n',  // private_key dari JSON service account (boleh dengan \n apa adanya)

  // Dipakai sekali untuk membuat owner pertama lewat akun.html. Setelah owner jadi, ganti ke ''.
  OWNER_SETUP_SECRET: 'passhihu2000#####',

  // Opsional: TURN server untuk voice room di jaringan seluler yang ketat. Kosongkan kalau tidak dipakai.
  TURN_URL: '',
  TURN_USERNAME: '',
  TURN_CREDENTIAL: '',
};
