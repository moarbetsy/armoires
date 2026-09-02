#!/usr/bin/env node
/*
 * Build step for the static site.
 *
 * 1. Compiles + minifies Tailwind CSS from assets/css/input.css.
 * 2. Writes assets/css/main.css = @font-face declarations + compiled Tailwind
 *    (committed, canonical stylesheet — also usable via a plain <link>).
 * 3. Inlines that CSS into every page that contains a <style data-app-css></style>
 *    marker, so the critical CSS ships with the HTML and there is no
 *    render-blocking stylesheet request. Font url()s are rewritten to the correct
 *    relative path for each page's directory depth.
 *
 * The @font-face source (assets/css/fonts.css) uses the token __FONTS__/ as the
 * font directory base so it can be rewritten per output location.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssDir = path.join(root, "assets", "css");
const tailwindBin = path.join(root, "node_modules", ".bin", "tailwindcss");

console.log("Compiling Tailwind CSS...");
execFileSync(
  tailwindBin,
  ["-i", path.join(cssDir, "input.css"), "-o", path.join(cssDir, "tailwind.css"), "--minify"],
  { stdio: "inherit", cwd: root }
);

const fontsTemplate = fs.readFileSync(path.join(cssDir, "fonts.css"), "utf8").trim();
const tailwind = fs.readFileSync(path.join(cssDir, "tailwind.css"), "utf8").trim();

// Canonical external stylesheet (fonts dir relative to assets/css/ is ../fonts/)
const mainCss = fontsTemplate.replace(/__FONTS__\//g, "../fonts/") + "\n" + tailwind;
fs.writeFileSync(path.join(cssDir, "main.css"), mainCss);
console.log("Wrote assets/css/main.css");

// Discover pages.
const pages = [];
for (const entry of fs.readdirSync(root)) {
  if (entry.endsWith(".html")) pages.push({ file: path.join(root, entry), prefix: "assets/fonts/" });
}
const sub = path.join(root, "HTML_Codes");
if (fs.existsSync(sub)) {
  for (const entry of fs.readdirSync(sub)) {
    if (entry.endsWith(".html")) pages.push({ file: path.join(sub, entry), prefix: "../assets/fonts/" });
  }
}

// Build a per-page minimal Tailwind CSS so each page ships only what it uses.
// The full stylesheet (loaded non-render-blocking) carries every @font-face
// (referenced from assets/css/pages/, so fonts live at ../../fonts/).
function buildPageCss(file, detectHtml) {
  const tmp = path.join(root, ".page.css.tmp");
  execFileSync(
    tailwindBin,
    ["--content", file, "-i", path.join(cssDir, "input.css"), "-o", tmp, "--minify"],
    { cwd: root, stdio: "pipe" }
  );
  const utilities = fs.readFileSync(tmp, "utf8").trim();
  fs.unlinkSync(tmp);
  return fontsForFullSheet(detectHtml) + "\n" + utilities;
}

// All @font-face for the families used, with paths relative to assets/css/pages/.
// `detectHtml` must be the page markup with the injected critical <style> removed,
// otherwise previously-inlined @font-face names re-trigger detection (feedback loop).
function fontsForFullSheet(detectHtml) {
  const families = ["Inter"];
  if (/Playfair Display/.test(detectHtml)) families.push("Playfair Display");
  if (/Oswald/.test(detectHtml)) families.push("Oswald");
  const blocks = fontsTemplate.split(/(?=@font-face)/).filter((b) => b.trim());
  return blocks
    .filter((b) => families.some((f) => b.includes(`font-family: '${f}'`)))
    .join("\n")
    .replace(/__FONTS__\//g, "../../fonts/")
    .trim();
}

// Only the above-the-fold font weights are inlined, and only the LATIN subset, so
// the HTML document stays small enough to arrive within the initial TCP congestion
// window (one RTT -> fast, stable FCP/LCP). The body font (Inter 400) and the LCP
// heading font (Playfair 700 on dark pages, Oswald 500 on light pages) cover all
// above-the-fold text (French text lives in U+0000-00FF). Every other weight and the
// latin-ext subset load via the async full stylesheet.
function criticalFontsForPage(detectHtml, prefix) {
  const wanted = [{ fam: "Inter", weight: "400", style: "normal" }];
  if (/Playfair Display/.test(detectHtml)) wanted.push({ fam: "Playfair Display", weight: "700", style: "normal" });
  if (/Oswald/.test(detectHtml)) wanted.push({ fam: "Oswald", weight: "500", style: "normal" });
  const blocks = fontsTemplate.split(/(?=@font-face)/).filter((b) => b.trim());
  const kept = blocks.filter(
    (b) =>
      !b.includes("latin-ext") &&
      wanted.some(
        (w) =>
          b.includes(`font-family: '${w.fam}'`) &&
          b.includes(`font-weight: ${w.weight};`) &&
          b.includes(`font-style: ${w.style};`)
      )
  );
  return kept.join("\n").replace(/__FONTS__\//g, prefix).trim();
}

// Build critical CSS from the above-the-fold fragment (body start -> <!--fold-->).
function buildCriticalCss(file, html, detectHtml) {
  const bodyIdx = html.indexOf("<body");
  const foldIdx = html.indexOf("<!--fold-->");
  if (bodyIdx === -1 || foldIdx === -1) return buildPageCss(file, detectHtml); // fallback: full
  const frag = html.slice(bodyIdx, foldIdx);
  const tmp = path.join(root, ".frag.html.tmp");
  const tmpOut = path.join(root, ".frag.css.tmp");
  fs.writeFileSync(tmp, frag);
  execFileSync(
    tailwindBin,
    ["--content", tmp, "-i", path.join(cssDir, "input.css"), "-o", tmpOut, "--minify"],
    { cwd: root, stdio: "pipe" }
  );
  const css = fs.readFileSync(tmpOut, "utf8").trim();
  fs.unlinkSync(tmp);
  fs.unlinkSync(tmpOut);
  return css;
}

const pagesDir = path.join(root, "assets", "css", "pages");
fs.mkdirSync(pagesDir, { recursive: true });

const styleMarker = /<style data-app-css>[\s\S]*?<\/style>/;
const fullMarker = /<!--app-css-full:start-->[\s\S]*?<!--app-css-full:end-->/;
let injected = 0;
for (const { file, prefix } of pages) {
  let html = fs.readFileSync(file, "utf8");
  if (!styleMarker.test(html)) continue;

  // Detection markup: strip the previously-injected critical <style> so its
  // @font-face family names don't feed back into font-family detection.
  const detectHtml = html.replace(styleMarker, "").replace(fullMarker, "");

  const name = path.basename(file, ".html");
  const fullCss = buildPageCss(file, detectHtml);
  fs.writeFileSync(path.join(pagesDir, name + ".css"), fullCss);

  const critical = buildCriticalCss(file, html, detectHtml);
  const fontsCss = criticalFontsForPage(detectHtml, prefix);
  const inline = fontsCss + "\n" + critical;
  html = html.replace(styleMarker, `<style data-app-css>${inline}</style>`);

  // Non-render-blocking full stylesheet (everything, incl. below-the-fold).
  const cssHref = (file.includes(path.sep + "HTML_Codes" + path.sep) ? "../" : "") + "assets/css/pages/" + name + ".css";
  const fullTag =
    `<!--app-css-full:start--><link rel="preload" href="${cssHref}" as="style" onload="this.onload=null;this.rel='stylesheet'" />` +
    `<noscript><link rel="stylesheet" href="${cssHref}" /></noscript><!--app-css-full:end-->`;
  if (fullMarker.test(html)) html = html.replace(fullMarker, fullTag);

  fs.writeFileSync(file, html);
  injected++;
  console.log(
    "Built", path.relative(root, file),
    `critical ${(inline.length / 1024).toFixed(1)}KB, full ${(fullCss.length / 1024).toFixed(1)}KB`
  );
}
console.log(`Done. Processed ${injected} page(s).`);
