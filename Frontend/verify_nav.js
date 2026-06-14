// Verify workspace back-navigation works on EVERY incident section.
// Run after rebuild + prod restart. Usage: node verify_nav.js
const p = require("puppeteer-core");
const B = "http://localhost:3000";
const CHROME = "/usr/bin/chromium";

const SECTIONS = ["", "/analysis", "/response", "/report", "/pipeline"];

(async () => {
  const browser = await p.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
  const pg = await browser.newPage();
  let pass = 0, fail = 0;
  const F = (m) => { console.log("FAIL | " + m); fail++; };
  const P = (m) => { console.log("PASS | " + m); pass++; };

  // get a real incident id from the dashboard
  await pg.goto(B + "/dashboard", { waitUntil: "networkidle0", timeout: 40000 });
  await new Promise(r => setTimeout(r, 1200));
  const id = await pg.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/incident/"]')].map(x => x.getAttribute("href")).find(h => /\/incident\/[^/]+$/.test(h));
    return a ? a.split("/").pop() : null;
  });
  if (!id) { console.log("NO INCIDENT — seed the dashboard first"); await browser.close(); process.exit(2); }
  console.log("incident id:", id);

  for (const sec of SECTIONS) {
    const url = `${B}/incident/${id}${sec}`;
    const name = sec || "/overview";
    await pg.goto(url, { waitUntil: "networkidle0", timeout: 40000 });
    await new Promise(r => setTimeout(r, 700));

    // 1. nav tabs present on this section?
    const hasTabs = await pg.evaluate(() => {
      const t = document.body.innerText;
      return /overview/i.test(t) && /analysis/i.test(t) && /response/i.test(t) && /report/i.test(t) && /pipeline/i.test(t);
    });
    hasTabs ? P(`${name}: section nav tabs present`) : F(`${name}: section nav tabs MISSING`);

    // 2. a back-to-dashboard control exists and navigates
    const backHref = await pg.evaluate(() => {
      const els = [...document.querySelectorAll('a,button')];
      const m = els.find(e => /back to (dashboard|workspace)|^\s*←?\s*dashboard\s*$|back to workspace/i.test((e.innerText || e.getAttribute("aria-label") || "").trim()));
      if (!m) return null;
      // prefer an <a> with href; else return marker
      const a = m.closest("a") || (m.tagName === "A" ? m : null);
      return a ? a.getAttribute("href") : "BUTTON";
    });
    if (!backHref) { F(`${name}: no back-to-dashboard control found`); continue; }

    // click it and verify we land on /dashboard
    const clicked = await pg.evaluate(() => {
      const els = [...document.querySelectorAll('a,button')];
      const m = els.find(e => /back to (dashboard|workspace)|^\s*←?\s*dashboard\s*$/i.test((e.innerText || e.getAttribute("aria-label") || "").trim()));
      if (!m) return false;
      (m.closest("a") || m).click();
      return true;
    });
    if (!clicked) { F(`${name}: back control not clickable`); continue; }
    await new Promise(r => setTimeout(r, 1500));
    const landed = pg.url();
    /\/dashboard/.test(landed) ? P(`${name}: back control → ${landed.replace(B, "")}`) : F(`${name}: back control did NOT reach /dashboard (got ${landed.replace(B, "")})`);
  }

  console.log(`\n==== nav: ${pass} passed, ${fail} failed ====`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
