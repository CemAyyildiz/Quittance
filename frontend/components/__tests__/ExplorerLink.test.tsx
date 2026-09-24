import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ExplorerLink from '../ExplorerLink';

afterEach(() => {
  cleanup();
});

// A valid 64-character hexadecimal transaction hash.
const VALID_HASH = 'a'.repeat(64);

const EXPLORER_BASE = 'https://stellar.expert/explorer';

describe('ExplorerLink', () => {
  describe('valid 64-hex transaction hash', () => {
    it('renders an anchor element with the correct href for testnet', () => {
      render(<ExplorerLink txHash={VALID_HASH} network="testnet" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        `${EXPLORER_BASE}/testnet/tx/${VALID_HASH}`,
      );
    });

    it('renders an anchor element with the correct href for public', () => {
      render(<ExplorerLink txHash={VALID_HASH} network="public" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        `${EXPLORER_BASE}/public/tx/${VALID_HASH}`,
      );
    });

    it('includes accessible aria-label', () => {
      render(<ExplorerLink txHash={VALID_HASH} network="testnet" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'aria-label',
        `View transaction ${VALID_HASH} on Stellar Explorer (Testnet)`,
      );
    });

    it('defaults to testnet when no network prop is provided', () => {
      render(<ExplorerLink txHash={VALID_HASH} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute(
        'href',
        `${EXPLORER_BASE}/testnet/tx/${VALID_HASH}`,
      );
    });

    it('uses custom children as label instead of truncated hash', () => {
      render(
        <ExplorerLink txHash={VALID_HASH} network="testnet">
          View details
        </ExplorerLink>,
      );

      expect(screen.getByText('View details')).toBeInTheDocument();
    });

    it('shows the external-link icon by default', () => {
      const { container } = render(
        <ExplorerLink txHash={VALID_HASH} network="testnet" />,
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('hides the icon when showIcon is false', () => {
      const { container } = render(
        <ExplorerLink txHash={VALID_HASH} network="testnet" showIcon={false} />,
      );
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('invalid hashes render plain text', () => {
    it('hash shorter than 64 characters', () => {
      const short = 'abc123';
      render(<ExplorerLink txHash={short} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText(short)).toBeInTheDocument();
    });

    it('hash longer than 64 characters', () => {
      const long = 'a'.repeat(65);
      render(<ExplorerLink txHash={long} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText(long)).toBeInTheDocument();
    });

    it('hash containing non-hexadecimal characters', () => {
      const nonHex = 'g'.repeat(64);
      render(<ExplorerLink txHash={nonHex} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText(nonHex)).toBeInTheDocument();
    });

    it('hash containing spaces', () => {
      const spaced = 'a '.repeat(32).trim();
      render(<ExplorerLink txHash={spaced} />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders a dash placeholder for empty string', () => {
      render(<ExplorerLink txHash="" />);

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('\u2014')).toBeInTheDocument();
    });
  });
});
