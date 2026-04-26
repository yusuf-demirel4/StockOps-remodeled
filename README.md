# StockOps

Turkce arayuzlu, kod ve veri modeli Ingilizce olan stok takip yonetim sistemi.

## Mimari

Bu repo artik monorepo olarak duzenlenir:

- `apps/web`: Next.js dashboard ve Server Actions tabanli yonetim arayuzu
- `apps/api`: mobil uygulama, public API ve webhook girisleri icin NestJS API iskeleti
- `apps/worker`: webhook, stok senkronizasyonu ve bildirim gibi arka plan isleri
- `packages/core`: domain tipleri, stok kurallari, validasyon, format ve demo veri
- `packages/db`: Prisma schema, SQL migrations, seed ve paylasilan database client
- `packages/queue`: memory ve BullMQ/Redis destekli job publish/worker adaptoru

## Kapsam

- Coklu isletme/SaaS veri modeli icin `organizationId` temeli
- Urun/SKU, barkod, kategori ve minimum stok kayitlari
- Stok hareket defteri: giris, cikis, duzeltme, satis ve satin alma teslimi
- Satis siparisi ve satin alma siparisi akisleri
- Tedarikci yonetimi
- Rol bazli yetki matrisi
- Dashboard ve kritik stok uyarilari
- API baslangici: `GET /v1/health`, `GET /v1/inventory/products`
- Shopify/WooCommerce webhook inbox ve provider imza dogrulama altyapisi
- API auth: Bearer token + `organizationId` tabanli tenant izolasyonu + rol bazli yetki
- Webhook inbox: event idempotency, `WebhookEvent` kaydi ve worker job kontrati
- SMS/WhatsApp bildirim delivery modeli ve guvenli console/dry-run provider adapter
- OpenAPI kontrati: Swagger UI ve JSON/YAML dokuman ciktilari
- Queue kontrati: demo icin memory driver, production icin BullMQ/Redis driver

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
OpenAPI dokumani varsayilan olarak `http://localhost:4000/docs` adresinde,
ham JSON ciktisi ise `http://localhost:4000/docs/openapi.json` adresinde yayinlanir.

Demo API token:

```txt
stockops_demo_api_key
```

Ornek API istegi:

```bash
curl http://localhost:4000/v1/products \
  -H "Authorization: Bearer stockops_demo_api_key"
```

Temel API rotalari:

```txt
GET    /v1/auth/me
GET    /v1/products
POST   /v1/products
PATCH  /v1/products/:id
DELETE /v1/products/:id
GET    /v1/suppliers
POST   /v1/suppliers
PATCH  /v1/suppliers/:id
GET    /v1/stock/warehouses
GET    /v1/stock/rows
GET    /v1/stock/alerts
GET    /v1/stock/movements
POST   /v1/stock/movements
GET    /v1/sales-orders
POST   /v1/sales-orders
POST   /v1/sales-orders/:id/confirm
GET    /v1/purchase-orders
POST   /v1/purchase-orders
POST   /v1/purchase-orders/:id/receive
```

OpenAPI ayarlari:

```env
API_DOCS_ENABLED="true"
API_DOCS_PATH="docs"
```

Queue ayarlari:

```env
STOCKOPS_QUEUE_DRIVER="memory" # memory | bullmq
STOCKOPS_QUEUE_NAME="stockops.jobs"
STOCKOPS_QUEUE_CONCURRENCY="5"
REDIS_URL="redis://localhost:6379"
```

`STOCKOPS_QUEUE_DRIVER` bos birakilirsa `REDIS_URL` varsa BullMQ,
yoksa memory driver kullanilir. Memory driver demo ve local dogrulama icindir;
ayri API/worker process'leri arasinda kalici is tasimak icin Redis/BullMQ kullanilmalidir.

Webhook rotalari:

```txt
POST /v1/webhooks/shopify
POST /v1/webhooks/woocommerce
```

`WEBHOOK_SHARED_SECRET` degeri bos degilse webhook isteklerinde
`X-StockOps-Webhook-Secret` header'i zorunlu olur.

Provider imza dogrulama ayarlari:

```env
SHOPIFY_WEBHOOK_SECRET=""
WOOCOMMERCE_WEBHOOK_SECRET=""
```

Bu degerlerden biri tanimliysa ilgili provider icin `X-Shopify-Hmac-Sha256`
veya `X-WC-Webhook-Signature` header'i raw body uzerinden dogrulanir.

Bildirim ayarlari:

```env
NOTIFICATION_PROVIDER="console"
SMS_NOTIFICATION_RECIPIENT=""
WHATSAPP_NOTIFICATION_RECIPIENT=""
```

`console` provider local ve staging icin guvenli dry-run davranisidir. Gercek
SMS/WhatsApp gonderimi icin provider adapter ayni kontratla genisletilmelidir.

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
SHADOW_DATABASE_URL="postgresql://stockops:stockops@localhost:5432/stockops_shadow?schema=public"
API_DEMO_TOKEN="stockops_demo_api_key"
WEBHOOK_DEFAULT_ORGANIZATION_SLUG="kernelguard"
```

`SHADOW_DATABASE_URL`, Prisma'nin migration drift kontrolleri ve `migrate dev`
akisinda kullandigi izole veritabanidir. Local PostgreSQL kullanirken ana
veritabani ile ayni yetkilere sahip ayri bir database olmalidir.

Local PostgreSQL baslatma:

```bash
npm run db:up
npm run db:ps
```

`compose.yaml`, `stockops` ve `stockops_shadow` veritabanlarini hazirlar.
Mevcut volume daha once olusturulduysa init script'leri yeniden calismaz; sadece
lokal veriyi sifirlamak icin `npm run db:reset:local` kullanin.

Ilk database kurulumu:

```bash
npm run prisma:migrate:dev
npm run prisma:seed
npm run smoke:database
```

Production/staging migration akisi:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
npm run smoke:database
```

Migration dosyalari `packages/db/prisma/migrations` altinda versiyonlanir.
`prisma:push` sadece hizli lokal prototipleme icindir; staging ve production icin
`prisma:migrate:deploy` kullanilmalidir.

Migration durumunu kontrol etmek icin:

```bash
npm run prisma:migrate:status
```

Migration dosyalari ile `schema.prisma` arasinda drift kontrolu icin:

```bash
npm run prisma:migrate:check
```

Bu komut PostgreSQL shadow database gerektirir; CI ortaminda
`SHADOW_DATABASE_URL` mutlaka tanimli olmalidir.

## Dogrulama

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
npm run prisma:generate
npm run smoke:database
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
