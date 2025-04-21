import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the response
    const response = NextResponse.next();

    // For data files, ensure proper headers are set
    if (request.nextUrl.pathname.startsWith('/data/')) {
        response.headers.set('Cache-Control', 'public, max-age=3600');
        response.headers.set('Access-Control-Allow-Origin', '*');
    }

    return response;
}

// Configure the paths that will trigger this middleware
export const config = {
    matcher: [
        '/data/:path*',
    ],
}; 
