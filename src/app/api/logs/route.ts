// POST /api/logs - 保存会话日志
// GET /api/logs?date=YYYY-MM-DD - 获取某日日志
import { NextRequest, NextResponse } from 'next/server';
import { saveLog, getLogsByDate } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, transcript, dailyPlan, cards } = body;

        if (!date || !dailyPlan) {
            return NextResponse.json(
                { error: 'Missing required fields: date, dailyPlan' },
                { status: 400 }
            );
        }

        const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await saveLog({
            id,
            date,
            transcript: transcript || '',
            dailyPlan,
            cards,
        });

        return NextResponse.json({ id, saved: true });
    } catch (error) {
        console.error('Error in /api/logs POST:', error);
        return NextResponse.json(
            { error: 'Failed to save log', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        if (!date) {
            return NextResponse.json(
                { error: 'Missing date parameter' },
                { status: 400 }
            );
        }

        const result = await getLogsByDate(date);

        return NextResponse.json({
            date,
            dailyPlan: result.dailyPlan,
            logs: result.logs,
            cards: [], // TODO: implement cards
        });
    } catch (error) {
        console.error('Error in /api/logs GET:', error);
        return NextResponse.json(
            { error: 'Failed to get logs', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
