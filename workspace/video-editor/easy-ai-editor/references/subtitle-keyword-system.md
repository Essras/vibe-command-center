# Subtitle And Keyword System

## Layer Model

Use separate layers:

- **Headline**: hook card or bold opening claim, often first 0-3 seconds.
- **Subtitle**: readable running captions following speech.
- **Keyword**: large emphasis words, separate from subtitle.
- **Labels**: small contextual labels for B-roll or product sections.

Do not merge subtitle and keyword into one layer. They have different jobs.

## Top Rule

Text placement must protect the face. "Under the chin" is not a hard rule. Captions can sit above the head, under the chin, side-aligned, or inside a B-roll safe zone if that is the best face-safe placement.

## Thai Typography Safety

Thai subtitle rendering must be checked visually before final handoff.

- For Thai final renders, use Pango/browser/SVG image overlays as the default text renderer. ASS/libass is not the first choice for Thai final subtitles because it can waste time on per-machine/font/build mark-placement issues.
- If the user says "ใช้ Kanit ทั้งคลิป", "ฟอนต์ต้องเหมือนกัน", "stroke บาง", or "ไม่มีกล่อง", treat that as a visible style requirement. It does not override the renderer rule. The final Thai text may still be rendered by Pango/browser/SVG as long as the visible result matches the requested font, size, weight, stroke, and placement.
- Do not change from Pango/browser/SVG to ASS/libass in a revision round merely to satisfy a font/style request. If the renderer must change for a technical reason, keep the visible style locked and mention the technical reason in the handoff.
- Use Thai-capable fonts with proper mark positioning. Prefer Kanit for HTML/browser rendering. If Kanit or Noto Sans Thai tone marks collide in a renderer, use Leelawadee UI first, then Tahoma as the conservative fallback.
- Keep letter spacing at `0`. Do not use negative tracking on Thai text.
- Do not animate, split, or wrap Thai text by individual codepoints. Keep grapheme clusters together so vowels and tone marks stay attached to the base character.
- For keyword pops, animate the whole word or phrase block, not each character.
- Use enough line height and vertical padding for above/below marks. In HTML/CSS, start around `line-height: 1.22-1.35`.
- Avoid text effects that crush vertical space: tight boxes, `scaleY`, oversized stroke, heavy shadow, or per-letter transforms.
- Test real Thai words that include stacked marks, such as `ไม่`, `ขึ้น`, `รู้`, `ซื้อ`, `เคี้ยว`, `ฟันกราม`, and `ใส่`. If any vowel or tone mark overlaps, fix the style before rendering final.
- If a renderer cannot shape Thai marks correctly, switch renderer or burn subtitles through a renderer with Thai/OpenType shaping support before final export.
- For normal Thai jobs, render the main edit without subtitles, then add subtitles in a second pass using a Thai-safe image overlay renderer such as ImageMagick Pango/PangoCairo with RAQM, browser DOM/SVG, or another renderer that visually passes the actual Thai words.
- Treat ASS/libass as preview-only for Thai text by default. It may be used only for non-Thai text, draft previews, or a constrained emergency path after a real-word bake-off proves the exact rendered Thai words are clean on the current machine.

Renderer notes:

- **Browser/HyperFrames**: prefer normal DOM text with Thai fonts. Keep `letter-spacing: 0`, avoid per-letter spans, and give subtitle pills enough top/bottom padding.
- **ASS/libass**: use for draft preview, non-Thai text, or emergency-only final rendering after a real-word bake-off passes. Avoid `Spacing`/tight tracking, keep `ScaleX/ScaleY` at `100`, and avoid thick text outlines. Confirm the local FFmpeg/libass build logs HarfBuzz and renders Thai marks correctly before trusting it. If the actual Thai word fails once, abandon ASS for the subtitle layer and use a Pango/browser image-overlay pass.
- **PIL/MoviePy/custom raster text**: avoid default per-glyph drawing for Thai unless it uses HarfBuzz/Pango/Raqm shaping. If it cannot shape Thai, render text through browser/SVG/Pango first, then composite the transparent raster.
- **ImageMagick Pango/PangoCairo**: good fallback for final Thai captions when `magick -version` lists `pangocairo` and `raqm`. Render each subtitle/keyword as a transparent text PNG, add the box/background in a raster compositor, write a transparent PNG frame sequence, then overlay it as the last FFmpeg step.

## Two-Pass Thai Subtitle Default

Use this as the default route for Thai final subtitles, headline hooks, and keyword emphasis:

1. Render the main edit with all cuts, B-roll, music, color, zoom, and effects, but **without** subtitle/headline/keyword text.
2. Generate subtitle/headline/keyword overlays as transparent image assets through Pango/browser/SVG, not ASS. Events must use final-output timeline seconds from word-level timing, not broad segment ranges.
3. Composite the overlay sequence onto the clean master as the final video step.
4. Verify full-size frames for words with stacked marks such as `เพื่อทำ`, `ไม่มี`, `สำหรับคนที่`, `อย่าปล่อยไว้นาน`, `เรื่อยๆ`, and `เคี้ยว`.
5. Inspect at least one frame around a fast subtitle change and one around a long phrase. If the visible text appears early/late, fix the event timing from word timestamps before handoff.
6. Run a subtitle gap audit after generating the event JSON. Any non-silence gap with speech means the caption set is incomplete; add the missing phrase before compositing the final pass.

Reusable script:

```powershell
python C:\Users\User\.codex\skills\easy-ai-editor\scripts\render_pango_text_overlay.py `
  --base-video clean_master_no_text.mp4 `
  --events-json text_events.json `
  --output final_with_pango_subs.mp4 `
  --width 1080 --height 1920 --fps 30 --duration 40.73
```

`text_events.json` format:

```json
{
  "events": [
    {
      "start": 7.35,
      "end": 7.87,
      "text": "เพื่อทำ",
      "style": "subtitle",
      "x": 540,
      "y": 955,
      "anchor": "bottom",
      "pop": false,
      "layer": 0
    }
  ],
  "styles": {
    "subtitle": {
      "font_desc": "Leelawadee UI Bold",
      "size": 58,
      "fill": "#ffffff",
      "bg": [0, 0, 0, 145],
      "pad_x": 24,
      "pad_y": 14
    }
  }
}
```

Built-in style names are `subtitle`, `keyword`, `headline_white`, `headline_red`, and `headline_black`. Use `anchor: top|center|bottom` to place the rendered text box relative to `x,y`. Keep headline, subtitle, and keyword as separate events/layers.

## Headline Defaults

- First 0-3 seconds may show headline only, with no subtitle, when the user wants a strong hook.
- Use big blocks inspired by Thai TikTok/Facebook ad style: white pill, red band, black/yellow band.
- Place headline in the best visible safe zone from the actual opening frame, not a fixed default.
- Prefer the largest blank area: often above the head, sometimes chest/lower third, sometimes side space.
- Do not cover eyes, nose, mouth, chin, or the most expressive gesture.
- If the opening frame has a large empty wall above the speaker, put the headline there before using lower-third placement.
- Verify headline placement with a rendered opening frame/contact sheet before final handoff.

## Subtitle Defaults

- Use Kanit ExtraBold or brand font.
- Chunk Thai into natural phrases, not arbitrary word splits.
- Typical vertical size: 56-72px for subtitle chunks.
- Use high-contrast fill plus black stroke or dark pill.
- Avoid bottom platform UI zone.
- Keep one baseline position, font, and size for the whole clip. Reposition for a specific scene only when the baseline would cover the face, the B-roll subject, or platform UI — then return to the baseline. A subtitle that wanders between scenes reads as a defect, and users reject it even when each individual position was "safe".
- Once the user specifies font, size, stroke, or box, those fields are locked. Fix rendering problems by changing the renderer or layout math while preserving the ordered look, and say what was adjusted. Do not substitute a different style because it is easier to render.
- Choose subtitle pacing by content type:
  - **Course / lesson / screen recording / long explanation**: use phrase or sentence chunks first. Readability and Thai grammar are more important than kinetic speed.
  - **TikTok / ad / punchy short-form**: short 1-3 word events are allowed, but they still must not split Thai phrases unnaturally.
- For exact subtitle sync, keep the displayed wording corrected, but keep each event's start/end tied to the first and last aligned spoken word in that phrase.
- If Pango point size looks larger than the requested pixel size, reduce the Pango size while preserving the visual target; do not allow large subtitle boxes to overflow the frame.
- For connected speech, extend the previous subtitle through very short micro-pauses when it prevents distracting blink-off. Do not use this to hide missing transcript over real speech; fill the missing words instead.

## Natural Thai Caption Chunking

Before rendering long/course subtitles, create a caption phrase plan from the corrected transcript. Timestamp accuracy does not require raw word-by-word display. The timing layer may be word-level, while the visible subtitle layer should be Thai-readable.

Required behavior:

- Build phrases from sentence meaning, clause boundaries, and natural spoken pauses before applying length limits.
- A subtitle should not begin with the tail of the previous sentence, such as `ครับ`, `นะครับ`, `แล้ว`, `ก็`, `ตรงนี้`, or `แบบนี้`, unless that word genuinely starts the speaker's next idea.
- Do not split immediately after Thai connectors or setup words if the next words complete the meaning, such as `ถ้า`, `เพราะ`, `เพราะว่า`, `ดังนั้น`, `แล้วก็`, `แต่`, `ซึ่ง`, `เวลาที่`, `สมมติว่า`, `ก็คือ`, `นี่คือ`.
- Do not split compounds, tool names, product names, or domain terms. Keep examples like `Easy AI Editor`, `Codex`, `Claude Code`, `Antigravity`, `ElevenLabs`, `WhisperX`, `HyperFrames`, `FFmpeg`, `Full access`, `API key`, `B-roll`, `SFX`, `คำสั่ง`, `สกิล`, `โปรเจกต์`, and dental/finance terms intact.
- If a phrase is too long, split at the best semantic boundary and allow two lines instead of cutting the phrase into awkward fragments.
- Normalize Thai spacing for display. Do not show raw tokenized Thai spaces such as `เรื่อง การเงิน` when the natural display is `เรื่องการเงิน`.
- Keep punctuation sparse but useful for course captions. A question or completed sentence may keep `?` or `.` only when it improves readability.

Timing rule:

- After the phrase plan is built, map each visible phrase back to the first and last aligned word or character timestamp. Do not hand-time from broad ASR segment ranges.
- The first visible frame of a phrase may start at the phrase's first aligned word, not at the previous token that was only a sentence tail.
- If the phrase plan and the timing layer disagree, fix alignment or mark the phrase for review. Do not silently fall back to fixed character-count chunking.

Bad chunk examples to avoid:

- `ครับ เดี๋ยวเรา`
- `แล้ว ก็ไป`
- `เพราะว่า` as a standalone caption when the next words complete the reason
- `Full` / `access` split across separate captions
- `Eleven` / `Labs` split across separate captions
- `เรื่อง การเงิน`
- `ปีหรือ`, `นั้นแต่`, `เร็วกว่า-นั้นแต่`

Good chunk examples:

- `เดี๋ยวเราเริ่มจากการติดตั้งสกิล`
- `ถ้าเครื่องมี NVIDIA`
- `ให้ใช้ WhisperX เป็นตัวเทียบเวลา`
- `แต่ถ้าไม่มี ElevenLabs`
- `ให้ใช้ transcript fallback แล้วตรวจคำเอง`
- `ตรงนี้คือ Full access`
- `อย่าปล่อยให้ซับหายตอนมีเสียงพูด`

Audit requirement:

- Write a subtitle phrase audit file before render: `start-end | displayed text`.
- Scan the audit for caption starts that are sentence tails, broken tool names, raw Thai token spaces, and known bad boundaries.
- For course videos, inspect a 20-30 second preview around dense explanation sections before full render.

## Subtitle Layout Timeline

When the edit contains B-roll, split-screen, PiP, punch-in, crop changes, CTA screenshots, or any inserted scene, plan subtitle placement by time range before rendering.

Use this format in the edit plan:

```text
00:00.00-00:03.00 | layout: talking head | headline: upper blank wall | subtitle: off | face: center lower | reason: headline must own the hook
00:06.20-00:11.40 | layout: B-roll top + speaker bottom | subtitle: lower speaker panel, below mouth/chin | keyword: top B-roll safe area | face adjustment: contain/up 8% if needed
```

Rules:

- A new visual layout needs a new subtitle *check*, not automatically a new position. Keep the clip-wide baseline whenever it stays safe in the new layout; move only when the baseline would cover the face, the B-roll subject, or important UI, and return to the baseline afterward.
- If the subtitle covers the speaker's mouth, chin, eyes, or important gesture, move the subtitle first.
- If no subtitle-safe zone exists, move or resize the speaker crop/panel so the face and subtitle both have room.
- If B-roll has important subject matter, do not place subtitle over the subject. Use an empty part of the B-roll, the speaker panel, or a smaller phrase.
- During full-screen B-roll, place subtitles according to the B-roll composition, not the talking-head default.
- During CTA/page screenshots, avoid covering buttons, page names, prices, proof, or other important UI text.
- Verify the planned placements with rendered frames at every layout change.

## Keyword Defaults

- Use only for important phrases.
- Typical size: 90-120px.
- Position near top or open safe area.
- Duration: 0.8-2.5 seconds depending on phrase.
- Pair with punch, snap, hit, or whoosh only when it supports the meaning.

## Thai Cleanup Dictionary

Common ASR repairs:

- `ล้าง` -> `ล่าง` when referring to lower screen position.
- `ติ๊กตอบ` -> `TikTok`.
- `เฟส์`, `เอฟ เฟส์` -> `เอฟเฟกต์`.
- `รด เร็ว` -> `รวดเร็ว`.
- `วีดีโอ` may be normalized to `วิดีโอ`.
- Normalize tool names exactly: `AI`, `Codex`, `Video Use`, `HyperFrames`, `WhisperX`.

When in doubt, preserve natural spoken Thai over literal ASR tokens.
