$files = Get-ChildItem client/src/pages -Recurse -Filter "*.tsx"
$fixed = 0

foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw -Encoding UTF8
  $lines = $content -split "`n"
  $seen = @{}
  $newLines = [System.Collections.Generic.List[string]]::new()
  $changed = $false
  
  foreach ($line in $lines) {
    $trimmed = $line.TrimEnd("`r")
    if ($trimmed -match "^import \{ (\w+) \} from 'lucide-react';$") {
      $icon = $matches[1]
      if ($seen.ContainsKey($icon)) {
        $changed = $true
        continue
      }
      $seen[$icon] = $true
    }
    $newLines.Add($line)
  }
  
  if ($changed) {
    $newContent = $newLines -join "`n"
    [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.Encoding]::UTF8)
    Write-Output "DEDUP: $($f.Name)"
    $fixed++
  }
}

Write-Output "Deduped $fixed files"
