import type { SetupDraft } from "./setup-data";

let database: Promise<IDBDatabase> | undefined;

function openDrafts() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("fides-website-setup", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Website draft storage is busy."));
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

export async function loadSetupDraft(key: string): Promise<SetupDraft | undefined> {
  const db = await openDrafts();
  return new Promise((resolve, reject) => {
    const request = db.transaction("drafts").objectStore("drafts").get(key);
    request.onsuccess = () => resolve(request.result as SetupDraft | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSetupDraft(key: string, draft: SetupDraft) {
  const db = await openDrafts();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    transaction.objectStore("drafts").put(draft, key);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
