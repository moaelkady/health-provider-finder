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
 * Chromium can install directly via beforeinstallprompt; iOS / Mac Safari need manual steps.
 */
export function InstallAppButton({ className }: { className?: string }) {
  const { showInstall, ios, macSafari, canNativePrompt, promptInstall } = usePwaInstall();
  const [helpOpen, setHelpOpen] = useState(false);

  if (!showInstall) return null;

  const onClick = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("تم تثبيت التطبيق");
      return;
    }
    if (outcome === "dismissed") return;
    // No native prompt (iOS, Mac Safari, Firefox, or Chrome criteria not met yet)
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
        aria-label="تثبيت التطبيق"
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
            <DialogTitle>
              {macSafari ? "تثبيت الدليل على جهازك" : "تثبيت الدليل على هاتفك"}
            </DialogTitle>
            <DialogDescription>
              {canNativePrompt
                ? "أضف التطبيق لشاشتك الرئيسية لفتحه بسرعة."
                : ios
                  ? "على آيفون لا يمكن التثبيت تلقائياً — اتبع الخطوات التالية."
                  : macSafari
                    ? "على Mac عبر Safari، أضف التطبيق إلى الـ Dock يدوياً:"
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
          ) : macSafari ? (
            <ol className="list-decimal space-y-2 pe-5 text-sm text-foreground">
              <li className="leading-relaxed">
                من شريط القائمة اختر <span className="font-medium">File</span> ثم{" "}
                <span className="font-medium">Add to Dock…</span>
              </li>
              <li className="leading-relaxed">أكّد الإضافة إلى الـ Dock.</li>
              <li className="leading-relaxed">
                افتح التطبيق من الـ Dock مرة واحدة ليُحفظ كتثبيت على الجهاز.
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
