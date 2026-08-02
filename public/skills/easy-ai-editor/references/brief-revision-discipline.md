# Brief And Revision Discipline

Use this for any job where the user gives a brief with explicit orders (insert timings, fonts, sizes, SFX) and for every correction round after the first delivery. This workflow exists because a real production job burned 14 render rounds on failures that were all preventable: guessed subtitles, misread insert timings, silently swapped text renderers, "fixed" rounds where nothing visibly changed, and subtitles that wandered around the frame.

## Why revision rounds fail

Revision rounds fail differently from first cuts. The user has already accepted parts of the video. From round 2 onward, the job is no longer "make a good video" — it is "change exactly these things and keep everything else identical." An agent that re-decides the whole edit each round will fix one complaint and create two new ones, and the user experiences this as the edit getting worse while they get angrier.

## Step 1: Parse the brief into a timeline table

Thai production briefs are usually one long spoken-style sentence. Before touching the timeline, rewrite the brief as a table and include it in your reply:

```text
# | order               | asset/source                  | source range | output range | layout                          | notes
1 | insert 01           | .../insert/01.png             | -            | 0:00-0:03    | full screen                     | -
2 | insert 02           | .../insert/02.png             | -            | 0:03-0:05    | full screen                     | -
3 | insert 03           | .../insert/03.png             | -            | 0:05-0:07    | full screen                     | -
4 | insert EP3 clip     | .../EP3.mp4                   | 2:27-2:34    | 0:07-0:11    | top half, fade bottom, face below | speaker face must stay visible
5 | subtitles           | from transcript only          | -            | whole clip   | baseline position, Kanit        | 3-4 words per event, follow speech exactly
6 | SFX                 | .../sound effect/ (pick)      | -            | at cut beats | -                               | quiet, under speech
```

Rules for parsing:

- Every number in the brief becomes a row. If a phrase can be read two ways ("ไปจนถึงวินาทีที่ 5 จากนั้น..."), write the reading you chose in the notes so the user can correct it from the table instead of from the rendered video.
- Watch for Thai brief typos and shorthand: `Stork` usually means `stroke` (text outline), `ขนาด 10`/`ขนาด 20` are font sizes that may be far too small at 1080x1920, `เต็มจอ/ครึ่งจอ` are layout orders, `เพี้ยน` means the output deviated from the order.
- If a materially ambiguous order cannot be resolved from context, ask once with your best-guess table attached — one question round is cheaper than one wrong render round.

## Step 2: Keep an edit spec as the single source of truth

Create `edit_spec.json` (or equivalent) next to the project on the first round and update it every round. It must contain everything needed to rebuild the current accepted state:

```json
{
  "version": 4,
  "source": "/path/to/aroll.mp4",
  "output": "1080x1920@30",
  "cut_list": [["0:00.0", "0:14.8", "dead-air cut map ..."]],
  "inserts": [
    {"id": "01", "asset": "01.png", "out": ["0:00", "0:03"], "layout": "full"},
    {"id": "EP3", "asset": "EP3.mp4", "src": ["2:27", "2:34"], "out": ["0:07", "0:11"],
     "layout": "top-half-fade-bottom", "face_rule": "speaker fully visible below"}
  ],
  "text_pipeline": "pango_overlay",
  "headline": {"text": "เลิก ใช้ AI ทำเพจแบบตกยุค!", "style": "red-band", "font": "Kanit ExtraBold", "ref_image": "example.jpg"},
  "subtitle": {"font": "Kanit Regular", "size_px": 56, "stroke": "thin", "box": false,
               "baseline_y": 1450, "source": "transcript_v2.md"},
  "music": {"file": "Drum.wav", "level_db": -22},
  "sfx": [{"file": "BOOM SWOOSH.wav", "at": "0:01"}],
  "locked": ["inserts", "music"],
  "round_log": [
    {"round": 4, "changed": ["subtitle.size_px"], "reason": "user: too small on mobile"}
  ]
}
```

Use `references/edit-spec-template.json` from this skill as the copyable starting point. Keep the project copy beside the working files, not inside the exported skill folder.

Why: when each round is an incremental patch on the previous render, errors and undocumented decisions accumulate and become unreproducible. When each round is "update the spec, rebuild from spec," the current state is always inspectable, diffable against the brief, and a regression means a spec bug you can see.

The `locked` list holds everything the user has accepted or ordered. Locked items must render bit-identically (or visually identically) until the user asks to change them.

Hard gate: for a briefed job or a revision job, no spec means no render. If the user says "ตัดเลย" after a detailed brief, create the spec internally first, then render from it. If the user asks to approve first, show the table/spec summary before rendering.

## Style locks vs renderer locks

Do not confuse the user's visual style order with the technical renderer used to draw it.

- `Kanit`, `ตัวหนา`, `stroke บาง`, `ไม่มีกล่อง`, `สีแดง`, `ตำแหน่งเดิม` are style/layout locks.
- `Pango`, `browser`, `SVG`, `ASS`, `PNG sequence`, `DOM text` are renderer choices.
- Thai final text defaults to Pango/browser/SVG overlay even when the visible font is Kanit. The renderer may change only to protect Thai shaping or because the user explicitly asked for a technical route.
- If a renderer change is technically necessary, preserve the visible style and write one sentence in the handoff: what changed technically and why. Do not silently switch to ASS/libass just because it is convenient.

## Step 3: Per-round procedure

For every correction round:

1. Quote each complaint and map it to spec fields. "ซับบังปากตั้งแต่วินาที 7" → `subtitle.baseline_y` is violated from 0:07 on; the fix is to restore one baseline, not to invent a new position scheme.
2. Re-read the original brief and the round log before editing. A complaint repeated twice ("บอกให้แก้มาสองรอบแล้วก็ยังเหมือนเดิม") means your previous change did not reach the output — debug the pipeline (wrong layer rendered? overlay cached? old file delivered?) instead of re-applying the same edit harder.
3. Update only the spec fields the round names. Create a tiny `spec_diff` note before rendering so the allowed change is explicit.
4. Rebuild from the full spec.
5. Verify the change with evidence (Step 4) before replying.
6. Append to `round_log` what changed and why.

Example `spec_diff`:

```text
Round 7 allowed changes:
- subtitle.baseline_y: 1510 -> 1420 from 0:07-end
- subtitle.size_px: unchanged
- text_pipeline: unchanged pango_overlay
- inserts/music/SFX/headline: locked, no changes allowed
```

## Step 4: Prove the change, check for regressions

A revision round has two failure modes: the requested change did not happen, and something unrequested changed. Check both:

- **Change proof.** For each changed element, extract the same frame (or the relevant frames) from the previous delivery and the new render, crop the element's region, and look at them side by side. The difference must be obvious and must match the order. If you cannot see the difference, the user certainly will not — the round is not done.
- **Regression glance.** Compare full contact sheets across rounds. Every locked/untouched element must look the same: headline style, insert in/out points, subtitle font and baseline, music level. Spot-check insert boundaries (first/middle/last frame of each insert) because timing regressions hide there.
- **Numeric checks when the order is numeric.** If the user ordered "size 30 pt" or "insert until 0:12", verify with measurement (rendered glyph height in px, ffprobe/frame timestamps), not by trusting the config you wrote.

Never report "แก้แล้วครับ" on the strength of having edited a config file. Report it on the strength of the cropped before/after frames, and attach them.

## Subtitle-specific rules for briefed jobs

- No transcript and no ASR tooling means no subtitles this round. Say so, deliver the rest, and offer the options (user supplies transcript, install WhisperX, set `ELEVENLABS_API_KEY`, or an explicit "ฟังแล้วถอด" listening pass that the user approves before burning). Guessing words from the brief is the single worst failure in this workflow — it produced the "ซับเพี้ยนมาก" round.
- One baseline position for the entire clip unless a specific scene forces a temporary move; return to baseline afterward. The same line position, the same font, the same size, every event.
- Style fields (font, weight, size, stroke, box) belong to the user once they have specified them. Rendering problems (Thai marks colliding, overflow) are fixed by changing the renderer or layout math — while keeping the ordered look — and the handoff must mention what was adjusted and why.

## Stop-loop response template

Use this when the same defect failed twice:

```text
เรื่องนี้แก้มา 2 รอบแล้วแต่ผลยังไม่เปลี่ยนจริง ผมจะหยุด render ก่อน
สาเหตุที่ต้องตรวจ:
1. แก้ผิด layer หรือ overlay ไม่ได้ถูกใช้ใน final render
2. ส่งไฟล์เก่า หรือ path output ชี้ผิด
3. renderer/cache ใช้ asset เก่า
4. spec ถูกแก้แล้วแต่ render script อ่านคนละไฟล์

ก่อน render รอบใหม่ ผมจะตรวจ spec, render command, output path, และ crop ก่อน/หลังให้เห็นว่าการแก้ถึงไฟล์จริงแล้ว
```

## When the user is frustrated

Repeated complaints and harsh wording ("ทำงานชุ่ยนะ") are a signal that trust is depleted and rounds are being wasted. The correct response is narrower scope and harder evidence, not broader initiative:

- Shrink the round to exactly the named defects.
- Deliver evidence first: before/after crops, the timeline table, measured numbers.
- Do not add improvements, new SFX, or style polish to compensate. Unrequested additions read as more loss of control.
- If two consecutive rounds failed on the same element, stop and state your diagnosis of why the fixes are not landing before rendering a third attempt.
