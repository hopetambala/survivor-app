const { readdir, readFile } = require("fs/promises");
const path = require("path");

async function runMigrations() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing env vars. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, "migrations");

  let files;
  try {
    files = await readdir(migrationsDir);
  } catch {
    console.error(`No migrations directory found at ${migrationsDir}`);
    process.exit(1);
  }

  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  if (sqlFiles.length === 0) {
    console.log("No .sql migration files found.");
    return;
  }

  console.log(`Found ${sqlFiles.length} migration(s):\n`);

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, "utf-8");

    console.log(`Running: ${file}`);

    const res = await fetch(`${url}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      // Use the Supabase SQL endpoint directly
    });

    // Use the pg_net or direct SQL execution endpoint
    const sqlRes = await fetch(`${url}/pg`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!sqlRes.ok) {
      // Fallback: try the /rest/v1/rpc endpoint won't work for DDL.
      // Use the management API SQL endpoint instead.
      const mgmtRes = await fetch(`${url}/pg/query`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!mgmtRes.ok) {
        const errText = await mgmtRes.text();
        console.error(`  FAILED: ${errText}`);
        process.exit(1);
      }
    }

    console.log(`  ✓ Done`);
  }

  console.log("\nAll migrations complete.");
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
