# Türkiye Pazaryerleri Derin Teknik Entegrasyon Analizi (Trendyol, Hepsiburada, Pazarama)

Bu doküman, StockOps projesinin çekirdek domain modelleri (`@stockops/core/types` altındaki `SalesOrder`, `Product`, `StockMovement`) ve direnç (resilience) mimarisi (Circuit Breaker, Retry mekanizmaları) göz önüne alınarak hazırlanmış derinlemesine bir teknik analizdir.

Mevcut `Shopify` entegrasyonu referans alınarak, Türkiye pazaryerlerinin yapısal farklılıkları ve çözüm mimarileri aşağıda detaylandırılmıştır.

---

## 1. Mimari Prensipler ve Core Domain Eşleşmesi

Tüm entegrasyonlar `packages/integrations/[provider]` altında yaşayacaktır. Temel StockOps uyumluluk kuralları:

1.  **Circuit Breaker (Devre Kesici):** `ShopifyClient` içindeki `getCircuitState()` mantığı, yerel API hız sınırlarına (Rate Limits) göre yeniden yapılandırılmalıdır. Özellikle Trendyol'un katı 429 (Too Many Requests) sınırları için `Retry-After` header'ı zorunlu olarak işlenmelidir.
2.  **Stok Hesaplama:** Pazaryerine stok basılırken (Push), stok miktarı veritabanındaki sabit bir kolondan değil, `getStockOnHand(movements, productId, warehouseId)` fonksiyonu ile `StockMovement` kayıtlarından (Event Sourcing benzeri) anlık olarak hesaplanmalıdır.
3.  **Hata Yönetimi (Retryable Errors):** `SyncError` arayüzü kullanılarak, geçici API kesintilerinde (örn: `TrendyolCircuitOpenError`) `retryable: true` bayrağı ile `apps/worker` üzerinden mesajların yeniden kuyruğa (Queue) alınması sağlanacaktır.

---

## 2. Trendyol Teknik Analizi

Trendyol API'si yüksek trafikli bir RESTful yapıya sahiptir. Senkron (anında cevap dönen) yapısı ile Shopify'a en çok benzeyen entegrasyondur.

### Kimlik Doğrulama & İstemci (Client)
- **Yöntem:** Basic Auth (`SupplierId`, `ApiKey`, `ApiSecret`).
- **Rate Limiting:** Dakikada 200-500 istek. `429 Too Many Requests` alındığında header'daki `Retry-After` değerine göre HTTP isteği `sleep()` ile bekletilmelidir (Exponential backoff).

### Sipariş Senkronizasyonu (Pull)
- **Endpoint:** `GET /sapigw/suppliers/{supplierId}/orders` (Yüksek hacim için `getShipmentPackagesStream` kullanılmalıdır; standart endpoint 10.000 kayıtla sınırlanacaktır).
- **Domain Eşleşmesi:**
  - `orderNumber` -> `SalesOrder.externalId`
  - `lines[].barcode` -> `Product.sku` (StockOps tarafında SKU eşleşmesi barkod üzerinden yapılacaktır).
  - `status` -> StockOps `SalesOrderStatus` enum'ına çevrilecek (örn: "Created" -> `PENDING`).

### Stok Senkronizasyonu (Push)
- **Endpoint:** `POST /sapigw/suppliers/{supplierId}/products/price-and-inventory`
- **Mekanizma:** Batch (Toplu) gönderim desteklenir.
- **StockOps Mantığı:**
  ```typescript
  // items array'i oluşturulur
  const stockOpsQty = getStockOnHand(movements, stockOpsProduct.id, config.warehouseId);
  const payload = {
    items: [{ barcode: variant.barcode, quantity: stockOpsQty }]
  };
  // client.pushInventory(payload) çağrılır.
  ```

---

## 3. Hepsiburada Teknik Analizi

Hepsiburada API'sinin StockOps mimarisini en çok zorlayacak kısmı **Asenkron (Batch/Job) yapısıdır**. Shopify gibi anında `200 OK` veya hata dönmez; işlem kuyruğa alınır.

### Kimlik Doğrulama & İstemci
- **Yöntem:** Basic Auth (Merchant ID odaklı).

### Sipariş Senkronizasyonu (Pull)
- **Endpoint:** `GET /orders/merchantid/{merchantId}`
- **Pagination:** `offset` ve `limit` tabanlı çalışır. Cursor olmadığı için veri çekilirken paralel istekler (Promise.all) ile sayfalama yapılabilir.
- **Webhook:** "Push Service" üzerinden sipariş durum değişiklikleri dinlenmeli ve `webhook-handler.ts` içerisinde StockOps veritabanı güncellenmelidir.

### Stok Senkronizasyonu (Push) - *KRİTİK FARK*
- **Endpoint:** `POST /listings/merchantid/{merchantId}/inventory-uploads`
- **Mimari Uyumsuzluk ve Çözüm:**
  - `inventory-uploads` endpoint'i veriyi hemen uygulamaz, bir upload işlemi başlatır.
  - **StockOps Çözümü:** `inventory-sync.ts` içerisindeki `pushInventoryToHepsiburada` fonksiyonu işlemi başlattığında veritabanına `SyncJobStatus: PENDING` kaydı açmalıdır.
  - `apps/worker/src/jobs.ts` içerisine yeni bir cron eklenerek (örn. her 15 dakikada bir) Hepsiburada'ya "Verdiğim stok upload işlemi bitti mi?" (`GET /listings/merchantid/{merchantId}/tickets/{ticketId}`) diye sorulmalı ve `SyncResult` ancak bu aşamada başarılı/başarısız olarak işaretlenmelidir.

---

## 4. Pazarama Teknik Analizi

Pazarama, OAuth2 kullanarak token bazlı yetkilendirme gerektirir. Bu durum, state (durum) yönetimini zorunlu kılar.

### Kimlik Doğrulama & Token Yönetimi
- **Sorun:** Çoklu sunucu (multi-node worker) yapısında, bir token'ın süresi dolduğunda her sunucunun aynı anda refresh isteği atması "Race Condition" yaratır.
- **Çözüm:** `PazaramaClient` sınıfı, token'ı hafızada (memory) değil, Merkezi Veritabanında (`PazaramaIntegration` tablosu) veya Redis üzerinde tutmalıdır. Refresh işlemi sırasında "Distributed Lock" (Dağıtık Kilit) mekanizması kullanılarak token'ın sadece bir kez yenilenmesi garanti edilmelidir.

---

## 5. Veritabanı (Prisma) Güncellemeleri

`packages/db/prisma/schema.prisma` içerisine entegrasyon durumu ve ayarlarını takip edecek yapılar:

```prisma
// Mevcut Tenant mimarisine eklemlenmiş Pazarama modeli
model PazaramaIntegration {
  id             String   @id @default(cuid())
  tenantId       String   @unique
  clientId       String
  clientSecret   String
  accessToken    String?  // Şifrelenmiş olmalı
  tokenExpiresAt DateTime?
  isActive       Boolean  @default(true)
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
}

// Trendyol için
model TrendyolIntegration {
  id           String  @id @default(cuid())
  tenantId     String  @unique
  supplierId   String
  apiKey       String
  apiSecret    String  // Şifrelenmiş olmalı
  isActive     Boolean @default(true)
  tenant       Tenant  @relation(fields: [tenantId], references: [id])
}

// Hepsiburada asenkron işlem takibi (Ticket/Job sistemi için gerekli)
model HepsiburadaSyncTicket {
  id         String   @id @default(cuid())
  tenantId   String
  ticketId   String   // Hepsiburada'nın döndüğü job ID
  status     String   // PENDING, SUCCESS, FAILED
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## 6. Sonuç ve Geliştirme Yol Haritası (Roadmap)

1.  **Faz 1 (Altyapı):** Prisma şema güncellemelerinin (migrations) yapılması ve şifreleme (encryption/decryption) utility'lerinin oluşturulması.
2.  **Faz 2 (Trendyol):** Shopify mimarisine en yakın olduğu için ilk olarak Trendyol entegrasyonu (Client, Circuit Breaker, Sync işlemleri) yazılmalıdır.
3.  **Faz 3 (Hepsiburada):** Worker tarafına "Asenkron Ticket" takip sisteminin (cron job) eklenmesi ve Hepsiburada stok upload entegrasyonu.
4.  **Faz 4 (Pazarama):** OAuth2 token rotasyon mantığının distributed lock mekanizması ile çözülmesi ve Pazarama entegrasyonu.
5.  **Faz 5 (Test):** Tüm client'lar için `nock` veya MSW kullanılarak 429 Rate Limit ve 500 API çökme senaryolarının test edilmesi.