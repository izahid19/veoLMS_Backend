import { z } from 'zod';

// ─── Progress Schemas ──────────────────────────────────────────────────────────

export const updateProgressSchema = z.object({
  watchedSeconds: z
    .number()
    .min(0, 'watchedSeconds cannot be negative'),
  completed: z.boolean().optional(),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
