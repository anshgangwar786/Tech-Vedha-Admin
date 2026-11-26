"use client";

// Dashboard home: the one place to change the website's email, phone and WhatsApp number. Saved into Site & Menus,
// which every page reads, so the header, phone menu, footer, Contact page, WhatsApp buttons and the enquiry
// pop-up all switch over together (and every mailto: / tel: / wa.me link uses the new details).

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, MessageCircle, Phone, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError } from "@/lib/sitePages/contactFormats";

type Settings = { email: string; phone: string; whatsappNumber: string };
const EMPTY: Settings = { email: "", phone: "", whatsappNumber: "" };

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export default function ContactSettingsCard() {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [form, setForm] = useState<Settings>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/contact-settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        if (!json.success) throw new Error(json.message);
        const settings = { ...json.settings, whatsappNumber: json.settings.whatsappNumber ? `+${json.settings.whatsappNumber}` : "" };
        setSaved(settings);
        setForm(settings);
      })
      .catch(() => alive && setError("Couldn't load the contact details."));
    return () => {
      alive = false;
    };
  }, []);

  // Same rules as the API (lib/sitePages/contactFormats.ts); shown once loaded.
  const errors: Record<keyof Settings, string | null> =
    saved === null
      ? { email: null, phone: null, whatsappNumber: null }
      : {
          email: formatError("email", form.email),
          phone: formatError("phone", form.phone),
          whatsappNumber: formatError("whatsapp", form.whatsappNumber),
        };
  const invalid = Object.values(errors).some(Boolean);

  const changed =
    saved !== null &&
    (form.email.trim() !== saved.email ||
      form.phone.trim() !== saved.phone ||
      digitsOnly(form.whatsappNumber) !== digitsOnly(saved.whatsappNumber));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/contact-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Saving failed");
      const settings = { ...json.settings, whatsappNumber: json.settings.whatsappNumber ? `+${json.settings.whatsappNumber}` : "" };
      setSaved(settings);
      setForm(settings);
      toast.success(json.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Saving failed";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof Settings) => ({
    id: `contact-${key}`,
    value: form[key],
    disabled: saved === null || saving,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `contact-${key}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const fieldError = (key: keyof Settings) =>
    errors[key] && (
      <p id={`contact-${key}-error`} className="text-xs font-medium text-destructive">
        {errors[key]}
      </p>
    );

  const whatsappInEffect = digitsOnly(form.whatsappNumber || form.phone);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>
          Used everywhere on the website: header, phone menu, footer, Contact page, WhatsApp buttons and the enquiry form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-muted-foreground" /> Email
            </Label>
            <Input type="email" placeholder="info@techvedha.tech" autoComplete="off" {...field("email")} />
            {fieldError("email")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-muted-foreground" /> Phone
            </Label>
            <Input type="tel" placeholder="+91 98765 43210" autoComplete="off" {...field("phone")} />
            {fieldError("phone")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-whatsappNumber" className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-muted-foreground" /> WhatsApp
            </Label>
            <Input type="tel" placeholder="Same as phone" autoComplete="off" {...field("whatsappNumber")} />
            {fieldError("whatsappNumber")}
          </div>
          <div className="flex flex-col gap-3 md:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-muted-foreground" role={error ? "alert" : undefined}>
              {error ? (
                <span className="text-destructive">{error}</span>
              ) : (
                <>
                  Include the country code. WhatsApp left empty uses the phone number
                  {whatsappInEffect ? ` (opens wa.me/${whatsappInEffect})` : ""}.
                </>
              )}
            </p>
            <Button type="submit" size="sm" disabled={!changed || saving || invalid} className="shrink-0">
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
              Save everywhere
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
