/**
 * One-off: trim transparent padding from the brand PNGs.
 *
 * The originals are 2000×2000 squares with the artwork centered inside lots of
 * whitespace, which made the rendered logo appear tiny no matter what size we
 * set. Trimming the alpha edges produces tight, properly-aspected assets.
 *
 * Run once with: node scripts/trim-logos.mjs
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '..', 'public');

const FILES = ['logo.png', 'mark.png', 'mark-glow.png'];

for (const name of FILES) {
  const src = path.join(PUBLIC, name);
  try {
    const before = await sharp(src).metadata();
    const buffer = await sharp(src)
      // Trim near-transparent / near-white pixels. threshold=10 is generous.
      .trim({ threshold: 10 })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(buffer).toFile(src);
    const after = await sharp(src).metadata();
    console.log(`✓ ${name}: ${before.width}×${before.height} → ${after.width}×${after.height}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
}
