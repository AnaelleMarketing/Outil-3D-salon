<?php
// API de collaboration (hébergement OVH, PHP) – remplace api/collab.js de Vercel, mêmes actions et réponses.
// Données dans data/ (interdit au web par .htaccess) :
//   users/<id>/directory.json      projets visibles par les autres (nom, salon, date) pour les demandes
//   shared/<pid>/project.json      projet partagé { id, owner, members, project, assets, rev, updated, updatedBy }
//   shared/<pid>/assets/<aid>      fichiers (visuels, modèles) des projets partagés (+ <aid>.type : type MIME)
//   requests/<rid>.json            demandes { id, type: invite|join, from, to, projectId, projectName, status, created }
//   users/<id>/inbox.json          index par personne { requests: [...], shared: [pid…] }
// Les projets restent des objets JSON (json_decode sans tableau associatif) pour garder {} et [] intacts.
require dirname(__DIR__) . '/lib/auth.php';

const MAX_ASSET = 4400000;
define('DATA', dirname(__DIR__) . '/data');

function json_out($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function safe_id($s)
{
    return is_string($s) && preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $s);
}

function now_ms()
{
    return (int) round(microtime(true) * 1000);
}

function user_dir($u)
{
    return 'users/' . rawurlencode($u);
}

function read_json($rel)
{
    $f = DATA . '/' . $rel;
    if (!is_file($f)) return null;
    $d = json_decode((string) file_get_contents($f));
    return is_object($d) ? $d : null;
}

function write_json($rel, $data)
{
    write_file($rel, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION));
}

/** Écriture atomique (fichier temporaire puis renommage) */
function write_file($rel, $content)
{
    $f = DATA . '/' . $rel;
    if (!is_dir(dirname($f))) mkdir(dirname($f), 0750, true);
    $tmp = $f . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, $content);
    rename($tmp, $f);
}

/** Fichiers JSON d'un dossier de data/ (motif glob) */
function read_all($pattern)
{
    $out = [];
    foreach (glob(DATA . '/' . $pattern) ?: [] as $f) {
        $d = json_decode((string) file_get_contents($f));
        if (is_object($d)) $out[] = $d;
    }
    return $out;
}

function rm_tree($dir)
{
    if (!is_dir($dir)) return;
    foreach (scandir($dir) as $x) {
        if ($x === '.' || $x === '..') continue;
        $p = $dir . '/' . $x;
        is_dir($p) ? rm_tree($p) : unlink($p);
    }
    rmdir($dir);
}

/** Un seul écrivain à la fois (lecture-modification-écriture des index) */
function lock_data()
{
    static $h = null;
    if ($h) return;
    if (!is_dir(DATA)) mkdir(DATA, 0750, true);
    if (!is_file(DATA . '/.htaccess')) file_put_contents(DATA . '/.htaccess', "Require all denied\n");
    $h = fopen(DATA . '/.lock', 'c');
    flock($h, LOCK_EX);
}

function shared_path($pid)
{
    return "shared/$pid/project.json";
}

function inbox_path($u)
{
    return user_dir($u) . '/inbox.json';
}

function by_created_desc($x, $y)
{
    return ($y->created ?? 0) <=> ($x->created ?? 0);
}

function members($s)
{
    return array_values((array) ($s->members ?? []));
}

function is_member($s, $u)
{
    return $s && in_array($u, members($s), true);
}

/** Index d'une personne ; reconstruit une seule fois à partir des fichiers s'il n'existe pas encore */
function read_inbox($u)
{
    $ix = read_json(inbox_path($u));
    if ($ix) return $ix;
    $reqs = array_values(array_filter(read_all('requests/*.json'), function ($r) use ($u) {
        return ($r->to ?? null) === $u || ($r->from ?? null) === $u;
    }));
    usort($reqs, 'by_created_desc');
    $shared = [];
    foreach (read_all('shared/*/project.json') as $s) if (is_member($s, $u)) $shared[] = $s->id;
    $built = (object) ['requests' => array_slice($reqs, 0, 60), 'shared' => $shared];
    write_json(inbox_path($u), $built);
    return $built;
}

/** Met à jour l'index d'une personne (fn modifie l'objet) */
function edit_inbox($u, $fn)
{
    $ix = read_inbox($u);
    $ix->requests = array_values((array) ($ix->requests ?? []));
    $ix->shared = array_values((array) ($ix->shared ?? []));
    $fn($ix);
    $ix->requests = array_slice(array_values($ix->requests), 0, 60);
    $ix->shared = array_values(array_unique($ix->shared));
    write_json(inbox_path($u), $ix);
}

function upsert_request($ix, $r)
{
    $list = array_values(array_filter($ix->requests, function ($x) use ($r) {
        return ($x->id ?? null) !== $r->id;
    }));
    array_unshift($list, $r);
    usort($list, 'by_created_desc');
    $ix->requests = $list;
}

function meta_of($s)
{
    return [
        'id' => $s->id,
        'name' => $s->project->name ?? null,
        'salon' => $s->project->salon ?? null,
        'owner' => $s->owner,
        'members' => members($s),
        'rev' => $s->rev,
        'updated' => $s->updated,
        'updatedBy' => $s->updatedBy,
    ];
}

$me = stand_user();
if (!$me) json_out(['error' => 'non connecté'], 401);
$a = (string) ($_GET['a'] ?? '');
$others = array_values(array_filter(array_keys(stand_accounts()), function ($u) use ($me) {
    return $u !== $me;
}));

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($a === 'me') {
        json_out(['user' => $me, 'name' => stand_display($me), 'users' => array_map(function ($u) {
            return ['id' => $u, 'name' => stand_display($u)];
        }, $others)]);
    }

    if ($a === 'directory') {
        $out = [];
        foreach ($others as $u) {
            $d = read_json(user_dir($u) . '/directory.json');
            $out[] = ['user' => $u, 'name' => stand_display($u), 'projects' => $d->projects ?? []];
        }
        json_out($out);
    }

    // suivi régulier : demandes + projets partagés en une seule lecture d'index
    if ($a === 'inbox') {
        $ix = read_inbox($me);
        $ids = array_values((array) ($ix->shared ?? []));
        $metas = [];
        foreach ($ids as $id) {
            $s = safe_id($id) ? read_json(shared_path($id)) : null;
            if (is_member($s, $me)) $metas[] = $s;
        }
        if (count($metas) !== count($ids)) {
            lock_data();
            edit_inbox($me, function ($i) use ($metas) {
                $i->shared = array_map(function ($s) {
                    return $s->id;
                }, $metas);
            });
        }
        json_out(['requests' => array_values((array) ($ix->requests ?? [])), 'shared' => array_map('meta_of', $metas)]);
    }

    if ($a === 'requests') {
        $reqs = array_values(array_filter(read_all('requests/*.json'), function ($r) use ($me) {
            return ($r->to ?? null) === $me || ($r->from ?? null) === $me;
        }));
        usort($reqs, 'by_created_desc');
        json_out(array_slice($reqs, 0, 60));
    }

    if ($a === 'shared') {
        $all = array_filter(read_all('shared/*/project.json'), function ($s) use ($me) {
            return is_member($s, $me);
        });
        json_out(array_values(array_map('meta_of', $all)));
    }

    if ($a === 'project' || $a === 'meta') {
        $id = $_GET['id'] ?? '';
        if (!safe_id($id)) json_out(['error' => 'id invalide'], 400);
        $s = read_json(shared_path($id));
        if (!$s) json_out(['error' => 'introuvable'], 404);
        if (!is_member($s, $me)) json_out(['error' => 'accès refusé'], 403);
        json_out($a === 'project' ? $s : meta_of($s));
    }

    if ($a === 'asset') {
        $pid = $_GET['pid'] ?? '';
        $aid = $_GET['aid'] ?? '';
        if (!safe_id($pid) || !safe_id($aid)) json_out(['error' => 'id invalide'], 400);
        if (!is_member(read_json(shared_path($pid)), $me)) json_out(['error' => 'accès refusé'], 403);
        $f = DATA . "/shared/$pid/assets/$aid";
        if (!is_file($f)) json_out(['error' => 'introuvable'], 404);
        $type = is_file("$f.type") ? trim((string) file_get_contents("$f.type")) : '';
        header('Content-Type: ' . ($type ?: 'application/octet-stream'));
        header('Cache-Control: private, no-store');
        header('Content-Length: ' . filesize($f));
        readfile($f);
        exit;
    }

    json_out(['error' => 'action inconnue'], 400);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'méthode non autorisée'], 405);
lock_data();

// envoi d'un fichier (corps binaire)
if ($a === 'asset') {
    $pid = $_GET['pid'] ?? '';
    $aid = $_GET['aid'] ?? '';
    if (!safe_id($pid) || !safe_id($aid)) json_out(['error' => 'id invalide'], 400);
    if (!is_member(read_json(shared_path($pid)), $me)) json_out(['error' => 'accès refusé'], 403);
    $buf = (string) file_get_contents('php://input');
    if (strlen($buf) > MAX_ASSET) json_out(['error' => 'fichier trop lourd (4 Mo max)'], 413);
    $type = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (!preg_match('#^[\w.+-]+/[\w.+-]+$#', $type)) $type = 'application/octet-stream';
    write_file("shared/$pid/assets/$aid", $buf);
    write_file("shared/$pid/assets/$aid.type", $type);
    json_out(['ok' => true]);
}

$body = json_decode((string) file_get_contents('php://input'));
if (!is_object($body)) $body = new stdClass();

if ($a === 'directory') {
    $projects = [];
    foreach (array_slice((array) ($body->projects ?? []), 0, 200) as $p) {
        $projects[] = [
            'id' => (string) ($p->id ?? ''),
            'name' => mb_substr((string) ($p->name ?? ''), 0, 120),
            'salon' => mb_substr((string) ($p->salon ?? ''), 0, 120),
            'updated' => is_numeric($p->updated ?? null) ? $p->updated + 0 : 0,
        ];
    }
    write_json(user_dir($me) . '/directory.json', ['user' => $me, 'projects' => $projects, 'updated' => now_ms()]);
    json_out(['ok' => true]);
}

// publication / mise à jour d'un projet partagé
if ($a === 'share' || $a === 'save') {
    $p = $body->project ?? null;
    if (!is_object($p) || !safe_id($p->id ?? null)) json_out(['error' => 'projet invalide'], 400);
    $cur = read_json(shared_path($p->id));
    if ($cur && !is_member($cur, $me)) json_out(['error' => 'accès refusé'], 403);
    if (!$cur && $a === 'save') json_out(['error' => 'projet non partagé'], 404);
    if ($cur && $a === 'save' && isset($body->baseRev) && $body->baseRev != $cur->rev) {
        json_out(['error' => 'conflit', 'rev' => $cur->rev, 'updatedBy' => $cur->updatedBy], 409);
    }
    $next = (object) [
        'id' => $p->id,
        'owner' => $cur->owner ?? $me,
        'members' => $cur ? members($cur) : [$me],
        'project' => $p,
        'assets' => $body->assets ?? ($cur->assets ?? []),
        'rev' => ($cur->rev ?? 0) + 1,
        'updated' => now_ms(),
        'updatedBy' => $me,
    ];
    write_json(shared_path($p->id), $next);
    if (!$cur) edit_inbox($me, function ($i) use ($p) {
        $i->shared[] = $p->id;
    });
    json_out(meta_of($next));
}

if ($a === 'request') {
    $type = $body->type ?? '';
    $to = strtolower((string) ($body->to ?? ''));
    $pid = $body->projectId ?? null;
    if (!in_array($type, ['invite', 'join'], true) || !in_array($to, $others, true) || !safe_id($pid)) json_out(['error' => 'demande invalide'], 400);
    if ($type === 'invite') {
        $s = read_json(shared_path($pid));
        if (!$s || $s->owner !== $me) json_out(['error' => 'seul le propriétaire peut inviter'], 403);
        if (is_member($s, $to)) json_out(['error' => 'déjà membre'], 409);
    }
    $r = (object) [
        'id' => 'r' . bin2hex(random_bytes(6)),
        'type' => $type,
        'from' => $me,
        'to' => $to,
        'projectId' => $pid,
        'projectName' => mb_substr((string) ($body->projectName ?? ''), 0, 120),
        'message' => mb_substr((string) ($body->message ?? ''), 0, 300),
        'status' => 'pending',
        'created' => now_ms(),
    ];
    write_json("requests/{$r->id}.json", $r);
    foreach ([$me, $to] as $u) edit_inbox($u, function ($i) use ($r) {
        upsert_request($i, $r);
    });
    json_out($r);
}

if ($a === 'respond') {
    if (!safe_id($body->id ?? null)) json_out(['error' => 'id invalide'], 400);
    $r = read_json("requests/{$body->id}.json");
    if (!$r || $r->to !== $me || $r->status !== 'pending') json_out(['error' => 'demande introuvable'], 404);
    $accept = !empty($body->accept);
    $newcomer = $r->type === 'invite' ? $r->to : $r->from;
    if ($accept) {
        $s = read_json(shared_path($r->projectId));
        if (!$s) json_out(['error' => 'le projet doit d’abord être partagé'], 409);
        if ($r->type === 'join' && $s->owner !== $me) json_out(['error' => 'seul le propriétaire peut accepter'], 403);
        if (!is_member($s, $newcomer)) $s->members = array_merge(members($s), [$newcomer]);
        write_json(shared_path($r->projectId), $s);
    }
    $r->status = $accept ? 'accepted' : 'declined';
    $r->answered = now_ms();
    write_json("requests/{$r->id}.json", $r);
    foreach ([$r->from, $r->to] as $u) edit_inbox($u, function ($i) use ($r, $accept, $u, $newcomer) {
        upsert_request($i, $r);
        if ($accept && $u === $newcomer) $i->shared[] = $r->projectId;
    });
    json_out($r);
}

if ($a === 'leave') {
    $id = $body->id ?? null;
    if (!safe_id($id)) json_out(['error' => 'id invalide'], 400);
    $s = read_json(shared_path($id));
    if (!is_member($s, $me)) json_out(['error' => 'introuvable'], 404);
    $drop = function ($i) use ($id) {
        $i->shared = array_values(array_filter($i->shared, function ($x) use ($id) {
            return $x !== $id;
        }));
    };
    if ($s->owner === $me) {
        // le propriétaire arrête le partage : suppression de la copie en ligne
        rm_tree(DATA . "/shared/$id");
        foreach (members($s) as $u) edit_inbox($u, $drop);
        json_out(['ok' => true, 'stopped' => true]);
    }
    $s->members = array_values(array_filter(members($s), function ($m) use ($me) {
        return $m !== $me;
    }));
    write_json(shared_path($id), $s);
    edit_inbox($me, $drop);
    json_out(['ok' => true]);
}

json_out(['error' => 'action inconnue'], 400);
