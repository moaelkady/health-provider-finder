/**
 * Saved searches persistence (localStorage in Phase 1).
 */

import { useCallback, useEffect, useState } from "react";
import type { ProviderFilters } from "@/types/provider";

const STORAGE_KEY = "hpd.searches.v1";

export interface SavedSearch {
  id: string;
  label: string;
  filters: ProviderFilters;
  createdAt: string;
}

type Listener = (items: SavedSearch[]) => void;

let cache: SavedSearch[] | null = null;
const listeners = new Set<Listener>();

function read(): SavedSearch[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: SavedSearch[]) {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(items));
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);

  useEffect(() => {
    setSearches(read());
    const listener: Listener = (items) => setSearches(items);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const saveSearch = useCallback((label: string, filters: ProviderFilters) => {
    write([
      {
        id: `search-${Date.now()}`,
        label,
        filters,
        createdAt: new Date().toISOString(),
      },
      ...read(),
    ]);
  }, []);

  const removeSearch = useCallback((id: string) => {
    write(read().filter((s) => s.id !== id));
  }, []);

  return { searches, saveSearch, removeSearch };
}
