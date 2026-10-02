"use client";

import { useState, type FormEvent } from "react";

import { CONNECT } from "@/lib/content";
import BubbleButton from "@/components/effects/bubble-button";

/**
 * The booking form. Underlined fields, mono labels, nothing boxed.
 *
 * Just the form. The page around it owns the grid, the headline and the
 * direct contacts beside it.
 *
 * There is no endpoint behind it yet: `onSubmit` only shows the confirmation.
 * Wire it to a route handler or a form service before launch.
 */
// Placeholder for the contact-form branch, which reads `connect` instead of the constant.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ContactForm(_props: { connect?: import("@/lib/cms/schema").ConnectDoc }) {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
  };

  // 16px floor: iOS Safari zooms into any field set smaller than that.
  const field =
    "rule focus:border-accent w-full border-b bg-transparent py-[0.7em] text-[max(16px,1.0625em)] transition-colors duration-300 outline-none";

  const autocomplete: Record<string, string> = {
    name: "name",
    company: "organization",
    phone: "tel",
    email: "email",
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-x-[1.5em] max-mobile:grid-cols-1">
        {CONNECT.fields.map((entry) => (
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
              className={field}
            />
          </div>
        ))}
      </div>

      <div className="mb-[2em]">
        <label htmlFor="message" className="label mb-[0.4em] block opacity-60">
          {CONNECT.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className={`${field} resize-none`}
        />
      </div>

      {/* The bubble draws its own arrow, so the label drops the one in the copy. */}
      <BubbleButton type="submit" invert>
        {CONNECT.submit.replace(" →", "")}
      </BubbleButton>

      {/* One live region, present from first render, so the confirmation is announced. */}
      <div
        role="status"
        aria-live="polite"
        className="mt-[1.5em] min-h-[1.5em]"
      >
        {sent ? (
          <>
            <p className="statement text-[1.25em]">{CONNECT.confirmed}</p>
            <p className="label mt-[0.5em] opacity-60">
              {CONNECT.confirmedSub}
            </p>
          </>
        ) : null}
      </div>
    </form>
  );
}
