import test from 'node:test';
import assert from 'node:assert/strict';

import { FREIGHTER_INSTALL_URL, shouldShowFreighterInstallGuidance } from './freighterGuidance';

test('uses the official Freighter install page', () => {
  assert.equal(FREIGHTER_INSTALL_URL, 'https://www.freighter.app/');
});

test('shows install guidance when Freighter is unavailable for a disconnected wallet', () => {
  assert.equal(shouldShowFreighterInstallGuidance(false, true), true);
});

test('hides install guidance while Freighter is available', () => {
  assert.equal(shouldShowFreighterInstallGuidance(false, false), false);
});

test('keeps install guidance hidden for a connected wallet', () => {
  assert.equal(shouldShowFreighterInstallGuidance(true, true), false);
});
