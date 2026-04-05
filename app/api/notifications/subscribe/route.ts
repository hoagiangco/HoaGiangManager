import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function POST(req: NextRequest) {
    try {
        const { user, error: authError } = await authenticate(req);
        if (!user) {
            return NextResponse.json({ status: false, error: authError || 'Unauthorized' }, { status: 401 });
        }

        const subscription = await req.json();
        const { endpoint, keys } = subscription;

        // Log for debugging (will show in Vercel logs)
        console.log(`[Push Subscription] User: ${user.userId}, Endpoint: ${endpoint.substring(0, 30)}...`);

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ status: false, error: 'Invalid subscription data' }, { status: 400 });
        }

        // Store subscription in DB
        const checkRes = await pool.query(
            'SELECT "ID" FROM "PushSubscription" WHERE "UserId" = $1 AND "Endpoint" = $2',
            [user.userId, endpoint]
        );

        if (checkRes.rows.length === 0) {
            await pool.query(
                `INSERT INTO "PushSubscription" ("UserId", "Endpoint", "P256dh", "Auth")
                 VALUES ($1, $2, $3, $4)`,
                [user.userId, endpoint, keys.p256dh, keys.auth]
            );
        }

        return NextResponse.json({ status: true });
    } catch (error: any) {
        console.error('Subscription API error:', error);
        return NextResponse.json({ status: false, error: error.message }, { status: 500 });
    }
}
