import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const source = process.argv[2] ?? resolve(publicDir, "app-icon-source.png");

const white = { r: 255, g: 255, b: 255, alpha: 1 };

async function writeIcon(size, filename) {
  await sharp(source)
    .resize(size, size, { fit: "contain", background: white })
    .png()
    .toFile(resolve(publicDir, filename));
}

mkdirSync(publicDir, { recursive: true });

await writeIcon(192, "icon-192.png");
await writeIcon(512, "icon-512.png");
await sharp(source)
  .resize(512, 512, { fit: "contain", background: white })
  .png()
  .toFile(resolve(publicDir, "apple-touch-icon.png"));

console.info("Generated icon-192.png, icon-512.png, apple-touch-icon.png");
