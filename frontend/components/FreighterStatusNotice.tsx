import { FREIGHTER_INSTALL_URL } from '@/lib/freighterGuidance';

export type FreighterIssue = 'missing' | 'locked';

interface FreighterStatusNoticeProps {
  issue: FreighterIssue;
}

export default function FreighterStatusNotice({ issue }: FreighterStatusNoticeProps) {
  return (
    <p role="alert" className="text-sm leading-relaxed text-[var(--muted)]">
      {issue === 'missing' ? (
        <>
          Freighter is required to create and pay invoices.{' '}
          <a
            href={FREIGHTER_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--teal)] underline underline-offset-4 hover:text-[var(--ink)]"
          >
            Install Freighter
          </a>{' '}
          to continue.
        </>
      ) : (
        'Freighter is installed but locked or access was denied. Unlock it and approve this site, then try again.'
      )}
    </p>
  );
}
