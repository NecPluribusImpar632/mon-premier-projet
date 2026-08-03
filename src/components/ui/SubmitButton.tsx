"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}

// Server actions have no built-in guard against a double-click or an
// impatient second click while the request is in flight — each submit
// creates a new row. useFormStatus's `pending` reflects this correctly, but
// only once React re-renders, which isn't synchronous with the click — two
// clicks fired back-to-back can both land before `disabled` commits to the
// DOM. A plain ref checked synchronously in onClick closes that gap without
// touching the button's `disabled` state directly: mutating `disabled` here
// interferes with how React dispatches the form action itself and can
// silently swallow the very first, legitimate submission.
export function SubmitButton({
  children,
  pendingLabel,
  className = `${PRIMARY_BUTTON_CLASS} mt-2`,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const submittedRef = useRef(false);

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (submittedRef.current) {
          event.preventDefault();
          return;
        }
        submittedRef.current = true;
      }}
      className={`${className} disabled:opacity-60`}
    >
      {pending ? pendingLabel ?? "Enregistrement…" : children}
    </button>
  );
}
