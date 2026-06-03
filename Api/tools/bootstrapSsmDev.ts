/**
 * Creates Parameter Store entries for a stage (default: dev) so serverless.yml
 * ${ssm:/dev/...} resolves during print/deploy.
 *
 * Usage (from Api/):
 *   npm run bootstrap-ssm:dev
 *   npm run bootstrap-ssm:dev -- --dry-run
 *   BOOTSTRAP_DRY_RUN=1 npm run bootstrap-ssm:dev   (Unix; or set env in PowerShell)
 *
 * If your PC times out to AWS (firewall/VPN), generate a script and run it in
 * AWS CloudShell (browser): no local outbound SSM access required.
 *   npx tsx tools/bootstrapSsmDev.ts --cloudshell
 *   npx tsx tools/bootstrapSsmDev.ts --cloudshell --out ./put-ssm-dev.sh
 *
 * Requires (live mode): AWS credentials, ssm:PutParameter on /${stage}/*
 */

import {
  PutParameterCommand,
  SSMClient,
  type ParameterType,
} from "@aws-sdk/client-ssm";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

type ParamDef = { nameSuffix: string; value: string; type: ParameterType };

function cliArgv(): string[] {
  return process.argv.slice(2).filter((a) => !/bootstrapSsmDev\.ts$/i.test(a));
}

function parseCli() {
  const envStage = process.env.BOOTSTRAP_STAGE || "dev";
  const envRegion =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2";

  const { values } = parseArgs({
    args: cliArgv(),
    options: {
      stage: { type: "string", default: envStage },
      region: { type: "string", default: envRegion },
      "mysql-base": { type: "string", default: "" },
      "dry-run": { type: "boolean", default: false },
      "no-overwrite": { type: "boolean", default: false },
      cloudshell: { type: "boolean", default: false },
      out: { type: "string", default: "./put-ssm-dev-cloudshell.sh" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: false,
  });

  if (values.help) {
    console.log(`bootstrapSsmDev.ts — create SSM params for Serverless

Live (needs outbound HTTPS to AWS):
  npx tsx tools/bootstrapSsmDev.ts
  npx tsx tools/bootstrapSsmDev.ts --dry-run
  npx tsx tools/bootstrapSsmDev.ts --mysql-base "mysql://user:pass@host:3306"

Offline / ETIMEDOUT on your network:
  npx tsx tools/bootstrapSsmDev.ts --cloudshell
  npx tsx tools/bootstrapSsmDev.ts --cloudshell --out ./put-ssm-dev.sh

PowerShell dry-run without npm arg passing:
  $env:BOOTSTRAP_DRY_RUN = "1"; npx tsx tools/bootstrapSsmDev.ts

Environment:
  BOOTSTRAP_STAGE, BOOTSTRAP_MYSQL_BASE, CHURCHAPPS_MYSQL_BASE
  AWS_REGION / AWS_DEFAULT_REGION
  BOOTSTRAP_DRY_RUN=1  Same as --dry-run
`);
    process.exit(0);
  }

  const mysqlBase =
    (values["mysql-base"] as string)?.trim() ||
    process.env.BOOTSTRAP_MYSQL_BASE?.trim() ||
    process.env.CHURCHAPPS_MYSQL_BASE?.trim() ||
    "";

  let dryRun = values["dry-run"] === true;
  if (
    process.env.BOOTSTRAP_DRY_RUN === "1" ||
    process.env.BOOTSTRAP_DRY_RUN?.toLowerCase() === "true"
  ) {
    dryRun = true;
  }

  return {
    stage: values.stage as string,
    region: values.region as string,
    mysqlBase,
    overwrite: values["no-overwrite"] !== true,
    dryRun,
    cloudshell: values.cloudshell === true,
    cloudshellOut: (values.out as string) || "./put-ssm-dev-cloudshell.sh",
  };
}

function randomSecret(length = 56): string {
  return randomBytes(Math.ceil((length * 3) / 4))
    .toString("base64")
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .slice(0, length);
}

function buildDefs(stage: string, mysqlBase: string): ParamDef[] {
  const p = (suffix: string) => `/${stage}/${suffix}`;

  const db = (moduleDb: string) => {
    if (mysqlBase) {
      return `${mysqlBase.replace(/\/$/, "")}/${moduleDb}`;
    }
    return `mysql://REPLACE_USER:REPLACE_PASSWORD@REPLACE_HOST.rds.amazonaws.com:3306/${moduleDb}`;
  };

  const SECURE: ParameterType = "SecureString";
  const STR: ParameterType = "String";

  return [
    { nameSuffix: p("jwtSecret"), value: randomSecret(64), type: SECURE },
    { nameSuffix: p("encryptionKey"), value: randomSecret(48), type: SECURE },
    { nameSuffix: p("membershipApi/connectionString"), value: db("membership"), type: SECURE },
    { nameSuffix: p("attendanceApi/connectionString"), value: db("attendance"), type: SECURE },
    { nameSuffix: p("contentApi/connectionString"), value: db("content"), type: SECURE },
    { nameSuffix: p("givingApi/connectionString"), value: db("giving"), type: SECURE },
    { nameSuffix: p("messagingApi/connectionString"), value: db("messaging"), type: SECURE },
    { nameSuffix: p("doingApi/connectionString"), value: db("doing"), type: SECURE },
    { nameSuffix: p("reportingApi/connectionString"), value: db("reporting"), type: SECURE },
    { nameSuffix: p("hubspotKey"), value: "not-configured", type: STR },
    { nameSuffix: p("caddyHost"), value: "localhost", type: STR },
    { nameSuffix: p("caddyPort"), value: "8087", type: STR },
    { nameSuffix: p("youTubeApiKey"), value: "not-configured", type: STR },
    { nameSuffix: p("pexelsKey"), value: "not-configured", type: STR },
    { nameSuffix: p("vimeoToken"), value: "not-configured", type: STR },
    { nameSuffix: p("apiBibleKey"), value: "not-configured", type: STR },
    { nameSuffix: p("youVersionApiKey"), value: "not-configured", type: STR },
    { nameSuffix: p("praiseChartsConsumerKey"), value: "not-configured", type: STR },
    { nameSuffix: p("praiseChartsConsumerSecret"), value: "not-configured", type: STR },
    { nameSuffix: p("recaptcha-secret-key"), value: "not-configured", type: STR },
    { nameSuffix: p("openRouterApiKey"), value: "not-configured", type: STR },
    { nameSuffix: p("openAiApiKey"), value: "not-configured", type: STR },
    { nameSuffix: p("enablePaynow"), value: "true", type: STR },
  ];
}

function toB64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function emitCloudshellScript(
  defs: ParamDef[],
  region: string,
  stage: string,
  outFile: string,
): void {
  const lines: string[] = [
    "#!/usr/bin/env bash",
    `# Generated by bootstrapSsmDev.ts — run in AWS CloudShell (${region}).`,
    "# Docs: https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html",
    "set -euo pipefail",
    `REGION=${region}`,
    `echo "Putting ${defs.length} parameters in region $REGION (stage ${stage})..."`,
  ];

  for (const { nameSuffix, value, type } of defs) {
    const b64 = toB64(value);
    const typ = type === "SecureString" ? "SecureString" : "String";
    lines.push(
      `aws ssm put-parameter --region \"$REGION\" --name '${nameSuffix}' --type ${typ} --overwrite --value \"$(printf '%s' '${b64}' | base64 -d)\"`,
    );
  }

  lines.push(
    `echo "Verify: aws ssm get-parameters-by-path --path \"/${stage}\" --region \\"$REGION\\" --recursive --query Parameters[].Name --output table"`,
  );

  const pathResolved = resolve(outFile);
  writeFileSync(pathResolved, lines.join("\n") + "\n", "utf8");

  console.log(`Wrote: ${pathResolved}`);
  console.log(
    "\nETIMEDOUT from your PC usually means outbound HTTPS to AWS is blocked.\n" +
      "Next steps:\n" +
      "  1. AWS Console → CloudShell (top bar) → ensure region is " +
      region +
      "\n" +
      "  2. Actions → Upload file → pick this .sh file (or paste contents)\n" +
      "  3. chmod +x put-ssm-*.sh && ./put-ssm-*.sh\n",
  );
}

function isTimeoutError(msg: string): boolean {
  return /ETIMEDOUT|ECONNRESET|socket hang up|EAI_AGAIN/i.test(msg);
}

async function main() {
  const { stage, region, mysqlBase, overwrite, dryRun, cloudshell, cloudshellOut } = parseCli();

  const defs = buildDefs(stage, mysqlBase);

  if (cloudshell) {
    emitCloudshellScript(defs, region, stage, cloudshellOut);
    return;
  }

  const client = new SSMClient({ region });

  console.log(
    `Stage: ${stage}  Region: ${region}  Overwrite: ${overwrite}  DryRun: ${dryRun}\n` +
      (mysqlBase
        ? `Using mysql-base for module DB names.\n`
        : `WARNING: No --mysql-base / BOOTSTRAP_MYSQL_BASE. Connection strings use REPLACE_* placeholders — update SSM before deploy.\n`),
  );

  let sawTimeout = false;

  for (const { nameSuffix, value, type } of defs) {
    if (dryRun) {
      console.log(`[dry-run] PutParameter ${nameSuffix} (${type})`);
      continue;
    }
    try {
      await client.send(
        new PutParameterCommand({
          Name: nameSuffix,
          Value: value,
          Type: type,
          Overwrite: overwrite,
          Description: `ChurchApps API bootstrap (${stage})`,
        }),
      );
      console.log(`OK  ${nameSuffix}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (isTimeoutError(msg)) {
        sawTimeout = true;
      }
      console.error(`FAIL ${nameSuffix}: ${msg}`);
      process.exitCode = 1;
    }
  }

  if (sawTimeout) {
    console.error(`
Network timeout talking to AWS SSM. Common causes:
  • Corporate firewall / ISP blocking HTTPS to AWS
  • VPN routing — try disconnecting or split tunnel
  • Wrong region in firewall allowlist

Fix without opening your network: generate a CloudShell script and run it in the browser:
  npx tsx tools/bootstrapSsmDev.ts --cloudshell --out ./put-ssm-dev.sh

Test from PowerShell:
  Test-NetConnection ssm.${region}.amazonaws.com -Port 443
`);
  }

  if (!dryRun && process.exitCode !== 1) {
    console.log(`\nDone. Verify: aws ssm get-parameters-by-path --path "/${stage}" --region ${region} --recursive --query "Parameters[*].Name" --output table`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
