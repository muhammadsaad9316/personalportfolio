// Run manually with `node scripts/optimize-images.cjs`; never reduce pixel detail.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const screenshots = 'public/media/screenshotofSalamCargoo';
const active = new Set(['01-branch-overview.png', '03-expenses.png', '05-arrival-management.png']);
const files = [
  ...['01-branch-overview.png', '02-bilties.png', '03-expenses.png',
    '04-company-overview.png', '05-arrival-management.png'].map(name => `${screenshots}/${name}`),
  'public/media/localhost_5173_overview.png',
];

async function verify(source, candidate) {
  const before = await sharp(source).metadata();
  const after = await sharp(candidate).metadata();
  assert.equal(after.depth, before.depth, 'Image bit depth changed');
  const original = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = await sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(result.info.width, original.info.width, 'Image width changed');
  assert.equal(result.info.height, original.info.height, 'Image height changed');
  assert(result.data.equals(original.data), 'Decoded RGBA pixels changed');
  return crypto.createHash('sha256').update(original.data).digest('hex');
}

async function main() {
  const results = [];
  for (const file of files) {
    const absolute = path.join(root, file);
    const original = await fs.readFile(absolute);
    // Palette quantization and near-lossless modes are deliberately disabled.
    const png = await sharp(original).keepMetadata()
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
    const rgbaSha256 = await verify(original, png);
    const output = png.length < original.length ? png : original;
    const result = { file, originalBytes: original.length, pngBytes: output.length, rgbaSha256 };
    if (active.has(path.basename(file))) {
      const webp = await sharp(original).keepMetadata().webp({ lossless: true, effort: 6 }).toBuffer();
      await verify(original, webp);
      assert(webp.length < original.length, 'Lossless WebP did not save bytes');
      const destination = absolute.replace(/\.png$/, '.webp');
      await fs.writeFile(destination, webp);
      result.webpFile = path.relative(root, destination).replaceAll('\\', '/');
      result.webpBytes = webp.length;
    }
    if (output !== original) await fs.writeFile(absolute, output);
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
