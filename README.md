# StockOps

Türkçe arayüzlü, İngilizce kod/veri modeli kullanan stok takip yönetim sistemi MVP'si.

## Kapsam

- Çoklu işletme/SaaS veri modeli için `organizationId` temeli
- Ürün/SKU, barkod, kategori ve minimum stok kayıtları
- Stok hareket defteri: giriş, çıkış, düzeltme, satış ve satın alma teslimi
- Satış siparişi ve satın alma siparişi akışları
- Tedarikçi yönetimi
- Rol bazlı yetki matrisi
- Dashboard ve kritik stok uyarıları

## Ekran görüntüleri

### Giriş yap
![Giriş yap](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165643.png)

### Dashboard
![Dashboard](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165228.png)

### Ürünler
![Ürünler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165243.png)

### Stok
![Stok](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165300.png)

### Siparişler
![Siparişler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165307.png)

### Tedarikçiler
![Tedarikçiler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165315.png)

### Yetkiler
![Yetkiler](screenshots/Ekran%20g%C3%B6r%C3%BCnt%C3%BCs%C3%BC%202026-04-25%20165321.png)

## Geliştirme

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak demo verisiyle çalışır. PostgreSQL hedefli Prisma şeması `prisma/schema.prisma` içindedir.

```bash
npm run lint
npm run typecheck
npm test
npm run prisma:validate
```

## Veritabanı

`.env.example` dosyasını `.env` olarak çoğaltıp `DATABASE_URL` değerini PostgreSQL bağlantınıza göre ayarlayın.
