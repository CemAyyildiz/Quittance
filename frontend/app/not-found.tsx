import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <div className="hero-grain" aria-hidden />

      <header className="relative z-10 border-b border-[var(--line)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link
            href="/"
            className="font-display text-2xl tracking-tight text-[var(--ink)]"
          >
            Quittance
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-5 py-16 sm:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--teal)]">
            Error 404
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight sm:text-7xl">
            This page could not be found.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--muted)]">
            The link may be incorrect or the page may have moved. Return to Quittance to
            create or manage your invoices.
          </p>
          <Link href="/" className="btn btn-primary mt-10 px-7 py-3">
            Go to home
          </Link>
        </div>
      </section>
    </main>
  );
}
