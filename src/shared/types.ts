/**
 * Types shared by the frontend (src/) and the Netlify Functions (netlify/functions/).
 * Types only: no runtime imports.
 */

export interface ApiError {
  error: { code: string; message: string };
}
