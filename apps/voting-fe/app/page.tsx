import {
  ShieldCheck,
  SearchCheck,
  Lock,
  Fingerprint,
  Activity,
  Globe,
} from "lucide-react";

import { LandingHeader } from "./components/landing-header";
import { SignInCta } from "./components/sign-in-cta";
import { SiteFooter } from "./components/site-footer";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Blockchain-backed integrity",
    description:
      "Every ballot is written to a distributed ledger across independent nodes, so results can't be quietly altered.",
  },
  {
    icon: SearchCheck,
    title: "End-to-end verifiable",
    description:
      "Independent auditors can download and re-verify the entire chain, making each election transparent from the first vote to the final tally.",
  },
  {
    icon: Lock,
    title: "Private by design",
    description:
      "Your identity is kept separate from your ballot. Votes stay secret while remaining fully countable and provably included.",
  },
  {
    icon: Fingerprint,
    title: "Flexible eligibility",
    description:
      "Elections plug into external eligibility providers — from voter registries to biometric checks — so only the right people can enrol.",
  },
  {
    icon: Activity,
    title: "Real-time & resilient",
    description:
      "A network of independent nodes replicates every ballot as it is cast, so the ledger stays available and tallies update live.",
  },
  {
    icon: Globe,
    title: "Accessible anywhere",
    description:
      "A fast, simple web experience lets eligible voters cast their ballot securely from any device, wherever they are.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-base-200">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-primary/10 to-transparent"
          />
          <div className="relative max-w-4xl mx-auto px-4 py-20 sm:py-28 text-center flex flex-col items-center gap-6">
            <span className="badge badge-outline badge-primary gap-1 rounded-full px-3 py-3 text-xs font-medium">
              Blockchain-secured elections
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
              Voting you can{" "}
              <span className="text-primary">actually trust</span>
            </h1>
            <p className="text-base sm:text-lg text-base-content/70 max-w-2xl text-pretty">
              Tora-Chain records every vote on a tamper-evident blockchain and
              lets anyone verify the outcome. Sign in to see the elections
              you&apos;re eligible for and cast your ballot with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <SignInCta size="lg" />
              <a href="#features" className="btn btn-ghost btn-lg rounded-none">
                Explore features
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="container mx-auto px-1 py-16 sm:py-20 scroll-mt-20"
        >
          <div className="max-w-2xl mx-auto text-center flex flex-col gap-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Built for trustworthy elections
            </h2>
            <p className="text-base-content/70 text-pretty">
              Everything you need to run and take part in an election that is
              secure, private, and independently verifiable.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-3 border border-base-200 bg-base-100 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold leading-snug">{title}</h3>
                <p className="text-sm text-base-content/70 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-base-200 bg-base-200/40">
          <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20 text-center flex flex-col items-center gap-5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to make your vote count?
            </h2>
            <p className="text-base-content/70 max-w-xl text-pretty">
              Sign in to view the elections you&apos;re eligible for and cast a
              secure, verifiable ballot.
            </p>
            <SignInCta size="lg" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
