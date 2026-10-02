"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, signOutOtherSessions, type FormState } from "@/lib/cms/actions/auth";
import { TextField } from "./fields/text-field";
import { Button, Notice } from "./ui";

/** Changing your own password. Signs out every other browser on success. */
export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex max-w-[420px] flex-col gap-4" noValidate>
      {state?.ok ? <Notice tone="success">{state.ok}</Notice> : null}
      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
      <TextField label="Current password" name="current" type="password" autoComplete="current-password" required error={state?.fieldErrors?.current} />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state?.fieldErrors?.password}
        hint="At least 12 characters. A short sentence is easier to remember than symbols."
      />
      <TextField label="New password again" name="confirm" type="password" autoComplete="new-password" required error={state?.fieldErrors?.confirm} />
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

/** Ends every session but this one, for a lost phone or a shared computer. */
export function SignOutOthersForm() {
  const [state, action, pending] = useActionState<FormState>(signOutOtherSessions, undefined);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      {state?.ok ? <Notice tone="success">{state.ok}</Notice> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing out…" : "Sign out everywhere else"}
      </Button>
    </form>
  );
}
