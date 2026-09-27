# Raksha Safe - Full End-to-End Real Browser Test Suite
# Run with: node real_full_test.js
# Requires: frontend at http://localhost:5173, backend at http://127.0.0.1:5000, AI at :8000
# Uses puppeteer-core -> system Chrome. Screenshots saved into ./real_screens.
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'real_screens');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rakshasafe.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const RESPONDER_EMAIL = process.env.RESPONDER_EMAIL || 'responder@rakshasafe.local';
const RESPONDER_PASSWORD = process.env.RESPONDER_PASSWORD || 'Resp@1234';
const BASE = 'http://localhost:5173';

let browser, page;

async function shot(name) {
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  console.log('>> screenshot:', name);
}

async function type(sel, val) {
  await page.waitForSelector(sel, { visible: true, timeout: 15000 });
  await page.click(sel, { clickCount: 3 });
  await page.type(sel, val, { delay: 12 });
}

async function goto(hash) {
  await page.goto(BASE + '/#' + hash, { waitUntil: 'networkidle2', timeout: 40000 });
  await new Promise(r => setTimeout(r, 1600));
}

async function selectOption(setIdx, wanted) {
  const sels = await page.$$('select');
  const s = sels[setIdx];
  if (!s) return false;
  const opts = await s.$$('option');
  for (const o of opts) {
    const txt = await o.evaluate(el => (el.textContent || '').trim());
    if (txt.toLowerCase().includes(wanted.toLowerCase())) {
      const val = await o.evaluate(el => el.value);
      await s.select(val);
      return true;
    }
  }
  return false;
}

async function clickButton(text) {
  const handles = await page.$$('button');
  for (const h of handles) {
    const t = await h.evaluate(el => (el.textContent || '').trim());
    if (t.toLowerCase().includes(text.toLowerCase())) { await h.click(); return true; }
  }
  return false;
}

async function clickButtonExact(text) {
  const handles = await page.$$('button');
  for (const h of handles) {
    const t = await h.evaluate(el => (el.textContent || '').trim());
    if (t === text) { await h.click(); return true; }
  }
  return false;
}

async function logout() {
  await goto('/home');
  for (const h of await page.$$('button')) {
    const t = await h.evaluate(el => (el.textContent || '').trim());
    if (/log out|logout/i.test(t)) { await h.click(); await new Promise(r => setTimeout(r, 1800)); break; }
  }
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const dir = 'C:/Users/SAI/AppData/Local/Temp/opencode/chrome_prof_' + Date.now();
  fs.mkdirSync(dir, { recursive: true });
  browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', userDataDir: dir,
    defaultViewport: { width: 1360, height: 850 },
    args: ['--no-sandbox', '--disable-gpu', '--lang=en-GB'],
  });
  page = await browser.newPage();

  // PHASE 1: USER FLOW
  await goto('/home'); await shot('01_login_page');

  await goto('/register'); await shot('02_register_page');
  const ts = Date.now().toString().slice(-6);
  const emailU = 'priya' + ts + '@raksha.test';
  const phoneU = '9' + ('9' + ts).padEnd(10, '7').slice(0, 9);
  await type('input[name="name"]', 'Priya Sharma');
  await type('input[name="email"]', emailU);
  await type('input[name="phone"]', phoneU);
  await type('input[name="password"]', 'Secure@123');
  await type('input[name="confirmPassword"]', 'Secure@123');
  await page.evaluate(() => { const cb = document.querySelector('input[name="terms"]'); if (cb && !cb.checked) cb.click(); });
  await shot('03_register_form_filled');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4500));
  await shot('04_user_dashboard_after_register');

  // SOS incident creation (full 4-step flow)
  await goto('/sos'); await shot('05_sos_page');
  await selectOption(0, 'Safety');
  await new Promise(r => setTimeout(r, 300));
  await selectOption(1, 'Women Safety');
  await new Promise(r => setTimeout(r, 300));
  await selectOption(2, 'Critical');
  await type('textarea', 'Feeling unsafe near the bus stop on MG Road. Please help - sharing my location.');
  await shot('06_sos_form_filled');
  await clickButton('Continue to location');
  await new Promise(r => setTimeout(r, 2500));
  await shot('07_sos_location_step');
  await clickButtonExact('Continue without location');
  await new Promise(r => setTimeout(r, 2000));
  await clickButtonExact('Review emergency request');
  await new Promise(r => setTimeout(r, 2000));
  await shot('08_sos_review_step');
  await clickButtonExact('Confirm SOS');
  await new Promise(r => setTimeout(r, 4000));
  await shot('09_incident_confirmed');

  await goto('/dashboard'); await shot('10_dashboard_with_incident');
  await goto('/notifications'); await shot('11_notifications_page');
  await goto('/resources'); await shot('12_resources_page');
  await goto('/contacts'); await shot('13_emergency_contacts_page');
  await goto('/profile'); await shot('14_profile_page');

  // PHASE 2: ADMIN FLOW
  await logout();
  await goto('/home'); await shot('15_before_admin_login');
  await type('input[name="identifier"]', ADMIN_EMAIL);
  await type('input[name="password"]', ADMIN_PASSWORD);
  await shot('16_admin_login_filled');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4500));
  await shot('17_admin_dashboard');

  await goto('/admin/incidents'); await new Promise(r => setTimeout(r, 2500)); await shot('18_admin_incidents');
  await goto('/admin/users'); await new Promise(r => setTimeout(r, 2500)); await shot('19_admin_users');
  await goto('/admin/facilities'); await new Promise(r => setTimeout(r, 2500)); await shot('20_admin_facilities');
  await goto('/admin/teams'); await new Promise(r => setTimeout(r, 2500)); await shot('21_admin_teams');
  await goto('/admin/unsafe-reports'); await new Promise(r => setTimeout(r, 2500)); await shot('22_admin_unsafe_reports');
  await goto('/reports'); await new Promise(r => setTimeout(r, 2500)); await shot('23_reports_page');

  // PHASE 3: RESPONDER FLOW
  await logout();
  await goto('/home');
  await type('input[name="identifier"]', RESPONDER_EMAIL);
  await type('input[name="password"]', RESPONDER_PASSWORD);
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4500));
  console.log('responder login URL:', page.url());
  await shot('24_responder_dashboard');

  browser.close();
  console.log('ALL DONE - screenshots in ' + OUT);
})().catch(e => { console.error('FAILED:', e.message); if (browser) browser.close(); process.exit(1); });