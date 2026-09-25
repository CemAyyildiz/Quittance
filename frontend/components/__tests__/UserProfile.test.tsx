import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import UserProfile from '../UserProfile';

// A standard 56-character Stellar G-address.
const WALLET_ADDRESS = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const SHORTENED_ADDRESS = 'GBRPYH...OX2H';

describe('UserProfile', () => {
  it('renders nothing when no wallet is connected', () => {
    const { container } = render(<UserProfile userWallet={null} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the shortened wallet address when connected', () => {
    render(<UserProfile userWallet={WALLET_ADDRESS} />);

    expect(screen.getByText(SHORTENED_ADDRESS)).toBeInTheDocument();
  });

  it('marks the menu trigger with aria-haspopup and aria-expanded', () => {
    render(<UserProfile userWallet={WALLET_ADDRESS} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
