# Télécharge les photos GSH retenues, recadre au plus près du produit (fond blanc ou transparent),
# réduit à 700 px max et enregistre dans public/produits/<ref>.(png|jpg). Sortie : tailles en px.
param([string]$In, [string]$Dest, [string]$Out)
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
public static class GshBox {
  // cadre des pixels non transparents et pas presque blancs ; [minX, minY, maxX, maxY, alpha?]
  public static int[] Find(byte[] p, int w, int h, int stride) {
    int minX = w, minY = h, maxX = -1, maxY = -1, alpha = 0;
    for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
      int i = y * stride + x * 4; byte b = p[i], g = p[i + 1], r = p[i + 2], a = p[i + 3];
      if (a < 250) alpha = 1;
      if (a < 30 || (r > 238 && g > 238 && b > 238)) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return new int[] { minX, minY, maxX, maxY, alpha };
  }
}
'@
$items = Get-Content $In -Raw -Encoding utf8 | ConvertFrom-Json
New-Item -ItemType Directory -Force $Dest | Out-Null
$tmp = Join-Path $env:TEMP 'gsh-img'; New-Item -ItemType Directory -Force $tmp | Out-Null
$res = @()
foreach ($it in $items) {
  if (-not $it.image) { continue }
  $safe = $it.ref -replace '[^A-Za-z0-9]', '_'
  $src = Join-Path $tmp ($safe + [IO.Path]::GetExtension($it.image))
  if (-not (Test-Path $src)) { curl.exe -s -L -m 90 -A 'Mozilla/5.0' -o $src $it.image }
  try { $bmp = New-Object System.Drawing.Bitmap $src } catch { Write-Output "$($it.ref) : image illisible"; continue }
  $W = $bmp.Width; $H = $bmp.Height
  # cadre du produit : pixels non transparents et pas presque blancs (échantillonnage 1 px sur 2)
  $minX = $W; $minY = $H; $maxX = -1; $maxY = -1; $alpha = $false
  $rect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $H)
  [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $bb = [GshBox]::Find($bytes, $W, $H, $data.Stride)
  $minX = $bb[0]; $minY = $bb[1]; $maxX = $bb[2]; $maxY = $bb[3]; $alpha = $bb[4] -eq 1
  if ($maxX -lt 0) { $minX = 0; $minY = 0; $maxX = $W - 1; $maxY = $H - 1 }
  $m = [int](0.02 * [Math]::Max($maxX - $minX, $maxY - $minY))
  $minX = [Math]::Max(0, $minX - $m); $minY = [Math]::Max(0, $minY - $m); $maxX = [Math]::Min($W - 1, $maxX + $m); $maxY = [Math]::Min($H - 1, $maxY + $m)
  $cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
  $s = [Math]::Min([double]1, 700.0 / [Math]::Max($cw, $ch)); $ow = [Math]::Max(1, [int]($cw * $s)); $oh = [Math]::Max(1, [int]($ch * $s))
  $outBmp = New-Object System.Drawing.Bitmap $ow, $oh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gr = [System.Drawing.Graphics]::FromImage($outBmp)
  $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if (-not $alpha) { $gr.Clear([System.Drawing.Color]::White) }
  $gr.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, $ow, $oh), (New-Object System.Drawing.Rectangle $minX, $minY, $cw, $ch), [System.Drawing.GraphicsUnit]::Pixel)
  $gr.Dispose(); $bmp.Dispose()
  $ext = if ($alpha) { 'png' } else { 'jpg' }
  $file = "$safe.$ext"
  if ($alpha) { $outBmp.Save((Join-Path $Dest $file), [System.Drawing.Imaging.ImageFormat]::Png) }
  else {
    $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters 1; $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88L
    $outBmp.Save((Join-Path $Dest $file), $enc, $ep)
  }
  $outBmp.Dispose()
  $res += [pscustomobject]@{ ref = $it.ref; file = $file; w = $ow; h = $oh; alpha = $alpha }
  Write-Output "$($it.ref) -> $file ${ow}x${oh} alpha=$alpha"
}
$res | ConvertTo-Json | Out-File -Encoding utf8 $Out
