"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/lib/cms/actions/auth";
import { TextField } from "./fields/text-field";
import { Button, Notice } from "./ui";

export default function LoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? <Notice tone="error">{state.error}</Notice> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label="Email" name="email" type="email" autoComplete="username" required inputMode="email" />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" variant="primary" disabled={pending || disabled} className="mt-2 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
