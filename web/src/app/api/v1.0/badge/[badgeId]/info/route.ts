import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ badgeId: string }> }
) {
    const { badgeId } = await params;

    const baseUrl = request.nextUrl.origin;
    const redirectUrl = `${baseUrl}/badge/${badgeId}`;

    return NextResponse.redirect(redirectUrl, { status: 302 });
}
