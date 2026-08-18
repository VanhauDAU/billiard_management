import { z } from 'zod'

export const CategorySchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'disabled', 'deleted']).default('active'),
  sortOrder: z.number().int().nonnegative().default(0),
  itemCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

export type Category = z.infer<typeof CategorySchema>

export const CategoryListResponseSchema = z.object({
  categories: z.array(CategorySchema)
})

export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>

export const CreateCategoryRequestSchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên danh mục tối đa 100 ký tự'),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').optional(),
  sortOrder: z.number().int().nonnegative().optional()
})

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>

export const UpdateCategoryRequestSchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(100, 'Tên danh mục tối đa 100 ký tự').optional(),
  description: z.string().trim().max(500, 'Mô tả tối đa 500 ký tự').nullable().optional(),
  status: z.enum(['active', 'disabled', 'deleted']).optional(),
  sortOrder: z.number().int().nonnegative().optional()
})

export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>
