import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { z } from 'zod';

const createPaymentLinkSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  amount: z.number().positive('Amount must be positive'),
  purpose: z.string().min(1, 'Purpose is required'),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !user.merchant) {
      return errorResponse('Unauthorized', 401);
    }
    const merchant = user.merchant;

    const paymentLinks = await prisma.paymentLink.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({ paymentLinks });
  } catch (err) {
    const error = err as Error;
    console.error('GET payment links error:', error);
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
    const result = createPaymentLinkSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 400, result.error.flatten().fieldErrors);
    }

    const { customerName, amount, purpose } = result.data;
    const reference = `ALAT-PL-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const paymentLink = await prisma.paymentLink.create({
      data: {
        merchantId: merchant.id,
        customerName,
        amount,
        purpose,
        reference,
        status: 'PENDING',
      },
    });

    return successResponse({ paymentLink });
  } catch (err) {
    const error = err as Error;
    console.error('POST payment link error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
