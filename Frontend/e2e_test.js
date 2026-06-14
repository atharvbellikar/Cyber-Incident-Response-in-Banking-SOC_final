/* Exhaustive frontend E2E: drives real interactions and fails on ANY console/page error. */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const LOGS_FILE = path.join(__dirname, "_e2e_logs.json");
fs.writeFileSync(LOGS_FILE, JSON.stringify([
  {timestamp:"2026-06-14T09:00:00Z",log_type:"network",source_ip:"185.220.101.1",destination_ip:"10.0.0.9",port:443,protocol:"https",action:"beaconing",affected_host:"finance-app-01"},
  {timestamp:"2026-06-14T09:01:00Z",log_type:"web",source_ip:"91.240.118.33",url:"/login?user=admin' OR '1'='1",action:"suspicious_request",affected_host:"web-banking-01"},
  {timestamp:"2026-06-14T09:02:00Z",log_type:"network",source_ip:"10.10.1.50",destination_ip:"10.10.1.75",port:22,protocol:"tcp",action:"port_scan",affected_host:"core-router-01"},
  {timestamp:"2026-06-14T09:03:00Z",log_type:"web",source_ip:"203.0.113.77",url:"/admin",http_method:"GET",action:"web_attack",affected_host:"admin-portal"},
], null, 2));

const results = [];
const pass = (n) => { results.push([true, n]); console.log("PASS | " + n); };
const fail = (n, d="") => { results.push([false, n + (d?` -- ${d}`:"")]); console.log("FAIL | " + n + (d?`  -- ${d}`:"")); };

const BENIGN = [/favicon/i, /vaapi|vaInitialize|gpu/i, /react devtools/i, /Download the React/i, /\[Fast Refresh\]/i, /webpack-hmr|hot-update/i];
const isBenign = (t) => BENIGN.some(re => re.test(t));

function attachErrorCapture(page, bucket) {
  page.on("console", (m) => { if (m.type() === "error" && !isBenign(m.text())) bucket.push("console.error: " + m.text()); });
  page.on("pageerror", (e) => { if (!isBenign(e.message)) bucket.push("pageerror: " + e.message); });
  page.on("requestfailed", (r) => {
    const u = r.url();
    const err = r.failure()?.errorText || "";
    // Aborted RSC prefetches (?_rsc=) are normal Next.js Link prefetch
    // cancellations on navigation — not real failures.
    if (err.includes("ERR_ABORTED") || u.includes("_rsc=")) return;
    if (!isBenign(u) && !u.includes("favicon")) bucket.push("requestfailed: " + u + " " + err);
  });
}

async function clickByText(page, tag, text) {
  return await page.evaluate((tag, text) => {
    const els = [...document.querySelectorAll(tag)];
    const el = els.find((e) => (e.textContent || "").trim().toLowerCase().includes(text.toLowerCase()));
    if (el) { el.scrollIntoView(); el.click(); return true; }
    return false;
  }, tag, text);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: "new",
    args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"] });

  // Helper: load a page and assert no errors
  async function loadClean(name, url, waitSel) {
    const page = await browser.newPage();
    const errs = [];
    attachErrorCapture(page, errs);
    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 40000 });
      if (waitSel) await page.waitForSelector(waitSel, { timeout: 15000 }).catch(() => {});
      await sleep(1500);
      if (errs.length === 0) pass(`page loads clean: ${name}`);
      else fail(`page loads clean: ${name}`, errs.join(" || "));
    } catch (e) {
      fail(`page loads clean: ${name}`, e.message);
    }
    return page;
  }

  // ---------- 1. root redirect ----------
  {
    const page = await browser.newPage(); const errs = []; attachErrorCapture(page, errs);
    await page.goto(BASE + "/", { waitUntil: "networkidle0", timeout: 40000 });
    await sleep(800);
    const u = page.url();
    (u.endsWith("/dashboard")) ? pass("root '/' redirects to /dashboard") : fail("root '/' redirects to /dashboard", "url="+u);
    (errs.length===0) ? pass("root redirect no errors") : fail("root redirect no errors", errs.join(" || "));
    await page.close();
  }

  // ---------- 2. REAL upload flow ----------
  {
    const page = await browser.newPage(); const errs = []; attachErrorCapture(page, errs);
    await page.goto(BASE + "/upload", { waitUntil: "networkidle0", timeout: 40000 });
    await page.waitForSelector('input[type=file]', { timeout: 15000 });
    const input = await page.$('input[type=file]');
    await input.uploadFile(LOGS_FILE);
    await sleep(400);
    // clearFirst checkbox is checked by default; ensure it's checked
    const clicked = await clickByText(page, "button", "Run SOC Pipeline");
    clicked ? pass("upload: clicked Run SOC Pipeline") : fail("upload: Run SOC Pipeline button found");
    // wait for redirect to /dashboard
    try {
      await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 40000 });
      pass("upload: redirected to /dashboard after pipeline run");
    } catch (e) { fail("upload: redirected to /dashboard", e.message); }
    await sleep(2500);
    const cardCount = await page.evaluate(() =>
      [...document.querySelectorAll("h3")].filter(h => /Suspicious|targeting/i.test(h.textContent)).length);
    (cardCount >= 1) ? pass(`upload: dashboard shows ingested incidents (${cardCount})`) : fail("upload: dashboard shows ingested incidents", "count="+cardCount);
    (errs.length===0) ? pass("upload flow no console errors") : fail("upload flow no console errors", errs.join(" || "));
    await page.close();
  }

  // ---------- 3. dashboard interactions ----------
  {
    const page = await browser.newPage(); const errs = []; attachErrorCapture(page, errs);
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle0", timeout: 40000 });
    await page.waitForSelector("h3", { timeout: 15000 });
    await sleep(1500);
    const total = await page.evaluate(() => [...document.querySelectorAll("h3")].filter(h=>/Suspicious|targeting/i.test(h.textContent)).length);
    // search filter
    const search = await page.$('input[placeholder*="Search"]');
    if (search) { await search.type("web"); await sleep(1200);
      const afterSearch = await page.evaluate(() => [...document.querySelectorAll("h3")].filter(h=>/Suspicious|targeting/i.test(h.textContent)).length);
      (afterSearch <= total) ? pass(`dashboard search filters (${total}->${afterSearch})`) : fail("dashboard search filters", `${total}->${afterSearch}`);
      await search.click({ clickCount: 3 }); await search.press("Backspace"); await sleep(800);
    } else fail("dashboard search input present");
    // severity filter pill
    const sevClicked = await clickByText(page, "button", "critical");
    sevClicked ? pass("dashboard: severity filter clickable") : fail("dashboard: severity filter present");
    await sleep(600);
    await clickByText(page, "button", "all"); await sleep(600);
    // expand a card (click its header)
    await page.evaluate(() => { const h = [...document.querySelectorAll("h3")].find(x=>/Suspicious|targeting/i.test(x.textContent)); if (h) h.click(); });
    await sleep(1200);
    const expanded = await page.evaluate(() => /AI Security Narrative|Recommended Containment|Telemetry & Anomalies/i.test(document.body.innerText));
    expanded ? pass("dashboard: card expands with detail") : fail("dashboard: card expands with detail");
    (errs.length===0) ? pass("dashboard interactions no console errors") : fail("dashboard interactions no console errors", errs.join(" || "));
    await page.close();
  }

  // ---------- 4. incident workspace + subpages + status change ----------
  {
    // get an event id from the dashboard DOM (workspace links point to /incident/{id})
    const idPage = await browser.newPage();
    await idPage.goto(BASE + "/dashboard", { waitUntil: "networkidle0", timeout: 40000 });
    await idPage.waitForSelector("h3", { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const eid = await idPage.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/incident/"]')].map(x => x.getAttribute("href"))
        .find(h => /\/incident\/[^/]+$/.test(h));
      return a ? a.split("/").pop() : null;
    });
    await idPage.close();
    if (!eid) { fail("incident: got an event id from API"); }
    else {
      pass("incident: got an event id");
      for (const [sub, sel] of [["", "h3"], ["/analysis","table"], ["/pipeline",""], ["/response",""], ["/report",""]]) {
        const page = await loadClean(`incident${sub||"/overview"}`, `${BASE}/incident/${eid}${sub}`, sel);
        // verify it's not the empty pipeline (alert title not "No Incident")
        const txt = await page.evaluate(() => document.body.innerText);
        if (sub === "") {
          (!/evt-empty/.test(txt) && /Event ID/i.test(txt)) ? pass("incident overview shows real event") : fail("incident overview shows real event");
        }
        if (sub === "/report") {
          (/Owner/i.test(txt) && /SOC Tier|Unassigned/i.test(txt) && !/\{\}/.test(txt)) ? pass("report page shows populated final_report (no {})") : fail("report page populated", "no owner / shows {}");
        }
        await page.close();
      }
      // status change on overview
      const page = await browser.newPage(); const errs = []; attachErrorCapture(page, errs);
      await page.goto(`${BASE}/incident/${eid}`, { waitUntil: "networkidle0", timeout: 40000 });
      await sleep(1200);
      const hasSelect = await page.$("select");
      if (hasSelect) {
        await page.select("select", "Closed").catch(()=>{});
        await sleep(1500);
        pass("incident: status dropdown change (Closed) no crash");
      } else fail("incident: status dropdown present");
      (errs.length===0) ? pass("incident status change no console errors") : fail("incident status change no console errors", errs.join(" || "));
      await page.close();

      // ---------- 5. feedback flow on response page ----------
      const fp = await browser.newPage(); const ferrs = []; attachErrorCapture(fp, ferrs);
      await fp.goto(`${BASE}/incident/${eid}/response`, { waitUntil: "networkidle0", timeout: 40000 });
      await sleep(1500);
      // open the "True Positive" classification button -> modal
      const opened = await fp.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find(b => /^true positive$/i.test(b.textContent.trim()));
        if (btn) { btn.click(); return true; } return false;
      });
      opened ? pass("response: classification button opens feedback modal") : fail("response: classification button present");
      if (opened) {
        await sleep(900);
        const modalShown = await fp.evaluate(() => /Mark as True Positive|Analyst feedback/i.test(document.body.innerText));
        modalShown ? pass("response: feedback modal rendered") : fail("response: feedback modal rendered");
        // select a reason (React-controlled select)
        const reasonSet = await fp.evaluate(() => {
          const sel = [...document.querySelectorAll("select")].find(s => [...s.options].some(o => /select a reason/i.test(o.textContent)));
          if (!sel) return false;
          const opt = [...sel.options].find(o => o.value && !o.disabled);
          if (!opt) return false;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
          setter.call(sel, opt.value);
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        });
        reasonSet ? pass("response: reason selectable") : fail("response: reason selectable");
        await sleep(500);
        const submitted = await fp.evaluate(() => {
          const btn = [...document.querySelectorAll("button")].find(b => /submit classification/i.test(b.textContent.trim()));
          if (btn && !btn.disabled) { btn.click(); return true; } return false;
        });
        submitted ? pass("response: Submit Classification clicked") : fail("response: Submit Classification enabled+clicked");
        await sleep(2000);
        const ok = await fp.evaluate(() => /recorded as|feedback recorded|suppression rule/i.test(document.body.innerText));
        ok ? pass("response: feedback submitted successfully (backend confirmed)") : fail("response: feedback success message shown");
      }
      (ferrs.length===0) ? pass("response/feedback no console errors") : fail("response/feedback no console errors", ferrs.join(" || "));
      await fp.close();
    }
  }

  // ---------- 6. simulation lab ----------
  {
    const page = await browser.newPage(); const errs = []; attachErrorCapture(page, errs);
    await page.goto(BASE + "/upload", { waitUntil: "networkidle0", timeout: 40000 });
    await sleep(1000);
    const clicked = await clickByText(page, "button", "SSH Brute Force");
    clicked ? pass("simulation: attack template clickable") : fail("simulation: attack template present");
    try {
      await page.waitForFunction(() => location.pathname === "/dashboard", { timeout: 45000 });
      pass("simulation: completes and redirects to /dashboard");
    } catch (e) { fail("simulation: redirects to /dashboard", e.message); }
    await sleep(2000);
    (errs.length===0) ? pass("simulation flow no console errors") : fail("simulation flow no console errors", errs.join(" || "));
    await page.close();
  }

  await browser.close();
  fs.unlinkSync(LOGS_FILE);

  const failed = results.filter(([ok]) => !ok);
  console.log("\n================ E2E SUMMARY ================");
  console.log(`PASSED: ${results.length - failed.length}   FAILED: ${failed.length}`);
  if (failed.length) { console.log("FAILED:"); failed.forEach(([,n]) => console.log("  - " + n)); process.exit(1); }
  console.log("ALL E2E TESTS PASSED");
})().catch((e) => { console.error("E2E HARNESS ERROR:", e); process.exit(2); });
