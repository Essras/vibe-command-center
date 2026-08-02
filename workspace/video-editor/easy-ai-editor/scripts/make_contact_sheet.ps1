param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][string[]]$Times,
  [int]$Columns = 4,
  [int]$ThumbWidth = 270,
  [int]$ThumbHeight = 480
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg was not found in PATH."
}
$culture = [Globalization.CultureInfo]::InvariantCulture
$timeValues = @()
foreach ($entry in $Times) {
  foreach ($part in ($entry -split "[,\s]+")) {
    if ($part.Trim().Length -gt 0) {
      $timeValues += [double]::Parse($part.Trim(), $culture)
    }
  }
}

if ($timeValues.Count -lt 1) {
  throw "Provide at least one timestamp in seconds."
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("thai-tiktok-contact-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

try {
  for ($i = 0; $i -lt $timeValues.Count; $i++) {
    $timeText = $timeValues[$i].ToString($culture)
    $framePath = Join-Path $tempRoot ("frame_{0:D3}.png" -f $i)
    & ffmpeg -hide_banner -y -i $InputPath -ss $timeText -frames:v 1 -vf "scale=${ThumbWidth}:${ThumbHeight}" $framePath | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -Path $framePath)) {
      throw "Could not extract frame at ${timeText}s."
    }
  }

  $rows = [int][Math]::Ceiling($timeValues.Count / [double]$Columns)
  $pattern = Join-Path $tempRoot "frame_%03d.png"
  & ffmpeg -hide_banner -y -framerate 1 -i $pattern -vf "tile=${Columns}x${rows}" -frames:v 1 $Output
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path -Path $Output)) {
    throw "Could not create contact sheet."
  }
}
finally {
  Remove-Item -Path $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
