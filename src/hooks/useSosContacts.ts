/**
 * Trusted SOS WhatsApp contacts (localStorage).
 * First contact in the list is the primary WhatsApp target.
 */

import { useCallback, useEffect, useState } from "react";

import { SOS_MAX_CONTACTS, normalizeWhatsAppPhone } from "@/lib/sos";

const STORAGE_KEY = "hpd.sos.contacts.v1";

export interface SosContact {
  id: string;
  label: string;
  /** Digits for wa.me (no +) */
  phone: string;
}

type Listener = (items: SosContact[]) => void;

let cache: SosContact[] | null = null;
const listeners = new Set<Listener>();

function read(): SosContact[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SosContact[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: SosContact[]) {
  cache = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* keep in-memory */
  }
  listeners.forEach((listener) => listener(items));
}

export function useSosContacts() {
  const [contacts, setContacts] = useState<SosContact[]>([]);

  useEffect(() => {
    setContacts(read());
    const listener: Listener = (items) => setContacts(items);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addContact = useCallback((label: string, phoneRaw: string): string | null => {
    const phone = normalizeWhatsAppPhone(phoneRaw);
    if (!phone) return "أدخل رقم واتساب صالحاً (مثال: 01012345678).";
    const current = read();
    if (current.length >= SOS_MAX_CONTACTS) {
      return `يمكنك إضافة ${SOS_MAX_CONTACTS} جهات كحد أقصى.`;
    }
    if (current.some((c) => c.phone === phone)) {
      return "هذا الرقم مضاف مسبقاً.";
    }
    const trimmedLabel = label.trim() || "جهة موثوقة";
    write([
      ...current,
      {
        id: `sos-${Date.now()}`,
        label: trimmedLabel,
        phone,
      },
    ]);
    return null;
  }, []);

  const removeContact = useCallback((id: string) => {
    write(read().filter((c) => c.id !== id));
  }, []);

  const moveContactToTop = useCallback((id: string) => {
    const current = read();
    const target = current.find((c) => c.id === id);
    if (!target) return;
    write([target, ...current.filter((c) => c.id !== id)]);
  }, []);

  const primaryContact = contacts[0] ?? null;

  return {
    contacts,
    primaryContact,
    addContact,
    removeContact,
    moveContactToTop,
    maxContacts: SOS_MAX_CONTACTS,
  };
}
