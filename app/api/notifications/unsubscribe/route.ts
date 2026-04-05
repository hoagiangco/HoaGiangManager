import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
    try {
        const { user } = await authenticate(req);
        if (!user) {
            return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint } = await req.json();

        if (!endpoint) {
            return NextResponse.json({ status: false, error: 'Endpoint is required' }, { status: 400 });
        }

        // Remove subscription from DB
        await pool.query(
            'DELETE FROM "PushSubscription" WHERE "UserId" = $1 AND "Endpoint" = $2',
            [user.userId, endpoint]
        );

        return NextResponse.json({ status: true });
    } catch (error: any) {
        console.error('Unsubscribe API error:', error);
        return NextResponse.json({ status: false, error: error.message }, { status: 500 });
    }
}
