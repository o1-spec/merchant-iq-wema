import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { generateGeminiText } from '@/lib/gemini';
import { z } from 'zod';

const reminderSchema = z.object({
  paymentLinkId: z.string().min(1, 'Payment Link ID is required'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !user.merchant) {
      return errorResponse('Unauthorized', 401);
    }
    const merchant = user.merchant;

    const body = await req.json();
    const result = reminderSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('Validation error', 400, result.error.flatten().fieldErrors);
    }

    const { paymentLinkId } = result.data;

    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id: paymentLinkId },
    });

    if (!paymentLink || paymentLink.merchantId !== merchant.id) {
      return errorResponse('Payment link not found', 404);
    }

    const checkoutUrl = `${req.nextUrl.origin}/public/checkout/${paymentLink.id}`;

    const prompt = `You are MerchantIQ, an automated collection assistant for "${merchant.businessName}" (an SME in ${merchant.location}).
Write a polite payment reminder for "${paymentLink.customerName}" regarding their unpaid invoice for "${paymentLink.purpose}".
Payment Details:
- Due Amount: ₦${paymentLink.amount.toLocaleString()}
- Purpose: ${paymentLink.purpose}
- Checkout Link: ${checkoutUrl}

Generate exactly three reminder formats, clearly separated.

**1. WhatsApp Draft** (Include a friendly greeting, brief explanation, Naira amount, the checkout URL, and a polite closing).
**2. SMS Draft** (Extremely concise, under 160 characters including the checkout URL, direct and clear).
**3. Email Draft** (Professional subject line, polite body, breakdown of dues, checkout CTA link, and professional signature from "${merchant.businessName}").

Keep the tone encouraging, professional, and friendly. Do not use complex corporate jargon. Use Naira (₦).`;

    const draft = await generateGeminiText(prompt);

    // Split drafts by format or return the block directly
    return successResponse({
      paymentLinkId,
      checkoutUrl,
      draft,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Reminder draft generation error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
