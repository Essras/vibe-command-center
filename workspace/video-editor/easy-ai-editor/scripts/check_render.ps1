param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [string]$SilenceNoise = "-30dB",
  [double]$SilenceDuration = 1.0
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg was not found in PATH."
}
if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
  throw "ffprobe was not found in PATH."
}

Write-Host "== Video stream =="
& ffprobe -hide_banner -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,duration,bit_rate -of default=nw=1:nk=0 $InputPath

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "== Volume =="
$volumeOutput = & ffmpeg -hide_banner -nostats -i $InputPath -af volumedetect -f null NUL 2>&1
$volumeOutput | Select-String -Pattern "mean_volume|max_volume"

Write-Host ""
Write-Host "== Silence =="
$silenceFilter = "silencedetect=noise=${SilenceNoise}:d=${SilenceDuration}"
$silenceOutput = & ffmpeg -hide_banner -nostats -i $InputPath -af $silenceFilter -f null NUL 2>&1
$silence = $silenceOutput | Select-String -Pattern "silence_(start|end)"
if ($silence) {
  $silence
} else {
  Write-Host "No silence events found for $SilenceNoise / ${SilenceDuration}s."
}
