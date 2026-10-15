# Génère src/medica-products.js à partir du relevé GSH et des photos traitées
param([string]$Results, [string]$Images, [string]$Out)
$res = Get-Content $Results -Raw -Encoding utf8 | ConvertFrom-Json
$imgs = @{}; foreach ($i in (Get-Content $Images -Raw -Encoding utf8 | ConvertFrom-Json)) { $imgs[$i.ref] = $i }
$q = { param($s) if ($null -eq $s -or $s -eq '') { 'null' } else { ($s | ConvertTo-Json -Compress) } }
$lines = foreach ($r in $res) {
  $i = $imgs[$r.ref]
  $file = if ($i) { & $q $i.file } else { 'null' }
  $px = if ($i) { "[$($i.w), $($i.h)]" } else { 'null' }
  "  { ref: $(& $q $r.ref), name: $(& $q $r.name), family: $(& $q $r.family), brand: $(& $q $r.brand), sub: $(& $q $r.sub), file: $file, px: $px, gsh: $(& $q $r.url) },"
}
$js = "// Généré à partir de MEDICA_PRODUCT_EN_2026.xlsx (feuille « Liste ADV 2026 ») et des fiches gsh-med.fr.`n// Photos dans public/produits/. Ne pas modifier à la main : relancer l'import.`nexport const MEDICA_RAW = [`n" + ($lines -join "`n") + "`n];`n"
[IO.File]::WriteAllText($Out, $js, (New-Object Text.UTF8Encoding $false))
"$($res.Count) produits, $($imgs.Count) photos"
