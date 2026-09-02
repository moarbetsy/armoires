#!/usr/bin/env node
/*
 * Generates optimized, responsive AVIF (and a WebP logo) assets under assets/img/.
 * Sources: local Assets/*.avif kitchen photos + downloaded Unsplash sources in assets/img/_src.
 * Prints a manifest of each output's intrinsic width/height for use in <img> tags.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "assets", "img");
const srcDir = path.join(outDir, "_src");
const AVIF = { quality: 58, effort: 6 };
const manifest = {};

async function avifSet(input, base, widths, aspect /* [w,h] or null */) {
  for (const w of widths) {
    let img = sharp(input).rotate();
    if (aspect) {
      const h = Math.round((w * aspect[1]) / aspect[0]);
      img = img.resize(w, h, { fit: "cover", position: "attention" });
    } else {
      img = img.resize({ width: w });
    }
    const outName = `${base}-${w}.avif`;
    const info = await img.avif(AVIF).toFile(path.join(outDir, outName));
    manifest[outName] = { w: info.width, h: info.height, bytes: info.size };
  }
}

(async () => {
  // Shared kitchen photos (keep native aspect ratios)
  await avifSet(path.join(root, "Assets/background-main-kitchen.avif"), "bg-kitchen", [640, 960, 1280, 1920], null);
  await avifSet(path.join(root, "Assets/three-kitchens.avif"), "three-kitchens", [640, 960, 1200], null);
  await avifSet(path.join(root, "Assets/white-small-kitchen.avif"), "white-kitchen", [640, 1024], null);

  // cc.html (DentaCare) images
  await avifSet(path.join(srcDir, "hero.jpg"), "cc-hero", [640, 1280, 1920], [3, 2]);
  await avifSet(path.join(srcDir, "about.jpg"), "cc-about", [400, 800], [1, 1]);
  await avifSet(path.join(srcDir, "team1.jpg"), "cc-team1", [300, 600], [4, 5]);
  await avifSet(path.join(srcDir, "team2.jpg"), "cc-team2", [300, 600], [4, 5]);
  await avifSet(path.join(srcDir, "team3.jpg"), "cc-team3", [300, 600], [4, 5]);
  await avifSet(path.join(srcDir, "team4.jpg"), "cc-team4", [300, 600], [4, 5]);

  // Logo (used on click-cuisine.html) -> small WebP at 2x display size (h-10 => 80px tall)
  const logoInfo = await sharp(path.join(root, "logo_raw.png"))
    .resize({ height: 80 })
    .webp({ quality: 90 })
    .toFile(path.join(outDir, "logo_raw.webp"));
  manifest["logo_raw.webp"] = { w: logoInfo.width, h: logoInfo.height, bytes: logoInfo.size };

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
})();
