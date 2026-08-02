# Audio-Safe Cuts

## Goal

Remove misspeaks, coughs, long pauses, and dead air without clipping Thai word starts/ends or cutting through unfinished meaning.

## Evidence Required

Before deleting a span, check both:

- Transcript/word timing evidence.
- Acoustic evidence from waveform, RMS, VAD, or timeline strip.

Never delete a gap only because ASR skipped text. Whisper/WhisperX may miss spoken words, especially Thai or low-volume phrases.

## Semantic Boundary Rule

If a cough or pause sits inside a sentence:

- Keep it,
- remove the entire retake/sentence, or
- ask for approval.

Do not slice through an unfinished phrase. A natural completed sentence beats a technically clean but semantically broken cut.

## Cut Padding

- Keep 80-150ms before word starts when possible.
- Keep 120-250ms after word ends when possible.
- Add 20-40ms audio fades at cut boundaries.
- Avoid rapid adjacent cuts that remove breath and make speech feel synthetic.

## Verification

After cutting:

- Listen or inspect around every cut boundary.
- Run `silencedetect` for long pauses.
- Check `volumedetect` for clipping.
- Create waveform or frame strips around risky cuts.

If a cut sounds wrong, restore more tail/head first before changing the script.
