import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';
import { alatpayWebhookSchema } from '@/lib/validation';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();

    // Verify webhook signature in production environment
    const signature = req.headers.get('x-alatpay-signature');
    const webhookSecret = process.env.ALATPAY_WEBHOOK_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!signature || !webhookSecret) {
        return errorResponse('Unauthorized: Missing signature or webhook secret key', 401);
      }
      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('hex');
      if (computedHash !== signature) {
        return errorResponse('Unauthorized: Webhook signature verification failed', 401);
      }
    }

    const body = JSON.parse(bodyText);
    const validation = alatpayWebhookSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Validation error', 400, validation.error.flatten().fieldErrors);
    }

    const validated = validation.data;

    let merchantId = '';
    let paymentLinkId: string | null = null;
    let virtualAccountId: string | null = null;
    let description = '';

    if (validated.type === 'payment_link') {
      const paymentLink = await prisma.paymentLink.findUnique({
        where: { id: validated.id },
      });
      if (!paymentLink) {
        return errorResponse('Payment link not found', 404);
      }
      merchantId = paymentLink.merchantId;
      paymentLinkId = paymentLink.id;
      description = `Payment from customer via ALATPay Link (Ref: ${paymentLink.purpose})`;
    } else if (validated.type === 'virtual_account') {
      const virtualAccount = await prisma.virtualAccount.findUnique({
        where: { id: validated.id },
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

    // Run database updates inside an atomic ACID transaction
    await prisma.$transaction(async (tx) => {
      // Create the Inbound Transaction Ledger record (externalReference has Unique index)
      await tx.transaction.create({
        data: {
          merchantId,
          amount: validated.amount,
          type: 'INCOME',
          category: 'Collections',
          description,
          source: 'ALATPAY',
          paymentMethod: validated.paymentMethod || 'TRANSFER',
          direction: 'INFLOW',
          status: 'COMPLETED',
          externalReference: validated.reference,
          paymentLinkId,
          virtualAccountId,
        },
      });

      // If it's a payment link checkout, update status to PAID
      if (validated.type === 'payment_link' && paymentLinkId) {
        await tx.paymentLink.update({
          where: { id: paymentLinkId },
          data: { status: 'PAID' },
        });
      }

      // Evict merchant's unpinned AI Insights to force AI recalculations on dashboard load
      await tx.insight.deleteMany({
        where: {
          merchantId,
          isPinned: false,
        },
      });
    });

    console.log(`Successfully ingested ALATPay payment event for reference: ${validated.reference}`);
    return successResponse({ message: 'Webhook processed successfully' });
  } catch (err: any) {
    // Handle unique constraint violations gracefully for idempotency (Prisma Error P2002)
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      console.log(`Webhook duplicate detected. Reference already exists. Ignoring.`);
      return successResponse({ message: 'Duplicate webhook ignored successfully' });
    }
    const error = err as Error;
    console.error('Webhook processing error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
