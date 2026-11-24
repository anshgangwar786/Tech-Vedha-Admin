"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lead } from "@/app/types/lead";
import { Label } from "../ui/label";
import { FieldError, cleanPhoneInput } from "./FieldError";
import { validateLeadFields } from "@/utils/leadForm";
import { SheetFooter } from "../ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface EditLeadFormProps {
  lead: Lead;
  onSave: (lead: Lead) => Promise<void> | void;
}

export default function EditLeadForm({ lead, onSave }: EditLeadFormProps) {
  const [form, setForm] = useState<Lead>(lead);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Only fields the admin changed are checked (same as the API), so an older lead saved under looser
  // rules can still have its status or source updated.
  const check = (values: Lead) =>
    validateLeadFields(
      Object.fromEntries(
        (["name", "email", "phoneNo"] as const)
          .filter((field) => values[field] !== lead[field])
          .map((field) => [field, values[field]]),
      ),
      true,
    );

  const handleChange = (field: keyof Lead, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (errors[field]) {
      setErrors((prev) => {
        const rest = { ...prev };
        const error = check(next)[field];
        if (error) rest[field] = error;
        else delete rest[field];
        return rest;
      });
    }
  };

  const save = async () => {
    const found = check(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNo: form.phoneNo.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  const invalid = (field: "name" | "email" | "phoneNo") =>
    errors[field] ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` } : {};

  return (
    <div className="mt-6 space-y-4 p-3">
      {/* NAME */}
      <div className="space-y-2">
        <Label className="text-foreground-light" htmlFor="name">Name</Label>
        <Input
          id="name"
          maxLength={100}
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          {...invalid("name")}
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      {/* EMAIL */}
      <div className="space-y-2">
        <Label className="text-foreground-light" htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          maxLength={191}
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          {...invalid("email")}
        />
        <FieldError id="email-error" message={errors.email} />
      </div>

      {/* PHONE */}
      <div className="space-y-2">
        <Label className="text-foreground-light" htmlFor="phoneNo">Phone</Label>
        <Input
          id="phoneNo"
          type="tel"
          inputMode="tel"
          maxLength={16}
          placeholder="98765 43210"
          value={form.phoneNo}
          onChange={(e) => handleChange("phoneNo", cleanPhoneInput(e.target.value))}
          {...invalid("phoneNo")}
        />
        <FieldError id="phoneNo-error" message={errors.phoneNo} />
      </div>

      {/* SOURCE */}
      <div className="space-y-2">
        <Label className="text-foreground-light" htmlFor="leadSource">Source</Label>
        <Select
          value={form.leadSource ?? "Website"}
          onValueChange={(value) => handleChange("leadSource", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Social Media">Social Media</SelectItem>
            <SelectItem value="Email Campaign">Email Campaign</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* STATUS */}
      <div className="space-y-2">
        <Label className="text-foreground-light" htmlFor="status">Status</Label>
        <Select
          value={form.status}
          onValueChange={(value) => handleChange("status", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <SheetFooter>
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="w-full cursor-pointer"
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </SheetFooter>
    </div>
  );
}
