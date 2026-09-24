'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim();
const GITHUB_FEEDBACK_URL =
  'https://github.com/CemAyyildiz/Quittance/issues/new?labels=feedback&title=User%20feedback';

type Rating = 'useful' | 'ok' | 'confusing' | '';

export default function FeedbackPage() {
  const [walletUsed, setWalletUsed] = useState(false);
  const [rating, setRating] = useState<Rating>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!rating || !message.trim()) {
      toast.error('Please rate the product and leave a short note');
      return;
    }

    setSubmitting(true);
    try {
      const entry = {
        rating,
        walletUsed,
        message: message.trim(),
        at: new Date().toISOString(),
      };
      try {
        const key = 'quittance.feedback';
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        const next = Array.isArray(prev) ? [...prev, entry] : [entry];
        localStorage.setItem(key, JSON.stringify(next.slice(-50)));
      } catch {
        // Ignore quota / private mode.
      }

      const detail = [
        `Rating: ${rating}`,
        `Wallet interaction: ${walletUsed ? 'yes' : 'no'}`,
        '',
        message.trim(),
      ].join('\n');

      if (FEEDBACK_EMAIL) {
        const subject = encodeURIComponent(`Quittance feedback (${rating})`);
        const body = encodeURIComponent(detail);
        window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
        toast.success('Opening email to send feedback');
      } else {
        const url = `${GITHUB_FEEDBACK_URL}&body=${encodeURIComponent(detail)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('Opening GitHub to file feedback');
      }

      setMessage('');
      setRating('');
      setWalletUsed(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] bg-white/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl text-[var(--ink)]">
            Quittance
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="font-display text-4xl sm:text-5xl text-[var(--ink)]">Feedback</h1>
        <p className="mt-3 text-[var(--muted)] leading-relaxed max-w-lg">
          Tell us what worked after you created or paid an invoice. Short notes help us ship a
          clearer proof workflow.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <fieldset>
            <legend className="text-sm font-medium text-[var(--ink)]">How useful was Quittance?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ['useful', 'Useful'],
                  ['ok', 'OK'],
                  ['confusing', 'Confusing'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`btn ${rating === value ? 'btn-primary' : 'btn-secondary'}`}
                  aria-pressed={rating === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={walletUsed}
              onChange={(e) => setWalletUsed(e.target.checked)}
              className="mt-1"
            />
            <span>I connected Freighter and completed a wallet action (create or pay).</span>
          </label>

          <div>
            <label htmlFor="feedback-message" className="text-sm font-medium text-[var(--ink)]">
              What should we improve?
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="e.g. Proof download was clear, but verifying payment felt slow…"
              className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Opening…' : 'Send feedback'}
          </button>

          <p className="text-xs text-[var(--muted)]">
            Opens email (if configured) or a GitHub issue. A copy is also saved in this browser for
            the owner to summarize in EVIDENCE.md.
          </p>
        </form>
      </main>
    </div>
  );
}
