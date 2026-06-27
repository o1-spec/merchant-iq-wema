import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/response';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhookSecret = process.env.ALATPAY_WEBHOOK_SECRET || 'dev-webhook-secret-key-123';
    
    const rawBody = JSON.stringify(body);
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('base64');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Post to the webhook endpoint locally carrying the signature
    const webhookRes = await fetch(`${appUrl}/api/webhooks/alatpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': computedSignature,
      },
      body: rawBody,
    });

    const resultText = await webhookRes.text();
    if (!webhookRes.ok) {
      return errorResponse(`Webhook forwarding failed: ${resultText}`, webhookRes.status);
    }

    return successResponse(JSON.parse(resultText));
  } catch (err: any) {
    return errorResponse(err.message || 'Internal simulation error', 500);
  }
}
