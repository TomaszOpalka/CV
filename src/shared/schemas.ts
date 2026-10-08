import { z } from 'zod';

import type { ExplosionCreateRequest } from './types';

const unit = z.number().min(0).max(1);

export const explosionCreateRequestSchema = z.object({
  origin: z.object({ x: unit, y: unit }),
  device: z.enum(['mobile', 'desktop']),
}) satisfies z.ZodType<ExplosionCreateRequest>;
