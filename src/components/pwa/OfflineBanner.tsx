import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-warning/30 bg-warning/15 px-4 py-2 text-center text-sm text-foreground"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WifiOff className="size-4 shrink-0 text-warning" aria-hidden />
        أنت غير متصل — يتم عرض البيانات المحفوظة
      </span>
    </div>
  );
}
