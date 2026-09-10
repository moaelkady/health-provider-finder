import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSosContacts } from "@/hooks/useSosContacts";
import {
  isAtlasEasterAttempt,
  isAtlasEasterSecret,
  shouldMaskAtlasPhone,
} from "@/lib/atlas-access";
import { EGYPT_AMBULANCE } from "@/lib/sos";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "الإعدادات" },
      {
        name: "description",
        content: "إعدادات طوارئ SOS وجهات واتساب الموثوقة ونصائح دليل مقدمي الخدمة.",
      },
    ],
  }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const { contacts, addContact, removeContact, moveContactToTop, maxContacts } =
    useSosContacts();
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const phoneMasked = shouldMaskAtlasPhone(phone);

  const onPhoneChange = (value: string) => {
    if (isAtlasEasterSecret(value)) {
      setError(null);
      setLabel("");
      setPhone("");
      void navigate({ to: "/atlas" });
      return;
    }
    setPhone(value);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isAtlasEasterAttempt(phone) || isAtlasEasterSecret(phone)) {
      setError(null);
      setPhone("");
      return;
    }
    const message = addContact(label, phone);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setLabel("");
    setPhone("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          الإعدادات
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          طوارئ SOS، جهات واتساب الموثوقة، ونصائح استخدام الدليل.
        </p>
      </div>

      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-red-800">طوارئ SOS</h2>
        <ul className="list-disc space-y-2 pe-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            زر <span className="font-semibold text-red-700">SOS</span> أعلى الشاشة يفتح شاشة
            طوارئ فورية.
          </li>
          <li>
            يبدأ عدّ تنازلي لمدة 5 ثوانٍ. إن لم تختر شيئاً، يتصل التطبيق تلقائياً بالإسعاف{" "}
            <span className="font-semibold text-foreground" dir="ltr">
              {EGYPT_AMBULANCE}
            </span>
          </li>
          <li>
            يمكنك فوراً إرسال رسالة واتساب بالـ SOS وموقعك للجهة{" "}
            <span className="font-medium text-foreground">الأولى</span> في القائمة أدناه، أو
            الاتصال بالإسعاف يدوياً، أو إلغاء العدّ.
          </li>
          <li>
            واتساب يفتح بمحادثة جاهزة فقط — يجب أن تضغط «إرسال» داخل واتساب لإتمام الرسالة.
          </li>
          <li>تُحفظ الأرقام على هذا الجهاز فقط (لا تُرفع لخادم).</li>
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div>
          <h2 className="text-base font-semibold text-foreground">جهات واتساب الموثوقة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            حتى {maxContacts} أرقام. الجهة الأولى تُستخدم عند الضغط على واتساب في شاشة SOS.
          </p>
        </div>

        {contacts.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
            لا توجد جهات بعد. أضف رقماً لتفعيل خيار واتساب في SOS.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((contact, index) => (
              <li
                key={contact.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {contact.label}
                    {index === 0 && (
                      <span className="ms-2 text-xs font-normal text-emerald-700">
                        (الأولى)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    +{contact.phone}
                  </p>
                </div>
                {index !== 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => moveContactToTop(contact.id)}
                  >
                    اجعلها الأولى
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label={`حذف ${contact.label}`}
                  onClick={() => removeContact(contact.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form className="space-y-3 border-t border-border pt-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="sos-label">الاسم</Label>
            <Input
              id="sos-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: أمي، زوجي، صديق"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sos-phone">رقم واتساب</Label>
            <Input
              id="sos-phone"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="01012345678"
              type={phoneMasked ? "password" : "text"}
              inputMode={phoneMasked ? "text" : "tel"}
              autoComplete={phoneMasked ? "off" : "tel"}
              spellCheck={false}
              dir="ltr"
              className="text-start"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={contacts.length >= maxContacts}>
            إضافة جهة
          </Button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-foreground">نصائح البحث</h2>
        <ul className="list-disc space-y-2 pe-5 text-sm text-muted-foreground">
          <li>ابحث باسم مقدم الخدمة أو التخصص أو المنطقة أو العنوان.</li>
          <li>اجمع بين مربع البحث وعوامل التصفية حسب النوع والمحافظة والشبكة والخدمات.</li>
          <li>احفظ عملية البحث من الدليل لفتحها لاحقاً من «عمليات البحث».</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-foreground">شارات الشبكة</h2>
        <ul className="list-disc space-y-2 pe-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">ضمن الشبكة</span> — التغطية
            الاعتيادية للشبكة (RN).
          </li>
          <li>
            <span className="font-medium text-foreground">الشبكة المفضلة</span> — مقدمو
            الخدمة ضمن فئة GN المفضلة.
          </li>
          <li>
            <span className="font-medium text-foreground">خارج الشبكة</span> — قوائم EN
            الموسّعة؛ قد تختلف المزايا.
          </li>
          <li>
            <span className="font-medium text-foreground">نشط</span> مقابل{" "}
            <span className="font-medium text-foreground">قيد التفعيل</span> يعكس حالة Pulse
            في الدليل.
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        <h2 className="text-base font-semibold text-foreground">الخرائط</h2>
        <ul className="list-disc space-y-2 pe-5 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">خرائط جوجل</span> يتيح
            البحث بالاسم والمنطقة والمحافظة، أو الفتح بالإحداثيات عند توفرها.
          </li>
        </ul>
      </section>

      <Button asChild className="h-11 w-full sm:w-auto">
        <Link to="/providers">تصفح دليل مقدمي الخدمة</Link>
      </Button>
    </div>
  );
}
