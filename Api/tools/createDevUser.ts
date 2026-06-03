import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

type Args = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  churchId?: string;
};

function getPositionalArgs(): string[] {
  const raw = process.argv.slice(2);
  const positional: string[] = [];
  for (const a of raw) {
    if (!a) continue;
    if (a === "--") continue;
    if (a.startsWith("--")) continue;
    positional.push(a);
  }
  return positional;
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);

  // Support `--name value` form as well.
  const idx = process.argv.indexOf(`--${name}`);
  if (idx > -1) {
    const next = process.argv[idx + 1];
    if (next && next !== "--" && !next.startsWith("--")) return next;
  }
  return undefined;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

async function main() {
  const positional = getPositionalArgs();

  const email = getArg("email") || positional[0] || "devadmin@example.com";
  const password = getArg("password") || positional[1] || "Password123!";
  const firstName = getArg("firstName") || positional[2] || "Dev";
  const lastName = getArg("lastName") || positional[3] || "Admin";
  const churchId = getArg("churchId") || positional[4];

  const args: Args = {
    email,
    password,
    firstName,
    lastName,
    churchId
  };

  const membershipConn = requireEnv("MEMBERSHIP_CONNECTION_STRING");
  const conn = await mysql.createConnection(membershipConn);

  try {
    const [existingRows] = await conn.execute<any[]>("SELECT * FROM users WHERE email=? LIMIT 1;", [args.email]);
    const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

    const hashed = bcrypt.hashSync(args.password, 10);
    const authGuid = uuidv4();

    let userId = existing?.id as string | undefined;
    if (!userId) {
      userId = uuidv4().replace(/-/g, "").slice(0, 11);
      await conn.execute(
        "INSERT INTO users (id, email, password, authGuid, firstName, lastName, registrationDate) VALUES (?, ?, ?, ?, ?, ?, NOW());",
        [userId, args.email, hashed, authGuid, args.firstName, args.lastName]
      );
    } else {
      await conn.execute(
        "UPDATE users SET password=?, authGuid=?, firstName=?, lastName=? WHERE id=?;",
        [hashed, authGuid, args.firstName, args.lastName, userId]
      );
    }

    // Link to a church so the account appears in church-scoped admin views.
    let churchId = args.churchId;
    if (!churchId) {
      const [churchRows] = await conn.execute<any[]>("SELECT id FROM churches WHERE archivedDate IS NULL OR archivedDate IS NULL LIMIT 1;");
      churchId = Array.isArray(churchRows) && churchRows.length > 0 ? (churchRows[0].id as string) : undefined;
    }

    if (churchId) {
      const [ucRows] = await conn.execute<any[]>("SELECT id FROM userChurches WHERE userId=? AND churchId=? LIMIT 1;", [userId, churchId]);
      const hasLink = Array.isArray(ucRows) && ucRows.length > 0;
      if (!hasLink) {
        const ucId = uuidv4().replace(/-/g, "").slice(0, 11);
        await conn.execute(
          "INSERT INTO userChurches (id, userId, churchId, personId, lastAccessed) VALUES (?, ?, ?, NULL, NOW());",
          [ucId, userId, churchId]
        );
      }
    }

    // Print credentials for convenience (local dev only).
    console.log("✅ Dev user ready");
    console.log(`   email: ${args.email}`);
    console.log(`   password: ${args.password}`);
    console.log(`   userId: ${userId}`);
    console.log(`   churchId: ${churchId || "(none linked)"}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error("Failed to create dev user:", err);
  process.exit(1);
});

