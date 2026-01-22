// GET /api/export - 导出所有数据
import { NextResponse } from 'next/server';
import { exportAll } from '@/lib/db';

export async function GET() {
    try {
        const data = await exportAll();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error exporting data:', error);
        return NextResponse.json(
            { error: 'Failed to export data' },
            { status: 500 }
        );
    }
}
