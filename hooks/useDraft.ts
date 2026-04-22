"use client";

import { useCallback, useEffect, useState } from "react";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "yka-editor";
const DB_VERSION = 1;
const STORE = "drafts";

export interface Draft {
  id: string;
  title: string;
  content: string; // TipTap JSON serialised as string
  updatedAt: number;
}

/* Singleton DB promise — created once per session */
let _db: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return _db;
}

export function useDraft(draftId = "default") {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* Load on mount */
  useEffect(() => {
    getDB()
      .then((db) => db.get(STORE, draftId))
      .then((saved) => {
        if (saved) setDraft(saved as Draft);
      })
      .finally(() => setIsLoading(false));
  }, [draftId]);

  const saveDraft = useCallback(
    async (data: { title: string; content: string }) => {
      const db = await getDB();
      const record: Draft = {
        id: draftId,
        title: data.title,
        content: data.content,
        updatedAt: Date.now(),
      };
      await db.put(STORE, record);
      setDraft(record);
    },
    [draftId]
  );

  const clearDraft = useCallback(async () => {
    const db = await getDB();
    await db.delete(STORE, draftId);
    setDraft(null);
  }, [draftId]);

  return { draft, saveDraft, clearDraft, isLoading };
}
