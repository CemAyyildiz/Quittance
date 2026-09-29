import { describe, it, expect } from 'vitest';
import horizonStatus, {
  isAuthError,
  isClientError,
  isServerError,
  getStatusMessage,
  isSuccess,
  type HorizonStatus
} from './horizonStatus';

describe('horizonStatus - HTTP status code handling', () => {
  describe('isAuthError', () => {
    it('returns true for 401 status', () => {
      expect(isAuthError(401)).toBe(true);
    });

    it('returns true for 403 status', () => {
      expect(isAuthError(403)).toBe(true);
    });

    it('returns false for other status codes', () => {
      expect(isAuthError(200)).toBe(false);
      expect(isAuthError(400)).toBe(false);
      expect(isAuthError(404)).toBe(false);
      expect(isAuthError(500)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('returns true for 4xx status codes', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(401)).toBe(true);
      expect(isClientError(403)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(429)).toBe(true);
      expect(isClientError(499)).toBe(true);
    });

    it('returns false for non-4xx status codes', () => {
      expect(isClientError(200)).toBe(false);
      expect(isClientError(300)).toBe(false);
      expect(isClientError(500)).toBe(false);
      expect(isClientError(599)).toBe(false);
    });
  });

  describe('isServerError', () => {
    it('returns true for 5xx status codes', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(502)).toBe(true);
      expect(isServerError(503)).toBe(true);
      expect(isServerError(599)).toBe(true);
    });

    it('returns false for non-5xx status codes', () => {
      expect(isServerError(200)).toBe(false);
      expect(isServerError(400)).toBe(false);
      expect(isServerError(499)).toBe(false);
      expect(isServerError(600)).toBe(false);
    });
  });

  describe('getStatusMessage', () => {
    it('returns correct message for 401', () => {
      expect(getStatusMessage(401)).toBe('Unauthorized');
    });

    it('returns correct message for 403', () => {
      expect(getStatusMessage(403)).toBe('Forbidden');
    });

    it('returns correct message for other common codes', () => {
      expect(getStatusMessage(400)).toBe('Bad Request');
      expect(getStatusMessage(404)).toBe('Not Found');
      expect(getStatusMessage(429)).toBe('Too Many Requests');
      expect(getStatusMessage(500)).toBe('Internal Server Error');
      expect(getStatusMessage(502)).toBe('Bad Gateway');
      expect(getStatusMessage(503)).toBe('Service Unavailable');
    });

    it('returns generic message for unknown 4xx codes', () => {
      expect(getStatusMessage(418)).toBe('Client Error 418');
      expect(getStatusMessage(451)).toBe('Client Error 451');
    });

    it('returns generic message for unknown 5xx codes', () => {
      expect(getStatusMessage(599)).toBe('Server Error 599');
      expect(getStatusMessage(510)).toBe('Server Error 510');
    });

    it('returns unknown message for non-HTTP codes', () => {
      expect(getStatusMessage(999)).toBe('Unknown Status 999');
      expect(getStatusMessage(1000)).toBe('Unknown Status 1000');
    });
  });

  describe('isSuccess', () => {
    it('returns true for 2xx status codes', () => {
      expect(isSuccess(200)).toBe(true);
      expect(isSuccess(201)).toBe(true);
      expect(isSuccess(299)).toBe(true);
    });

    it('returns false for non-2xx status codes', () => {
      expect(isSuccess(200)).toBe(true);
      expect(isSuccess(300)).toBe(false);
      expect(isSuccess(400)).toBe(false);
      expect(isSuccess(500)).toBe(false);
    });
  });

  describe('HorizonStatus type', () => {
    it('accepts specific status codes as HorizonStatus', () => {
      const status401: HorizonStatus = 401;
      const status403: HorizonStatus = 403;
      const status404: HorizonStatus = 404;
      const status429: HorizonStatus = 429;
      const status500: HorizonStatus = 500;
      const status502: HorizonStatus = 502;
      const status503: HorizonStatus = 503;

      expect(status401).toBe(401);
      expect(status403).toBe(403);
      expect(status404).toBe(404);
      expect(status429).toBe(429);
      expect(status500).toBe(500);
      expect(status502).toBe(502);
      expect(status503).toBe(503);
    });

    it('accepts any number as HorizonStatus', () => {
      const status: HorizonStatus = 999;
      const status2: HorizonStatus = 12345;

      expect(status).toBe(999);
      expect(status2).toBe(12345);
    });
  });
});