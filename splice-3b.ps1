# splice-3b.ps1 — Region 3B: replace index.html lines 3027-3044 (canvas caution
# branch) with the rr-scaled, drawCautionTri rewrite. Guarded; CRLF + UTF-8 (BOM
# state preserved). Aborts without writing if boundaries or block size mismatch.
$ErrorActionPreference = 'Stop'
$path = 'index.html'

$bytes  = [System.IO.File]::ReadAllBytes($path)
$hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$lines  = [System.IO.File]::ReadAllLines($path)

# Boundary asserts (0-based: idx 3026 = file line 3027 START, idx 3043 = file line 3044 END)
$startOk = $lines[3026].Trim() -eq 'ctx.font = `bold ${r*0.85}px DM Sans, sans-serif`;'
$endOk   = $lines[3043].Trim() -eq '} else {'

$block = @'
      const cs = isCaution ? ((+(balloonMeta(b)?._extra?.s)) || 1) : 1;
      const rr = r * cs;
      ctx.font = `bold ${rr*0.85}px DM Sans, sans-serif`;
      const fontPx = rr*0.85;
      const triK = isCaution ? (fontPx*1.25)/125 : 0;
      const icoW = 140 * triK;
      const tw = isCaution ? (icoW + 6 + ctx.measureText(text).width) : ctx.measureText(text).width;
      const indSize = rr*0.9;
      const padX = rr*0.35, indGap = rr*0.3;
      // caution shows the drawn warning triangle + text
      const w = isCaution ? (padX + tw + padX) : (padX + indSize + indGap + tw + padX);
      const h = rr*1.5, rad = rr*0.25;
      const x0 = cx - w/2, y0 = cy - h/2;
      ctx.fillStyle = isCaution ? '#fef9c3' : 'white';
      ctx.strokeStyle = isCaution ? '#f59e0b' : color;
      ctx.lineWidth = Math.max(1.5, rr*0.08);
      ctx.beginPath(); ctx.roundRect(x0, y0, w, h, rad); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (isCaution) {
        const icoH = 125 * triK;
        drawCautionTri(ctx, x0 + padX, cy - icoH/2, triK);
        ctx.fillStyle = '#7c2d12';
        ctx.fillText(text, x0 + padX + icoW + 6, cy);
      } else {
'@

$blk = $block -split "`r?`n"
while ($blk.Count -gt 0 -and $blk[-1] -eq '') { $blk = $blk[0..($blk.Count-2)] }

"hasBom=$hasBom  totalLines=$($lines.Count)  blockLines=$($blk.Count)  startOk=$startOk  endOk=$endOk"

if (-not ($startOk -and $endOk)) { 'ABORT: boundary assert failed (line 3027/3044 mismatch) - NO WRITE.'; exit 1 }
if ($blk.Count -ne 24)           { "ABORT: block line count $($blk.Count) != 24 - NO WRITE."; exit 1 }

# Splice: keep file lines 1..3026 (idx 0..3025) + new block + file lines 3045..end (idx 3044..end)
$result = $lines[0..3025] + $blk + $lines[3044..($lines.Count-1)]
$out = ($result -join "`r`n") + "`r`n"
[System.IO.File]::WriteAllText((Resolve-Path $path).Path, $out, (New-Object System.Text.UTF8Encoding($hasBom)))

"WROTE ok. newTotalLines=$(([System.IO.File]::ReadAllLines($path)).Count)  (expected $($lines.Count + 6))"
