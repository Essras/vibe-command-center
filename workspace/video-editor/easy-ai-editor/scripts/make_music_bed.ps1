param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][double]$Duration,
  [double]$Volume = 0.075,
  [double]$FadeIn = 0.8,
  [double]$FadeOut = 1.6,
  [string]$Bitrate = "160k"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg was not found in PATH."
}

$fadeOutStart = [Math]::Max(0, $Duration - $FadeOut)
$culture = [Globalization.CultureInfo]::InvariantCulture
$volumeText = $Volume.ToString($culture)
$fadeInText = $FadeIn.ToString($culture)
$fadeOutStartText = $fadeOutStart.ToString($culture)
$fadeOutText = $FadeOut.ToString($culture)
$filter = "volume=$volumeText,afade=t=in:st=0:d=$fadeInText,afade=t=out:st=${fadeOutStartText}:d=$fadeOutText"

& ffmpeg -hide_banner -y -i $InputPath -t $Duration -af $filter -c:a aac -b:a $Bitrate $Output
