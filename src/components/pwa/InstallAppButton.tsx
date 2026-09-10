import { Download, Share } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";

/**
 * Header CTA: install / add-to-home-screen when running in the browser (not as PWA).
 * Chromium can install directly via beforeinstallprompt; iOS needs manual steps.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { showInstall, ios, canNativePrompt, promptInstall } = usePwaInstall();
  const [helpOpen, setHelpOpen] = useState(false);

  if (!showInstall) return null;

  const onClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("تم تثبيت التطبيق");
      return;
    }
    if (outcome === "dismissed") return;
    // No native prompt (iOS, Firefox, or Chrome criteria not met yet)
    setHelpOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        aria-label="تثبيت التطبيق على الهاتف"
      >
        <Download className="size-3.5 shrink-0" />
        <span className="whitespace-nowrap">
          <span className="sm:hidden">تثبيت</span>
          <span className="hidden sm:inline">تثبيت التطبيق</span>
        </span>
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تثبيت الدليل على هاتفك</DialogTitle>
            <DialogDescription>
              {canNativePrompt
                ? "أضف التطبيق لشاشتك الرئيسية لفتحه بسرعة."
                : ios
                  ? "على آيفون لا يمكن التثبيت تلقائياً — اتبع الخطوات التالية."
                  : "المتصفح لم يعرض زر التثبيت التلقائي بعد. يمكنك إضافته يدوياً:"}
            </DialogDescription>
          </DialogHeader>
          {ios ? (
            <ol className="list-decimal space-y-2 pe-5 text-sm text-foreground">
              <li className="leading-relaxed">
                اضغط زر المشاركة{" "}
                <Share className="inline size-3.5 align-text-bottom text-muted-foreground" /> في
                أسفل أو أعلى Safari.
              </li>
              <li className="leading-relaxed">اختر «إضافة إلى الشاشة الرئيسية».</li>
              <li className="leading-relaxed">
                فعّل «فتح كتطبيق ويب» إن ظهر الخيار، ثم اضغط إضافة.
              </li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-2 pe-5 text-sm text-foreground">
              <li className="leading-relaxed">افتح قائمة المتصفح (⋮ أو ⋯).</li>
              <li className="leading-relaxed">
                اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».
              </li>
              <li className="leading-relaxed">أكّد التثبيت من النافذة التي تظهر.</li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
