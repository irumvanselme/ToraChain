import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Tora-Chain",
  description:
    "What data Tora-Chain stores, and how it is protected, stored, and transferred.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-base-content/60">
          Last updated: 22 July 2026
        </p>
      </header>

      <p className="text-base-content/70">
        This policy explains, in plain terms, exactly what data Tora-Chain
        stores and how it is protected, stored, and transferred. We collect only
        what is needed to sign you in and to record a verifiable vote.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">What we store</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base-content/70">
          <li>
            <strong>Account details</strong> — your name and email address, and
            your password stored only as a one-way hash (we never keep the
            plaintext password).
          </li>
          <li>
            <strong>Session data</strong> — a session record and short-lived
            token used to keep you signed in.
          </li>
          <li>
            <strong>Eligibility</strong> — a record that links you to the
            elections you may vote in, and whether you have already voted.
          </li>
          <li>
            <strong>Your ballot</strong> — stored as a sealed value plus a
            SHA-256 commitment anchored on the blockchain. The blockchain stores
            only a voter number and that commitment —{" "}
            <strong>never the plaintext of your choice</strong>.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How it is protected</h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base-content/70">
          <li>
            Passwords are hashed; ballots are sealed (AES-GCM) before storage.
          </li>
          <li>
            Your identity is held separately from the content of your ballot, so
            a vote cannot be traced back to you.
          </li>
          <li>
            Access to voter records is gated behind authenticated, key-protected
            APIs — no service reaches directly into another&apos;s data.
          </li>
          <li>
            Every vote is written to a tamper-evident ledger, so records cannot
            be silently altered.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How it is stored</h2>
        <p className="text-base-content/70">
          Data is separated by purpose across independent databases: an identity
          store (accounts and sessions), an elections store (elections,
          eligibility, and sealed ballots), and the blockchain store
          (hash-linked blocks holding only a voter number and a ballot
          commitment). Keeping them apart limits what any single store reveals.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How it is transferred</h2>
        <p className="text-base-content/70">
          All traffic between your browser and our services travels over
          encrypted HTTPS. Signing in issues a short-lived token that your
          browser attaches to requests to prove who you are; we do not sell or
          share your data with third parties for advertising. Eligibility checks
          may contact the external registry configured for a given election
          solely to confirm you are allowed to vote.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p className="text-base-content/70">
          You can review and update your account details at any time. Note that
          because votes are recorded on an immutable ledger to guarantee
          integrity, a cast ballot cannot be deleted or altered. This deployment
          is a demonstration — please do not submit real or sensitive personal
          information.
        </p>
      </section>
    </>
  );
}
