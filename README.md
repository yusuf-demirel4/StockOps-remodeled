# StockOps

Turkce arayuzlu, kod ve veri modeli Ingilizce olan stok takip yonetim sistemi.

## Mimari

Bu repo artik monorepo olarak duzenlenir:

- `apps/web`: Next.js dashboard ve Server Actions tabanli yonetim arayuzu
- `apps/api`: mobil uygulama, public API ve webhook girisleri icin NestJS API iskeleti
- `apps/worker`: webhook, satin alma onerisi, bildirim ve AI forecast gibi arka plan isleri
- `packages/core`: domain tipleri, stok kurallari, validasyon, format ve demo veri
- `packages/db`: Prisma schema, seed ve paylasilan database client

## Kapsam

- Coklu isletme/SaaS veri modeli icin `organizationId` temeli
- Urun/SKU, barkod, kategori ve minimum stok kayitlari
- Stok hareket defteri: giris, cikis, duzeltme, satis ve satin alma teslimi
- Satis siparisi ve satin alma siparisi akisleri
- Tedarikci yonetimi
- Rol bazli yetki matrisi
- Dashboard ve kritik stok uyarilari
- API baslangici: `GET /v1/health`, `GET /v1/inventory/products`
- Webhook baslangici: `POST /v1/webhooks/shopify`, `POST /v1/webhooks/woocommerce`

## Gelistirme

```bash
npm install
npm run prisma:generate
npm run dev
```

Varsayilan web uygulamasi `http://localhost:3000` adresinde calisir.

Demo girisi:

```txt
E-posta: eren@example.com
Sifre: stockops123
```

API ve worker ayri calistirilabilir:

```bash
npm run dev:api
npm run dev:worker
```

API varsayilan portu `http://localhost:4000`.

## Veritabani

`.env.example` dosyasini `.env` olarak cogaltip ihtiyaca gore duzenleyin.

Demo mod:

```env
APP_DATA_SOURCE="demo"
```

Database mod:

```env
APP_DATA_SOURCE="database"
DATABASE_URL="postgresql://stockops:stockops@localhost:5432/stockops?schema=public"
```

Ilk database kurulumu:

```bash
npm run prisma:push
npm run prisma:seed
```

## Dogrulama

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
```

## Ekran goruntuleri

### Giris yap
![Giris yap](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165643.png)

### Dashboard
![Dashboard](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165228.png)

### Urunler
![Urunler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165243.png)

### Stok
![Stok](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165300.png)

### Siparisler
![Siparisler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165307.png)

### Tedarikciler
![Tedarikciler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165315.png)

### Yetkiler
![Yetkiler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165321.png)
