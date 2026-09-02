const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  // Load the built minimal page so the Oswald webfont @font-face is present.
  await page.goto("http://localhost:8099/HTML_Codes/light-oswald-minimal.html", { waitUntil: "networkidle0" });

  const sample =
    "Armoires de cuisine livrée directement à votre porte de qualité professionnelle ABCDEFGHIJKLMNOP abcdefghijklmnop";

  const result = await page.evaluate((text) => {
    function widthOf(fam) {
      const el = document.createElement("span");
      el.textContent = text;
      el.style.cssText =
        "position:absolute;left:-99999px;top:0;white-space:nowrap;font-size:100px;font-weight:500;font-family:" + fam;
      document.body.appendChild(el);
      // force layout
      const w = el.getBoundingClientRect().width;
      el.remove();
      return w;
    }
    return {
      oswald: widthOf('"Oswald"'),
      liberation: widthOf('"Liberation Sans"'),
      arial: widthOf('Arial'),
      dejavu: widthOf('"DejaVu Sans"'),
    };
  }, sample);

  console.log(JSON.stringify(result, null, 2));
  console.log("size-adjust to match Oswald from Liberation Sans:", ((result.oswald / result.liberation) * 100).toFixed(2) + "%");
  await browser.close();
})();
