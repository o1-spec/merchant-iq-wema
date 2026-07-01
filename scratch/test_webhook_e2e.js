const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

// 1. Parse .env file manually to avoid dependency issues
const envPath = path.join(__dirname, '../.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  });
}

const webhookSecret = env.ALATPAY_WEBHOOK_SECRET || 'dev-webhook-secret-key-123';
const prisma = new PrismaClient();

async function run() {
  console.log('🚀 --- ALATPay End-to-End Signature Integration Test ---');
  try {
    // 2. Locate or create a test merchant
    let merchant = await prisma.merchant.findFirst();
    if (!merchant) {
      console.log('Creating a test merchant...');
      const user = await prisma.user.create({
        data: {
          name: 'Muiz Kitchen Test',
          email: `test-${Date.now()}@kitchen.com`,
          passwordHash: 'dummyhash123',
          role: 'MERCHANT',
          merchant: {
            create: {
              businessName: 'Muiz Kitchen Test Store',
              businessType: 'Restaurant',
              businessCategory: 'Food',
              location: 'Lagos, Nigeria',
            }
          }
        },
        include: { merchant: true }
      });
      merchant = user.merchant;
    }

    // 3. Locate or create a pending payment link
    let paymentLink = await prisma.paymentLink.findFirst({
      where: { status: 'PENDING' }
    });

    if (!paymentLink) {
      console.log('No pending payment links found. Generating a new test link...');
      paymentLink = await prisma.paymentLink.create({
        data: {
          merchantId: merchant.id,
          customerName: 'Tunde Balogun',
          amount: 5000,
          purpose: 'Real Production Ingestion Inflow Test',
          reference: `ALAT-PL-TEST-${Date.now()}`,
          status: 'PENDING',
        }
      });
    }

    console.log(`[Target] Invoice Reference: ${paymentLink.reference}`);
    console.log(`[Target] Amount: ₦${paymentLink.amount}`);

    // 4. Construct payload
    const payload = {
      Value: {
        Status: true,
        Message: 'Success',
        Data: {
          Amount: paymentLink.amount,
          OrderId: paymentLink.reference,
          Id: `ALAT-TX-E2E-${Date.now()}`,
          Channel: 'Card',
          Status: 'completed',
          NgnVirtualBankAccountNumber: null,
          Customer: {
            Email: 'tunde@customer.com',
            FirstName: 'Tunde',
            LastName: 'Balogun'
          }
        }
      }
    };

    const bodyText = JSON.stringify(payload);

    // 5. Compute HMAC SHA-256 Signature (Exactly like Wema Bank)
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('base64');

    console.log(`[Signed] Computed HMAC Signature: ${signature}`);

    // 6. Send Request to Webhook Receiver Route
    console.log('Sending webhook POST request to server...');
    const response = await fetch('http://localhost:3000/api/webhooks/alatpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature
      },
      body: bodyText
    });

    const resJson = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Payload:', resJson);

    if (response.ok && resJson.success) {
      console.log('\n✅ Webhook call successfully ingested by server.');

      // 7. Verify Database Updates
      console.log('Checking database verification state...');
      const updatedLink = await prisma.paymentLink.findUnique({
        where: { id: paymentLink.id }
      });
      console.log(`[Check] Payment Link Status: ${updatedLink.status} (Expected: PAID)`);

      const transaction = await prisma.transaction.findFirst({
        where: { externalReference: payload.Value.Data.Id }
      });

      if (transaction) {
        console.log(`[Check] Transaction Ledger: Created successfully.`);
        console.log(`[Check] Transaction ID: ${transaction.id}`);
        console.log(`[Check] Amount: ₦${transaction.amount}`);
        console.log('\n🎉 --- END-TO-END SIGNATURE INTEGRATION TEST SUCCESSFUL! ---');
      } else {
        console.error('❌ Error: Transaction Ledger was not created in the database.');
      }
    } else {
      console.error('❌ Error: Webhook endpoint rejected the request.', resJson);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
