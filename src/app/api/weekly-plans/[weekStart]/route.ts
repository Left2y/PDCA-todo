import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyPlan, deleteWeeklyPlan } from '@/lib/db';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ weekStart: string }> }
) {
    try {
        const { weekStart } = await params;

        if (!weekStart) {
            return NextResponse.json(
                { error: 'Missing weekStart parameter' },
                { status: 400 }
            );
        }

        const plan = await getWeeklyPlan(weekStart);

        if (!plan) {
            return NextResponse.json(
                { error: 'Weekly plan not found' },
                { status: 404, headers: NO_STORE_HEADERS }
            );
        }

        return NextResponse.json(plan, { headers: NO_STORE_HEADERS });
    } catch (error) {
        console.error('Error getting weekly plan:', error);
        return NextResponse.json(
            { error: 'Failed to get weekly plan' },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ weekStart: string }> }
) {
    try {
        const { weekStart } = await params;

        if (!weekStart) {
            return NextResponse.json(
                { error: 'Missing weekStart parameter' },
                { status: 400 }
            );
        }

        await deleteWeeklyPlan(weekStart);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Error deleting weekly plan:', error);
        return NextResponse.json(
            { error: 'Failed to delete weekly plan' },
            { status: 500 }
        );
    }
}
