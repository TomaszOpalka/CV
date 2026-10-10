/**
 * Types shared by the frontend (src/) and the Netlify Functions (netlify/functions/).
 * Keep this file free of runtime imports - types only.
 * The site has no database, so for now there is only the error envelope; the contact form types arrive in phase 4.
 */

export interface ApiError {
  error: { code: string; message: string };
}
