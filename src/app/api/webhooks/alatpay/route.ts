import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, type, reference, amount, paymentMethod, id } = body;

    if (!reference || !amount || !type || !id) {
      return errorResponse('Missing required webhook fields', 400);
    }

    // Webhook Idempotency Check
    const existingTx = await prisma.transaction.findFirst({
      where: { externalReference: reference },
    });

    if (existingTx) {
      console.log(`Webhook duplicate detected for reference: ${reference}. Ignoring.`);
      return successResponse({ message: 'Duplicate webhook ignored successfully' });
    }

    let merchantId = '';
    let paymentLinkId: string | null = null;
    let virtualAccountId: string | null = null;
    let description = '';

    if (type === 'payment_link') {
      const paymentLink = await prisma.paymentLink.findUnique({
        where: { id },
      });
      if (!paymentLink) {
        return errorResponse('Payment link not found', 404);
      }
      merchantId = paymentLink.merchantId;
      paymentLinkId = paymentLink.id;
      description = `Payment from customer via ALATPay Link (Ref: ${paymentLink.purpose})`;

      // Update payment link status to PAID
      await prisma.paymentLink.update({
        where: { id },
        data: { status: 'PAID' },
      });
    } else if (type === 'virtual_account') {
      const virtualAccount = await prisma.virtualAccount.findUnique({
        where: { id },
      });
      if (!virtualAccount) {
        return errorResponse('Virtual account not found', 404);
      }
      merchantId = virtualAccount.merchantId;
      virtualAccountId = virtualAccount.id;
      description = `Direct Wema/ALAT Transfer to Customer Virtual Account (${virtualAccount.customerName})`;
    } else {
      return errorResponse('Invalid webhook collection type', 400);
    }

    // Create the Transaction record representing the successful inflow
    await prisma.transaction.create({
      data: {
        merchantId,
        amount: parseFloat(amount),
        type: 'INCOME',
        category: 'Collections',
        description,
        source: 'ALATPAY',
        paymentMethod: paymentMethod || 'TRANSFER',
        direction: 'INFLOW',
        status: 'COMPLETED',
        externalReference: reference,
        paymentLinkId,
        virtualAccountId,
      },
    });

    // Evict merchant's unpinned AI Insights to force updates
    await prisma.insight.deleteMany({
      where: {
        merchantId,
        isPinned: false,
      },
    });

    console.log(`Successfully ingested ALATPay payment event for reference: ${reference}`);
    return successResponse({ message: 'Webhook processed successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('Webhook processing error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
