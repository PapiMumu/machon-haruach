import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";

type Args = { inputDir: string; outFile: string };

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const pick = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const inputDir = pick("--input") || "layer/nodejs";
  const outFile = pick("--out") || "layer/dependencies.zip";
  return { inputDir, outFile };
}

async function main() {
  const { inputDir, outFile } = parseArgs(process.argv);
  const inDirAbs = path.resolve(process.cwd(), inputDir);
  const outAbs = path.resolve(process.cwd(), outFile);

  if (!fs.existsSync(inDirAbs)) {
    throw new Error(`Input dir not found: ${inDirAbs}`);
  }

  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  if (fs.existsSync(outAbs)) fs.rmSync(outAbs, { force: true });

  const output = fs.createWriteStream(outAbs);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const done = new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", reject);
    archive.on("warning", (err: { code?: string; message?: string }) => {
      // Windows can race on deep node_modules paths during directory walks; skip missing entries.
      if (err?.code === "ENOENT") {
        // eslint-disable-next-line no-console
        console.warn(`zipLayer: skipping missing path (${err.message || "ENOENT"})`);
        return;
      }
      reject(err);
    });
    archive.on("error", reject);
  });

  archive.pipe(output);
  // Ensure the zip root is `nodejs/` (Lambda layer requirement)
  archive.directory(inDirAbs, "nodejs");
  await archive.finalize();
  await done;

  const size = fs.statSync(outAbs).size;
  // eslint-disable-next-line no-console
  console.log(`Layer zip created: ${outAbs} (${Math.round(size / (1024 * 1024))} MB)`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

