// POST /api/import - 导入数据
import { NextRequest, NextResponse } from 'next/server';
import { importAll } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data || (typeof data !== 'object')) {
            return NextResponse.json(
                { error: 'Invalid data format' },
                { status: 400 }
            );
        }

        await importAll(data);

        return NextResponse.json({ imported: true });
    } catch (error) {
        console.error('Error importing data:', error);
        return NextResponse.json(
            { error: 'Failed to import data' },
            { status: 500 }
        );
    }
}
