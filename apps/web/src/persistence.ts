import type { VenueDocument } from "@openvenue/scene-schema";

export const SAVE_DELAY_MS = 2000;
export const SNAPSHOT_LIMIT = 5;
const DB_NAME = "openvenue";
const DB_VERSION = 1;

export interface VenueDatabase {
  list(): Promise<VenueDocument[]>;
  put(document: VenueDocument): Promise<void>;
  remove(projectId: string): Promise<void>;
  latestSnapshot(projectId: string): Promise<VenueDocument | null>;
  addSnapshot(document: VenueDocument): Promise<void>;
}

interface SnapshotRecord {
  key: string;
  projectId: string;
  savedAt: string;
  document: VenueDocument;
}

/** Prefer the copy whose project timestamp is later. */
export function newerDocument(
  current: VenueDocument,
  snapshot: VenueDocument | null,
): VenueDocument {
  if (!snapshot) {
    return current;
  }
  const currentTime = Date.parse(current.project.metadata.updatedAt);
  const snapshotTime = Date.parse(snapshot.project.metadata.updatedAt);
  return snapshotTime > currentTime ? snapshot : current;
}

export function createMemoryDatabase(): VenueDatabase {
  const projects = new Map<string, VenueDocument>();
  const snapshots = new Map<string, SnapshotRecord[]>();
  return {
    async list() {
      return [...projects.values()];
    },
    async put(document) {
      projects.set(document.project.id, structuredClone(document));
    },
    async remove(projectId) {
      projects.delete(projectId);
      snapshots.delete(projectId);
    },
    async latestSnapshot(projectId) {
      const records = snapshots.get(projectId) ?? [];
      return records.at(-1)?.document ?? null;
    },
    async addSnapshot(document) {
      const records = snapshots.get(document.project.id) ?? [];
      records.push({
        key: `${document.project.id}:${document.project.metadata.updatedAt}:${records.length}`,
        projectId: document.project.id,
        savedAt: document.project.metadata.updatedAt,
        document: structuredClone(document),
      });
      snapshots.set(document.project.id, records.slice(-SNAPSHOT_LIMIT));
    },
  };
}

export function openVenueDatabase(): Promise<VenueDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(createMemoryDatabase());
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("projects")) {
        database.createObjectStore("projects", { keyPath: "projectId" });
      }
      if (!database.objectStoreNames.contains("snapshots")) {
        const store = database.createObjectStore("snapshots", { keyPath: "key" });
        store.createIndex("projectId", "projectId");
      }
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open the venue database."));
    request.onsuccess = () => resolve(indexedDatabase(request.result));
  });
}

export function deleteVenueDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function indexedDatabase(database: IDBDatabase): VenueDatabase {
  return {
    list: async () => {
      const records = await transaction<ProjectRecord[]>(
        database,
        "projects",
        "readonly",
        (store) => store.getAll(),
      );
      return records.map((record) => record.document);
    },
    put: async (document) => {
      await transaction(database, "projects", "readwrite", (store) =>
        store.put({ projectId: document.project.id, document }),
      );
    },
    remove: async (projectId) => {
      await transaction(database, "projects", "readwrite", (store) => store.delete(projectId));
    },
    latestSnapshot: async (projectId) => {
      const records = await snapshotsFor(database, projectId);
      return records.at(-1)?.document ?? null;
    },
    addSnapshot: async (document) => {
      const records = await snapshotsFor(database, document.project.id);
      const next: SnapshotRecord = {
        key: `${document.project.id}:${document.project.metadata.updatedAt}:${records.length}`,
        projectId: document.project.id,
        savedAt: document.project.metadata.updatedAt,
        document,
      };
      const tx = database.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      const overflow = [...records, next].slice(0, -SNAPSHOT_LIMIT);
      for (const record of overflow) {
        store.delete(record.key);
      }
      store.put(next);
      await transactionDone(tx);
    },
  };
}

interface ProjectRecord {
  projectId: string;
  document: VenueDocument;
}

function snapshotsFor(database: IDBDatabase, projectId: string): Promise<SnapshotRecord[]> {
  return transaction(database, "snapshots", "readonly", (store) =>
    store.index("projectId").getAll(projectId),
  );
}

function transaction<T>(
  database: IDBDatabase,
  name: "projects" | "snapshots",
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const tx = database.transaction(name, mode);
  const request = run(tx.objectStore(name));
  return requestToPromise(request);
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("The venue database request failed."));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("The venue database request failed."));
    tx.onabort = () => reject(tx.error ?? new Error("The venue database request failed."));
  });
}
