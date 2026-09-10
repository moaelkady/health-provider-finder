import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AtlasGate, AtlasKeyCheck } from "@/components/atlas/AtlasGate";
import { clearAtlasMapsKey, getAtlasMapsKey, setAtlasMapsKey } from "@/lib/atlas-access";

const AtlasMap = lazy(() => import("@/components/atlas/AtlasMap"));

export const Route = createFileRoute("/atlas")({
  component: AtlasPage,
  head: () => ({
    meta: [{ title: "· · ·" }],
  }),
});

type Phase = "boot" | "gate" | "checking" | "denied" | "unlocked";

function AtlasPage() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const goHomeHard = useCallback(() => {
    window.location.assign("/");
  }, []);

  const runValidation = useCallback(async (key: string) => {
    const runId = ++runIdRef.current;
    setPhase("checking");
    setMapsKey(key);

    try {
      const { validateMapsKey } = await import("@/components/atlas/validate-maps-key");
      const result = await validateMapsKey(key);
      if (runId !== runIdRef.current) return;

      if (result === "ok") {
        setAtlasMapsKey(key);
        setMapsKey(key);
        setPhase("unlocked");
      } else {
        clearAtlasMapsKey();
        setMapsKey(null);
        setPhase("denied");
      }
    } catch {
      if (runId !== runIdRef.current) return;
      clearAtlasMapsKey();
      setMapsKey(null);
      setPhase("denied");
    }
  }, []);

  useEffect(() => {
    const stored = getAtlasMapsKey();
    if (stored) {
      void runValidation(stored);
    } else {
      setPhase("gate");
    }
    return () => {
      // Invalidate in-flight validation on unmount (Strict Mode remount).
      runIdRef.current += 1;
    };
  }, [runValidation]);

  if (phase === "boot" || phase === "checking") {
    return <AtlasKeyCheck phase="loading" />;
  }

  if (phase === "denied") {
    return <AtlasKeyCheck phase="denied" onDeniedDone={goHomeHard} />;
  }

  if (phase === "gate" || !mapsKey) {
    return (
      <AtlasGate
        onSubmitKey={(key) => {
          void runValidation(key);
        }}
      />
    );
  }

  return (
    <Suspense fallback={<AtlasKeyCheck phase="loading" />}>
      <AtlasMap
        apiKey={mapsKey}
        onLock={() => {
          clearAtlasMapsKey();
          setMapsKey(null);
          setPhase("gate");
        }}
      />
    </Suspense>
  );
}
