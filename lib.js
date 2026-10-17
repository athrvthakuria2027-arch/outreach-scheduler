// All data lives in localStorage (demo mode). No backend needed.
const USERS = 'os_users', SESSION = 'os_session', dataKey = (e) => 'os_data_' + e;
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function signup(email, password, name) {
  email = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  const users = read(USERS, {});
  if (users[email]) throw new Error('An account with this email already exists. Log in instead.');
  users[email] = { password, name: name || email.split('@')[0] };
  write(USERS, users); write(SESSION, email);
  write(dataKey(email), seed());
  return email;
}
export function login(email, password) {
  email = email.trim().toLowerCase();
  const u = read(USERS, {})[email];
  if (!u || u.password !== password) throw new Error('Wrong email or password.');
  write(SESSION, email); return email;
}
export const logout = () => localStorage.removeItem(SESSION);
export const session = () => read(SESSION, null);
export const userName = (e) => (read(USERS, {})[e] || {}).name || e;
export const load = (e) => read(dataKey(e), null) || seed();
export const save = (e, d) => write(dataKey(e), d);

const uid = () => Math.random().toString(36).slice(2, 9);
const FIRST = ['Aarav','Priya','Rahul','Sneha','Kabir','Meera','Arjun','Ananya','Rohan','Isha','Vikram','Neha','Dev','Tara','Sameer','Kavya'];
const COMP = ['Brightpath','Nimbus Labs','Kiln Studio','Orbit Foods','Paperkite','Lumen Co','Harbor Digital','Greenleaf'];

function seed() {
  const contacts = FIRST.map((n, i) => ({
    id: uid(), name: n, email: `${n.toLowerCase()}@${COMP[i % 8].toLowerCase().replace(/\s/g, '')}.com`, company: COMP[i % 8],
  }));
  const data = {
    contacts,
    template: {
      subject: 'Quick idea for {company}',
      body: 'Hi {name},\n\nI help teams like {company} reach customers without landing in spam. Would a 10 minute chat this week work?\n\nThanks,\nAlex',
    },
    queue: [],
    sentHistory: { sent: 120, bounces: 2, replies: 9 }, // earlier warm-up days
    startedAt: Date.now(),
  };
  data.queue = buildSchedule(contacts, data.template, new Date());
  return data;
}

export const fill = (t, c) => t.replaceAll('{name}', c.name).replaceAll('{company}', c.company);
export const dailyLimit = (day) => 10 + (day - 1) * 5; // day 1 = 10, then +5 per day
const isBiz = (d) => d.getDay() !== 0 && d.getDay() !== 6;
const START_H = 9, END_H = 17;

// Warm-up schedule: 10 emails on day 1, +5 each day, business hours only, random gaps.
export function buildSchedule(contacts, template, from, startDay = 1) {
  const out = [];
  let day = new Date(from); day.setHours(0, 0, 0, 0);
  let dayNo = startDay, i = 0;
  let cursor = new Date(from);
  const nowH = cursor.getHours() + cursor.getMinutes() / 60;
  // if now is outside business hours or weekend, start next business day at 9:00
  if (!isBiz(cursor) || nowH >= END_H - 0.5) { do { day.setDate(day.getDate() + 1); } while (!isBiz(day)); cursor = new Date(day); cursor.setHours(START_H, 0, 0, 0); }
  else if (nowH < START_H) { cursor.setHours(START_H, 0, 0, 0); }
  else { cursor = new Date(cursor.getTime() + 2 * 60000); }
  day = new Date(cursor); day.setHours(0, 0, 0, 0);
  while (i < contacts.length) {
    const limit = dailyLimit(dayNo);
    const endOfDay = new Date(day); endOfDay.setHours(END_H, 0, 0, 0);
    const startOfDay = new Date(day); startOfDay.setHours(START_H, 0, 0, 0);
    if (cursor < startOfDay) cursor = new Date(startOfDay);
    const slots = Math.min(limit, contacts.length - i);
    const span = Math.max(endOfDay - cursor, 60000);
    const avgGap = span / slots;
    let placed = 0;
    while (placed < slots && cursor < endOfDay) {
      const c = contacts[i];
      out.push({ id: uid(), contactId: c.id, to: c.email, name: c.name, day: dayNo,
        subject: fill(template.subject, c), body: fill(template.body, c), at: cursor.getTime(), status: 'queued' });
      i++; placed++;
      // random gap between 50% and 150% of the average gap
      cursor = new Date(cursor.getTime() + avgGap * (0.5 + Math.random()));
    }
    dayNo++;
    do { day.setDate(day.getDate() + 1); } while (!isBiz(day));
    cursor = new Date(day); cursor.setHours(START_H, 0, 0, 0);
  }
  return out;
}

export function stats(data, now = Date.now()) {
  const q = data.queue;
  const sentItems = q.filter((x) => x.at <= now);
  const queued = q.filter((x) => x.at > now).length;
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const sentToday = sentItems.filter((x) => x.at >= startOfToday.getTime()).length;
  const h = data.sentHistory;
  const sent = h.sent + sentItems.length;
  const bounces = h.bounces + sentItems.filter((x) => x.bounced).length;
  const replies = h.replies + sentItems.filter((x) => x.replied).length;
  const bounceRate = sent ? (bounces / sent) * 100 : 0;
  const replyRate = sent ? (replies / sent) * 100 : 0;
  const health = Math.max(0, Math.min(100, Math.round(100 - bounceRate * 8 + Math.min(replyRate, 10) * 0.5)));
  const today = q.find((x) => x.at > now) || q[q.length - 1];
  const limit = dailyLimit(today ? today.day : 1);
  const paused = bounceRate > 5 || health < 60;
  return { queued, sentToday, limit, bounces, replies, sent, bounceRate, health, paused,
    reason: bounceRate > 5 ? `Bounce rate is ${bounceRate.toFixed(1)}% (limit 5%).` : health < 60 ? `Health score is ${health} (minimum 60).` : '' };
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], skipped: 0 };
  const split = (l) => l.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
  let head = split(lines[0]).map((s) => s.toLowerCase());
  let start = 0, idx = { name: 0, email: 1, company: 2 };
  if (head.includes('email')) { start = 1; idx = { name: head.indexOf('name'), email: head.indexOf('email'), company: head.indexOf('company') }; }
  const rows = []; let skipped = 0;
  for (const l of lines.slice(start)) {
    const p = split(l);
    const email = (p[idx.email] || '').toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) { skipped++; continue; }
    rows.push({ id: uid(), name: (idx.name >= 0 && p[idx.name]) || email.split('@')[0], email, company: (idx.company >= 0 && p[idx.company]) || '' });
  }
  return { rows, skipped };
}
export { uid };
