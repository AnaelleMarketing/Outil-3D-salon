<?php
// Connexion (hébergement OVH) : comptes et secret lus dans lib/config.php, généré au déploiement
// à partir des secrets GitHub STAND_USERS (JSON {identifiant: code}) et STAND_SECRET.
// Cookie de session signé, même format que la version Vercel : identifiant~expiration.signature

const STAND_COOKIE = 'stand3d_session';
const STAND_DAYS = 30;

function stand_config()
{
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/config.php';
        $c = is_file($f) ? include $f : [];
        if (!is_array($c)) $c = [];
    }
    return $c;
}

/** Comptes autorisés : [identifiant (minuscules) => code] */
function stand_accounts()
{
    $out = [];
    foreach ((array) (stand_config()['users'] ?? []) as $k => $v) $out[strtolower((string) $k)] = (string) $v;
    return $out;
}

function stand_secret()
{
    return (string) (stand_config()['secret'] ?? '');
}

function stand_display($id)
{
    return ucfirst($id);
}

function stand_https()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function stand_cookie($value, $maxAge)
{
    setcookie(STAND_COOKIE, $value, [
        'expires' => $maxAge > 0 ? time() + $maxAge : time() - 3600,
        'path' => '/',
        'secure' => stand_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/** Identité vérifiée à partir du cookie de session signé (jamais à partir du client) */
function stand_user()
{
    $v = (string) ($_COOKIE[STAND_COOKIE] ?? '');
    $secret = stand_secret();
    if ($v === '' || $secret === '') return null;
    $parts = explode('.', $v, 2);
    if (count($parts) !== 2) return null;
    list($payload, $sig) = $parts;
    $p = explode('~', $payload, 2);
    if (count($p) !== 2) return null;
    list($user, $exp) = $p;
    if ((float) $exp < microtime(true) * 1000) return null;
    if (!array_key_exists($user, stand_accounts())) return null;
    return hash_equals(hash_hmac('sha256', $payload, $secret), $sig) ? $user : null;
}

/** Vérifie identifiant + code ; ouvre la session si c'est bon */
function stand_login($user, $pass)
{
    $user = strtolower(trim((string) $user));
    $accounts = stand_accounts();
    if (!array_key_exists($user, $accounts) || !hash_equals($accounts[$user], (string) $pass)) return false;
    $payload = $user . '~' . ((int) round(microtime(true) * 1000) + STAND_DAYS * 86400000);
    stand_cookie($payload . '.' . hash_hmac('sha256', $payload, stand_secret()), STAND_DAYS * 86400);
    return true;
}

function stand_logout()
{
    stand_cookie('', 0);
}
