import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import mysql from "mysql2/promise";

type Args = {
  stage: string;
  region: string;
  keepChurchId?: string;
  keepChurchName: string;
  connectionString?: string;
  dryRun: boolean;
  listOnly: boolean;
  confirm: boolean;
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
    if (a.startsWith("--")) {
      // Skip flag value if present
      const next = raw[i + 1];
      if (next && !next.startsWith("--")) i++;
      continue;
    }
    positional.push(a);
  }
  return positional;
}

async function getMembershipConnectionStringFromSsm(stage: string, region: string): Promise<string> {
  const name = `/${stage.toLowerCase()}/membershipApi/connectionString`;
  const client = new SSMClient({ region });
  const result = await client.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const value = result.Parameter?.Value || "";
  if (!value) throw new Error(`SSM parameter ${name} is empty or missing.`);
  return value;
}

async function main() {
  const positional = getPositionalArgs();
  const stageFromFlags = (getArgValue("--stage") || "").trim();
  const regionFromFlags = (getArgValue("--region") || "").trim();

  const stage = stageFromFlags || (positional[0] || "").trim();
  const region = regionFromFlags || (positional[1] || "us-east-2").trim();

  const args: Args = {
    stage: requireString(stage, "--stage"),
    region,
    keepChurchId: (getArgValue("--keep-church-id") || "").trim() || undefined,
    keepChurchName: (getArgValue("--keep-church-name") || "Spirit Embassy").trim(),
    connectionString: (getArgValue("--connection-string") || "").trim() || undefined,
    dryRun: hasFlag("--dry-run"),
    listOnly: hasFlag("--list"),
    confirm: hasFlag("--confirm")
  };

  const stageLower = args.stage.toLowerCase();
  const connStr = args.connectionString || (await getMembershipConnectionStringFromSsm(stageLower, args.region));

  const conn = await mysql.createConnection(connStr);
  try {
    const [churches] = await conn.execute<any[]>("SELECT id, name, subDomain, archivedDate FROM churches ORDER BY name;");

    if (!churches || churches.length === 0) {
      console.log("No churches found.");
      return;
    }

    if (args.listOnly) {
      console.log(`Stage: ${args.stage}`);
      for (const c of churches) {
        const status = c.archivedDate ? "archived" : "active";
        console.log(`${c.id}\t${status}\t${c.subDomain || ""}\t${c.name || ""}`);
      }
      return;
    }

    const normalize = (s: string) => (s || "").toLowerCase().trim();
    const keepById = args.keepChurchId ? churches.find((c) => c.id === args.keepChurchId) : undefined;
    const keepByName = churches.find((c) => normalize(c.name).includes(normalize(args.keepChurchName)));
    const keep = keepById || keepByName;

    if (!keep) {
      throw new Error(
        `Could not find a church to keep. Provide --keep-church-id or ensure a church name contains "${args.keepChurchName}".`
      );
    }

    const active = churches.filter((c) => !c.archivedDate);
    const toArchive = active.filter((c) => c.id !== keep.id);

    console.log(`Stage: ${args.stage}`);
    console.log(`Keeping church: ${keep.id} (${keep.name})`);
    console.log(`Active churches: ${active.length}`);
    console.log(`Would archive: ${toArchive.length}`);

    if (args.dryRun) {
      for (const c of toArchive.slice(0, 25)) {
        console.log(`- ${c.id} (${c.name})`);
      }
      if (toArchive.length > 25) console.log(`...and ${toArchive.length - 25} more`);
      return;
    }

    if (!args.confirm) {
      throw new Error('Refusing to modify data without "--confirm". Re-run with --confirm (or use --dry-run).');
    }

    // Unarchive the kept church (in case it was archived previously)
    await conn.execute("UPDATE churches SET archivedDate=NULL WHERE id=?;", [keep.id]);

    // Archive all other active churches
    const [result] = await conn.execute<any>(
      "UPDATE churches SET archivedDate=NOW() WHERE id<>? AND archivedDate IS NULL;",
      [keep.id]
    );

    console.log(`Archived churches updated. affectedRows=${result?.affectedRows ?? "unknown"}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});

