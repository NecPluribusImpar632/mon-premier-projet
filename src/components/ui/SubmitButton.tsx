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
//
// The ref must only latch when a submission is actually about to happen —
// checking form.checkValidity() first is what makes that safe. Without it, a
// click that the browser's own required-field validation blocks (e.g. no
// département picked yet) still latches the ref, and every later click,
// valid or not, gets silently preventDefault()-ed forever: the form looks
// permanently broken with zero feedback until the page is reloaded.
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
        const form = event.currentTarget.form;
        if (form && !form.checkValidity()) {
          // Native validation is about to block this submit — let the
          // browser show its own message and leave the ref untouched so a
          // corrected retry isn't silently swallowed.
          return;
        }
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
