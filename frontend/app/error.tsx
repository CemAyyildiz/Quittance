'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          <div role="alert">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--teal)]">
              Something went wrong
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight tracking-tight sm:text-7xl">
              We could not load this page.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--muted)]">
              Try loading it again. If the problem continues, return home and start from
              there.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={reset} className="btn btn-primary px-7 py-3">
              Try again
            </button>
            <Link href="/" className="btn btn-outline px-7 py-3">
              Go to home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
