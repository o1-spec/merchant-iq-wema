import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { calculateSummary, calculateCashflow, calculateBusinessHealth, calculateForecast, calculateCollectionsSummary, TransactionData } from '@/lib/analytics';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !user.merchant) {
      return errorResponse('Unauthorized', 401);
    }
    const merchant = user.merchant;

    
    const transactions = await prisma.transaction.findMany({
      where: { merchantId: merchant.id },
      orderBy: { date: 'desc' },
    });

    
    const latestInsights = await prisma.insight.findMany({
      where: { merchantId: merchant.id },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
    });

    // Query payment links to generate collections statistics
    const paymentLinks = await prisma.paymentLink.findMany({
      where: { merchantId: merchant.id },
    });

    
    const txData = transactions as unknown as TransactionData[];
    const summary = calculateSummary(txData);
    const cashflow = calculateCashflow(txData);
    const businessHealth = calculateBusinessHealth(txData);
    const forecast = calculateForecast(txData);
    const collections = calculateCollectionsSummary(txData, paymentLinks);

    return successResponse({
      merchant,
      summary,
      cashflow,
      businessHealth,
      forecast,
      recentTransactions: transactions.slice(0, 10),
      latestInsights,
      collections,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Dashboard aggregation error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
