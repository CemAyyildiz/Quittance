import { describe, it, expect } from 'vitest';
import { FREIGHTER_INSTALL_URL, shouldShowFreighterInstallGuidance } from './freighterGuidance';

describe('freighterGuidance', () => {
  it('uses the official Freighter install page', () => {
    expect(FREIGHTER_INSTALL_URL).toBe('https://www.freighter.app/');
  });

  it('shows install guidance when Freighter is unavailable for a disconnected wallet', () => {
    expect(shouldShowFreighterInstallGuidance(false, true)).toBe(true);
  });

  it('hides install guidance while Freighter is available', () => {
    expect(shouldShowFreighterInstallGuidance(false, false)).toBe(false);
  });

  it('keeps install guidance hidden for a connected wallet', () => {
    expect(shouldShowFreighterInstallGuidance(true, true)).toBe(false);
  });
});
