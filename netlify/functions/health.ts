import type { Config } from '@netlify/functions';

export default async function handler(): Promise<Response> {
  return Response.json({ ok: true, time: new Date().toISOString() });
}

export const config: Config = { path: '/api/health' };
