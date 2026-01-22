// PATCH /api/daily-plans/[date]/tasks/[taskId] - 更新任务状态
import { NextRequest, NextResponse } from 'next/server';
import { updateTaskDone } from '@/lib/db';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ date: string; taskId: string }> }
) {
    try {
        const { date, taskId } = await params;
        const body = await request.json();
        const { done } = body;

        if (typeof done !== 'boolean') {
            return NextResponse.json(
                { error: 'Missing or invalid done field' },
                { status: 400 }
            );
        }

        const plan = await updateTaskDone(date, taskId, done);

        if (!plan) {
            return NextResponse.json(
                { error: 'Plan not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            ok: true,
            date,
            taskId,
            done,
            dailyPlan: plan,
        });
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
}
