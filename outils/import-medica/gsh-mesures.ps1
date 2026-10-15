# Relève les mesures des fiches gsh-med.fr (unité emballée et unité nue, en cm) pour chaque produit de src/medica-products.js
param([string]$Products = 'src\medica-products.js', [string]$Out)
$js = Get-Content $Products -Raw -Encoding utf8
$items = [regex]::Matches($js, 'ref: "([^"]+)".*?gsh: (?:"([^"]+)"|null)') | ForEach-Object { [pscustomobject]@{ ref = $_.Groups[1].Value; url = $_.Groups[2].Value } }
$cache = @{}
$res = foreach ($it in $items) {
  $m = [ordered]@{ ref = $it.ref }
  if ($it.url) {
    if (-not $cache[$it.url]) {
      $h = (curl.exe -s -L -m 60 -A 'Mozilla/5.0' $it.url) -join "`n"
      $t = [regex]::Replace($h, '<script[\s\S]*?</script>|<style[\s\S]*?</style>', '')
      $cache[$it.url] = ([System.Net.WebUtility]::HtmlDecode([regex]::Replace($t, '<[^>]+>', ' ')) -replace '\s+', ' ')
    }
    $t = $cache[$it.url]
    foreach ($k in 'Largeur', 'Longueur', 'Hauteur') {
      $m["$k emballage"] = ([regex]::Match($t, "$k unitaire \(cm\) ([\d.,]+)")).Groups[1].Value
      $m["$k nue"] = ([regex]::Match($t, "Unité nue / $k \(cm\) ([\d.,]+|nc)")).Groups[1].Value
    }
  }
  [pscustomobject]$m
  Write-Host -NoNewline '.'
}
$res | ConvertTo-Json | Out-File -Encoding utf8 $Out
