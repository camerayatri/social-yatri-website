"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMaintainer, changeMaintainer, type MaintainerResult } from "@/lib/cms/actions/maintainers";
import type { MaintainerSummary } from "@/lib/cms/maintainers";
import { TextField } from "./fields/text-field";
import { Button, Notice, formatWhen } from "./ui";

/**
 * The maintainers page's interactive parts: adding someone (their temporary
 * password is shown once, here, to be passed on by hand), and the row
 * actions. Destructive actions ask first; the server refuses anything that
 * would leave the site with nobody able to sign in.
 */

function TempPassword({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Notice tone="success">
      <p>
        Give <strong className="font-medium">{email}</strong> this temporary password. It won&apos;t be shown again, and
        they&apos;ll be asked to choose their own after signing in.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-[6px] bg-white px-2.5 py-1.5 font-mono text-[15px] select-all">{password}</code>
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Notice>
  );
}

export function AddMaintainerForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<MaintainerResult | undefined, FormData>(addMaintainer, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="flex flex-col gap-4">
      {state && "ok" in state && state.tempPassword ? <TempPassword email={state.email!} password={state.tempPassword} /> : null}
      {state && "error" in state && !state.fieldErrors ? <Notice tone="error">{state.error}</Notice> : null}
      <form ref={formRef} action={action} className="grid gap-4 tablet:grid-cols-[1fr_1fr_auto] tablet:items-start" noValidate>
        <TextField label="Name" name="name" autoComplete="off" required error={state && "error" in state ? state.fieldErrors?.name : undefined} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          required
          error={state && "error" in state ? state.fieldErrors?.email : undefined}
        />
        <div className="tablet:pt-[22px]">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add maintainer"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MaintainerRows({ rows, meId }: { rows: MaintainerSummary[]; meId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [result, setResult] = useState<MaintainerResult | null>(null);
  const activeCount = rows.filter((r) => !r.disabled).length;

  const run = async (row: MaintainerSummary, change: "disable" | "enable" | "remove" | "reset") => {
    const questions = {
      disable: `Disable ${row.email}? They'll be signed out and can't sign in until re-enabled.`,
      enable: `Let ${row.email} sign in again?`,
      remove: `Remove ${row.email} for good? Their past changes stay in the history.`,
      reset: `Issue ${row.email} a new temporary password? Their current one stops working.`,
    };
    if (!window.confirm(questions[change])) return;
    setBusy(row.id);
    const res = await changeMaintainer(row.id, change);
    setBusy(null);
    setResult(res);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {result && "error" in result ? <Notice tone="error">{result.error}</Notice> : null}
      {result && "ok" in result && result.tempPassword ? <TempPassword email={result.email!} password={result.tempPassword} /> : null}
      <ul className="flex flex-col divide-y divide-ink/10">
        {rows.map((row) => {
          const me = row.id === meId;
          const last = !row.disabled && activeCount <= 1;
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[15px]">
                  {row.name}
                  {me ? <span className="ml-2 text-[12px] opacity-55">(you)</span> : null}
                  {row.disabled ? <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[12px]">Disabled</span> : null}
                  {row.mustChangePassword && !row.disabled ? (
                    <span className="ml-2 rounded-full bg-[#fff3cc] px-2 py-0.5 text-[12px]">Temporary password</span>
                  ) : null}
                </p>
                <p className="truncate text-[13px] opacity-60">
                  {row.email} · last signed in {formatWhen(row.lastLoginAt)}
                  {row.activeSessions ? ` · ${row.activeSessions} active session${row.activeSessions > 1 ? "s" : ""}` : ""}
                </p>
              </div>
              {me ? null : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => run(row, "reset")} disabled={busy === row.id}>
                    New password
                  </Button>
                  {row.disabled ? (
                    <Button size="sm" onClick={() => run(row, "enable")} disabled={busy === row.id}>
                      Enable
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => run(row, "disable")} disabled={busy === row.id || last}>
                      Disable
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => run(row, "remove")} disabled={busy === row.id || last}>
                    Remove
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
