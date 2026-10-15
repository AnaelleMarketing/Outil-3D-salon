<?php
// Porte d'entrée du site (remplace middleware.js de Vercel) : page de connexion, puis envoi des fichiers.
// Toutes les adresses passent ici (.htaccess), sauf brand/, mentions-legales.html et api/collab.php.
require __DIR__ . '/lib/auth.php';

$p = ltrim((string) ($_GET['_gate'] ?? ''), '/');

function login_page($error = '')
{
    http_response_code(401);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $err = $error ? '<div class="err">' . htmlspecialchars($error) . '</div>' : '';
    echo <<<HTML
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connexion – Stand 3D Spengler Medical</title><link rel="icon" href="brand/favicon.png">
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
</style></head><body><form class="card" method="POST" action="__login">
<div class="brand"><img src="brand/logo-s.png" alt=""><span class="b1">SPENGLER</span><span class="b2">MEDICAL</span></div>
<h1>Conception de stand 3D</h1>$err
<label for="u">Identifiant</label><input id="u" name="user" autocomplete="username" required autofocus>
<label for="p">Code</label><input id="p" name="pass" type="password" autocomplete="current-password" required>
<button type="submit">Se connecter</button>
<div class="foot">Outil de conception 3D – Propriétaire : Anaelle Cintract<br><a href="mentions-legales.html" style="color:#9fc3d6">Mentions légales et conditions d’utilisation</a></div></form></body></html>
HTML;
    exit;
}

function not_found()
{
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Introuvable.';
    exit;
}

if (stand_secret() === '' || !stand_accounts()) {
    http_response_code(503);
    echo 'Site non configuré.';
    exit;
}

if ($p === '__logout') {
    stand_logout();
    header('Location: ./', true, 303);
    exit;
}

if ($p === '__login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!stand_login($_POST['user'] ?? '', $_POST['pass'] ?? '')) {
        usleep(900000); // freine les essais répétés
        login_page('Identifiant ou code incorrect.');
    }
    header('Location: ./', true, 303);
    exit;
}

if (!stand_user()) login_page();

// ---------- envoi du fichier demandé ----------

if ($p === '' || substr($p, -1) === '/') $p .= 'index.html';
// fichiers cachés, données, code serveur : jamais envoyés
if (preg_match('#(^|/)\.#', $p) || preg_match('#^(data|lib|api)(/|$)#', $p) || preg_match('#\.php$#i', $p)) not_found();
$root = realpath(__DIR__);
$file = realpath($root . '/' . $p);
if ($file === false || strpos($file, $root . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) not_found();

$types = [
    'html' => 'text/html; charset=utf-8', 'js' => 'text/javascript; charset=utf-8', 'mjs' => 'text/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8', 'json' => 'application/json', 'svg' => 'image/svg+xml', 'png' => 'image/png',
    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'gif' => 'image/gif', 'ico' => 'image/x-icon',
    'glb' => 'model/gltf-binary', 'gltf' => 'model/gltf+json', 'woff2' => 'font/woff2', 'woff' => 'font/woff',
    'ttf' => 'font/ttf', 'pdf' => 'application/pdf', 'mp4' => 'video/mp4', 'webm' => 'video/webm', 'txt' => 'text/plain; charset=utf-8',
];
$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$type = $types[$ext] ?? 'application/octet-stream';
$mtime = filemtime($file);

header('Content-Type: ' . $type);
header('X-Content-Type-Options: nosniff');
if (preg_match('#^assets/#', $p)) header('Cache-Control: private, max-age=31536000, immutable'); // noms avec empreinte
elseif ($ext === 'html') header('Cache-Control: no-cache');
else header('Cache-Control: private, max-age=3600');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');

$since = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';
if ($since !== '' && strtotime($since) >= $mtime) {
    http_response_code(304);
    exit;
}

// compression des fichiers texte (le bundle Three.js pèse plusieurs Mo)
$text = preg_match('#^(text/|application/json|image/svg)#', $type);
if ($text && strpos($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip') !== false && function_exists('gzencode') && !ini_get('zlib.output_compression')) {
    $gz = gzencode(file_get_contents($file), 6);
    header('Content-Encoding: gzip');
    header('Vary: Accept-Encoding');
    header('Content-Length: ' . strlen($gz));
    echo $gz;
    exit;
}
header('Content-Length: ' . filesize($file));
readfile($file);
