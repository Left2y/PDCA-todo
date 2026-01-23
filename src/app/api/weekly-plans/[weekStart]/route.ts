import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyPlan } from '@/lib/db';

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
                { status: 404 }
            );
        }

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Error getting weekly plan:', error);
        return NextResponse.json(
            { error: 'Failed to get weekly plan' },
            { status: 500 }
        );
    }
}
