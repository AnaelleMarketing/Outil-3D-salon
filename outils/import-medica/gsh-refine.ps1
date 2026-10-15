# Fiches GSH proches pour les produits restés sans photo + choix de la photo la plus « packshot »
param([string]$Results)
$res = Get-Content $Results -Raw -Encoding utf8 | ConvertFrom-Json
function Get-Html($url) { (curl.exe -s -L -m 60 -A 'Mozilla/5.0' $url) -join "`n" }
function Images($h) { @([regex]::Matches($h, 'https://www\.gsh-med\.fr/wp-content/uploads/[^"''\s)]+?\.(?:jpe?g|png|webp)') | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch '-\d+x\d+\.' -and $_ -notmatch '(?i)logo|icon|picto|poids|mesure|flag|drapeau' } | Select-Object -Unique) }
$P = 'https://www.gsh-med.fr/produit/'
# produit de la liste -> fiche GSH la plus proche (même produit sous une autre référence, ou variante de la même gamme)
$near = @{
  'AE.416.114' = @('otoscope-luxascope-auris-led-2-5-v-noir-luxamed_rgp_oto-a1-416/', 'même otoscope, finition standard')
  'NEO300A' = @('tensiometre-electronique-bras-neotens-r-spengler_neo300/', 'fiche NEO300 (sans adaptateur)')
  'NEO500' = @('tensiometre-electronique-bras-neotens-r-spengler_neo300/', 'photo du Neotens bras (Neotens + absent du site)')
  'GBDM202' = @('brassard-garrot-monobloc-droit-nourrisson-4-4x28cm-ddm_rgp_garbrasmono/', 'gamme brassards monobloc')
  'GBDMS103' = @('brassard-garrot-monobloc-droit-enfant-4-5x35cm-ddm-sangle_rgp_garbrasmonosan/', 'gamme brassards monobloc à sangle')
  'GBCM105' = @('cuissard-garrot-monobloc-droit-petit-adulte-8x76cm-ddm_rgp_garcuismono/', 'gamme cuissards monobloc')
  'GCDM103' = @('cuissard-garrot-monobloc-conique-adulte-10x62cm-ddm_rgp_garcuiscon/', 'gamme cuissards monobloc coniques')
  'KGMBM1' = @('garrot-manuel-usage-unique-brassard-droit-enfant-ddm_rgp_garrman/', 'photo du garrot manuel DDM')
  'A1.416.414' = @('otoscope-smartled-spengler-myrtille_a1-416-194/', 'photo du coloris myrtille (corail absent du site)')
  'A1.416.14' = @('otoscope-smartled-spengler-myrtille_a1-416-194/', 'photo du coloris myrtille (rose absent du site)')
}
foreach ($r in $res) { $r | Add-Member -NotePropertyName note -NotePropertyValue $null -Force }
foreach ($r in $res | Where-Object { -not $_.image -and $near[$_.ref] }) {
  $url = $P + $near[$r.ref][0]; $h = Get-Html $url
  $og = ([regex]::Match($h, 'og:image" content="([^"]+)"')).Groups[1].Value
  if ($og) { $r.url = $url; $r.images = Images $h; $r.image = $og; $r.match = 'proche'; $r.note = $near[$r.ref][1] }
}
# F1.416.112 (Oculus Black Edition) : photo de l'ophtalmoscope noir de la même gamme
$ref = $res | Where-Object { $_.ref -eq 'F1.416.934' } | Select-Object -First 1
$oc = $res | Where-Object { $_.ref -eq 'F1.416.112' } | Select-Object -First 1
if ($ref -and $oc -and -not $oc.image) { $oc.url = $ref.url; $oc.image = $ref.image; $oc.match = 'proche'; $oc.note = 'photo de l''ophtalmoscope noir de la gamme' }
# photo la plus « packshot » : celle qui porte la référence, sans mise en situation / emballage / présentoir
$bad = '(?i)situation|packaging|emballage|presentoir|présentoir|pdf|ambiance|zoom|-scaled'
foreach ($r in $res | Where-Object { $_.image }) {
  $key = ($r.ref -replace '\.', '[.-]?')
  $cands = @($r.images | Where-Object { $_ -match $key -and $_ -notmatch $bad })
  if ($r.image -match $bad -and $cands.Count) { Write-Output "$($r.ref) : $($r.image) -> $($cands[0])"; $r.image = $cands[0] }
}
$res | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 $Results
"Avec photo : $(@($res | Where-Object { $_.image }).Count) / $($res.Count)"
"Sans photo : " + (($res | Where-Object { -not $_.image } | ForEach-Object { $_.ref }) -join ', ')
