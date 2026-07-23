import Link from "next/link";

/**
 * Shared site footer. Carries the brand line plus links to the public legal
 * pages, so it can be reused across the landing page and the legal pages.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-base-200">
      <div className="container mx-auto flex flex-col items-center gap-3 px-1 py-6 text-sm text-base-content/60 sm:flex-row sm:justify-between">
        <span className="text-center sm:text-left">
          © Tora-Chain — Secure, verifiable, blockchain-backed voting.
        </span>
        <nav className="flex items-center gap-4">
          <Link
            href="/legal/terms-and-conditions"
            className="transition-colors hover:text-base-content"
          >
            Terms &amp; Conditions
          </Link>
          <Link
            href="/legal/privacy-policy"
            className="transition-colors hover:text-base-content"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
