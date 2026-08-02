param(
  [string]$OutputPath = "",
  [switch]$FailOnMissing
)

$ErrorActionPreference = "Continue"

$lines = [System.Collections.Generic.List[string]]::new()
$criticalIssues = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()
function Add-Line([string]$Text = "") {
  $script:lines.Add($Text) | Out-Null
}
function Add-Critical([string]$Text) {
  $script:criticalIssues.Add($Text) | Out-Null
}
function Add-Warning([string]$Text) {
  $script:warnings.Add($Text) | Out-Null
}

function Get-CommandPath([string]$Name) {
  $cmds = @(Get-Command $Name -All -ErrorAction SilentlyContinue)
  if ($cmds.Count -eq 0) { return $null }
  $preferred = $cmds | Where-Object { $_.Source -match '\.(exe|cmd|bat)$' } | Select-Object -First 1
  if ($preferred) { return $preferred.Source }
  $cmd = $cmds | Select-Object -First 1
  if ($cmd) { return $cmd.Source }
  return $null
}

function Invoke-ToolWithTimeout([string]$FilePath, [string]$Arguments, [int]$TimeoutSeconds = 60) {
  $result = @{
    ExitCode = $null
    Output = ""
    TimedOut = $false
    Error = ""
  }
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    if ($FilePath -match '\.(cmd|bat)$') {
      $psi.FileName = "cmd.exe"
      $psi.Arguments = "/d /s /c `"`"$FilePath`" $Arguments`""
    } elseif ($FilePath -match '\.ps1$') {
      $psi.FileName = "powershell.exe"
      $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$FilePath`" $Arguments"
    } else {
      $psi.FileName = $FilePath
      $psi.Arguments = $Arguments
    }
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($psi)
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
      try { $process.Kill() } catch {}
      $result.TimedOut = $true
      $result.Error = "Timed out after $TimeoutSeconds seconds."
      return $result
    }
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $result.ExitCode = $process.ExitCode
    $result.Output = (($stdout + [Environment]::NewLine + $stderr).Trim())
  } catch {
    $result.Error = $_.Exception.Message
  }
  return $result
}

function To-Gb([double]$Bytes) {
  return [Math]::Round($Bytes / 1GB, 1)
}

Add-Line "# Easy AI Editor Hardware Check"
Add-Line ""
Add-Line "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line ""

Add-Line "## API Keys"
if ([string]::IsNullOrWhiteSpace($env:ELEVENLABS_API_KEY)) {
  Add-Line "- ELEVENLABS_API_KEY: not set. ElevenLabs transcript authority is unavailable unless the user provides a key or transcript in-session."
  Add-Warning "ELEVENLABS_API_KEY is not set; use WhisperX plus manual Thai correction, or set the key for higher-accuracy transcript content."
} else {
  Add-Line "- ELEVENLABS_API_KEY: configured. Do not print or save the key; use it only for ElevenLabs/Scribe transcript content."
}
Add-Line ""

Add-Line "## System"
try {
  $os = Get-CimInstance Win32_OperatingSystem
  Add-Line "- OS: $($os.Caption) $($os.Version)"
} catch {
  Add-Line "- OS: unavailable"
}
try {
  $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
  Add-Line "- CPU: $($cpu.Name)"
  Add-Line "- CPU cores: $($cpu.NumberOfCores) physical / $($cpu.NumberOfLogicalProcessors) logical"
} catch {
  Add-Line "- CPU: unavailable"
}
try {
  $cs = Get-CimInstance Win32_ComputerSystem
  $ramGb = To-Gb $cs.TotalPhysicalMemory
  Add-Line "- RAM: $ramGb GB"
  if ($ramGb -lt 8) {
    Add-Critical "RAM is below 8 GB. Video editing and frame-sequence subtitle overlays may fail or thrash heavily. Upgrade RAM or use a lighter machine profile."
  } elseif ($ramGb -lt 16) {
    Add-Warning "RAM is below the 16 GB recommended baseline. Drafts should use lower resolution/FPS and fewer concurrent frame sequences."
  }
} catch {
  Add-Line "- RAM: unavailable"
  Add-Warning "Could not detect RAM. Verify memory manually before heavy renders."
}
Add-Line ""

Add-Line "## GPU"
try {
  $gpus = Get-CimInstance Win32_VideoController
  foreach ($gpu in $gpus) {
    $ram = if ($gpu.AdapterRAM) { "$(To-Gb $gpu.AdapterRAM) GB" } else { "unknown" }
    Add-Line "- $($gpu.Name) | VRAM: $ram | Driver: $($gpu.DriverVersion)"
  }
} catch {
  Add-Line "- GPU inventory unavailable"
}

$nvidiaSmi = Get-CommandPath "nvidia-smi"
if ($nvidiaSmi) {
  Add-Line "- nvidia-smi: $nvidiaSmi"
  $query = & nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>&1
  foreach ($line in $query) {
    Add-Line "  - NVIDIA: $line"
  }
  $plain = (& nvidia-smi 2>&1 | Out-String)
  $cudaMatch = [regex]::Match($plain, "CUDA Version:\s*([0-9.]+)")
  if ($cudaMatch.Success) {
    Add-Line "  - CUDA runtime reported by driver: $($cudaMatch.Groups[1].Value)"
  }
} else {
  Add-Line "- nvidia-smi: not found"
  Add-Warning "nvidia-smi was not found. Do not assume NVIDIA CUDA/NVENC is usable; renders may be CPU-only or use another hardware path."
}
Add-Line ""

Add-Line "## FFmpeg"
$ffmpeg = Get-CommandPath "ffmpeg"
$ffprobe = Get-CommandPath "ffprobe"
if ($ffmpeg) {
  Add-Line "- ffmpeg: $ffmpeg"
  $version = (& ffmpeg -hide_banner -version 2>&1 | Select-Object -First 1)
  Add-Line "- ffmpeg version: $version"

  $encoders = (& ffmpeg -hide_banner -encoders 2>&1 | Out-String)
  $hwaccels = (& ffmpeg -hide_banner -hwaccels 2>&1 | Out-String)
  $checks = @(
    @{Name="h264_nvenc"; Kind="encoder"},
    @{Name="hevc_nvenc"; Kind="encoder"},
    @{Name="av1_nvenc"; Kind="encoder"},
    @{Name="cuda"; Kind="hwaccel"},
    @{Name="d3d11va"; Kind="hwaccel"},
    @{Name="dxva2"; Kind="hwaccel"},
    @{Name="qsv"; Kind="hwaccel"}
  )
  foreach ($check in $checks) {
    $present = if ($check.Kind -eq "encoder") { $encoders -match $check.Name } else { $hwaccels -match "(?m)^\s*$($check.Name)\s*$" }
    Add-Line "- $($check.Name): $(if ($present) { 'available' } else { 'missing' })"
  }
  if (-not ($encoders -match "h264_nvenc")) {
    Add-Warning "FFmpeg h264_nvenc is missing. Final renders can still use CPU libx264, but they will be much slower."
  }
  if (-not (($hwaccels -match "(?m)^\s*cuda\s*$") -or ($hwaccels -match "(?m)^\s*d3d11va\s*$") -or ($hwaccels -match "(?m)^\s*dxva2\s*$") -or ($hwaccels -match "(?m)^\s*qsv\s*$"))) {
    Add-Warning "FFmpeg hardware acceleration was not detected. Decode/preview paths may be slower."
  }
} else {
  Add-Line "- ffmpeg: not found"
  Add-Critical "ffmpeg is missing. Install FFmpeg and make sure ffmpeg is on PATH before using this skill."
}
if ($ffprobe) {
  Add-Line "- ffprobe: $ffprobe"
} else {
  Add-Line "- ffprobe: not found"
  Add-Critical "ffprobe is missing. Install FFmpeg/ffprobe and make sure ffprobe is on PATH before verification."
}
Add-Line ""

Add-Line "## Text Rendering"
$magick = Get-CommandPath "magick"
if ($magick) {
  Add-Line "- ImageMagick: $magick"
  $magickVersion = (& magick -version 2>&1 | Out-String)
  $firstLine = ($magickVersion -split "`r?`n" | Select-Object -First 1)
  Add-Line "- ImageMagick version: $firstLine"
  foreach ($feature in @("pangocairo", "raqm", "freetype", "fontconfig")) {
    Add-Line "- ImageMagick ${feature}: $(if ($magickVersion -match $feature) { 'available' } else { 'missing' })"
  }
  if (-not ($magickVersion -match "pangocairo")) {
    Add-Critical "ImageMagick pangocairo is missing. Thai-safe second-pass subtitle rendering may not work; install an ImageMagick build with Pango/PangoCairo."
  }
  if (-not ($magickVersion -match "raqm")) {
    Add-Critical "ImageMagick raqm is missing. Thai vowels and tone marks may render incorrectly; install an ImageMagick build with RAQM."
  }
} else {
  Add-Line "- ImageMagick magick: not found"
  Add-Critical "ImageMagick magick.exe is missing. Install ImageMagick with pangocairo and raqm for Thai-safe subtitle overlays."
}
Add-Line ""

Add-Line "## Runtime Tools"
$runtimeTools = @{}
foreach ($tool in @("python", "node", "npm", "npx")) {
  $path = Get-CommandPath $tool
  $runtimeTools[$tool] = $path
  if ($path) {
    $version = (& $tool --version 2>&1 | Select-Object -First 1)
    Add-Line "- ${tool}: $path | $version"
  } else {
    Add-Line "- ${tool}: not found"
  }
}
if (-not $runtimeTools["python"]) {
  Add-Critical "python is missing. Install Python 3.11+ or a working Conda Python before using bundled render/overlay scripts."
}
foreach ($tool in @("node", "npm", "npx")) {
  if (-not $runtimeTools[$tool]) {
    Add-Warning "$tool is missing. HyperFrames workflows may not run until Node.js 22+ is installed."
  }
}
Add-Line ""

Add-Line "## HyperFrames And Color-Safe Render"
$docker = Get-CommandPath "docker"
if ($runtimeTools["npm"]) {
  $latestHyperframes = Invoke-ToolWithTimeout $runtimeTools["npm"] "view hyperframes version --silent" 30
  if ($latestHyperframes.Output) {
    Add-Line "- hyperframes latest on npm: $($latestHyperframes.Output -split '\r?\n' | Select-Object -First 1)"
  } elseif ($latestHyperframes.TimedOut) {
    Add-Line "- hyperframes latest on npm: unavailable (npm view timed out)"
    Add-Warning 'Could not check latest HyperFrames version. If color/render issues happen, run `npm view hyperframes version` manually.'
  } else {
    Add-Line "- hyperframes latest on npm: unavailable"
    if ($latestHyperframes.Error) {
      Add-Line "  - npm view error: $($latestHyperframes.Error)"
    }
    Add-Warning "Could not check latest HyperFrames version. Internet, npm, or registry access may be unavailable."
  }
}
if ($runtimeTools["npx"]) {
  $hfVersion = Invoke-ToolWithTimeout $runtimeTools["npx"] "--yes hyperframes@latest --version" 60
  if ($hfVersion.Output) {
    Add-Line "- hyperframes@latest version: $($hfVersion.Output -split '\r?\n' | Select-Object -First 1)"
  } elseif ($hfVersion.TimedOut) {
    Add-Line "- hyperframes@latest version: timed out"
    Add-Warning 'HyperFrames version check timed out. Use FFmpeg/Pango fallback until `npx hyperframes@latest --version` works.'
  } else {
    Add-Line "- hyperframes@latest version: unavailable"
    if ($hfVersion.Error) {
      Add-Line "  - npx error: $($hfVersion.Error)"
    }
    Add-Warning "HyperFrames version check failed. HyperFrames workflows may not run until npm/npx registry access works."
  }

  $hfDoctor = Invoke-ToolWithTimeout $runtimeTools["npx"] "--yes hyperframes@latest doctor" 90
  if ($hfDoctor.Output) {
    Add-Line "- hyperframes doctor:"
    foreach ($line in (($hfDoctor.Output -split '\r?\n') | Select-Object -First 40)) {
      if ($line.Trim()) { Add-Line "  $line" }
    }
  } elseif ($hfDoctor.TimedOut) {
    Add-Line "- hyperframes doctor: timed out"
    Add-Warning "HyperFrames doctor timed out. Use FFmpeg/Pango fallback or rerun doctor manually before HyperFrames final renders."
  } else {
    Add-Line "- hyperframes doctor: unavailable"
    if ($hfDoctor.Error) {
      Add-Line "  - doctor error: $($hfDoctor.Error)"
    }
    Add-Warning "HyperFrames doctor did not run. Do not promise HyperFrames compositions until doctor passes."
  }
} else {
  Add-Line "- hyperframes: npx not found"
}
if ($docker) {
  Add-Line "- docker: $docker"
  Add-Line "- render mode option: Docker deterministic render is available if Docker Desktop is running."
} else {
  Add-Line "- docker: not found"
  Add-Warning "Docker was not found. If HyperFrames local colors differ across machines, Docker comparison will not be available."
}
Add-Line "- default social/course color mode: SDR Rec.709"
Add-Line '- recommended color-safe render: `npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4`'
Add-Line '- if colors shift: compare `--no-browser-gpu`; use `--docker` as deterministic reference when Docker is available.'
Add-Line ""

Add-Line "## Status"
if ($criticalIssues.Count -eq 0 -and $warnings.Count -eq 0) {
  Add-Line "- PASS: This machine has the required render, runtime, and Thai text overlay capabilities."
} elseif ($criticalIssues.Count -eq 0) {
  Add-Line "- WARN: This machine can run the skill, but some acceleration or recommended tooling is missing."
} else {
  Add-Line "- FAIL: This machine is missing required components. Fix the critical issues before relying on this skill."
}
if ($criticalIssues.Count -gt 0) {
  Add-Line ""
  Add-Line "### Critical Missing"
  foreach ($issue in $criticalIssues) {
    Add-Line "- $issue"
  }
}
if ($warnings.Count -gt 0) {
  Add-Line ""
  Add-Line "### Warnings"
  foreach ($issue in $warnings) {
    Add-Line "- $issue"
  }
}
Add-Line ""

Add-Line "## Recommendations"
if ($ffmpeg -and ((& ffmpeg -hide_banner -encoders 2>&1 | Out-String) -match "h264_nvenc")) {
  Add-Line '- NVENC is available for fast renders: `-c:v h264_nvenc -preset p5 -rc vbr -cq 19`. Use it after the color-safe SDR render path has been verified on this machine.'
} else {
  Add-Line "- NVENC is missing. Renders will likely fall back to CPU and be much slower."
}
if ($nvidiaSmi) {
  Add-Line "- NVIDIA GPU detected. Prefer CUDA/NVENC paths for render and local ASR when available."
} else {
  Add-Line "- No NVIDIA driver tool detected. Do not assume CUDA is available."
}
if ($magick -and ((& magick -version 2>&1 | Out-String) -match "pangocairo") -and ((& magick -version 2>&1 | Out-String) -match "raqm")) {
  Add-Line "- Pango/RAQM text rendering is available. Use second-pass Pango overlay as the default final route for Thai subtitles/headlines/keywords."
} else {
  Add-Line "- Pango/RAQM is missing. Install an ImageMagick build with pangocairo and raqm before relying on Thai-safe subtitle overlay."
}
if ($runtimeTools["npx"]) {
  Add-Line '- HyperFrames social/course default: render SDR Rec.709 with `--sdr --quality high --video-frame-format png`; use `--no-browser-gpu` or Docker when colors shift.'
}
Add-Line "- For short-form work, recommended baseline: NVIDIA RTX GPU with NVENC, 16 GB+ RAM, SSD workspace, FFmpeg with h264_nvenc, ImageMagick with pangocairo/raqm, Node 22+, and Python 3.11+."

$report = ($lines -join [Environment]::NewLine)
if ($OutputPath) {
  [System.IO.File]::WriteAllText($OutputPath, $report, [System.Text.UTF8Encoding]::new($false))
  Write-Host $OutputPath
} else {
  Write-Output $report
}

if ($FailOnMissing -and $criticalIssues.Count -gt 0) {
  exit 2
}
