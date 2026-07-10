import { z } from 'zod';

// ─── Course Schemas ────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters'),
  price: z
    .number()
    .min(0, 'Price cannot be negative'),
  isPublished: z.boolean().optional().default(false),
});

export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(150, 'Title cannot exceed 150 characters')
      .optional(),
    description: z
      .string()
      .min(20, 'Description must be at least 20 characters')
      .optional(),
    price: z.number().min(0, 'Price cannot be negative').optional(),
    isPublished: z.boolean().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    discountExpiresAt: z.string().nullable().optional(),
    taxPercent: z.number().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: 'At least one field must be provided' },
  );

// ─── Section Schemas ───────────────────────────────────────────────────────────

export const createSectionSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  order: z.number().min(0, 'Order cannot be negative').optional(),
});

export const updateSectionSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  order: z.number().min(0, 'Order cannot be negative').optional(),
});

// ─── Lesson Schemas ────────────────────────────────────────────────────────────

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  order: z.number().min(0, 'Order cannot be negative').optional(),
  isFree: z.boolean().optional().default(false),
});

export const updateLessonSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters')
    .optional(),
  order: z.number().min(0, 'Order cannot be negative').optional(),
  isFree: z.boolean().optional(),
  videoUrl: z.string().nullable().optional(),
  videoPublicId: z.string().nullable().optional(),
  content: z.string().optional(),
  resources: z.array(z.object({
    title: z.string().min(1, 'Title is required'),
    url: z.string().url('Must be a valid URL')
  })).optional(),
});

// ─── Inferred Types ────────────────────────────────────────────────────────────

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
