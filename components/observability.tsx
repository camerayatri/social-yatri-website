"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics (page views, and the events sent with `track` from
 * `lib/analytics.ts`) and Speed Insights (the Core Web Vitals of real
 * visits), for the public site only.
 *
 * Both are Vercel's first-party scripts, served from the site's own origin
 * under `/_vercel/`: no cookies, nothing stored on the visitor's device, and
 * a visitor is told apart only by a hash of the request that rotates daily,
 * so there is no consent banner to show. Both have to be switched on in the
 * project's dashboard (Analytics, Speed Insights) before the scripts answer;
 * until then they 404 quietly and nothing is lost but the numbers.
 *
 * Mounted once in the root layout, which the admin shares, so it stands
 * itself down there. The admin's address is a secret and cannot be named in
 * code that ships to every visitor, so it goes by the admin's own frame
 * (`data-cms`, from `app/cms/layout.tsx`): on an admin page the scripts are
 * never added, and `beforeSend` drops anything sent while one is showing.
 * The admin's pages are behind a sign-in and say nothing about how the
 * public site performs.
 */
const ON_VERCEL = Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV);

const onAdmin = () => typeof document !== "undefined" && document.querySelector("[data-cms]") !== null;

function publicOnly<T>(event: T): T | null {
  return onAdmin() ? null : event;
}

export default function Observability() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Decided once the page exists: the server cannot tell an admin page from
    // a public one in a layout they share, and the scripts load after
    // hydration anyway. Only on a Vercel deployment (Vercel sets
    // NEXT_PUBLIC_VERCEL_ENV), because the scripts are served by Vercel:
    // anywhere else, `next start` included, both requests 404 and print two
    // errors on every page.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the DOM, which only exists here
    setShow(ON_VERCEL && !onAdmin());
  }, []);
  if (!show) return null;
  return (
    <>
      <Analytics beforeSend={publicOnly} />
      <SpeedInsights beforeSend={publicOnly} />
    </>
  );
}
