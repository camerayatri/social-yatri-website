"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";

import type { ConnectDoc } from "@/lib/cms/schema";
import {
  startContactForm,
  submitContact,
  type ContactFallback,
  type ContactField,
  type ContactState,
} from "@/lib/cms/actions/contact";
import { HONEYPOT, MAX_LENGTH, MIN_FILL_MS, TOKEN, tooLong } from "@/lib/cms/contact-rules";
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
 * email.
 *
 * The action wants back a signed timestamp at least a few seconds old (the
 * page is cached, so it cannot be rendered in; it is fetched on mount). Every
 * way that can go wrong for a person is handled here rather than handed to
 * them: a timestamp too fresh is waited out, one that is missing (the fetch
 * failed) is fetched on the press, and one the server refuses comes back
 * replaced and is sent again once by itself. "Press send once more" is only
 * ever shown if even that fails.
 */

/** A timestamp, and when this browser received it, by its own clock. */
type Stamp = { value: string; at: number };

/**
 * After this long, a form coming back into view (a tab left open overnight, a
 * page restored from the back/forward cache) fetches a fresh timestamp. Well
 * inside the server's day, so a long-open tab never sends a stale one.
 */
const REFRESH_AFTER_MS = 60 * 60 * 1000;
/** Margin over the server's minimum, for the time the request takes to arrive. */
const MIN_WAIT_MS = MIN_FILL_MS + 300;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until a timestamp is old enough to be accepted. */
const ripen = (stamp: Stamp) => sleep(Math.max(0, stamp.at + MIN_WAIT_MS - Date.now()));

const IDLE: ContactState = { status: "idle" };

/** What the form shows: the last result, numbered so a repeat of the same one is still news. */
type Shown = ContactState & { n: number };

/** Read-only all the way down, so the stored document and the shipped `as const` copy both fit. */
type ReadonlyDeep<T> = { readonly [K in keyof T]: ReadonlyDeep<T[K]> };

type Props = {
  connect: ReadonlyDeep<ConnectDoc>;
  /** The studio's email and phone from the page's content, offered if the form cannot send. */
  contacts: ContactFallback;
};

export default function ContactForm({ connect, contacts }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  // Never shown, so not state: it only travels with a submission.
  const stamp = useRef<Stamp | null>(null);
  const fetching = useRef<Promise<Stamp | null> | null>(null);
  // Set the moment a press is accepted, before React has re-rendered with `pending`.
  const sending = useRef(false);

  /** One request at a time; resolves to null if it failed. */
  const fetchStamp = () =>
    (fetching.current ??= startContactForm()
      .then(({ token }) => (stamp.current = { value: token, at: Date.now() }))
      .catch(() => null)
      .finally(() => {
        fetching.current = null;
      }));

  useEffect(() => {
    fetchStamp();
    // Back in view after a long time away, or restored from the back/forward
    // cache, where no effect runs again: replace an old timestamp before it
    // can be sent.
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (!stamp.current || Date.now() - stamp.current.at > REFRESH_AFTER_MS) fetchStamp();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, []);

  /*
   * A request that never reaches the server (offline, a deploy in between)
   * throws on the client. It becomes the same failure the server would have
   * sent, so the visitor still sees the email and phone instead of an error
   * boundary.
   */
  const [state, dispatch, pending] = useActionState<Shown, FormData>(async (previous, formData) => {
    const n = previous.n + 1;
    try {
      // A message too long to store is turned back here, before the upload:
      // a pasted megabyte would otherwise fail on the request's size limit
      // as an unexplained "didn't send".
      if (String(formData.get("message") ?? "").length > MAX_LENGTH.message) {
        return { status: "invalid", fieldErrors: { message: tooLong(MAX_LENGTH.message) }, n };
      }

      let current = stamp.current ?? (await fetchStamp());
      if (current) {
        await ripen(current);
        formData.set(TOKEN, current.value);
      }
      // The previous state is the form's business, not the server's.
      let result = await submitContact(IDLE, formData);

      // Too quick by the server's clock, or the timestamp was missing or
      // refused and a fresh one came back: wait it out and send once more.
      if (result.status === "retry") {
        if (result.token) current = stamp.current = { value: result.token, at: Date.now() };
        if (current) {
          await ripen(current);
          formData.set(TOKEN, current.value);
          result = await submitContact(IDLE, formData);
          if (result.status === "retry" && result.token) stamp.current = { value: result.token, at: Date.now() };
        }
      }

      return { ...result, n };
    } catch {
      return { status: "failed", fallback: contacts, n };
    } finally {
      sending.current = false;
    }
  }, { ...IDLE, n: 0 });

  // A success clears the fields; a field turned back gets the focus, so the fix starts there.
  useEffect(() => {
    if (state.status === "sent") formRef.current?.reset();
    if (state.status === "invalid") {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  /*
   * Hydrated, every press comes through here: the form is sent from this
   * handler rather than by React's form action, because React resets a form
   * after every action it runs, and a failed send must leave the text where
   * it is. The `action` below is still given: it is what makes the server
   * render a form that cannot fall back to the browser's own GET submission,
   * which would put everything typed into the address bar and the server
   * logs and send nothing.
   */
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // One submission at a time: a second press while sending would queue a duplicate.
    if (sending.current || pending) return;
    sending.current = true;
    const data = new FormData(event.currentTarget);
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
    <form ref={formRef} action={dispatch} onSubmit={onSubmit} aria-busy={pending || undefined}>
      {/*
        Without JavaScript the form cannot send (its timestamp, its checks and
        the request itself all run here), so it says so where it is, with the
        two ways that always work.
      */}
      <noscript>
        <p className="mb-[2em] max-w-[30em] text-[0.9375em] leading-[1.4]">
          This form needs JavaScript to send. Email{" "}
          <a href={`mailto:${contacts.email}`} className="underline underline-offset-[0.2em]">
            {contacts.email}
          </a>{" "}
          or call{" "}
          <a href={contacts.phoneHref} className="whitespace-nowrap underline underline-offset-[0.2em]">
            {contacts.phone}
          </a>
          .
        </p>
      </noscript>

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
              {/* The field says it is required itself; the star is for the eye. */}
              {entry.required ? <span aria-hidden className="text-accent"> *</span> : null}
            </label>
            <input
              id={entry.name}
              name={entry.name}
              type={entry.type}
              required={entry.required}
              maxLength={MAX_LENGTH[entry.name]}
              placeholder={
                "placeholder" in entry ? entry.placeholder : undefined
              }
              autoComplete={autocomplete[entry.name] ?? "off"}
              // An address and a number are not words to correct.
              spellCheck={entry.type === "email" || entry.type === "tel" ? false : undefined}
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
        {/*
          No `maxLength` here: it would cut a long paste off without a word.
          Over the limit is turned back with the reason instead (above).
        */}
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
        assistive technology, and named so that no autofill fills it in. The
        data attributes ask the password managers that read them (1Password,
        LastPass, Bitwarden, Dashlane) to leave it alone too: a person whose
        autofill filled it would be thanked and their enquiry dropped.
      */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={HONEYPOT}>Leave this field empty</label>
        <input
          id={HONEYPOT}
          name={HONEYPOT}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
        />
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

      {/*
        One live region, present from first render, so the outcome is
        announced. Its content is keyed on the result's number, so a second
        enquiry's identical "thank you" is a new node and is read out again.
      */}
      <div
        role="status"
        aria-live="polite"
        className="mt-[1.5em] min-h-[1.5em]"
      >
        <div key={state.n}>
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
      </div>
    </form>
  );
}
