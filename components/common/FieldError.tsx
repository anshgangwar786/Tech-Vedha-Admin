/** The validation message under a dashboard form field. Renders nothing when there's no error. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

/** Leaves only what a phone number can contain while typing: digits, and "+", spaces, "-" for "+91 98765-43210". */
export const cleanPhoneInput = (value: string) => value.replace(/[^\d+\s-]/g, "").slice(0, 16);
