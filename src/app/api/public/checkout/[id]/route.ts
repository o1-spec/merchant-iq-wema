import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            businessName: true,
            location: true,
            currency: true,
          },
        },
      },
    });

    if (!paymentLink) {
      return errorResponse('Payment link not found', 404);
    }

    return successResponse({ paymentLink });
  } catch (err) {
    const error = err as Error;
    console.error('GET public checkout data error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
