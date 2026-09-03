import { NextResponse } from 'next/server';
import { healthResponseSchema } from '@lures-dcs/api-contracts';

export async function GET() {
  const body = healthResponseSchema.parse({
    ok: true,
    service: 'lures-dcs-web',
  });

  return NextResponse.json(body);
}
