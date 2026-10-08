/**
 * API contract shared by the frontend (src/) and the Netlify Functions (netlify/functions/).
 * Keep this file free of runtime imports - types only.
 */

export type DeviceKind = 'mobile' | 'desktop';

/** Position relative to the pixel field, both axes in 0..1. */
export interface Point01 {
  x: number;
  y: number;
}

export interface ExplosionCreateRequest {
  origin: Point01;
  device: DeviceKind;
}

export interface Explosion {
  id: string;
  /** ISO 8601 UTC, assigned by the server. */
  createdAt: string;
  device: DeviceKind;
  origin: Point01;
}

export interface ExplosionCreateResponse {
  explosion: Explosion;
  total: number;
}

export interface ExplosionStats {
  total: number;
  lastAt: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
