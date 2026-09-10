import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GateProps {
  onSubmitKey: (key: string) => void;
}

/**
 * Puzzle gate — no hints about Maps / Atlas until after a valid key.
 */
export function AtlasGate({ onSubmitKey }: GateProps) {
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      return;
    }
    onSubmitKey(trimmed);
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c1214] px-4">
      <AtlasAtmosphere />

      <form
        onSubmit={onSubmit}
        className={cn(
          "relative z-10 w-full max-w-md space-y-8 text-center",
          shake && "motion-safe:animate-[atlas-shake_0.4s_ease-in-out]",
        )}
      >
        <div className="space-y-3">
          <p className="text-[11px] font-medium tracking-[0.35em] text-[#5a7a82] uppercase">
            · · ·
          </p>
          <h1 className="text-balance text-2xl font-semibold leading-relaxed text-[#e8eef0] sm:text-3xl">
            إذا كنت مخوّلاً بالدخول إلى هذه الصفحة، أدخل المفتاح الصحيح
          </h1>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 border-[#2a3c42] bg-[#121a1d]/90 text-center text-[#e8eef0] placeholder:text-[#4a6068] focus-visible:ring-[#3d6b78]"
            dir="ltr"
            aria-label="المفتاح"
          />
          <Button
            type="submit"
            className="h-11 w-full bg-[#2d6b7a] text-[#f2f7f8] hover:bg-[#3a7f90]"
          >
            دخول
          </Button>
        </div>
      </form>

      <AtlasKeyframes />
    </div>
  );
}

interface CheckProps {
  phase: "loading" | "denied";
  /** Fired when the denied countdown hits 0 (parent should hard-redirect). */
  onDeniedDone?: () => void;
}

export function AtlasKeyCheck({ phase, onDeniedDone }: CheckProps) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (phase !== "denied") return;
    setSeconds(5);
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "denied" && seconds === 0) {
      onDeniedDone?.();
    }
  }, [phase, seconds, onDeniedDone]);

  if (phase === "denied") {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c1214] px-4">
        <AtlasAtmosphere />
        <div className="relative z-10 max-w-md space-y-6 text-center">
          <p className="text-balance text-xl font-semibold leading-relaxed text-[#e8eef0] sm:text-2xl">
            يا نينجا المفتاح… غلط. المكان مش ليك 😄
          </p>
          <p
            className="font-mono text-3xl tabular-nums tracking-widest text-[#5a7a82]"
            dir="ltr"
          >
            {seconds}
          </p>
        </div>
        <AtlasKeyframes />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0c1214] px-4">
      <AtlasAtmosphere />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div
          aria-hidden
          className="relative h-16 w-16 motion-safe:animate-[atlas-orb_2.4s_ease-in-out_infinite]"
        >
          <div className="absolute inset-0 rounded-full bg-[#2d6b7a]/35 blur-xl" />
          <div className="absolute inset-2 rounded-full border border-[#5a9aaa]/40 bg-[#1a3038]/80 shadow-[0_0_40px_rgba(45,107,122,0.35)]" />
          <div className="absolute inset-[18px] rounded-full bg-[#7ec8d4]/70 motion-safe:animate-[atlas-pulse_1.6s_ease-in-out_infinite]" />
        </div>
        <p className="text-[11px] font-medium tracking-[0.4em] text-[#5a7a82] uppercase">
          · · ·
        </p>
      </div>
      <AtlasKeyframes />
    </div>
  );
}

function AtlasAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 motion-safe:animate-[atlas-mist_18s_ease-in-out_infinite_alternate]"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(45, 107, 122, 0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 70% 80%, rgba(180, 120, 60, 0.08), transparent 50%), radial-gradient(ellipse 50% 30% at 20% 70%, rgba(30, 60, 70, 0.35), transparent 45%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0c1214_72%)]"
      />
    </>
  );
}

function AtlasKeyframes() {
  return (
    <style>{`
      @keyframes atlas-mist {
        from { opacity: 0.65; transform: scale(1); }
        to { opacity: 0.95; transform: scale(1.06); }
      }
      @keyframes atlas-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        75% { transform: translateX(6px); }
      }
      @keyframes atlas-orb {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.08); opacity: 1; }
      }
      @keyframes atlas-pulse {
        0%, 100% { opacity: 0.45; transform: scale(0.92); }
        50% { opacity: 1; transform: scale(1); }
      }
    `}</style>
  );
}
