import Link from "next/link";

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-2 h-2 rounded-full bg-signal shrink-0" aria-hidden />
          <span className="font-mono text-sm tracking-wide text-paper group-hover:text-signal transition-colors">
            GrayNet
          </span>
        </Link>
        <nav className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest text-dim">
          <Link href="/#architecture" className="hover:text-paper transition-colors">
            Architecture
          </Link>
          <Link href="/#leakage" className="hover:text-paper transition-colors">
            Leakage
          </Link>
          <Link
            href="/lab"
            className="text-paper border border-line px-3 py-1.5 rounded-sm hover:border-signal hover:text-signal transition-colors"
          >
            Test models →
          </Link>
        </nav>
      </div>
    </header>
  );
}
