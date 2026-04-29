import type { ReportDefinition, ReportFilter, AppSnapshot } from "./types";

export const reportCategories = [
  { id: "stock", name: "Stok" },
  { id: "sales", name: "Satış" },
  { id: "purchasing", name: "Satın Alma" },
  { id: "customers", name: "Müşteriler" },
  { id: "invoices", name: "Faturalar" },
  { id: "products", name: "Ürünler" },
  { id: "manufacturing", name: "Üretim" },
  { id: "warehouse", name: "Depo" },
  { id: "general", name: "Genel" },
] as const;

export const builtInReports: ReportDefinition[] = [
  // ── Stok (10) ──
  { id: "stock-on-hand", name: "Eldeki Stok", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "warehouse", label: "Depo", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }, { key: "minimumStock", label: "Minimum", type: "number" }] },
  { id: "stock-by-warehouse", name: "Depoya Göre Stok", category: "stock", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "totalOnHand", label: "Toplam Eldeki", type: "number" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }] },
  { id: "stock-by-category", name: "Kategoriye Göre Stok", category: "stock", columns: [{ key: "category", label: "Kategori", type: "string" }, { key: "totalOnHand", label: "Toplam Eldeki", type: "number" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }] },
  { id: "stock-movements", name: "Stok Hareketleri", category: "stock", columns: [{ key: "date", label: "Tarih", type: "date" }, { key: "type", label: "Tip", type: "string" }, { key: "sku", label: "SKU", type: "string" }, { key: "warehouse", label: "Depo", type: "string" }, { key: "quantity", label: "Miktar", type: "number" }, { key: "reference", label: "Referans", type: "string" }] },
  { id: "critical-stock", name: "Kritik Stok", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }, { key: "minimumStock", label: "Minimum", type: "number" }, { key: "shortage", label: "Eksik", type: "number" }] },
  { id: "stock-valuation", name: "Stok Değerleme", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }, { key: "costPrice", label: "Maliyet", type: "currency" }, { key: "totalValue", label: "Toplam Değer", type: "currency" }] },
  { id: "stock-aging", name: "Stok Yaşlandırma", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "lastMovement", label: "Son Hareket", type: "date" }, { key: "daysSinceMovement", label: "Gün", type: "number" }] },
  { id: "stock-inbound-summary", name: "Giriş Özeti", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "totalInbound", label: "Toplam Giriş", type: "number" }] },
  { id: "stock-outbound-summary", name: "Çıkış Özeti", category: "stock", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "totalOutbound", label: "Toplam Çıkış", type: "number" }] },
  { id: "stock-adjustment-log", name: "Düzeltme Günlüğü", category: "stock", columns: [{ key: "date", label: "Tarih", type: "date" }, { key: "sku", label: "SKU", type: "string" }, { key: "warehouse", label: "Depo", type: "string" }, { key: "quantity", label: "Miktar", type: "number" }, { key: "note", label: "Not", type: "string" }] },

  // ── Satış (10) ──
  { id: "sales-orders-summary", name: "Satış Siparişleri Özeti", category: "sales", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Toplam Adet", type: "number" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "sales-by-product", name: "Ürüne Göre Satış", category: "sales", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "totalSold", label: "Toplam Satış", type: "number" }, { key: "orderCount", label: "Sipariş Sayısı", type: "number" }] },
  { id: "sales-by-customer", name: "Müşteriye Göre Satış", category: "sales", columns: [{ key: "customer", label: "Müşteri", type: "string" }, { key: "orderCount", label: "Sipariş Sayısı", type: "number" }, { key: "totalQuantity", label: "Toplam Adet", type: "number" }] },
  { id: "sales-by-period", name: "Döneme Göre Satış", category: "sales", columns: [{ key: "period", label: "Dönem", type: "string" }, { key: "orderCount", label: "Sipariş Sayısı", type: "number" }, { key: "totalQuantity", label: "Toplam Adet", type: "number" }] },
  { id: "sales-returns-summary", name: "İadeler Özeti", category: "sales", columns: [{ key: "code", label: "İade No", type: "string" }, { key: "orderCode", label: "Sipariş No", type: "string" }, { key: "reason", label: "Neden", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }] },
  { id: "sales-open-orders", name: "Açık Satış Siparişleri", category: "sales", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }] },
  { id: "sales-confirmed-orders", name: "Onaylı Siparişler", category: "sales", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "sales-cancelled-orders", name: "İptal Edilen Siparişler", category: "sales", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "sales-daily", name: "Günlük Satış", category: "sales", columns: [{ key: "date", label: "Tarih", type: "date" }, { key: "orderCount", label: "Sipariş", type: "number" }, { key: "totalQuantity", label: "Adet", type: "number" }] },
  { id: "sales-monthly", name: "Aylık Satış", category: "sales", columns: [{ key: "month", label: "Ay", type: "string" }, { key: "orderCount", label: "Sipariş", type: "number" }, { key: "totalQuantity", label: "Adet", type: "number" }] },

  // ── Satın Alma (8) ──
  { id: "purchase-orders-summary", name: "Satın Alma Siparişleri", category: "purchasing", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "supplier", label: "Tedarikçi", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "purchases-by-supplier", name: "Tedarikçiye Göre Alım", category: "purchasing", columns: [{ key: "supplier", label: "Tedarikçi", type: "string" }, { key: "orderCount", label: "Sipariş Sayısı", type: "number" }, { key: "totalQuantity", label: "Toplam Adet", type: "number" }] },
  { id: "pending-deliveries", name: "Bekleyen Teslimatlar", category: "purchasing", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "supplier", label: "Tedarikçi", type: "string" }, { key: "expectedDate", label: "Beklenen Tarih", type: "date" }, { key: "remainingQuantity", label: "Kalan Adet", type: "number" }] },
  { id: "purchase-lead-times", name: "Tedarik Süreleri", category: "purchasing", columns: [{ key: "supplier", label: "Tedarikçi", type: "string" }, { key: "leadTimeDays", label: "Tedarik Süresi (Gün)", type: "number" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }] },
  { id: "purchase-open-orders", name: "Açık Satın Alma Siparişleri", category: "purchasing", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "supplier", label: "Tedarikçi", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }] },
  { id: "purchase-completed", name: "Tamamlanan Alımlar", category: "purchasing", columns: [{ key: "code", label: "Sipariş No", type: "string" }, { key: "supplier", label: "Tedarikçi", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "purchase-by-product", name: "Ürüne Göre Alım", category: "purchasing", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "totalPurchased", label: "Toplam Alım", type: "number" }] },
  { id: "purchase-monthly", name: "Aylık Satın Alma", category: "purchasing", columns: [{ key: "month", label: "Ay", type: "string" }, { key: "orderCount", label: "Sipariş", type: "number" }, { key: "totalQuantity", label: "Adet", type: "number" }] },

  // ── Müşteriler (8) ──
  { id: "customer-list", name: "Müşteri Listesi", category: "customers", columns: [{ key: "code", label: "Kod", type: "string" }, { key: "name", label: "İsim", type: "string" }, { key: "email", label: "E-posta", type: "string" }, { key: "phone", label: "Telefon", type: "string" }, { key: "paymentTermDays", label: "Vade (Gün)", type: "number" }] },
  { id: "customer-order-history", name: "Müşteri Sipariş Geçmişi", category: "customers", columns: [{ key: "customer", label: "Müşteri", type: "string" }, { key: "code", label: "Sipariş No", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "totalQuantity", label: "Adet", type: "number" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "customer-receivables", name: "Müşteri Alacakları", category: "customers", columns: [{ key: "customer", label: "Müşteri", type: "string" }, { key: "invoiceCount", label: "Fatura Sayısı", type: "number" }, { key: "totalOwed", label: "Toplam Borç", type: "currency" }] },
  { id: "top-customers", name: "En İyi Müşteriler", category: "customers", columns: [{ key: "customer", label: "Müşteri", type: "string" }, { key: "orderCount", label: "Sipariş Sayısı", type: "number" }, { key: "totalQuantity", label: "Toplam Adet", type: "number" }] },
  { id: "customer-active", name: "Aktif Müşteriler", category: "customers", columns: [{ key: "code", label: "Kod", type: "string" }, { key: "name", label: "İsim", type: "string" }, { key: "lastOrderDate", label: "Son Sipariş", type: "date" }] },
  { id: "customer-inactive", name: "Pasif Müşteriler", category: "customers", columns: [{ key: "code", label: "Kod", type: "string" }, { key: "name", label: "İsim", type: "string" }] },
  { id: "customer-by-region", name: "Bölgeye Göre Müşteriler", category: "customers", columns: [{ key: "address", label: "Adres", type: "string" }, { key: "customerCount", label: "Müşteri Sayısı", type: "number" }] },
  { id: "customer-payment-terms", name: "Vade Analizi", category: "customers", columns: [{ key: "customer", label: "Müşteri", type: "string" }, { key: "paymentTermDays", label: "Vade (Gün)", type: "number" }, { key: "invoiceCount", label: "Fatura Sayısı", type: "number" }] },

  // ── Faturalar (8) ──
  { id: "invoice-list", name: "Fatura Listesi", category: "invoices", columns: [{ key: "code", label: "Fatura No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "total", label: "Toplam", type: "currency" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "overdue-invoices", name: "Vadesi Geçmiş Faturalar", category: "invoices", columns: [{ key: "code", label: "Fatura No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "total", label: "Toplam", type: "currency" }, { key: "dueDate", label: "Vade", type: "date" }, { key: "daysOverdue", label: "Gecikme (Gün)", type: "number" }] },
  { id: "payment-summary", name: "Ödeme Özeti", category: "invoices", columns: [{ key: "invoiceCode", label: "Fatura No", type: "string" }, { key: "amount", label: "Tutar", type: "currency" }, { key: "method", label: "Yöntem", type: "string" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "revenue-by-period", name: "Döneme Göre Gelir", category: "invoices", columns: [{ key: "period", label: "Dönem", type: "string" }, { key: "invoiceCount", label: "Fatura Sayısı", type: "number" }, { key: "totalRevenue", label: "Toplam Gelir", type: "currency" }] },
  { id: "invoice-by-status", name: "Duruma Göre Faturalar", category: "invoices", columns: [{ key: "status", label: "Durum", type: "string" }, { key: "count", label: "Adet", type: "number" }, { key: "totalAmount", label: "Toplam", type: "currency" }] },
  { id: "invoice-draft", name: "Taslak Faturalar", category: "invoices", columns: [{ key: "code", label: "Fatura No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "total", label: "Toplam", type: "currency" }] },
  { id: "invoice-paid", name: "Ödenmiş Faturalar", category: "invoices", columns: [{ key: "code", label: "Fatura No", type: "string" }, { key: "customer", label: "Müşteri", type: "string" }, { key: "total", label: "Toplam", type: "currency" }, { key: "paidDate", label: "Ödeme Tarihi", type: "date" }] },
  { id: "tax-summary", name: "Vergi Özeti", category: "invoices", columns: [{ key: "period", label: "Dönem", type: "string" }, { key: "taxableAmount", label: "Matrah", type: "currency" }, { key: "taxAmount", label: "KDV", type: "currency" }] },

  // ── Ürünler (8) ──
  { id: "product-catalog", name: "Ürün Kataloğu", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "category", label: "Kategori", type: "string" }, { key: "unitPrice", label: "Fiyat", type: "currency" }, { key: "isActive", label: "Aktif", type: "boolean" }] },
  { id: "product-performance", name: "Ürün Performansı", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "totalSold", label: "Satılan", type: "number" }, { key: "totalPurchased", label: "Alınan", type: "number" }, { key: "onHand", label: "Eldeki", type: "number" }] },
  { id: "low-stock-alerts", name: "Düşük Stok Uyarıları", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }, { key: "minimumStock", label: "Minimum", type: "number" }] },
  { id: "product-variants", name: "Ürün Varyantları", category: "products", columns: [{ key: "parentSku", label: "Ana SKU", type: "string" }, { key: "variantSku", label: "Varyant SKU", type: "string" }, { key: "name", label: "Varyant", type: "string" }, { key: "unitPrice", label: "Fiyat", type: "currency" }] },
  { id: "product-by-category", name: "Kategoriye Göre Ürünler", category: "products", columns: [{ key: "category", label: "Kategori", type: "string" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }, { key: "activeCount", label: "Aktif", type: "number" }] },
  { id: "product-inactive", name: "Pasif Ürünler", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "category", label: "Kategori", type: "string" }] },
  { id: "product-pricing", name: "Ürün Fiyatları", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "unitPrice", label: "Satış Fiyatı", type: "currency" }, { key: "costPrice", label: "Maliyet", type: "currency" }, { key: "margin", label: "Marj %", type: "number" }] },
  { id: "product-barcode-list", name: "Barkod Listesi", category: "products", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "barcode", label: "Barkod", type: "string" }] },

  // ── Üretim (6) ──
  { id: "bom-list", name: "Ürün Reçeteleri", category: "manufacturing", columns: [{ key: "productSku", label: "Mamul SKU", type: "string" }, { key: "bomName", label: "Reçete", type: "string" }, { key: "componentCount", label: "Bileşen Sayısı", type: "number" }, { key: "isActive", label: "Aktif", type: "boolean" }] },
  { id: "manufacturing-orders", name: "Üretim Emirleri", category: "manufacturing", columns: [{ key: "code", label: "Emir No", type: "string" }, { key: "product", label: "Mamul", type: "string" }, { key: "warehouse", label: "Depo", type: "string" }, { key: "quantity", label: "Miktar", type: "number" }, { key: "status", label: "Durum", type: "string" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "material-usage", name: "Hammadde Kullanımı", category: "manufacturing", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Hammadde", type: "string" }, { key: "totalConsumed", label: "Toplam Tüketim", type: "number" }] },
  { id: "manufacturing-output", name: "Üretim Çıktısı", category: "manufacturing", columns: [{ key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Mamul", type: "string" }, { key: "totalProduced", label: "Toplam Üretim", type: "number" }] },
  { id: "manufacturing-in-progress", name: "Devam Eden Üretimler", category: "manufacturing", columns: [{ key: "code", label: "Emir No", type: "string" }, { key: "product", label: "Mamul", type: "string" }, { key: "quantity", label: "Miktar", type: "number" }, { key: "startedAt", label: "Başlangıç", type: "date" }] },
  { id: "bom-component-usage", name: "Bileşen Kullanım Raporu", category: "manufacturing", columns: [{ key: "componentSku", label: "Bileşen SKU", type: "string" }, { key: "componentName", label: "Bileşen", type: "string" }, { key: "usedInBoms", label: "Reçete Sayısı", type: "number" }, { key: "totalQuantity", label: "Toplam Miktar", type: "number" }] },

  // ── Depo (6) ──
  { id: "warehouse-utilization", name: "Depo Kullanımı", category: "warehouse", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }, { key: "totalOnHand", label: "Toplam Eldeki", type: "number" }] },
  { id: "transfer-history", name: "Transfer Geçmişi", category: "warehouse", columns: [{ key: "date", label: "Tarih", type: "date" }, { key: "sku", label: "SKU", type: "string" }, { key: "sourceWarehouse", label: "Kaynak", type: "string" }, { key: "destWarehouse", label: "Hedef", type: "string" }, { key: "quantity", label: "Miktar", type: "number" }] },
  { id: "warehouse-stock-summary", name: "Depo Stok Özeti", category: "warehouse", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }] },
  { id: "warehouse-movement-volume", name: "Hareket Hacmi", category: "warehouse", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "inboundCount", label: "Giriş", type: "number" }, { key: "outboundCount", label: "Çıkış", type: "number" }] },
  { id: "warehouse-critical-items", name: "Depoda Kritik Ürünler", category: "warehouse", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "sku", label: "SKU", type: "string" }, { key: "name", label: "Ürün", type: "string" }, { key: "onHand", label: "Eldeki", type: "number" }, { key: "minimumStock", label: "Minimum", type: "number" }] },
  { id: "warehouse-default", name: "Varsayılan Depo Raporu", category: "warehouse", columns: [{ key: "warehouse", label: "Depo", type: "string" }, { key: "isDefault", label: "Varsayılan", type: "boolean" }, { key: "productCount", label: "Ürün Sayısı", type: "number" }] },

  // ── Genel (8) ──
  { id: "audit-log", name: "Denetim Kaydı", category: "general", columns: [{ key: "date", label: "Tarih", type: "date" }, { key: "action", label: "Aksiyon", type: "string" }, { key: "entityType", label: "Varlık Tipi", type: "string" }, { key: "entityId", label: "Varlık ID", type: "string" }, { key: "summary", label: "Özet", type: "string" }] },
  { id: "user-activity", name: "Kullanıcı Aktivitesi", category: "general", columns: [{ key: "user", label: "Kullanıcı", type: "string" }, { key: "actionCount", label: "Aksiyon Sayısı", type: "number" }, { key: "lastActivity", label: "Son Aktivite", type: "date" }] },
  { id: "webhook-events", name: "Webhook Olayları", category: "general", columns: [{ key: "source", label: "Kaynak", type: "string" }, { key: "topic", label: "Konu", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "notification-log", name: "Bildirim Günlüğü", category: "general", columns: [{ key: "channel", label: "Kanal", type: "string" }, { key: "recipient", label: "Alıcı", type: "string" }, { key: "message", label: "Mesaj", type: "string" }, { key: "status", label: "Durum", type: "string" }, { key: "date", label: "Tarih", type: "date" }] },
  { id: "system-health", name: "Sistem Sağlığı", category: "general", columns: [{ key: "metric", label: "Metrik", type: "string" }, { key: "value", label: "Değer", type: "string" }, { key: "status", label: "Durum", type: "string" }] },
  { id: "api-token-usage", name: "API Token Kullanımı", category: "general", columns: [{ key: "tokenName", label: "Token", type: "string" }, { key: "lastUsed", label: "Son Kullanım", type: "date" }, { key: "isRevoked", label: "İptal", type: "boolean" }] },
  { id: "role-distribution", name: "Rol Dağılımı", category: "general", columns: [{ key: "role", label: "Rol", type: "string" }, { key: "userCount", label: "Kullanıcı Sayısı", type: "number" }] },
  { id: "organization-summary", name: "Organizasyon Özeti", category: "general", columns: [{ key: "metric", label: "Metrik", type: "string" }, { key: "value", label: "Değer", type: "number" }] },
];

export function getReportsByCategory() {
  const grouped: Record<string, ReportDefinition[]> = {};
  for (const report of builtInReports) {
    if (!grouped[report.category]) grouped[report.category] = [];
    grouped[report.category].push(report);
  }
  return grouped;
}

export function findReport(id: string): ReportDefinition | undefined {
  return builtInReports.find((r) => r.id === id);
}

export function runReport(
  definition: ReportDefinition,
  snapshot: AppSnapshot,
  _filters?: ReportFilter[],
): Record<string, unknown>[] {
  switch (definition.id) {
    case "stock-on-hand":
      return snapshot.stockRows.map((r) => ({
        sku: r.product.sku,
        name: r.product.name,
        warehouse: r.warehouse.name,
        onHand: r.onHand,
        minimumStock: r.minimumStock,
      }));
    case "critical-stock":
      return snapshot.criticalRows.map((r) => ({
        sku: r.product.sku,
        name: r.product.name,
        onHand: r.onHand,
        minimumStock: r.minimumStock,
        shortage: Math.max(0, r.minimumStock - r.onHand),
      }));
    case "sales-orders-summary":
      return snapshot.salesOrders.map((o) => ({
        code: o.code,
        customer: o.customerName,
        status: o.status,
        totalQuantity: o.lines.reduce((s, l) => s + l.quantity, 0),
        date: o.createdAt,
      }));
    case "purchase-orders-summary":
      return snapshot.purchaseOrders.map((o) => ({
        code: o.code,
        supplier: snapshot.suppliers.find((s) => s.id === o.supplierId)?.name ?? o.supplierId,
        status: o.status,
        totalQuantity: o.lines.reduce((s, l) => s + l.quantity, 0),
        date: o.createdAt,
      }));
    case "product-catalog":
      return snapshot.products.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitPrice: p.unitPrice,
        isActive: p.isActive,
      }));
    case "stock-movements":
      return snapshot.stockMovements.map((m) => ({
        date: m.createdAt,
        type: m.type,
        sku: snapshot.products.find((p) => p.id === m.productId)?.sku ?? m.productId,
        warehouse: snapshot.warehouses.find((w) => w.id === m.warehouseId)?.name ?? m.warehouseId,
        quantity: m.quantityChange,
        reference: m.reference ?? "",
      }));
    case "audit-log":
      return snapshot.auditLogs.map((a) => ({
        date: a.createdAt,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        summary: a.summary,
      }));
    default:
      return [];
  }
}
