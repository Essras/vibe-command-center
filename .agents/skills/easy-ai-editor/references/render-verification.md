# Render Verification

## Required Checks

Run before claiming completion:

```powershell
npx --yes hyperframes@latest doctor
npx --yes hyperframes@latest lint
npx --yes hyperframes@latest validate
```

Do not pin old HyperFrames versions in normal course/social workflows. Check the current installed/latest version first, then use the latest version that passes `doctor`. If a student is mid-revision on an older project, update HyperFrames only before a new render cycle or when the issue being fixed is color/render reliability.

## Color And HDR-SDR Checks

Before final render, inspect each source video:

```powershell
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,color_space,color_transfer,color_primaries,color_range -of default=nw=1 input.mp4
```

For Facebook, TikTok, Reels, YouTube Shorts, course lessons, screen recordings, and normal client delivery, default to SDR Rec.709. If any source shows `bt2020`, `smpte2084`, or `arib-std-b67`, read `color-management.md` and either convert the source to SDR Rec.709 or force an SDR-safe HyperFrames render.

Default color-safe HyperFrames final render:

```powershell
npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4
```

If color still looks wrong:

```powershell
npx hyperframes@latest render --sdr --quality high --video-frame-format png --no-browser-gpu --output final-sdr-nogpu.mp4
npx hyperframes@latest render --docker --sdr --quality high --video-frame-format png --output final-sdr-docker.mp4
```

Do not diagnose color from QuickTime/macOS alone. Compare another viewer such as VLC, Chrome, a real phone, or a private/unlisted platform upload.

Then check the final file:

```powershell
ffprobe -hide_banner -v error -select_streams v:0 -show_entries stream=codec_name,width,height,avg_frame_rate,duration,bit_rate,pix_fmt,color_space,color_transfer,color_primaries,color_range -of default=nw=1:nk=0 final.mp4
ffmpeg -hide_banner -nostats -i final.mp4 -af volumedetect -f null NUL
ffmpeg -hide_banner -nostats -i final.mp4 -af silencedetect=noise=-30dB:d=1 -f null NUL
```

For captioned Thai edits, also run or inspect the subtitle gap audit. Every subtitle gap above the micro-pause threshold should be explained by silence/VAD-negative audio, a deliberate visual-only moment, or a documented hold decision. A gap with real speech is a missing-caption bug.

## Contact Sheet

Create a contact sheet from the rendered output, not the source HTML:

- headline frame
- first subtitle
- Thai subtitle with vowels/tone marks, such as `ไม่`, `ขึ้น`, `รู้`, `ซื้อ`, or `เคี้ยว`
- first keyword
- split-screen/PiP
- punch-in moments
- B-roll/product moment
- CTA/end
- one frame from each distinct subtitle placement zone

Use `scripts/make_contact_sheet.ps1` when useful.

## Pass Criteria

- Vertical output is `1080x1920` unless the user asked otherwise.
- FPS matches request, usually `30/1`.
- Course/social final output is SDR Rec.709 unless HDR was explicitly requested and verified.
- Source/video colors are checked with ffprobe; HDR sources are documented and handled through the SDR/HDR decision gate.
- Voice is not clipped. Target peak should generally stay below `-0.3 dB`; if music is added, keep some headroom.
- No unexpected silence >= 1 second unless intentional.
- No unexplained subtitle gap over real speech.
- Text is readable and does not cover the face.
- Thai vowels and tone marks do not overlap, disappear, or detach from base characters.
- Face-safe moments are verified from final rendered frames.
- Subtitle placement is verified at every layout change, especially B-roll, split-screen, PiP, punch-in, and CTA scenes.

If HyperFrames `inspect` times out on long video compositions, say so and substitute contact-sheet/frame verification.

## Revision Round Verification

The checks above prove the file is technically healthy. A revision round additionally has to prove the round itself worked:

- **Before/after crop per changed element.** Extract the same frame region from the previous delivery and the new render for every element the user asked to change. The difference must be visible and must match the order. If the crops look the same, the change did not reach the output — find out why (wrong layer, cached overlay, stale file path, old file delivered) before replying.
- **Locked-element comparison.** Compare contact sheets between rounds. Elements the user did not ask to change must look identical: headline, insert in/out frames, subtitle font/size/baseline, music level. Check the first and last frame of each insert specifically; timing regressions concentrate at boundaries.
- **Measured numbers for numeric orders.** Font size orders are verified by measuring rendered glyph height in pixels on a frame; timing orders by frame timestamps. Do not verify numbers by re-reading your own config.
- **Attach the evidence.** The handoff includes the crops or a comparison sheet, not just the claim. A round may only be reported as fixed when the evidence exists.
