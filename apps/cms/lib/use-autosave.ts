"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autoguardado en dos capas para el editor:
 *
 * 1. Respaldo local (localStorage) SIEMPRE que haya cambios: sobrevive a
 *    cortes de red, cierres de pestaña y apagones del equipo.
 * 2. Sincronización con el servidor solo si la página provee `serverSave`
 *    (posts existentes en DRAFT): mantener un PUBLISHED al día en silencio
 *    cambiaría el blog sin que el autor lo pida.
 *
 * El respaldo local se escribe primero y se borra cuando el servidor
 * confirma; mientras no haya confirmación, la copia queda como recuperable.
 */

const PREFIX = "cms:draft:";

export interface LocalDraft<T> {
  savedAt: string;
  payload: T;
}

function storageKeyOf(key: string): string {
  return `${PREFIX}${key}`;
}

/** Lee la copia local de un documento; null si no hay o está corrupta. */
export function readLocalDraft<T>(key: string): LocalDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(storageKeyOf(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft<T>;
    if (
      !parsed ||
      typeof parsed.savedAt !== "string" ||
      !("payload" in parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Borra la copia local de un documento (tras guardar o al descartarla). */
export function clearLocalDraft(key: string): void {
  try {
    window.localStorage.removeItem(storageKeyOf(key));
  } catch {
    // localStorage puede fallar en modo incógnito estricto: se ignora.
  }
}

function writeLocalDraft<T>(key: string, payload: T): string | null {
  const savedAt = new Date().toISOString();
  try {
    window.localStorage.setItem(
      storageKeyOf(key),
      JSON.stringify({ savedAt, payload }),
    );
    return savedAt;
  } catch {
    return null;
  }
}

export type AutosaveState = "clean" | "saving" | "saved" | "backup";

export interface AutosaveHandle {
  state: AutosaveState;
  savedAt: string | null;
  /** Tras un guardado manual: fija la línea base y limpia la copia local. */
  markSaved: (payload: unknown) => void;
}

export function useAutosave<T>({
  storageKey,
  ready,
  snapshot,
  serverSave,
  canServerSave,
  intervalMs = 15000,
}: {
  /** Clave estable del documento (p. ej. `post:<id>` o `new`). */
  storageKey: string;
  /** false mientras el documento carga: no se guarda nada hasta estar listo. */
  ready: boolean;
  /** Payload actual; se lee en cada tick, así siempre ve lo último tecleado. */
  snapshot: () => T;
  /** PATCH al servidor; ausente = solo respaldo local. */
  serverSave?: (payload: T) => Promise<void>;
  /** Valida el payload para el servidor (p. ej. título y contenido no vacíos). */
  canServerSave?: () => boolean;
  intervalMs?: number;
}): AutosaveHandle {
  const [state, setState] = useState<AutosaveState>("clean");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const snapshotRef = useRef(snapshot);
  const serverSaveRef = useRef(serverSave);
  const canServerSaveRef = useRef(canServerSave);
  const readyRef = useRef(ready);
  const busyRef = useRef(false);
  const localFingerprintRef = useRef<string | null>(null);
  const serverFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
    serverSaveRef.current = serverSave;
    canServerSaveRef.current = canServerSave;
    readyRef.current = ready;
  });

  // Al cargar el documento se fija la línea base SIN escribir nada: un post
  // recién abierto no genera respaldo hasta que algo cambie de verdad.
  useEffect(() => {
    if (!ready) {
      localFingerprintRef.current = null;
      serverFingerprintRef.current = null;
      return;
    }
    const baseline = JSON.stringify(snapshotRef.current());
    localFingerprintRef.current = baseline;
    serverFingerprintRef.current = baseline;
    setState("clean");
    setSavedAt(null);
  }, [ready, storageKey]);

  /** Escribe el respaldo local si hay algo nuevo; no toca el servidor. */
  const persistLocal = useCallback(() => {
    if (!readyRef.current || busyRef.current) return;
    const payload = snapshotRef.current();
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === localFingerprintRef.current) return;
    const time = writeLocalDraft(storageKey, payload);
    if (time) {
      localFingerprintRef.current = fingerprint;
      setState("backup");
      setSavedAt(time);
    }
  }, [storageKey]);

  const persist = useCallback(async () => {
    if (!readyRef.current || busyRef.current) return;

    const payload = snapshotRef.current();
    const fingerprint = JSON.stringify(payload);
    const dirtyLocal = fingerprint !== localFingerprintRef.current;
    const dirtyServer =
      Boolean(serverSaveRef.current) &&
      fingerprint !== serverFingerprintRef.current &&
      (canServerSaveRef.current?.() ?? true);

    if (!dirtyLocal && !dirtyServer) return;
    busyRef.current = true;

    try {
      if (dirtyLocal) {
        const time = writeLocalDraft(storageKey, payload);
        if (time) {
          localFingerprintRef.current = fingerprint;
          setState("backup");
          setSavedAt(time);
        }
      }

      if (dirtyServer && serverSaveRef.current) {
        setState("saving");
        try {
          await serverSaveRef.current(payload);
          // Confirmado en servidor: la copia local ya no aporta.
          serverFingerprintRef.current = fingerprint;
          localFingerprintRef.current = fingerprint;
          clearLocalDraft(storageKey);
          setState("saved");
          setSavedAt(new Date().toISOString());
        } catch {
          // Sin confirmación: el fingerprint de servidor queda pendiente y se
          // reintenta en el siguiente tick; el respaldo local ya está escrito.
          setState("backup");
        }
      }
    } finally {
      busyRef.current = false;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      void persist();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [ready, intervalMs, persist]);

  // Respaldo local con retardo corto tras la última edición: si el equipo se
  // apaga de golpe (sin pagehide), lo escrito pierde como mucho ~2 s en lugar
  // de la ventana completa del intervalo. Cada render reinicia el temporizador.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(persistLocal, 2000);
    return () => window.clearTimeout(timer);
  });

  // Cierre/ocultado de la pestaña: una última escritura local para no perder
  // lo tecleado entre ticks (pagehide cubre cierre y navegación).
  useEffect(() => {
    function flush() {
      if (!readyRef.current) return;
      const payload = snapshotRef.current();
      const fingerprint = JSON.stringify(payload);
      if (fingerprint === localFingerprintRef.current) return;
      const time = writeLocalDraft(storageKey, payload);
      if (time) {
        localFingerprintRef.current = fingerprint;
        setState("backup");
        setSavedAt(time);
      }
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey]);

  const markSaved = useCallback(
    (payload: unknown) => {
      const fingerprint = JSON.stringify(payload);
      localFingerprintRef.current = fingerprint;
      serverFingerprintRef.current = fingerprint;
      clearLocalDraft(storageKey);
      setState("clean");
      setSavedAt(null);
    },
    [storageKey],
  );

  return { state, savedAt, markSaved };
}
