# Color Management And HDR-SDR Safety

Use this when a clip looks washed out, too bright, too flat, over-saturated, or different after rendering. Most learner reports of "สีเพี้ยน" come from HDR sources being interpreted as SDR, SDR overlays being mixed into HDR output, JPG frame extraction, or browser/GPU capture differences.

## Default Policy

- For Facebook, TikTok, Reels, YouTube Shorts, course videos, screen lessons, and normal client work, deliver **SDR Rec.709** unless the user explicitly asks for HDR.
- Treat iPhone HDR, DJI HDR, OBS/Gaming HDR, HLG, PQ, and BT.2020 sources as risk sources.
- Do not rely on one viewer. QuickTime/macOS can show gamma differently from VLC, Chrome, phones, and social platforms.
- Keep color management separate from creative grading. First make the technical color correct; then apply any grade intentionally.

## Detect Source Color

Run this on every A-roll and B-roll video before final render:

```powershell
ffprobe -v error -select_streams v:0 `
  -show_entries stream=codec_name,pix_fmt,color_space,color_transfer,color_primaries,color_range `
  -of default=nw=1 input.mp4
```

Read the result this way:

- `color_primaries=bt2020`, `color_space=bt2020nc`, `color_transfer=smpte2084` means PQ HDR.
- `color_transfer=arib-std-b67` means HLG HDR.
- `color_space=bt709` and `color_primaries=bt709` means normal SDR Rec.709.
- Empty or unknown color tags are a warning: render a short test and compare viewers before final.

## HyperFrames Safe Render Defaults

For normal social/course final renders:

```powershell
npx hyperframes@latest doctor
npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4
```

Use `--video-frame-format png` for:

- screen recordings and UI tutorials
- product shots or brand-color-sensitive footage
- clips with saturated UI colors
- any source where default render looks shifted, washed out, or too contrasty

If local render color is wrong, compare these:

```powershell
npx hyperframes@latest render --sdr --quality high --video-frame-format png --no-browser-gpu --output final-sdr-nogpu.mp4
npx hyperframes@latest render --docker --sdr --quality high --video-frame-format png --output final-sdr-docker.mp4
```

Use Docker as the deterministic reference when available. If Docker is not installed, compare local vs no-browser-gpu and document the result.

## Convert HDR Source To SDR Rec.709

When the source is HDR but the final job is normal social/course SDR, convert the source first and edit with the converted file:

```powershell
ffmpeg -y -i input_hdr.mp4 `
  -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" `
  -c:v libx264 -crf 18 -preset slow -c:a copy input_sdr_rec709.mp4
```

After conversion, verify:

```powershell
ffprobe -v error -select_streams v:0 `
  -show_entries stream=color_space,color_transfer,color_primaries,color_range `
  -of default=nw=1 input_sdr_rec709.mp4
```

The final SDR output should report Rec.709-like tags, not BT.2020/PQ/HLG.

## Final Output Verification

Before delivery:

- Run ffprobe on the final file and record the color tags.
- For social/course SDR, final output should be SDR/Rec.709. If it is HDR, this must be intentional and documented.
- Compare at least two viewers when color was the reported issue: VLC/Chrome/phone/private upload. Do not fix based only on QuickTime/macOS.
- If the final contains screen recordings or product colors, include a frame/contact-sheet comparison from source vs output.

## Plain-Language Diagnosis

Use this wording with learners:

- "ไฟล์จาก iPhone/DJI/OBS บางตัวเป็น HDR แต่คลิปที่ลงโซเชียลปกติควรเป็น SDR เลยต้องแปลงหรือบังคับ render เป็น SDR ก่อน"
- "สีที่เพี้ยนอาจไม่ได้เกิดจากการแต่งสี แต่อาจเกิดจาก player หรือ render path ตีความ HDR/SDR ไม่ตรงกัน"
- "ถ้าสีเพี้ยนเฉพาะ QuickTime แต่ VLC/Chrome/มือถือถูก อาจเป็น viewer gamma shift ไม่ใช่ไฟล์เสีย"
