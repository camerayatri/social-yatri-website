/** A missing admin page, kept plain and inside the admin's own look. */
export default function CmsNotFound() {
  return (
    <main className="mx-auto max-w-[560px] px-5 py-24">
      <p className="cms-label opacity-60">404</p>
      <h1 className="statement mt-3 text-[32px]">There&apos;s nothing here.</h1>
      <p className="mt-3 opacity-70">Use the menu to get back to something that exists.</p>
    </main>
  );
}
