-- CreateMaterializedView: stock_on_hand
-- Replaces the in-memory filter().reduce() pattern with a database-level aggregate.
-- Refresh after every stock mutation via REFRESH MATERIALIZED VIEW CONCURRENTLY.

CREATE MATERIALIZED VIEW stock_on_hand AS
SELECT
  "organizationId",
  "productId",
  "warehouseId",
  SUM("quantityChange")   AS on_hand,
  COUNT(*)                 AS movement_count,
  MAX("createdAt")         AS last_movement_at
FROM "StockMovement"
GROUP BY "organizationId", "productId", "warehouseId";

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_stock_on_hand_pk
  ON stock_on_hand ("organizationId", "productId", "warehouseId");

-- Fast lookups per org
CREATE INDEX idx_stock_on_hand_org
  ON stock_on_hand ("organizationId");

-- Function to refresh the materialized view (called after stock mutations)
CREATE OR REPLACE FUNCTION refresh_stock_on_hand()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY stock_on_hand;
END;
$$ LANGUAGE plpgsql;
