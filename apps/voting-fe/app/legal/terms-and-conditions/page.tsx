import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Tora-Chain",
  description: "The terms governing your use of the Tora-Chain voting service.",
};

export default function TermsAndConditionsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-base-content/60">
          Last updated: 22 July 2026
        </p>
      </header>

      <p className="text-base-content/70">
        Tora-Chain is a blockchain-backed voting service. By creating an account
        or casting a ballot you agree to these terms. They are intentionally
        short: use the service honestly, and we will keep your vote secure and
        verifiable.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">1. Eligibility</h2>
        <p className="text-base-content/70">
          You may only vote in an election you are eligible for. Eligibility is
          confirmed against the registry configured for that election. Creating
          an account does not by itself grant you the right to vote.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">2. Your account</h2>
        <p className="text-base-content/70">
          You are responsible for keeping your login credentials secure and for
          activity under your account. Provide accurate information and do not
          impersonate anyone else. One person, one account.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p className="text-base-content/70">
          Do not attempt to cast more than one ballot per election, tamper with
          the ledger, disrupt the service, or access data that is not yours. The
          system is designed to detect and reject duplicate or altered votes.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">4. How your vote is recorded</h2>
        <p className="text-base-content/70">
          Each ballot is sealed and written to a tamper-evident blockchain that
          is replicated across independent nodes. Your identity is kept separate
          from the content of your ballot, so votes stay secret while remaining
          countable and independently verifiable. Once recorded, a vote cannot
          be changed.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">5. Service availability</h2>
        <p className="text-base-content/70">
          Tora-Chain is provided on an &ldquo;as is&rdquo; basis and is under
          active development. We do not guarantee uninterrupted availability and
          may change or suspend features. This deployment is a demonstration and
          should not be used for legally binding elections.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">6. Privacy</h2>
        <p className="text-base-content/70">
          Our handling of your data is described in the{" "}
          <a
            href="/legal/privacy-policy"
            className="text-primary underline underline-offset-2"
          >
            Privacy Policy
          </a>
          , which forms part of these terms.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">7. Changes</h2>
        <p className="text-base-content/70">
          We may update these terms from time to time. Continued use of the
          service after an update means you accept the revised terms.
        </p>
      </section>
    </>
  );
}
