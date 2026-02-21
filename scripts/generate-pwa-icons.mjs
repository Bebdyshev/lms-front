#!/usr/bin/env node
/**
 * Generates PWA icons from logo.svg for iOS and Android.
 * White background, blue logo.
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

const LOGO_BLUE = '#2563eb'; // blue-600
const BG_WHITE = '#ffffff';

async function main() {
  await mkdir(outDir, { recursive: true });
  let svg = await readFile(srcSvg, 'utf-8');
  svg = svg.replace(/fill="#000000"/g, `fill="${LOGO_BLUE}"`);
  const svgBuffer = Buffer.from(svg);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .flatten({ background: BG_WHITE })
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
