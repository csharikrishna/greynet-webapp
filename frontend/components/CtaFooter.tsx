import Link from "next/link";

export default function CtaFooter() {
  return (
    <>
      <section className="px-6 py-28 border-t border-line text-center">
        <div className="max-w-xl mx-auto">
          <p className="eyebrow mb-4">Future Vision</p>
          <h2 className="font-display italic text-3xl sm:text-4xl text-paper leading-tight">
            Deploy intelligent diagnostics anywhere.
          </h2>
          <Link
            href="/lab"
            className="mt-8 inline-flex items-center gap-2 bg-signal text-ink font-mono text-sm uppercase tracking-widest px-7 py-4 rounded-sm hover:bg-paper transition-colors"
          >
            Launch the Interface →
          </Link>
        </div>
      </section>
      <footer className="px-6 py-10 border-t border-line">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-dim">
          <span>GrayNet — Efficient by design, reproducible by methodology, practical by deployment.</span>
          <a
            href="https://github.com/csharikrishna/GreyNet"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-paper transition-colors"
          >
            View source →
          </a>
        </div>
      </footer>
    </>
  );
}
