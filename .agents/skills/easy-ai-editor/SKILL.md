---
name: easy-ai-editor
description: Use when editing Thai videos with Codex or another terminal-capable AI agent for short-form content, lessons, ads, screen recordings, product demos, or creator clips that need speech-safe cuts, Thai captions, optional ElevenLabs transcript authority, B-roll, effects, music, and render checks.
---

# Easy AI Editor

## Purpose

Build practical Thai videos as a production pipeline, not a one-off edit. The skill supports short-form clips, lessons, ads, screen tutorials, product demos, and creator content while prioritizing natural Thai readability, speech-safe cuts, face-safe framing, and fast draft/final render loops.

Use this skill together with `hyperframes`, `hyperframes-cli`, and `hyperframes-media` when creating or modifying HyperFrames compositions.

This skill is a workflow pack, not a bundled video editor. It still needs local tools such as FFmpeg, Python, Pango/browser/SVG rendering, WhisperX/ASR, HyperFrames, or video-use depending on the edit. On a new machine, run the hardware/tool check and report missing tools before promising a final render.

If Claude Code, Antigravity, or another terminal-capable agent is reading this file outside Codex, treat this folder as a workflow manual. Read this `SKILL.md`, load only the referenced files needed for the task, ask the user to add external media folders to the project/workspace if access is blocked, and run the same verification gates before claiming the edit is ready.

## Tool Dependency Rule

- `easy-ai-editor` decides the workflow, quality rules, timing rules, layout rules, and verification gates.
- FFmpeg is still required for practical cutting, audio extraction, encode, and export.
- Pango/browser/SVG rendering is the default final route for Thai headline/subtitle/keyword overlays.
- FFprobe color metadata checks are required before final renders. Course and social outputs default to SDR Rec.709 unless the user explicitly requests HDR delivery.
- ElevenLabs/Scribe is optional but recommended as the transcript content authority when the user provides an API key. Use `ELEVENLABS_API_KEY` from the environment or a user-provided session secret; never write the key into project files, scripts, or exported skill zips.
- WhisperX or another word-level/forced-alignment tool is still required when the user needs exact subtitle timing.
- HyperFrames is optional but recommended for advanced composition, motion graphics, browser-rendered overlays, split-screen, PiP, and polished effect work.
- video-use is optional as an additional video editing engine/workflow. Do not require it for every learner if FFmpeg/Pango/HyperFrames can do the job, but use it when the local setup and task benefit from it.
- If a tool is missing, say exactly what quality or speed limitation it creates before editing.

## Inputs

Collect or infer these before editing:

- A-roll source video and optional B-roll/product/screen assets.
- Transcript or word timing. Prefer WhisperX word-level timing for Thai. When ElevenLabs/Scribe transcript is available, treat it as the content authority and WhisperX as the timing authority.
- Optional ElevenLabs API key for higher-accuracy transcript content. Prefer environment variable `ELEVENLABS_API_KEY`; do not save API keys in the project.
- Target platform and aspect ratio. Default: vertical `1080x1920`, `30fps`.
- Desired style: sales, lesson, story, product demo, course promo, or raw creator clip.
- Optional music/SFX files.
- Required headline, CTA, product names, spelling corrections, and banned terms.

Ask only when a missing input would change the edit materially. Otherwise make a reasonable default and proceed.

## Default Behavior for Broad Edit Requests

When the user says "ตัดต่อให้หน่อย", "ทำคลิปให้หน่อย", or gives a similarly broad editing request, run the autonomous baseline workflow:

- Inspect the **audio, visuals, and provided files** before deciding edits.
- Plan effects, headline, subtitle style, music, camera movement, and candidate B-roll slots.
- Do **not** stop for approval unless the user explicitly asks to approve the plan first.
- Render a usable first cut with at least: speech-safe cleanup, headline hook, Thai subtitles, keyword emphasis, basic punch/zoom/cut effects, light grade, and music bed when available.
- If no real B-roll is provided, do not fake final proof. Use face-safe text/graphic placeholders only when helpful, and save a B-roll replacement plan for the next iteration.
- Read `references/autonomous-baseline-edit.md` before handling broad edit requests.

## Brief-Driven Jobs and Revision Rounds

Real jobs often arrive as a Thai brief with exact insert timings, font orders, and then several correction rounds. Most production failures happen here, not in the first cut. These rules exist because every one of them has been violated in a real job and cost the user many wasted rounds:

1. **Parse the brief into a timeline table before editing.** Restate every insert/text/music order as one row: `asset | source range | output range | layout (full/half/position) | notes`. Include this table in your work summary so the user can spot a misread immediately. Thai briefs are often one long run-on sentence; timing phrases like "จากวินาทีที่ 3 ไปจนถึงวินาทีที่ 5 จากนั้น..." are easy to misparse, so never trust a single reading.
2. **Keep one edit spec as the single source of truth.** Maintain `edit_spec.json` (or equivalent) holding the cut list, inserts, text pipeline, fonts, sizes, positions, music, and SFX. Build every render from the full spec. A revision round updates only the fields the user asked to change; everything else must come out identical to the previous accepted render. If a briefed or revision job has no spec yet, create it before rendering. Do not render from memory, chat history, or scattered notes.
3. **Change only what the round asks.** Do not redesign styles, swap fonts, switch text renderers, move subtitles, retime inserts, or add/remove SFX the user did not mention. If a technical problem forces a change outside the brief, say so explicitly in the handoff instead of deciding silently. Users read unrequested changes as the edit going out of control, and they are right.
4. **Pick the text pipeline once.** Decide the Thai text route (Pango/browser/SVG overlay by default) at project start, record it in the spec, and do not bounce between PNG overlays, DOM text, and ASS across rounds. Switching renderers mid-project changes how every caption looks and reads to the user as random drift. Treat user orders such as "Kanit", "stroke บาง", or "ไม่มีกล่อง" as visible style locks, not permission to switch to a Thai-unsafe renderer.
5. **Prove each requested change visually.** After a revision render, crop the exact region of each changed element from the old and the new output and compare them side by side. If the requested change is not clearly visible in the new frame, the round is not done — do not hand it off. "I changed the config" is not evidence; the pixel difference is.
6. **Run a regression glance on what you did not touch.** Compare contact sheets between rounds; untouched elements (headline, insert timing, subtitle position, music) should look the same. A fix that breaks a previously accepted element costs more trust than the original bug.

Use `references/edit-spec-template.json` as the starting schema, then read `references/brief-revision-discipline.md` before any revision round, and immediately whenever the user reports that a previous "fix" did not actually change the output.

## Color Safety / HDR-SDR Rule

Color shifts are common when iPhone, DJI, OBS/Gaming HDR, or other HDR sources are mixed into a normal social/course edit. Treat color management as a required gate, not a cosmetic afterthought.

- Before render, inspect every A-roll and B-roll video with `ffprobe` for `color_space`, `color_transfer`, `color_primaries`, and `color_range`.
- For Facebook, TikTok, Reels, YouTube Shorts, course lessons, screen tutorials, and normal client delivery, default to **SDR Rec.709**.
- If any source reports `bt2020`, `smpte2084`, or `arib-std-b67`, either convert that source to SDR Rec.709 before editing or force a verified SDR render path. Do not let HyperFrames auto-HDR surprise the user.
- For HyperFrames social/course final renders, prefer `npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4`.
- Use `--video-frame-format png` for UI recordings, screen captures, product shots, color-sensitive footage, and any project where the user reports washed-out or shifted colors.
- If local render color looks wrong, rerender with `--no-browser-gpu`; if Docker is available, compare a Docker render as the deterministic reference.
- Do not diagnose color from QuickTime/macOS alone. Compare at least one other viewer such as VLC, Chrome, a real phone, or a private/unlisted platform upload before applying aggressive color fixes.
- Read `references/color-management.md` before handling HDR sources, color-shift reports, or HyperFrames renders involving screen recordings/product visuals.

## Workflow

1. **Prepare media**
   - Keep a clean source and a working HyperFrames project.
   - Inspect media first: ffprobe metadata, audio waveform/VAD/silence, representative frames/contact sheet, existing burned-in text, face position, and all provided assets.
   - Include color metadata in the inspection: `color_space`, `color_transfer`, `color_primaries`, and `color_range`. If any source is HDR, decide the SDR/HDR route before cutting.
   - Re-encode long A-roll to frequent keyframes if HyperFrames seeking is unreliable.
   - Copy Kanit, Noto Sans Thai, and Leelawadee UI fonts from `assets/fonts/` into the project unless a stronger brand font is provided.
   - On a new machine or exported install, run `scripts/check_hardware_accel.ps1` before the first render and read `references/hardware-acceleration.md` plus `references/color-management.md`.

2. **Audio-safe cleanup**
   - Cut speech only after semantic and waveform validation.
   - Never delete an ASR-only gap without checking waveform/VAD evidence.
   - Read `references/audio-safe-cuts.md` before trimming misspeaks, coughs, pauses, or retakes.

3. **Build transcript authority**
   - Hard gate: subtitle words and timings must come from the actual audio. If no transcript was provided and no ASR/alignment tool is available on this machine, do not guess captions from the brief or from memory — deliver the non-subtitle work, then tell the user their options (provide a transcript, install WhisperX, or set `ELEVENLABS_API_KEY`). A guessed subtitle looks finished but is a worse failure than a missing one, because the user only discovers it by watching every second.
   - For Thai subtitles, do not trust a single ASR output for both words and timing.
   - If `ELEVENLABS_API_KEY` is configured or the user provides an ElevenLabs transcript, use ElevenLabs/Scribe as the main transcript content authority, especially for proper nouns, Thai spelling, and sentence meaning.
   - If ElevenLabs is not configured, say so briefly and continue with WhisperX plus a manual Thai correction pass rather than pretending WhisperX text is perfect.
   - Use WhisperX as the word/phrase timing backbone, then align the corrected transcript to those timings.
   - Never hand-time subtitles from broad segment ranges when the user needs exact sync. Every visible subtitle event must inherit its start/end from WhisperX or another word-level/forced-alignment timing source, transformed through the final edit map.
   - Build a Thai phrase plan before generating subtitle events. For course, lesson, screen-recording, or long-form captions, split the corrected transcript by Thai sentence meaning and reading flow first, then map each phrase back to the first/last aligned word timestamp. Do not let fixed character counts, raw ASR tokens, or word-count heuristics create subtitles that start with the previous sentence's tail word or begin mid-sentence.
   - After speech cuts, either rerun alignment on the clean cut or remap original word timestamps through the cut list before generating subtitle events.
   - Run a subtitle gap audit before final render. If a subtitle gap is longer than a short natural pause and the audio is not silence/VAD-negative, treat it as missing caption content and fill it from a second ASR/listening pass.
   - Read `references/transcript-authority.md` before captioning clips with ASR spelling errors, retake cues, repeated phrases, or user-provided wording corrections.

4. **Plan the edit**
   - Map beats by time: hook, proof/demo, explanation, offer/CTA.
   - Decide where each effect earns its place: punch-in, smooth zoom, hard emphasis, split-screen, PiP, B-roll, keyword pop, SFX, grade.
   - For every layout change, make a second-by-second text placement plan: headline zone, subtitle zone, keyword zone, face zone, and B-roll focus zone.
   - For user approval requests, provide a second-by-second plan before rendering.

5. **Build face-safe visuals**
   - Face readability is the primary constraint.
   - Foreground speaker layouts must not crop hairline, eyes, nose, mouth, or chin unless the user explicitly wants an extreme close-up.
   - Read `references/face-safe-layouts.md` before split-screen, PiP, zoom, punch-in, or text placement work.

6. **Add text layers**
   - Text overlays are separate layers: headline, subtitle, keyword emphasis, labels.
   - The top rule is **do not cover the face**. Text may be above the head, below the chin, side-aligned, or in a B-roll safe zone depending on the frame.
   - Thai text must be typography-safe: vowels and tone marks must not collide, disappear, or detach from their base character.
   - For Thai final renders, do **not** use ASS/libass as the first choice. Default to a clean master without Thai text, then add headline/subtitle/keyword as a final second-pass Pango/browser/SVG image overlay.
   - Use ASS/libass only for draft preview, non-Thai text, or a constrained emergency path after a real-word bake-off proves the exact Thai words are clean on the current machine. Do not make learners test ASS/libass on every normal job.
   - For final Thai captions that must be exact and clean, use `scripts/render_pango_text_overlay.py` or an equivalent Thai-safe browser/SVG overlay with events generated from word-level timing.
   - For long/course subtitles, prioritize natural Thai sentence chunks over kinetic 1-3 word chunks. A subtitle may stay longer or use two lines if that preserves a complete Thai phrase and remains synced to its first/last spoken word.
   - Use short hold smoothing across micro-pauses when needed so subtitles do not blink off between connected spoken phrases.
   - Default to one consistent subtitle baseline for the whole clip, especially short-form. Move a subtitle off the baseline only when that scene's frame would put it over the face, the B-roll subject, or platform UI — and return to the baseline right after. If the user specified a position, their order wins over scene-aware repositioning; viewers (and users) experience a wandering subtitle as a defect.
   - Subtitle placement is scene-aware within that constraint. When B-roll, split-screen, PiP, punch-in, or CTA screenshots change the frame, check the baseline against the new layout and adjust the subtitle or the face/crop before rendering.
   - When the user orders a numeric text size that would be unreadable on a phone at 1080x1920 (roughly below 40 px for subtitles), render one sample frame, flag the readability risk once with a concrete alternative, then follow the user's decision. Never silently substitute a different size, weight, or font.
   - Read `references/subtitle-keyword-system.md` before adding Thai captions, headline hooks, or keyword emphasis.

7. **Add music and SFX**
   - Music is a low-volume bed under speech, with fades.
   - Use `scripts/make_music_bed.ps1` when preparing a music bed.
   - SFX should support cuts, keyword pops, transitions, or CTA beats; avoid constant noise.

8. **Render loop**
   - Render a fast draft first:
     ```powershell
     npx hyperframes@latest render --sdr --quality draft --fps 15 --video-frame-format png --output draft.mp4
     ```
   - Generate a contact sheet and inspect layout.
   - Render final only after draft placement and color are acceptable:
     ```powershell
     npx hyperframes@latest render --sdr --quality high --video-frame-format png --output final-sdr.mp4
     ```
   - Use `--gpu` only when the hardware check says the GPU path is stable for this machine and the current composition. If color shifts after a GPU/browser render, compare `--no-browser-gpu` and Docker renders before delivery.

9. **Verify before handoff**
   - Run HyperFrames lint and validate.
   - Check video metadata, audio peak, long silence, and contact sheets.
   - Confirm the subtitle gap audit has no unexplained non-silence gaps before sending the output.
   - Read `references/render-verification.md` before claiming the video is done.

## Effect Defaults

- Visual change every 5-8 seconds when the footage would otherwise feel static.
- Punch-in for important claims, insight lines, and CTA. Default hold: at least 3 seconds.
- Smooth zoom for longer explanation sections.
- Hard snap/punch for strong statements or transitions.
- Split-screen or PiP when showing product, chart, app, B-roll, before/after, or screen demo.
- Keyword pop only for the few words that matter. Do not animate every sentence.
- Light grade, vignette, and grain can be default, but keep skin natural.

Read `references/effects-presets.md` for selection rules.

## Utility Scripts

- `scripts/make_music_bed.ps1`: create a low-volume, faded music bed.
- `scripts/make_contact_sheet.ps1`: create a tiled screenshot sheet from chosen timestamps.
- `scripts/check_render.ps1`: run ffprobe, volumedetect, and silencedetect checks.
- `scripts/check_hardware_accel.ps1`: inspect CPU, RAM, GPU, NVIDIA driver, FFmpeg NVENC/hwaccels, ImageMagick Pango/RAQM, Node, and Python on a new machine.
- `scripts/render_pango_text_overlay.py`: default final-pass renderer for Thai-safe headline, subtitle, and keyword overlays.

Use these scripts rather than rewriting the same FFmpeg commands each time.

The `.ps1` scripts are PowerShell. On macOS/Linux, do not skip the check — run the equivalent ffmpeg/ffprobe commands directly; the commands inside each script are plain FFmpeg and translate one-to-one.

## Completion Standard

A finished edit must include:

- Output video path.
- Summary of cut/effect/text/music changes.
- Verification evidence: lint/validate, ffprobe, audio peak, silence check, and contact sheet path.
- For revision rounds: before/after crops of each changed element, plus an explicit note for anything that had to change beyond the brief.
- Any remaining caveat, such as imperfect ASR spelling or a layout choice that trades full-frame fill for face safety.
