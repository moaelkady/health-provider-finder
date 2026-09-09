/**
 * Favorites persistence.
 *
 * Phase 1 uses localStorage behind a small store so it can be swapped for
 * backend persistence later without touching components.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "hpd.favorites.v1";

type Listener = (ids: string[]) => void;

let cache: string[] | null = null;
const listeners = new Set<Listener>();

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable — keep in-memory */
  }
  listeners.forEach((listener) => listener(ids));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(read());
    const listener: Listener = (ids) => setFavorites(ids);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);

  return { favorites, favoriteIds, toggleFavorite, isFavorite };
}
