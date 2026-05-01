// Simple IndexedDB implementation for Sync Queue
const DB_NAME = "StockOpsOfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "syncQueue";

export interface SyncAction {
  id: string; // idempotency key
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body: any;
  status: "PENDING" | "SYNCING" | "FAILED";
  retryCount: number;
  timestamp: number;
}

export function initSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function queueAction(action: Omit<SyncAction, "status" | "retryCount" | "timestamp">) {
  const db = await initSyncDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const fullAction: SyncAction = {
    ...action,
    status: "PENDING",
    retryCount: 0,
    timestamp: Date.now(),
  };

  store.put(fullAction);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      // Trigger sync event if online
      if (navigator.onLine) {
        processSyncQueue().catch(console.error);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingActions(): Promise<SyncAction[]> {
  const db = await initSyncDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result.sort((a, b) => a.timestamp - b.timestamp));
    request.onerror = () => reject(request.error);
  });
}

export async function processSyncQueue() {
  if (!navigator.onLine) return;

  const actions = await getPendingActions();
  const pending = actions.filter((a) => a.status === "PENDING" || a.status === "FAILED");

  if (pending.length === 0) return;

  const db = await initSyncDB();

  for (const action of pending) {
    try {
      // Mark syncing
      const txStart = db.transaction(STORE_NAME, "readwrite");
      txStart.objectStore(STORE_NAME).put({ ...action, status: "SYNCING" });

      // Execute request with idempotency key
      const res = await fetch(action.url, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": action.id, // Phase 9 harden offline sync
        },
        body: JSON.stringify(action.body),
      });

      if (res.ok || res.status === 409) {
        // 409 could mean already processed via idempotency
        const txEnd = db.transaction(STORE_NAME, "readwrite");
        txEnd.objectStore(STORE_NAME).delete(action.id);
      } else {
        throw new Error(`Sync failed with status ${res.status}`);
      }
    } catch (error) {
      console.error("Sync action failed", error);
      const txFail = db.transaction(STORE_NAME, "readwrite");
      txFail.objectStore(STORE_NAME).put({
        ...action,
        status: "FAILED",
        retryCount: action.retryCount + 1,
      });
    }
  }
}

// Setup listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    processSyncQueue().catch(console.error);
  });
}