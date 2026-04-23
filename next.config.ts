import type { NextConfig } from "next";

// Build the connect-src CSP directive around the Supabase project URL so the
// anon client can still reach REST, auth, and realtime endpoints.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl.replace(/\/+$/, "");
const supabaseWsOrigin = supabaseOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

// dlite web components inline styles into their shadow DOM, and Next injects
// inline <style> for RSC payloads — both require 'unsafe-inline' for styles.
// Scripts: Next occasionally needs 'unsafe-inline' for hydration payloads;
// 'unsafe-eval' is only needed in dev for React Refresh.
const isDev = process.env.NODE_ENV !== "production";

// dlite tokens pull typography from Google Fonts; stylesheet from
// fonts.googleapis.com, woff2 files from fonts.gstatic.com.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
