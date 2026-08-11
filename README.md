# Spor Salonu QR Giriş Kontrol Sistemi

Proje ana hattı (v4) doğrultusunda kodlanmış tam çalışır MVP. Ek donanım (turnike/kart okuyucu)
olmadan, sabit bir QR kod + telefon konumu ile üyelik doğrulaması yapar.

## Klasör yapısı

```
qr-gym-system/
├── backend/     Node.js + Express + PostgreSQL + Socket.io API
└── frontend/    React (Vite) + PWA — hem salon sahibi paneli hem üye uygulaması
```

## Mimari özet

- **Multi-tenant**: her istek `owner_id === gym.owner_id` kontrolünden geçer
  (bkz. `backend/src/middleware/ownership.js`). Bu proje ana hattı madde 8'deki
  en kritik güvenlik kuralıdır.
- **QR içeriği** doğrudan `gym_id` değil, tahmin edilemez rastgele bir `qr_token`'dır.
- **Konum doğrulama**: Haversine formülü + GPS `accuracy` kontrolü
  (`backend/src/routes/checkin.routes.js`).
- **Üyelik durumu** elle işaretlenmez, tarih aralığına göre backend'de otomatik hesaplanır.
- **Mükerrer giriş** salon bazlı ayarlanabilir süreyle (varsayılan 5 dk) engellenir.
- **Canlı ekran**: Socket.io ile `gym:{id}` odasına yayın — yalnızca ilgili salon sahibi,
  kendi salonunun oda katılımını JWT ile doğrulayıp izleyebilir.
- Tüm başarılı/başarısız denemeler tek `checkins` tablosunda `result` alanıyla tutulur
  (`success`, `failed_out_of_range`, `failed_low_accuracy`, `failed_expired_membership`,
  `duplicate`, `failed_wrong_gym`, `failed_invalid_qr`, `failed_suspended`).

## Kurulum — Backend

1. PostgreSQL'i kurun ve boş bir veritabanı oluşturun (yerelde ücretsiz, ör. `qr_gym_db`).
2. ```bash
   cd backend
   cp .env.example .env      # DATABASE_URL ve JWT gizli anahtarlarını doldurun
   npm install
   npm run migrate           # schema.sql'i uygular
   npm run dev                # http://localhost:4000
   ```

> `.env` içindeki `JWT_ACCESS_SECRET` ve `JWT_REFRESH_SECRET` değerlerini mutlaka
> rastgele, uzun ve birbirinden farklı değerlerle değiştirin.

## Kurulum — Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL backend adresinizi göstermeli
npm install
npm run dev              # http://localhost:5173
```

## Kullanım akışı (uçtan uca test)

1. `/owner/register` → salon sahibi hesabı oluştur.
2. Dashboard'dan **+ Yeni salon** → konum + GPS yarıçapı gir (mobilde "Mevcut konumumu
   kullan" ile kolayca doldurabilirsin).
3. Salon sayfasında **Ayarlar & QR** sekmesinden sabit QR kodunu indir, salon girişine as.
4. **Üye Davet Et** sekmesinden bir üye oluştur → davet kodu üretilir.
5. Bir üye cihazında `/member/register` → davet kodu + şifre ile hesap kur.
6. Üye ana ekranından **QR okut ve giriş yap** → kamerayla QR'ı okut, konum izni ver.
7. Salon sahibi ekranındaki **Canlı Ekran** sekmesinde giriş anlık olarak görünür.

## Hosting

Proje ana hattında belirtildiği gibi hosting kararı bilinçli olarak koda bağımlı
bırakılmamıştır. Mimaride belirli bir sağlayıcıya özgü kod yoktur:

- Backend: standart Node.js + PostgreSQL — Railway, Render, Fly.io gibi güncel ücretsiz
  katmanı olan servislerden herhangi birine deploy edilebilir.
- Frontend: statik Vite derlemesi — Vercel/Netlify gibi servislere deploy edilebilir.
- Kodlama tamamlandıktan sonra o dönemin güncel ücretsiz seçenekleri karşılaştırılıp
  seçilmelidir (bkz. proje ana hattı madde 1 ve madde 9, adım 15).

## Kapsam dışı (bilinçli olarak)

- Ödeme/aidat takibi
- SMS doğrulama
- Kesin/otomatik multi-device engelleme (yalnızca risk sinyali olarak fingerprint —
  proje ana hattı madde 7)

## Sonraki adımlar (isteğe bağlı geliştirmeler)

- `security_logs` ayrı tablosu (MVP sonrası ihtiyaç doğarsa, ana hat madde 6'daki not)
- E2E test paketi (Playwright/Cypress)
- Docker Compose ile tek komutla ayağa kaldırma
