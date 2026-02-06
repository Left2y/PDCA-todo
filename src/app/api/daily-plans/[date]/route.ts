// GET /api/daily-plans/[date] - 获取某日计划
import { NextRequest, NextResponse } from 'next/server';
import { getDailyPlan } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    try {
        const { date } = await params;

        if (!date) {
            return NextResponse.json(
                { error: 'Missing date parameter' },
                { status: 400 }
            );
        }

        const plan = await getDailyPlan(date);

        if (!plan) {
            return NextResponse.json(
                { error: 'Plan not found' },
                { status: 404, headers: NO_STORE_HEADERS }
            );
        }

        return NextResponse.json(plan, { headers: NO_STORE_HEADERS });
    } catch (error) {
        console.error('Error getting daily plan:', error);
        return NextResponse.json(
            { error: 'Failed to get daily plan' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
