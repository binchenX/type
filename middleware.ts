import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configuration constants
const PRODUCTION_DOMAIN = 'qtype.vercel.com';
const DEV_DOMAIN = 'localhost:3000';
const PROTOCOL = {
    production: 'https',
    development: 'http'
};

// Helper to get allowed origins based on environment
function getAllowedOrigins(): string[] {
    const origins = new Set<string>();

    // Add additional origins from env var
    if (process.env.ALLOWED_ORIGINS) {
        process.env.ALLOWED_ORIGINS.split(',').forEach(origin => origins.add(origin.trim()));
    }

    // Add Vercel preview URL
    if (process.env.VERCEL_URL) {
        origins.add(`https://${process.env.VERCEL_URL}`);
    }

    // Add main domain based on environment
    if (process.env.NODE_ENV === 'production') {
        origins.add(`${PROTOCOL.production}://${PRODUCTION_DOMAIN}`);
    } else {
        origins.add(`${PROTOCOL.development}://${DEV_DOMAIN}`);
    }

    return Array.from(origins);
}

// Add security headers to all responses
function addSecurityHeaders(response: NextResponse) {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    // Control referrer information
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    // Content Security Policy
    response.headers.set('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://generativelanguage.googleapis.com;"
    );
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
}

export function middleware(request: NextRequest) {
    // Get the response
    const response = NextResponse.next();

    // Add security headers to all responses
    addSecurityHeaders(response);

    // For API routes, add CORS headers
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const allowedOrigins = getAllowedOrigins();
        const origin = request.headers.get('origin');

        // Check if the request origin is allowed
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else {
            // If no origin header or origin not allowed, use the first allowed origin
            response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
        }

        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    }

    // For data files, ensure proper headers are set
    if (request.nextUrl.pathname.startsWith('/data/')) {
        response.headers.set('Cache-Control', 'public, max-age=3600');
    }

    return response;
}

// Configure the paths that will trigger this middleware
export const config = {
    matcher: [
        '/api/:path*',
        '/data/:path*',
        '/(.*)', // Apply security headers to all routes
    ],
}; 
