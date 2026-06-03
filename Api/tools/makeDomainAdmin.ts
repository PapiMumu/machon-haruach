import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

type Args = {
  connectionString: string;
  churchId: string;
  email: string;
  dryRun: boolean;
};

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return undefined;
  return next;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function requireString(value: string | undefined, name: string): string {
  const v = (value || "").trim();
  if (!v) throw new Error(`Missing required argument: ${name}`);
  return v;
}

function getPositionalArgs(): string[] {
  // process.argv: [node, script, ...args]
  const raw = process.argv.slice(2);
  const positional: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (!a) continue;
    // npm/tsx often inject a standalone "--" separator; treat it as non-argument.
    if (a === "--") continue;
    if (a.startsWith("--")) {
      const next = raw[i + 1];
      if (next && !next.startsWith("--")) i++;
      continue;
    }
    positional.push(a);
  }
  return positional;
}

function shortId(): string {
  return uuidv4().replace(/-/g, "").slice(0, 11);
}

async function main() {
  const positional = getPositionalArgs();
  const connectionString = (getArgValue("--connection-string") || positional[0] || "").trim();
  const churchId = (getArgValue("--church-id") || positional[1] || "").trim();
  const email = (getArgValue("--email") || positional[2] || "").trim();

  const args: Args = {
    connectionString: requireString(connectionString, "--connection-string"),
    churchId: requireString(churchId, "--church-id"),
    email: requireString(email, "--email"),
    dryRun: hasFlag("--dry-run")
  };

  const conn = await mysql.createConnection(args.connectionString);
  try {
    const [userRows] = await conn.execute<any[]>("SELECT id, email FROM users WHERE email=? LIMIT 1;", [args.email]);
    const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;
    if (!user?.id) {
      throw new Error(`User not found for email ${args.email}. Register/login once first so the user exists.`);
    }

    // Ensure userChurch link exists (so the user shows under this church context)
    const [ucRows] = await conn.execute<any[]>(
      "SELECT id FROM userChurches WHERE userId=? AND churchId=? LIMIT 1;",
      [user.id, args.churchId]
    );
    const hasUserChurch = Array.isArray(ucRows) && ucRows.length > 0;

    // Ensure Domain Admins role exists for this church
    const [roleRows] = await conn.execute<any[]>(
      "SELECT id FROM roles WHERE churchId=? AND name='Domain Admins' LIMIT 1;",
      [args.churchId]
    );
    const existingRole = Array.isArray(roleRows) && roleRows.length > 0 ? roleRows[0] : null;
    const roleId = (existingRole?.id as string) || `ROL${shortId().slice(3)}`;

    // Ensure permission exists: MembershipApi / Domain / Admin
    const [permRows] = await conn.execute<any[]>(
      "SELECT id FROM rolePermissions WHERE churchId=? AND roleId=? AND apiName='MembershipApi' AND contentType='Domain' AND action='Admin' LIMIT 1;",
      [args.churchId, roleId]
    );
    const hasDomainAdminPerm = Array.isArray(permRows) && permRows.length > 0;

    // Ensure role member exists
    const [rmRows] = await conn.execute<any[]>(
      "SELECT id FROM roleMembers WHERE churchId=? AND roleId=? AND userId=? LIMIT 1;",
      [args.churchId, roleId, user.id]
    );
    const hasRoleMember = Array.isArray(rmRows) && rmRows.length > 0;

    if (args.dryRun) {
      console.log(`churchId: ${args.churchId}`);
      console.log(`userId: ${user.id}`);
      console.log(`roleId: ${roleId}`);
      console.log(`wouldCreateRole: ${!existingRole}`);
      console.log(`wouldLinkUserChurch: ${!hasUserChurch}`);
      console.log(`wouldAddDomainAdminPermission: ${!hasDomainAdminPerm}`);
      console.log(`wouldAddRoleMember: ${!hasRoleMember}`);
      return;
    }

    if (!existingRole) {
      await conn.execute("INSERT INTO roles (id, churchId, name) VALUES (?, ?, 'Domain Admins');", [roleId, args.churchId]);
    }

    if (!hasUserChurch) {
      const ucId = shortId();
      await conn.execute(
        "INSERT INTO userChurches (id, userId, churchId, personId, lastAccessed) VALUES (?, ?, ?, NULL, NOW());",
        [ucId, user.id, args.churchId]
      );
    }

    if (!hasDomainAdminPerm) {
      const rpId = `RPM${shortId().slice(3)}`;
      await conn.execute(
        "INSERT INTO rolePermissions (id, churchId, roleId, apiName, contentType, contentId, action) VALUES (?, ?, ?, 'MembershipApi', 'Domain', NULL, 'Admin');",
        [rpId, args.churchId, roleId]
      );
    }

    if (!hasRoleMember) {
      const rmId = `RME${shortId().slice(3)}`;
      await conn.execute(
        "INSERT INTO roleMembers (id, churchId, roleId, userId, dateAdded, addedBy) VALUES (?, ?, ?, ?, NOW(), ?);",
        [rmId, args.churchId, roleId, user.id, user.id]
      );
    }

    console.log(`✅ ${args.email} is now a Domain Admin for church ${args.churchId}. Log out/in to refresh permissions.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

