export type JsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

export function safeJsonParse<T = unknown>(text: string): JsonParseResult<T> {
  try {
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export function tryJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
