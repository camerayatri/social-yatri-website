"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";

import { SITE } from "@/lib/content";
import type { ConnectDoc } from "@/lib/cms/schema";
import {
  startContactForm,
  submitContact,
  type ContactFallback,
  type ContactField,
  type ContactState,
} from "@/lib/cms/actions/contact";
import BubbleButton from "@/components/effects/bubble-button";

/**
 * The booking form. Underlined fields, mono labels, nothing boxed.
 *
 * Just the form. The page around it owns the grid, the headline and the
 * direct contacts beside it.
 *
 * It posts to `submitContact` (lib/cms/actions/contact.ts), which stores the
 * enquiry for the admin's inbox and emails the studio. The fields stay
 * uncontrolled and the form is only cleared on success, so whatever goes
 * wrong, what the visitor typed is still there to send again or copy into an
 * email. On mount it fetches the signed timestamp the action wants back (the
 * page is cached, so it cannot be rendered in) and the studio's current
 * email and phone, offered if sending fails.
 */

/* Must match HONEYPOT and TOKEN in lib/cms/actions/contact.ts. */
const HONEYPOT = "sy_extra";
const TOKEN = "sy_t";

/** Used only if even the mount-time request fails: the network is down, so offer the shipped details. */
const SHIPPED: ContactFallback = { email: SITE.email, phone: SITE.phone, phoneHref: SITE.phoneHref };

/** Read-only all the way down, so the stored document and the shipped `as const` copy both fit. */
type ReadonlyDeep<T> = { readonly [K in keyof T]: ReadonlyDeep<T[K]> };

export default function ContactForm({ connect }: { connect: ReadonlyDeep<ConnectDoc> }) {
  const formRef = useRef<HTMLFormElement>(null);
  // Neither is ever shown, so neither is state: they only travel with a submission.
  const token = useRef("");
  const contacts = useRef<ContactFallback>(SHIPPED);

  useEffect(() => {
    startContactForm()
      .then((start) => {
        token.current = start.token;
        contacts.current = start.fallback;
      })
      .catch(() => {});
  }, []);

  /*
   * A request that never reaches the server (offline, a deploy in between)
   * throws on the client. It becomes the same failure the server would have
   * sent, so the visitor still sees the email and phone instead of an error
   * boundary.
   */
  const [state, dispatch, pending] = useActionState<ContactState, FormData>(async (previous, formData) => {
    try {
      const result = await submitContact(previous, formData);
      // A stale or missing timestamp comes back replaced, ready for the next press.
      if (result.status === "retry" && result.token) token.current = result.token;
      return result;
    } catch {
      return { status: "failed", fallback: contacts.current };
    }
  }, { status: "idle" });

  // A success clears the fields; a field turned back gets the focus, so the fix starts there.
  useEffect(() => {
    if (state.status === "sent") formRef.current?.reset();
    if (state.status === "invalid") {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // One submission at a time: a second press while sending would queue a duplicate.
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.set(TOKEN, token.current);
    startTransition(() => dispatch(data));
  };

  const errors: Partial<Record<ContactField, string>> = state.status === "invalid" ? state.fieldErrors : {};
  const sent = state.status === "sent";

  // 16px floor: iOS Safari zooms into any field set smaller than that.
  const field =
    "rule focus:border-accent w-full border-b bg-transparent py-[0.7em] text-[max(16px,1.0625em)] transition-colors duration-300 outline-none";
  // A field the server turned back keeps its underline in the accent until it is fixed.
  const fieldClass = (name: ContactField) => `${field}${errors[name] ? " border-accent" : ""}`;

  const autocomplete: Record<string, string> = {
    name: "name",
    company: "organization",
    phone: "tel",
    email: "email",
  };

  const error = (name: ContactField) =>
    errors[name] ? (
      <p id={`${name}-error`} className="label-xs mt-[0.6em]">
        {errors[name]}
      </p>
    ) : null;

  const fallback = state.status === "failed" || state.status === "limited" ? state.fallback : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} aria-busy={pending || undefined}>
      <div className="grid grid-cols-2 gap-x-[1.5em] max-mobile:grid-cols-1">
        {connect.fields.map((entry) => (
          <div
            key={entry.name}
            // The one field with room to write takes the whole row.
            className={`mb-[1.5em] ${entry.name === "need" ? "col-span-2 max-mobile:col-span-1" : ""}`}
          >
            <label
              htmlFor={entry.name}
              className="label mb-[0.4em] block opacity-60"
            >
              {entry.label}
              {entry.required ? <span className="text-accent"> *</span> : null}
            </label>
            <input
              id={entry.name}
              name={entry.name}
              type={entry.type}
              required={entry.required}
              placeholder={
                "placeholder" in entry ? entry.placeholder : undefined
              }
              autoComplete={autocomplete[entry.name] ?? "off"}
              aria-invalid={errors[entry.name] ? true : undefined}
              aria-describedby={errors[entry.name] ? `${entry.name}-error` : undefined}
              className={fieldClass(entry.name)}
            />
            {error(entry.name)}
          </div>
        ))}
      </div>

      <div className="mb-[2em]">
        <label htmlFor="message" className="label mb-[0.4em] block opacity-60">
          {connect.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${fieldClass("message")} resize-none`}
        />
        {error("message")}
      </div>

      {/*
        The honeypot. Off screen rather than display:none (some bots skip
        fields that are not rendered), out of the tab order, hidden from
        assistive technology, and named so that no autofill fills it in.
      */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT}>Leave this field empty</label>
        <input id={HONEYPOT} name={HONEYPOT} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {/*
        The bubble draws its own arrow, so the label drops the one in the copy.
        While sending, the fieldset disables the button and it dims; `contents`
        keeps the fieldset out of the layout.
      */}
      <fieldset
        disabled={pending}
        className={`contents [&_.btn-bubble-arrow]:transition-opacity [&_.btn-bubble-arrow]:duration-300 ${pending ? "[&_.btn-bubble-arrow]:cursor-wait [&_.btn-bubble-arrow]:opacity-50" : ""}`}
      >
        <BubbleButton type="submit" invert>
          {pending ? "Sending…" : connect.submit.replace(" →", "")}
        </BubbleButton>
      </fieldset>

      {/* One live region, present from first render, so the confirmation is announced. */}
      <div
        role="status"
        aria-live="polite"
        className="mt-[1.5em] min-h-[1.5em]"
      >
        {sent ? (
          <>
            <p className="statement text-[1.25em]">{connect.confirmed}</p>
            <p className="label mt-[0.5em] opacity-60">
              {connect.confirmedSub}
            </p>
          </>
        ) : state.status === "retry" ? (
          <p className="label opacity-60">Please press send once more.</p>
        ) : state.status === "invalid" ? (
          <p className="label opacity-60">Please check the fields marked above.</p>
        ) : fallback ? (
          <>
            <p className="statement text-[1.25em]">
              {state.status === "limited" ? "We can’t take more messages from here just now." : "Your message didn’t send."}
            </p>
            <p className="mt-[0.75em] max-w-[30em] text-[0.9375em] leading-[1.4] opacity-70">
              It’s still in the form. Email{" "}
              <a href={`mailto:${fallback.email}`} className="underline underline-offset-[0.2em] hover:text-accent">
                {fallback.email}
              </a>{" "}
              or call{" "}
              <a href={fallback.phoneHref} className="whitespace-nowrap underline underline-offset-[0.2em] hover:text-accent">
                {fallback.phone}
              </a>
              {state.status === "failed" ? ", or try again in a moment." : "."}
            </p>
          </>
        ) : null}
      </div>
    </form>
  );
}
