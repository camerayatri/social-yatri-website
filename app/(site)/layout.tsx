import SiteShell from "@/components/site-shell";

/**
 * Every public page sits in this group, so they share the site's chrome while
 * the admin, a sibling of the group, does not. The group adds nothing to the
 * URL: `/work` is still `/work`.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
