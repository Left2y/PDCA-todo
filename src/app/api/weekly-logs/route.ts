import { NextRequest, NextResponse } from 'next/server';
import { saveWeeklyLog, getWeeklyLogsByWeek } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { weekStart, transcript, weeklyPlan } = body;

        if (!weekStart || !weeklyPlan) {
            return NextResponse.json(
                { error: 'Missing required fields: weekStart, weeklyPlan' },
                { status: 400 }
            );
        }

        const id = `wlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await saveWeeklyLog({
            id,
            weekStart,
            transcript: transcript || '',
            weeklyPlan,
        });

        return NextResponse.json({ id, saved: true });
    } catch (error) {
        console.error('Error saving weekly log:', error);
        return NextResponse.json(
            { error: 'Failed to save weekly log' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const weekStart = searchParams.get('weekStart');

        if (!weekStart) {
            return NextResponse.json(
                { error: 'Missing weekStart parameter' },
                { status: 400 }
            );
        }

        const result = await getWeeklyLogsByWeek(weekStart);

        return NextResponse.json({
            weekStart,
            weeklyPlan: result.weeklyPlan,
            logs: result.logs,
        });
    } catch (error) {
        console.error('Error getting weekly logs:', error);
        return NextResponse.json(
            { error: 'Failed to get weekly logs' },
            { status: 500 }
        );
    }
}
