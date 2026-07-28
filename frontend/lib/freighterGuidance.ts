export const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/';

export const shouldShowFreighterInstallGuidance = (
  connected: boolean,
  freighterUnavailable: boolean,
): boolean => !connected && freighterUnavailable;
