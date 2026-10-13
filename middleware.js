// Protection du site sur Vercel : page de connexion (identifiant + code) et cookie de session signé.
// Variables d'environnement Vercel : STAND_USERS (JSON {identifiant: code}), STAND_SECRET.
// (STAND_USER / STAND_PASS restent acceptés comme compte unique de secours.)

export const config = {
  matcher: ['/((?!brand/|mentions-legales).*)'],
};

const COOKIE = 'stand3d_session';
const DAYS = 30;
const enc = new TextEncoder();

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Comptes autorisés : { identifiant (minuscules) : code } */
function accounts() {
  const out = {};
  try {
    Object.assign(out, JSON.parse(process.env.STAND_USERS || '{}'));
  } catch (e) {
    /* variable mal formée : on ignore */
  }
  if (process.env.STAND_USER && process.env.STAND_PASS) out[process.env.STAND_USER.toLowerCase()] ??= process.env.STAND_PASS;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k.toLowerCase(), String(v)]));
}

/** Jeton de session : identifiant~expiration.signature */
async function sessionUser(req, secret) {
  const v = getCookie(req, COOKIE);
  if (!v) return null;
  const [payload, sig] = v.split('.');
  const [user, exp] = (payload || '').split('~');
  if (!user || !exp || !sig || Number(exp) < Date.now()) return null;
  if (!(user in accounts())) return null;
  return safeEqual(sig, await hmac(payload, secret)) ? user : null;
}

const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

function loginPage(error = '') {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connexion – Stand 3D Spengler Medical</title><link rel="icon" href="/brand/favicon.png">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#fff;
background:radial-gradient(ellipse at 70% 40%,#2b5fa8 0%,#1b2f63 40%,#141634 75%,#0e0f26 100%);padding:16px}
.card{width:100%;max-width:380px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:34px 28px;backdrop-filter:blur(8px);box-shadow:0 20px 60px rgba(0,0,0,.35)}
.brand{display:flex;flex-direction:column;align-items:center;margin-bottom:26px;font-family:'Gill Sans','Gill Sans MT',Calibri,sans-serif}
.brand img{width:56px;margin-bottom:8px}.b1{font-size:34px;letter-spacing:.02em;color:#d9dbdd;line-height:1}.b2{font-size:14px;letter-spacing:.42em;padding-left:.42em;color:#b9bcc0;margin-top:5px}
h1{font-size:18px;font-weight:600;text-align:center;margin:0 0 22px;color:#d3e2e7}
label{display:block;font-size:13px;color:#b9c8d6;margin:0 0 6px}input{width:100%;height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:16px;padding:0 12px;margin-bottom:16px;outline:none}
input:focus{border-color:#52e3e8;box-shadow:0 0 0 3px rgba(82,227,232,.2)}
button{width:100%;height:48px;border:0;border-radius:24px;background:#fff;color:#1b2f63;font-size:16px;font-weight:700;cursor:pointer;margin-top:6px}
.err{background:rgba(224,57,62,.18);border:1px solid rgba(224,57,62,.5);color:#ffd2d3;border-radius:10px;padding:9px 12px;font-size:13px;margin-bottom:16px;text-align:center}
.foot{margin-top:22px;text-align:center;font-size:11.5px;letter-spacing:.06em;color:rgba(211,226,231,.55)}
</style></head><body><form class="card" method="POST" action="/__login">
<div class="brand"><img src="/brand/logo-s.png" alt=""><span class="b1">SPENGLER</span><span class="b2">MEDICAL</span></div>
<h1>Conception de stand 3D</h1>${error ? `<div class="err">${error}</div>` : ''}
<label for="u">Identifiant</label><input id="u" name="user" autocomplete="username" required autofocus>
<label for="p">Code</label><input id="p" name="pass" type="password" autocomplete="current-password" required>
<button type="submit">Se connecter</button>
<div class="foot">Outil de conception 3D – Propriétaire : Anaelle Cintract<br><a href="/mentions-legales.html" style="color:#9fc3d6">Mentions légales et conditions d’utilisation</a></div></form></body></html>`;
  return new Response(html, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const { STAND_SECRET } = process.env;
  const users = accounts();
  if (!STAND_SECRET || !Object.keys(users).length) return new Response('Site non configuré.', { status: 503 });

  if (url.pathname === '/__logout') {
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (url.pathname === '/__login' && req.method === 'POST') {
    const form = await req.formData();
    const user = String(form.get('user') || '').trim().toLowerCase();
    const ok = user in users && safeEqual(String(form.get('pass') || ''), users[user]);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 900)); // freine les essais répétés
      return loginPage('Identifiant ou code incorrect.');
    }
    const payload = `${user}~${Date.now() + DAYS * 864e5}`;
    const token = `${payload}.${await hmac(payload, STAND_SECRET)}`;
    return new Response(null, {
      status: 303,
      headers: { location: '/', 'set-cookie': `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` },
    });
  }

  if (await sessionUser(req, STAND_SECRET)) return next();
  if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({ error: 'non connecté' }), { status: 401, headers: { 'content-type': 'application/json' } });
  return loginPage();
}
