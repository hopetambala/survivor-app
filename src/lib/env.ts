// Validated, typed accessor for the environment variables this app needs.
//
// Importing this module throws immediately if a required variable is missing
// or malformed, so misconfiguration surfaces at startup rather than as a
// cryptic runtime error in the middle of a request.
//
// IMPORTANT: NEXT_PUBLIC_* vars are only inlined into the client bundle when
// accessed as literal property names (`process.env.NEXT_PUBLIC_FOO`). Any
// dynamic access (`process.env[key]`) returns undefined at runtime in the
// browser. Read each variable as a literal here — don't refactor to a loop.

function required(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing ${name}. Copy .env.local.example to .env.local and fill in your Supabase credentials.`
    );
  }
  return value.trim();
}

function assertHttpsUrl(name: string, value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`${name} must be an http(s) URL.`);
    }
    return value;
  } catch {
    throw new Error(`${name} is not a valid URL: ${value}`);
  }
}

const rawUrl = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const rawKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const env = {
  SUPABASE_URL: assertHttpsUrl("NEXT_PUBLIC_SUPABASE_URL", rawUrl),
  SUPABASE_ANON_KEY: rawKey,
} as const;
