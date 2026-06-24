import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { z } from 'zod';

const createVirtualAccountSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !user.merchant) {
      return errorResponse('Unauthorized', 401);
    }
    const merchant = user.merchant;

    const virtualAccounts = await prisma.virtualAccount.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ virtualAccounts });
  } catch (err) {
    const error = err as Error;
    console.error('GET virtual accounts error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !user.merchant) {
      return errorResponse('Unauthorized', 401);
    }
    const merchant = user.merchant;

    const body = await req.json();
    const result = createVirtualAccountSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 400, result.error.flatten().fieldErrors);
    }

    const { customerName } = result.data;

    // Generate random 10-digit account number starting with 801
    const rand = Math.floor(1000000 + Math.random() * 9000000);
    const accountNumber = `801${rand}`;

    const virtualAccount = await prisma.virtualAccount.create({
      data: {
        merchantId: merchant.id,
        customerName,
        accountNumber,
        bankName: 'Wema / ALAT',
      },
    });

    return successResponse({ virtualAccount });
  } catch (err) {
    const error = err as Error;
    console.error('POST virtual account error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
