#!/usr/bin/env node
/**
 * Generates PWA icons from logo.svg for iOS and Android.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcSvg = join(root, 'public', 'logo.svg');
const outDir = join(root, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function main() {
  await mkdir(outDir, { recursive: true });
  const svg = await readFile(srcSvg);

  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
  console.log('PWA icons generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
