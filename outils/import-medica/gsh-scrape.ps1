# Pour chaque référence de la liste Medica : recherche sur gsh-med.fr, fiche produit, photos candidates.
param([string]$Xlsx, [string]$Out)
$ErrorActionPreference = 'Continue'

# 1) liste des produits (feuille « Liste ADV 2026 », références corrigées)
$xl = New-Object -ComObject Excel.Application; $xl.Visible = $false; $xl.DisplayAlerts = $false
$rows = @()
try {
  $wb = $xl.Workbooks.Open($Xlsx, 0, $true)
  $ws = $wb.Worksheets.Item('Liste ADV 2026'); $v = $ws.UsedRange.Value2; $n = $ws.UsedRange.Rows.Count
  for ($r = 2; $r -le $n; $r++) {
    $rows += [pscustomobject]@{ ref = "$($v[$r,1])".Trim(); name = ("$($v[$r,2])" -replace '\s+', ' ').Trim(); family = "$($v[$r,3])".Trim(); brand = "$($v[$r,4])".Trim(); qty = "$($v[$r,5])"; sub = "$($v[$r,6])".Trim(); cat = "$($v[$r,7])".Trim() }
  }
  $wb.Close($false)
} finally { $xl.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl) }
$rows = $rows | Where-Object { $_.ref -and $_.cat -ne 'POS/goodies' -and $_.sub }

function Get-Html($url) { (curl.exe -s -L -m 60 -A 'Mozilla/5.0' $url) -join "`n" }

$results = @()
foreach ($p in $rows) {
  $ref = $p.ref -replace '[^A-Za-z0-9.]', ''
  $res = [ordered]@{ ref = $ref; name = $p.name; family = $p.family; brand = $p.brand; sub = $p.sub; cat = $p.cat; url = $null; gshName = $null; image = $null; images = @(); match = 'none' }
  try {
    $s = Get-Html ("https://www.gsh-med.fr/?s=" + [uri]::EscapeDataString($ref))
    $links = [regex]::Matches($s, 'href="(https://www\.gsh-med\.fr/produit/[^"?#]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    # la recherche WordPress redirige parfois directement vers la fiche
    if (-not $links -and $s -match 'data-product_variations|class="product_title') { $links = @('(direct)') }
    foreach ($l in ($links | Select-Object -First 4)) {
      $h = if ($l -eq '(direct)') { $s } else { Get-Html $l }
      $skus = @([regex]::Matches($h, '"sku":"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
      $vm = [regex]::Match($h, 'data-product_variations="([^"]+)"')
      $vars = @(); if ($vm.Success) { try { $vars = [System.Net.WebUtility]::HtmlDecode($vm.Groups[1].Value) | ConvertFrom-Json } catch {} }
      $hit = ($vars | Where-Object { $_.sku -eq $ref }) -or ($skus | Where-Object { $_ -match [regex]::Escape($ref) + '$' })
      if (-not $hit -and $l -ne ($links | Select-Object -First 1)) { continue }
      $res.url = $l
      $res.gshName = [System.Net.WebUtility]::HtmlDecode(([regex]::Match($h, 'og:title" content="([^"]+)"')).Groups[1].Value)
      $imgs = [regex]::Matches($h, 'https://www\.gsh-med\.fr/wp-content/uploads/[^"''\s)]+?\.(?:jpe?g|png|webp)') | ForEach-Object { $_.Value } | Where-Object { $_ -notmatch '-\d+x\d+\.' -and $_ -notmatch '(?i)logo|icon|picto|poids|mesure|flag|drapeau' } | Select-Object -Unique
      $res.images = @($imgs)
      $varImg = ($vars | Where-Object { $_.sku -eq $ref } | Select-Object -First 1).image.full_src
      $byRef = $imgs | Where-Object { $_ -match [regex]::Escape($ref) } | Select-Object -First 1
      $og = ([regex]::Match($h, 'og:image" content="([^"]+)"')).Groups[1].Value
      if ($byRef) { $res.image = $byRef; $res.match = 'ref' } elseif ($varImg) { $res.image = $varImg; $res.match = 'variation' } elseif ($og) { $res.image = $og; $res.match = 'og' }
      if ($hit) { $res.match += '+sku' }
      break
    }
  } catch { $res.match = 'error: ' + $_.Exception.Message }
  $results += [pscustomobject]$res
  Write-Output ("{0,-12} {1,-14} {2}" -f $ref, $res.match, $res.image)
}
$results | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 $Out
Write-Output "Terminé : $($results.Count) produits"
