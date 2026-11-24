"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldError, cleanPhoneInput } from "@/components/common/FieldError";
import { validateLeadFields } from "@/utils/leadForm";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface NewLeadPayload {
  name: string;
  email: string;
  phoneNo: string;
  status: string;
  leadSource: string;
  formData?: Record<string, string>;
}

interface Props {
  onCreate: (lead: NewLeadPayload) => Promise<void>;
}

type Field = "name" | "email" | "phoneNo" | "topic" | "status";

export default function AddLeadForm({ onCreate }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNo: "",
    topic: "",
    status: "new",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const updateField = (field: Field, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    // Once a field shows an error, re-check it as the admin types so the message clears when fixed.
    if (errors[field]) {
      setErrors((prev) => {
        const rest = { ...prev };
        const error = validateLeadFields(next)[field];
        if (error) rest[field] = error;
        else delete rest[field];
        return rest;
      });
    }
  };

  const save = async () => {
    const found = validateLeadFields(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`add-lead-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNo: form.phoneNo.trim(),
        status: form.status,
        leadSource: "Manual entry",
        formData: form.topic.trim() ? { Topic: form.topic.trim() } : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const invalid = (field: Field) =>
    errors[field] ? { "aria-invalid": true as const, "aria-describedby": `add-lead-${field}-error` } : {};

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-4 mt-2"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="add-lead-name">Name</Label>
        <Input
          id="add-lead-name"
          maxLength={100}
          autoComplete="off"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          {...invalid("name")}
        />
        <FieldError id="add-lead-name-error" message={errors.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="add-lead-email">Email</Label>
        <Input
          id="add-lead-email"
          type="email"
          maxLength={191}
          autoComplete="off"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          {...invalid("email")}
        />
        <FieldError id="add-lead-email-error" message={errors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="add-lead-phoneNo">Phone</Label>
        <Input
          id="add-lead-phoneNo"
          type="tel"
          inputMode="tel"
          maxLength={16}
          placeholder="98765 43210"
          autoComplete="off"
          value={form.phoneNo}
          onChange={(e) => updateField("phoneNo", cleanPhoneInput(e.target.value))}
          {...invalid("phoneNo")}
        />
        <FieldError id="add-lead-phoneNo-error" message={errors.phoneNo} />
        {!errors.phoneNo && (
          <p className="text-xs text-muted-foreground">10-digit Indian mobile, starting with 5, 6, 7, 8 or 9.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="add-lead-topic">Topic</Label>
        <Input
          id="add-lead-topic"
          maxLength={2000}
          placeholder="What is this lead about?"
          value={form.topic}
          onChange={(e) => updateField("topic", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select
          value={form.status}
          onValueChange={(value) => updateField("status", value)}
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

      <Button type="submit" className="w-full mt-3" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
