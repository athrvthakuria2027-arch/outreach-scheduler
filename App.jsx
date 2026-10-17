import React, { useState, useEffect, useMemo } from 'react';
import * as L from './lib.js';

const useHash = () => {
  const [h, setH] = useState(location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};
const go = (p) => { location.hash = p; };
const fmt = (t) => new Date(t).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function App() {
  const route = useHash();
  const [user, setUser] = useState(L.session());
  const [data, setData] = useState(() => (L.session() ? L.load(L.session()) : null));
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(t); }, []);
  const update = (d) => { setData(d); L.save(user, d); };
  const onAuth = (e) => { setUser(e); setData(L.load(e)); go('/dashboard'); };
  const out = () => { L.logout(); setUser(null); setData(null); go('/'); };
  const app = ['/dashboard', '/contacts', '/templates', '/schedule'];
  const authed = user && data;

  let page;
  if (route === '/login') page = <Auth mode="login" onAuth={onAuth} />;
  else if (route === '/signup') page = <Auth mode="signup" onAuth={onAuth} />;
  else if (app.includes(route)) {
    if (!authed) page = <Auth mode="login" onAuth={onAuth} note="Please log in to continue." />;
    else page = <Shell route={route} user={user} out={out}>
      {route === '/dashboard' && <Dashboard data={data} update={update} />}
      {route === '/contacts' && <Contacts data={data} update={update} />}
      {route === '/templates' && <Templates data={data} update={update} />}
      {route === '/schedule' && <Schedule data={data} update={update} />}
    </Shell>;
  } else page = <Landing user={authed} />;
  return page;
}

function Landing({ user }) {
  return (
    <div>
      <header className="top"><b className="logo">Outreach<span>Scheduler</span></b>
        <nav>{user ? <a className="btn" href="#/dashboard">Open dashboard</a> : <><a href="#/login">Log in</a><a className="btn" href="#/signup">Start free</a></>}</nav></header>
      <section className="hero">
        <h1>Send outreach emails without burning your sender reputation.</h1>
        <p>Outreach Scheduler warms up your sending gradually: 10 emails on day 1, a bit more each day, spaced with random gaps, business hours only. It pauses itself when bounces climb.</p>
        <a className="btn big" href="#/signup">Try the demo</a>
        <small>No inbox needed. Demo mode comes with sample data.</small>
      </section>
      <section className="features">
        {[['Gradual warm-up', 'Day 1 starts at 10 emails and the daily limit grows every day.'], ['Human-looking timing', 'Random gaps between sends, inside business hours only.'], ['Sender health score', 'A score out of 100 that tracks bounces and replies.'], ['Auto-pause', 'Sending stops if bounce rate passes 5% or health drops under 60.']].map(([t, d]) => <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>)}
      </section>
      <section className="pricing" id="pricing">
        <h2>Pricing</h2>
        <div className="plans">
          <div className="card plan"><h3>Starter</h3><div className="price">$9<span>/month</span></div><ul><li>1 sender inbox</li><li>Up to 1,000 contacts</li><li>Warm-up scheduler</li><li>Health score</li></ul><a className="btn" href="#/signup">Choose Starter</a></div>
          <div className="card plan hot"><h3>Pro</h3><div className="price">$19<span>/month</span></div><ul><li>5 sender inboxes</li><li>Unlimited contacts</li><li>Warm-up scheduler</li><li>Health score and auto-pause</li></ul><a className="btn" href="#/signup">Choose Pro</a></div>
        </div>
      </section>
      <footer>Outreach Scheduler - demo build</footer>
    </div>
  );
}

function Auth({ mode, onAuth, note }) {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState(''); const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault(); setErr('');
    try { onAuth(mode === 'signup' ? L.signup(email, pw, name) : L.login(email, pw)); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="authwrap">
      <form className="card auth" onSubmit={submit}>
        <a href="#/" className="logo">Outreach<span>Scheduler</span></a>
        <h2>{mode === 'signup' ? 'Create your account' : 'Log in'}</h2>
        {note && <p className="muted">{note}</p>}
        {mode === 'signup' && <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></label>
        <label>Password<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></label>
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn" type="submit">{mode === 'signup' ? 'Sign up' : 'Log in'}</button>
        <p className="muted">{mode === 'signup' ? <>Have an account? <a href="#/login">Log in</a></> : <>New here? <a href="#/signup">Sign up</a></>}</p>
      </form>
    </div>
  );
}

function Shell({ route, user, out, children }) {
  const tabs = [['/dashboard', 'Dashboard'], ['/contacts', 'Contacts'], ['/templates', 'Templates'], ['/schedule', 'Schedule']];
  return (
    <div>
      <header className="top"><a href="#/" className="logo">Outreach<span>Scheduler</span></a>
        <nav><span className="muted hide">{user}</span><button className="link" onClick={out}>Log out</button></nav></header>
      <div className="tabs">{tabs.map(([p, t]) => <a key={p} href={'#' + p} className={route === p ? 'on' : ''}>{t}</a>)}</div>
      <main className="main">{children}</main>
    </div>
  );
}

function Dashboard({ data, update }) {
  const s = L.stats(data);
  const simulate = (badBounce) => {
    const now = Date.now(); let n = 0;
    const queue = data.queue.map((x) => {
      if (x.at > now && n < 10) { n++; const r = Math.random();
        return { ...x, at: now - 1000 * (10 - n), bounced: badBounce ? r < 0.7 : r < 0.02, replied: !badBounce && r > 0.9 }; }
      return x;
    });
    update({ ...data, queue });
  };
  const reset = () => { update({ ...data, queue: L.buildSchedule(data.contacts, data.template, new Date()), sentHistory: { sent: 120, bounces: 2, replies: 9 } }); };
  const cards = [['Queued', s.queued], ['Sent today', s.sentToday], ['Daily limit', s.limit], ['Bounces', s.bounces], ['Replies', s.replies]];
  return (
    <>
      <h2>Dashboard</h2>
      {s.paused && <div className="banner" role="alert"><b>Paused.</b> {s.reason} Sending is stopped until your sender health recovers.</div>}
      <div className="grid">
        {cards.map(([t, v]) => <div className="card stat" key={t}><div className="muted">{t}</div><div className="num">{v}</div></div>)}
        <div className="card stat"><div className="muted">Sender health</div><div className={'num ' + (s.health < 60 ? 'bad' : '')}>{s.health}<small>/100</small></div>
          <div className="bar"><i style={{ width: s.health + '%' }} className={s.health < 60 ? 'bad' : ''} /></div></div>
      </div>
      <div className="card">
        <p className="muted">Bounce rate: <b>{s.bounceRate.toFixed(1)}%</b> across {s.sent} emails. Pause rule: bounce rate above 5% or health score below 60.</p>
        <div className="row">
          <button className="btn" onClick={() => simulate(false)} disabled={s.paused}>Simulate sending next 10</button>
          <button className="btn ghost" onClick={() => simulate(true)}>Simulate a bad batch (bounces)</button>
          <button className="btn ghost" onClick={reset}>Reset demo</button>
        </div>
        <p className="muted small">Demo mode: nothing is really sent. These buttons mimic a batch going out.</p>
      </div>
    </>
  );
}

function Contacts({ data, update }) {
  const [f, setF] = useState({ name: '', email: '', company: '' }); const [msg, setMsg] = useState('');
  const rebuild = (contacts) => update({ ...data, contacts, queue: L.buildSchedule(contacts, data.template, new Date()) });
  const add = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setMsg('Enter a valid email.');
    if (data.contacts.some((c) => c.email === f.email.toLowerCase())) return setMsg('That email is already in your list.');
    rebuild([...data.contacts, { id: L.uid(), name: f.name || f.email.split('@')[0], email: f.email.toLowerCase(), company: f.company }]);
    setF({ name: '', email: '', company: '' }); setMsg('Contact added and schedule updated.');
  };
  const csv = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const { rows, skipped } = L.parseCSV(await file.text());
    const have = new Set(data.contacts.map((c) => c.email));
    const fresh = rows.filter((r) => !have.has(r.email));
    rebuild([...data.contacts, ...fresh]);
    setMsg(`Imported ${fresh.length} contacts${skipped ? `, skipped ${skipped} invalid rows` : ''}${rows.length - fresh.length ? `, ${rows.length - fresh.length} duplicates ignored` : ''}.`);
    e.target.value = '';
  };
  return (
    <>
      <h2>Contacts <span className="muted">({data.contacts.length})</span></h2>
      <div className="card">
        <form className="row wrap" onSubmit={add}>
          <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input placeholder="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <button className="btn" type="submit">Add contact</button>
        </form>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <label className="btn ghost filebtn">Upload CSV<input type="file" accept=".csv,text/csv" onChange={csv} hidden data-testid="csv" /></label>
          <span className="muted small">Columns: name, email, company</span>
        </div>
        {msg && <p className="ok" role="status">{msg}</p>}
      </div>
      <div className="card tablewrap"><table><thead><tr><th>Name</th><th>Email</th><th>Company</th><th /></tr></thead><tbody>
        {data.contacts.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.company}</td><td><button className="link" onClick={() => rebuild(data.contacts.filter((x) => x.id !== c.id))}>Remove</button></td></tr>)}
      </tbody></table></div>
    </>
  );
}

function Templates({ data, update }) {
  const [t, setT] = useState(data.template); const [saved, setSaved] = useState(false);
  const sample = data.contacts[0] || { name: 'Alex', company: 'Acme' };
  const save = () => { update({ ...data, template: t, queue: L.buildSchedule(data.contacts, t, new Date()) }); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return (
    <>
      <h2>Email template</h2>
      <div className="two">
        <div className="card">
          <label>Subject<input value={t.subject} onChange={(e) => setT({ ...t, subject: e.target.value })} /></label>
          <label>Body<textarea rows="9" value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })} /></label>
          <p className="muted small">Use {'{name}'} and {'{company}'} to personalise each email.</p>
          <button className="btn" onClick={save}>Save template and rebuild schedule</button>
          {saved && <p className="ok" role="status">Saved. Schedule rebuilt.</p>}
        </div>
        <div className="card"><div className="muted">Preview for {sample.name} at {sample.company}</div>
          <h4>{L.fill(t.subject, sample)}</h4><pre className="pre">{L.fill(t.body, sample)}</pre></div>
      </div>
    </>
  );
}

function Schedule({ data }) {
  const s = L.stats(data); const now = Date.now();
  const days = useMemo(() => { const m = {}; data.queue.forEach((x) => { (m[x.day] = m[x.day] || []).push(x); }); return m; }, [data.queue]);
  return (
    <>
      <h2>Schedule</h2>
      {s.paused && <div className="banner" role="alert"><b>Paused.</b> {s.reason}</div>}
      <p className="muted">{data.queue.length} emails scheduled over {Object.keys(days).length} sending day(s). Business hours only (Mon-Fri, 9:00-17:00). Day 1 limit is 10, then +5 each day.</p>
      {Object.entries(days).map(([d, items]) => (
        <div className="card tablewrap" key={d}>
          <h4>Day {d} <span className="muted">- {items.length} of {L.dailyLimit(+d)} allowed</span></h4>
          <table><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody>
            {items.map((x) => <tr key={x.id}><td>{fmt(x.at)}</td><td>{x.to}</td><td>{x.subject}</td>
              <td><span className={'tag ' + (x.at > now ? '' : x.bounced ? 'bad' : 'good')}>{x.at > now ? (s.paused ? 'On hold' : 'Queued') : x.bounced ? 'Bounced' : x.replied ? 'Replied' : 'Sent'}</span></td></tr>)}
          </tbody></table>
        </div>))}
    </>
  );
}
