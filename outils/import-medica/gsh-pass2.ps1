# 2e passe : produits sans photo, recherche par nom (le site est en français)
param([string]$Results)
$res = Get-Content $Results -Raw -Encoding utf8 | ConvertFrom-Json
$queries = @{
  'D5.313.112' = 'miroir laryngé'; 'F1.416.112' = 'ophtalmoscope black'; 'D5.311.212' = 'filtre bleu'
  'A5.101.124' = 'spéculum jetable'; 'A5.102.124' = 'spéculum jetable'; 'A1.416.414' = 'smartled'; 'A1.416.14' = 'smartled'
  'B1.319.212' = 'tensiomètre LX'; 'NEO500' = 'neotens'; 'NEO300A' = 'neotens'; 'V1.416.114' = 'vétérinaire'
  'V5.203.012' = 'spéculum vétérinaire'; 'V5.204.012' = 'spéculum vétérinaire'; 'V5.206.012' = 'spéculum vétérinaire'; 'V5.207.012' = 'spéculum vétérinaire'
  'E5.101.214' = 'étui laryngoscope'; 'KGMBM1' = 'garrot manuel'; 'GBDM202' = 'brassard monobloc'; 'GBDMS103' = 'brassard monobloc'
  'GBCM105' = 'brassard monobloc'; 'GCDM103' = 'brassard monobloc'; 'AE.416.114' = 'otoscope black'
}
function Get-Html($url) { (curl.exe -s -L -m 60 -A 'Mozilla/5.0' $url) -join "`n" }
$cache = @{}
foreach ($r in $res | Where-Object { -not $_.image }) {
  $ref = $r.ref; $q = $queries[$ref]; if (-not $q) { $q = $r.name }
  if (-not $cache[$q]) {
    $s = Get-Html ('https://www.gsh-med.fr/?s=' + [uri]::EscapeDataString($q))
    $cache[$q] = @([regex]::Matches($s, 'href="(https://www\.gsh-med\.fr/produit/[^"?#]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique -First 8)
  }
  $best = $null
  foreach ($l in $cache[$q]) {
    if (-not $cache[$l]) { $cache[$l] = Get-Html $l }
    $h = $cache[$l]
    $vm = [regex]::Match($h, 'data-product_variations="([^"]+)"'); $vars = @()
    if ($vm.Success) { try { $vars = [System.Net.WebUtility]::HtmlDecode($vm.Groups[1].Value) | ConvertFrom-Json } catch {} }
    $skus = @([regex]::Matches($h, '"sku":"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
    $hit = ($vars | Where-Object { $_.sku -eq $ref }) -or ($skus | Where-Object { $_ -match [regex]::Escape($ref) + '$' })
    if (-not $hit) { continue }
    $imgs = [regex]::Matches($h, 'https://www\.gsh-med\.fr/wp-content/uploads/[^"''\s)]+?\.(?:jpe?g|png|webp)') | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch '-\d+x\d+\.' -and $_ -notmatch '(?i)logo|icon|picto|poids|mesure|flag|drapeau' } | Select-Object -Unique
    $varImg = ($vars | Where-Object { $_.sku -eq $ref } | Select-Object -First 1).image.full_src
    $byRef = $imgs | Where-Object { $_ -match [regex]::Escape($ref) } | Select-Object -First 1
    $og = ([regex]::Match($h, 'og:image" content="([^"]+)"')).Groups[1].Value
    $best = @{ url = $l; images = @($imgs); image = $(if ($byRef) { $byRef } elseif ($varImg) { $varImg } else { $og }); match = 'pass2+sku' }
    break
  }
  if ($best) { $r.url = $best.url; $r.images = $best.images; $r.image = $best.image; $r.match = $best.match }
  Write-Output ("{0,-12} {1,-26} {2}" -f $ref, $q, $(if ($best) { $best.image } else { '—' }))
}
$res | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 $Results
