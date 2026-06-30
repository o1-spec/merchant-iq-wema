import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';
import { alatpayWebhookSchema } from '@/lib/validation';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();

    // Verify webhook signature in production or if a custom webhook secret is defined
    const signature = req.headers.get('x-signature');
    const webhookSecret = process.env.ALATPAY_WEBHOOK_SECRET;

    const isProduction = process.env.NODE_ENV === 'production';
    const isCustomSecretConfigured = webhookSecret && 
      webhookSecret !== '38051ceab8deb2a919a5d60b5c51393e' && 
      webhookSecret !== 'dev-webhook-secret-key-123';

    if (isProduction || isCustomSecretConfigured) {
      if (!signature || !webhookSecret) {
        return errorResponse('Unauthorized: Missing signature or webhook secret key', 401);
      }
      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyText)
        .digest('base64');
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

    // Reject non-successful transactions
    if (validated.Value.Status !== true || !['completed', 'successful', 'success'].includes(validated.Value.Data.Status.toLowerCase())) {
      return errorResponse('Webhook ignored: Transaction status is not completed', 400);
    }

    const { OrderId, Id, Amount, Channel, NgnVirtualBankAccountNumber } = validated.Value.Data;

    let merchantId = '';
    let paymentLinkId: string | null = null;
    let virtualAccountId: string | null = null;
    let description = '';

    // 1. Look up PaymentLink by OrderId (reference match)
    let paymentLink = null;
    if (OrderId) {
      paymentLink = await prisma.paymentLink.findFirst({
        where: { reference: OrderId },
      });
    }

    if (paymentLink) {
      merchantId = paymentLink.merchantId;
      paymentLinkId = paymentLink.id;
      description = `Payment from customer via ALATPay Link (Ref: ${paymentLink.purpose})`;
    } else {
      // 2. Check VirtualAccount fallback lookup if OrderId is empty or not matching
      let virtualAccount = null;
      if (NgnVirtualBankAccountNumber) {
        virtualAccount = await prisma.virtualAccount.findUnique({
          where: { accountNumber: NgnVirtualBankAccountNumber },
        });
      } else if (OrderId) {
        // Fallback: sometimes the accountNumber is passed in OrderId field during direct transfers
        virtualAccount = await prisma.virtualAccount.findUnique({
          where: { accountNumber: OrderId },
        });
      }

      if (virtualAccount) {
        merchantId = virtualAccount.merchantId;
        virtualAccountId = virtualAccount.id;
        description = `Direct Wema/ALAT Transfer to Customer Virtual Account (${virtualAccount.customerName})`;
      } else {
        // 3. Reject unmatched webhooks immediately
        return errorResponse('Webhook ignored: Unmatched transaction reference or virtual account number', 404);
      }
    }

    // Run database updates inside an atomic ACID transaction
    await prisma.$transaction(async (tx) => {
      // Create the Inbound Transaction Ledger record (externalReference has Unique index)
      await tx.transaction.create({
        data: {
          merchantId,
          amount: Amount,
          type: 'INCOME',
          category: 'Collections',
          description,
          source: 'ALATPAY',
          paymentMethod: Channel.toLowerCase().includes('card') ? 'CARD' : 'TRANSFER',
          direction: 'INFLOW',
          status: 'COMPLETED',
          externalReference: Id || OrderId || `ALAT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          paymentLinkId,
          virtualAccountId,
        },
      });

      // If it's a payment link checkout, update status to PAID
      if (paymentLinkId) {
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

    console.log(`Successfully ingested ALATPay payment event for reference: ${Id}`);
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
