# Face-Safe Layouts

## Definition

"Face visible" means hairline/top of head, eyes, nose, mouth, and chin remain readable in the final render. Do not treat "eyes are visible" as enough. The mouth and chin matter because viewers judge speech and emotion from them.

## Non-Negotiable Rules

- Text, headline, keyword, stickers, PiP, and UI-like overlays must not cover the face.
- If a text default position covers the face, move the text before reducing face visibility.
- When the speaker is foreground and must be fully visible, use `object-fit: contain`.
- Use a separate blurred `object-fit: cover` copy as background fill when `contain` leaves side bars.
- Use `object-fit: cover` only for background layers or for face-tracked crops verified by contact sheets.
- Avoid placing important text in the bottom 150-220px of vertical social video; mobile player UI may cover it.

## Split-Screen Pattern

For "B-roll/product top, speaker bottom":

```css
.speaker-fill {
  object-fit: cover;
  filter: blur(24px) brightness(0.42);
}

.speaker-foreground {
  object-fit: contain;
  object-position: 50% 50%;
  background: transparent;
}
```

The blurred fill creates full-width visual polish; the contained foreground protects the face.

## Punch-In And Zoom

- Default punch hold is at least 3 seconds.
- Before a punch, inspect the source frame. If the speaker leans toward a frame edge, reduce scale or pan toward the safe area.
- Do not reuse the same punch parameters for every moment. Face position changes.
- Prefer scale `1.15-1.45` for face-safe punch-ins. Extreme close-ups are allowed only when the user asks for them.
- Use `transform-origin` near the face center, not always the screen center.

## Text Safe Zones

Choose text position dynamically:

- Headline: choose the largest clean blank zone from the actual frame. Do not use a fixed lower-third or top position without checking the frame first.
- Opening talking-head with empty wall above the speaker: prefer the upper blank area for headline blocks.
- Face low in frame: use top or upper-side text.
- Face high in frame: use lower text, but not over mouth/chin and not in platform UI zone.
- Split-screen: place text in the empty zone of the relevant panel.
- B-roll full-screen: place text based on B-roll composition, not the A-roll default.
- No safe space: reduce font, split lines, shorten wording, or use a smaller pill.

Always verify with rendered frames, not CSS assumptions.

## Insert And Half-Screen Overlay Checks

When the brief places an insert (image, B-roll, page screenshot) over or above a talking head:

- The speaker's full face must stay readable for the entire insert duration, not just at the moment the insert appears. Fades and animated edges move; check frames at the insert's start, middle, and end.
- If the insert's fade/gradient region touches the face at any of those frames, shrink the insert panel, move the fade boundary, or shift the speaker crop — do not deliver and wait for the user to spot it.
- Verify insert in/out points against the brief by extracting the boundary frames and reading their timestamps. Insert timing is the most commonly misexecuted brief order.

## Scene-Aware Subtitle Placement

Subtitles are part of the layout, not a fixed overlay.

- For every B-roll, split-screen, PiP, punch-in, crop shift, CTA screenshot, or full-screen insert, reserve separate zones for face, subtitle, keyword, and important visual content.
- If the subtitle would cover the face, move the subtitle or change the speaker crop/panel. Do not accept a render where text sits on the mouth, chin, eyes, or main gesture.
- In "B-roll top, speaker bottom" layouts, keep the speaker's full face readable and reserve a subtitle band that does not touch the mouth or chin. If needed, move the speaker upward/downward or make the speaker panel taller.
- In full-screen B-roll, protect the B-roll subject the same way you protect the speaker's face. Use empty background or side space for subtitles.
- In page/screenshot/CTA scenes, avoid covering buttons, page names, proof, price, or instructions.
- Contact sheets must include one frame from each subtitle placement zone, not just one generic subtitle frame.
