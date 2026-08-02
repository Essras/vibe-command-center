# Transcript Authority Workflow

Use this when Thai ASR words are misspelled, split strangely, or when the clip has retakes such as "เอาใหม่". The goal is to separate **what was said** from **when it was said**.

## Hard Gate: No Source, No Subtitles

Subtitle text and timing must trace back to the actual audio — a provided transcript, an ASR pass, or an explicit user-approved listening pass. If none of these is possible on the current machine, do not burn subtitles in this round. Deliver the non-subtitle work and present the options (user provides transcript, install WhisperX, set `ELEVENLABS_API_KEY`, or an approved listen-and-transcribe pass). Inventing caption words from the brief or from context produces subtitles that look done but are wrong, which the user only discovers by re-watching the whole clip — the most expensive possible failure.

## Source Priority

1. **Content authority**: ElevenLabs/Scribe transcript, user-provided script, or manually corrected transcript.
2. **Timing authority**: WhisperX word-level timestamps and VAD/silence evidence.
3. **Safety evidence**: waveform, silencedetect, and video review around proposed cuts.

If ElevenLabs is unavailable, keep using WhisperX but add a manual Thai correction pass before generating subtitles.

## ElevenLabs API Key Option

Use ElevenLabs/Scribe when the user wants higher transcript accuracy or when WhisperX drops words, garbles Thai, or misses proper nouns.

- Prefer API key from environment variable `ELEVENLABS_API_KEY`.
- If the key is missing and transcript accuracy matters, ask the user to provide/set the key or confirm a WhisperX + manual correction fallback.
- Never write the API key into a project file, subtitle file, render script, exported skill zip, or final report.
- Treat ElevenLabs output as **what was said**, not as final timing. Keep WhisperX/forced alignment as the timing backbone unless ElevenLabs timing has been separately verified for the final edit.
- After rough cuts, either rerun timing on the clean cut or remap source timings through the edit list before generating subtitles.

## Procedure

1. Generate WhisperX word timings with CUDA when available.
2. Generate or import the ElevenLabs transcript when `ELEVENLABS_API_KEY` or a user-provided ElevenLabs transcript is available. If unavailable, generate a second transcript/listening pass and mark it as lower-confidence.
3. Read the entire transcript before captioning. Identify:
   - proper nouns, product names, clinic names, English brand names;
   - domain terms such as finance, dental, software, or course vocabulary;
   - repeated takes, "เอาใหม่", coughs, false starts, and abandoned phrases.
4. Create a canonical transcript:
   - fix spelling and spacing;
   - preserve intended Thai phrasing;
   - remove false starts only when the retake is clearly better;
   - keep wording faithful, do not rewrite the speaker's meaning.
5. Align canonical transcript to WhisperX timings:
   - anchor by phrases, not only by exact word strings;
   - use WhisperX word start/end for subtitle timing;
   - when a proper noun is garbled by WhisperX, borrow timing from the surrounding phrase span;
   - mark any low-confidence span for manual review rather than guessing.
   - Do not invent subtitle ranges from segment start/end, rough speech blocks, or visual scene timing. That creates visible drift and is not acceptable for final Thai subtitles.
   - If the video has already been cut, generate subtitle times on the cut timeline: rerun WhisperX/forced alignment on the clean cut, or apply the exact edit decision list to every source word timestamp before building events.
6. Build subtitles from the canonical transcript:
   - for course, lesson, screen-recording, and long-form captions, split by Thai sentence meaning first, then by line length only when needed;
   - for TikTok/ad kinetic captions, short 1-3 word chunks are allowed only when they still read naturally;
   - never start a subtitle with the previous sentence's tail word, such as `ครับ`, `นะครับ`, `แล้ว`, or `ก็`, unless it genuinely begins a new idea;
   - never split Thai connectors away from the phrase they introduce, such as `ถ้า`, `เพราะว่า`, `ดังนั้น`, `แต่`, `ซึ่ง`, `เวลาที่`, `สมมติว่า`, and `ก็คือ`;
   - never split compound terms awkwardly, e.g. keep "ฟันกราม", "Power Dental", "ตรวจฟรี";
   - keep tool/domain names intact, e.g. `Easy AI Editor`, `Codex`, `Claude Code`, `Antigravity`, `ElevenLabs`, `WhisperX`, `HyperFrames`, `FFmpeg`, `Full access`, `API key`, `B-roll`, and `SFX`;
   - allow a two-line subtitle when it preserves one complete Thai phrase better than splitting mid-meaning;
   - keep punctuation intentional and sparse;
   - strip ASR artifacts such as braces, hallucinated punctuation, or broken syllables.
7. Write a subtitle timing audit file next to the render inputs:
   - one line per event: `start-end | displayed text`;
   - times are on the final output timeline, not the original source timeline;
   - use this file to spot long, hand-timed, suspiciously broad, or linguistically awkward subtitle events before rendering;
   - check for bad starts such as sentence-tail words, broken tool names, raw Thai token spaces, and known bad joins such as `ปีหรือ`, `นั้นแต่`, or `เร็วกว่า-นั้นแต่`.
8. Run a subtitle gap audit against the clean-cut audio:
   - list every subtitle gap above about `0.45s`;
   - compare those gaps with `silencedetect`, VAD, waveform, or a quick ASR/listening pass;
   - gaps that contain speech are missing captions, not stylistic pauses;
   - fill missing captions from a second ASR pass or manual review, then rerun the audit.

## Retake Rules

- A cue like "เอาใหม่" means inspect before and after it. It is not automatically part of the final script.
- If the speaker restarts the same idea after "เอาใหม่", keep the later clean take.
- If a sentence before "เอาใหม่" is complete and useful, keep it unless the later take replaces it.
- Do not cut speech edges tight. Leave a small pre-roll and tail room, then fade only at edit points.

## Quality Gate

Before final render:

- Compare final subtitles against the canonical transcript, not the raw WhisperX text.
- Check that every subtitle event start/end comes from word-level timing or a documented edit-map transform.
- Check that the subtitle gap audit has no unexplained non-silence gaps. Do not hand off a final video where real speech has no subtitle.
- Run a second ASR pass on the clean cut and confirm removed retake words are gone.
- Inspect a contact sheet for subtitle and keyword positions.
- Report any uncertain phrase explicitly in the handoff.
