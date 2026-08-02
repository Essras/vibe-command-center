# Hardware Acceleration And New Machine Setup

Use this reference when exporting the skill, installing it on a new machine, or when renders/transcription feel unexpectedly slow.

## First Check

Run the bundled check script before the first edit:

```powershell
& C:\Users\User\.codex\skills\easy-ai-editor\scripts\check_hardware_accel.ps1 -OutputPath hardware-check.md
```

Read the report before choosing render settings. Do not assume CUDA, NVENC, Pango, or RAQM are available just because the machine has a GPU.

Also read `color-management.md` before the first HyperFrames render on a new machine or whenever a learner reports washed-out, shifted, or overly bright colors.

## What Matters

- **GPU render**: FFmpeg should list `h264_nvenc` for fast H.264 export on NVIDIA. `hevc_nvenc` and `av1_nvenc` are useful but not required.
- **GPU decode/accel**: `ffmpeg -hwaccels` should include `cuda`, `d3d11va`, or `dxva2`. Use them when they are stable, but do not force hardware decode if it breaks a filter chain.
- **Driver/CUDA**: `nvidia-smi` should run and show the NVIDIA driver. CUDA model inference depends on the ML stack, but render speed mainly depends on NVENC support.
- **Thai subtitle renderer**: ImageMagick should list `pangocairo` and `raqm` in `magick -version` for the Pango overlay fallback.
- **Runtime**: Node 22+ for HyperFrames workflows, Python 3.11+ for scripts, FFmpeg/ffprobe on PATH, `npx hyperframes@latest doctor`, and SSD workspace for frame sequences.
- **Color safety**: FFprobe must be available for checking HDR/SDR metadata, and HyperFrames renders should support `--sdr`, `--video-frame-format png`, `--no-browser-gpu`, and Docker comparison when needed.

## Render Defaults

Use NVENC when available:

```powershell
-c:v h264_nvenc -preset p5 -rc vbr -cq 19 -b:v 12M -maxrate 18M -bufsize 24M
```

If NVENC is missing, fall back to CPU H.264:

```powershell
-c:v libx264 -preset medium -crf 18
```

For preview renders, reduce resolution, bitrate, or FPS before lowering subtitle/text quality.

## Color-Safe Render Defaults

For normal social/course delivery, prefer SDR Rec.709:

```powershell
npx hyperframes@latest doctor
npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4
```

If a render looks washed out or shifted, compare:

```powershell
npx hyperframes@latest render --sdr --quality high --video-frame-format png --no-browser-gpu --output final-sdr-nogpu.mp4
npx hyperframes@latest render --docker --sdr --quality high --video-frame-format png --output final-sdr-docker.mp4
```

Use `--video-frame-format png` for screen recordings, UI tutorials, product footage, and any clip where source colors matter. Use `--gpu` only after the hardware check says the GPU path is available and the color comparison looks correct.

## Recommended Baseline

- NVIDIA RTX GPU with working `nvidia-smi` and FFmpeg `h264_nvenc`
- 16 GB RAM minimum, 32 GB preferred for heavier B-roll and frame sequences
- SSD workspace
- FFmpeg with `libass`, `h264_nvenc`, and common hwaccels
- ImageMagick with `pangocairo` and `raqm`
- Node 22+, Python 3.11+, and HyperFrames latest passing `doctor`

## New Machine Decision

- If `h264_nvenc` is available: use GPU render by default.
- If only CPU render is available: keep drafts short/lower-res and warn that final render will be slower.
- If ImageMagick lacks `pangocairo` or `raqm`: avoid promising perfect Thai tone-mark rendering until Pango/browser/SVG overlay is verified.
- If local ASR uses WhisperX or other ML tooling: verify CUDA separately inside that environment; FFmpeg NVENC availability does not prove PyTorch CUDA is ready.
- If HyperFrames doctor fails: use FFmpeg/Pango/video-use fallback for simple edits, or fix Node/FFmpeg/Chrome/Docker before promising HyperFrames compositions.
- If color differs between local and no-browser-gpu/Docker renders: choose the stable color path first, then optimize speed after the visual output is correct.
