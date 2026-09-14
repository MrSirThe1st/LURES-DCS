import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const registerYardArrivalSchema = z.object({
  vehicle_registration: z.string().trim().min(1),
  trailer_registration: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_phone: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  driver_passport_reference: z
    .string()
    .trim()
    .nullish()
    .transform((v) => emptyToNull(v ?? null)),
  transporter_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  client_name: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
  arrived_at: z.string().trim().min(1).nullish(),
  notes: z.string().trim().nullish().transform((v) => emptyToNull(v ?? null)),
});
export type RegisterYardArrivalInput = z.infer<typeof registerYardArrivalSchema>;

export const assignTrucksToProgramSchema = z.object({
  truck_ids: z.array(z.string().uuid()).min(1),
  loading_date: isoDate,
});
export type AssignTrucksToProgramInput = z.infer<typeof assignTrucksToProgramSchema>;

export const returnTrucksToYardSchema = z.object({
  truck_ids: z.array(z.string().uuid()).min(1),
});
export type ReturnTrucksToYardInput = z.infer<typeof returnTrucksToYardSchema>;
