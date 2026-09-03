import { z } from 'zod';
import { TruckStatus, UserRole } from '@lures-dcs/domain';

/** Shared boundary schemas only — no DB implementation details. */

export const userRoleSchema = z.enum([UserRole.Management, UserRole.LoadingStaff]);

export const truckStatusSchema = z.enum([
  TruckStatus.Waiting,
  TruckStatus.Loading,
  TruckStatus.Completed,
  TruckStatus.OnHold,
  TruckStatus.Cancelled,
]);

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
