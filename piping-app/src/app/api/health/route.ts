import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint for network status detection
 * Returns 200 OK if server is reachable
 */
export async function GET() {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
