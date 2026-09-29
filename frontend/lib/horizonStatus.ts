/**
 * horizonStatus - HTTP status code handler for Horizon API responses
 *
 * Provides type-safe handling of HTTP status codes returned by Horizon,
 * with specific handling for authentication errors (401, 403) and
 * other status codes that may occur during Horizon interactions.
 */

export type HorizonStatus =
  | 401    // Unauthorized
  | 403    // Forbidden
  | 404    // Not Found
  | 429    // Too Many Requests
  | 500    // Internal Server Error
  | 502    // Bad Gateway
  | 503    // Service Unavailable
  | number; // Any other HTTP status code

/**
 * Determine if a status code represents an authentication error
 *
 * @param status - HTTP status code from Horizon response
 * @returns true if status is 401 or 403 (authentication/authorization errors)
 */
export const isAuthError = (status: number): boolean => {
  return status === 401 || status === 403;
};

/**
 * Determine if a status code represents a client error (4xx)
 *
 * @param status - HTTP status code from Horizon response
 * @returns true if status is in the 400-499 range
 */
export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

/**
 * Determine if a status code represents a server error (5xx)
 *
 * @param status - HTTP status code from Horizon response
 * @returns true if status is in the 500-599 range
 */
export const isServerError = (status: number): boolean => {
  return status >= 500 && status < 600;
};

/**
 * Get a human-readable message for a Horizon HTTP status code
 *
 * @param status - HTTP status code from Horizon response
 * @returns descriptive message for the status code
 */
export const getStatusMessage = (status: number): string => {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    case 502: return 'Bad Gateway';
    case 503: return 'Service Unavailable';
    default:
      if (status >= 400 && status < 500) {
        return `Client Error ${status}`;
      }
      if (status >= 500 && status < 600) {
        return `Server Error ${status}`;
      }
      return `Unknown Status ${status}`;
  }
};

/**
 * Check if a status code is a successful Horizon response (2xx)
 *
 * @param status - HTTP status code from Horizon response
 * @returns true if status is in the 200-299 range
 */
export const isSuccess = (status: number): boolean => {
  return status >= 200 && status < 300;
};

export default {
  isAuthError,
  isClientError,
  isServerError,
  getStatusMessage,
  isSuccess,
};