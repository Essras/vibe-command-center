from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import shutil
import subprocess
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

from PIL import Image


DEFAULT_STYLES: dict[str, dict[str, Any]] = {
    "subtitle": {
        "font_desc": "Leelawadee UI Bold",
        "size": 58,
        "fill": "#ffffff",
        "bg": [0, 0, 0, 145],
        "pad_x": 24,
        "pad_y": 14,
    },
    "keyword": {
        "font_desc": "Leelawadee UI Bold",
        "size": 76,
        "fill": "#ffff00",
        "bg": [0, 0, 0, 145],
        "pad_x": 26,
        "pad_y": 16,
    },
    "headline_white": {
        "font_desc": "Leelawadee UI Bold",
        "size": 56,
        "fill": "#000000",
        "bg": [255, 255, 255, 255],
        "pad_x": 30,
        "pad_y": 16,
    },
    "headline_red": {
        "font_desc": "Leelawadee UI Bold",
        "size": 86,
        "fill": "#ffffff",
        "bg": [216, 0, 0, 255],
        "pad_x": 34,
        "pad_y": 20,
    },
    "headline_black": {
        "font_desc": "Leelawadee UI Bold",
        "size": 82,
        "fill": "#ffff00",
        "bg": [0, 0, 0, 255],
        "pad_x": 34,
        "pad_y": 20,
    },
}


@dataclass(frozen=True)
class TextStyle:
    font_desc: str
    size: int
    fill: str
    bg: tuple[int, int, int, int]
    pad_x: int
    pad_y: int


@dataclass(frozen=True)
class TextEvent:
    start: float
    end: float
    text: str
    style: str
    x: int
    y: int
    anchor: str = "center"
    pop: bool = False
    layer: int = 0


def run(cmd: list[str], cwd: Path) -> None:
    completed = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if completed.returncode != 0:
        raise RuntimeError(
            "Command failed:\n"
            + " ".join(cmd)
            + "\nSTDOUT:\n"
            + completed.stdout
            + "\nSTDERR:\n"
            + completed.stderr
        )


def style_from_dict(raw: dict[str, Any]) -> TextStyle:
    bg = raw.get("bg", [0, 0, 0, 145])
    if len(bg) != 4:
        raise ValueError(f"Style bg must be [r,g,b,a], got {bg!r}")
    return TextStyle(
        font_desc=str(raw.get("font_desc", "Leelawadee UI Bold")),
        size=int(raw.get("size", 58)),
        fill=str(raw.get("fill", "#ffffff")),
        bg=tuple(int(v) for v in bg),  # type: ignore[arg-type]
        pad_x=int(raw.get("pad_x", 24)),
        pad_y=int(raw.get("pad_y", 14)),
    )


def load_spec(path: Path) -> tuple[dict[str, TextStyle], list[TextEvent]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    raw_styles = dict(DEFAULT_STYLES)
    raw_styles.update(data.get("styles", {}))
    styles = {name: style_from_dict(value) for name, value in raw_styles.items()}

    events = []
    for item in data["events"]:
        events.append(
            TextEvent(
                start=float(item["start"]),
                end=float(item["end"]),
                text=str(item["text"]),
                style=str(item.get("style", "subtitle")),
                x=int(item["x"]),
                y=int(item["y"]),
                anchor=str(item.get("anchor", "center")),
                pop=bool(item.get("pop", False)),
                layer=int(item.get("layer", 0)),
            )
        )
    for event in events:
        if event.style not in styles:
            raise ValueError(f"Event uses unknown style {event.style!r}: {event}")
        if event.anchor not in {"top", "center", "bottom"}:
            raise ValueError(f"Unsupported anchor {event.anchor!r}: {event}")
    return styles, sorted(events, key=lambda ev: (ev.start, ev.layer))


def pango_markup(text: str, style: TextStyle) -> str:
    escaped = html.escape(text)
    return (
        f'<span font_desc="{html.escape(style.font_desc)} {style.size}" '
        f'foreground="{style.fill}">{escaped}</span>'
    )


def cache_key(style_name: str, style: TextStyle, text: str) -> str:
    raw = json.dumps(
        {
            "style_name": style_name,
            "style": style.__dict__,
            "text": text,
        },
        ensure_ascii=False,
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha1(raw).hexdigest()[:16]


def render_text_asset(
    text: str,
    style_name: str,
    style: TextStyle,
    assets_dir: Path,
    cwd: Path,
) -> Image.Image:
    assets_dir.mkdir(parents=True, exist_ok=True)
    key = cache_key(style_name, style, text)
    out_path = assets_dir / f"{key}.png"
    if not out_path.exists():
        markup_path = assets_dir / f"{key}.pango"
        raw_path = assets_dir / f"{key}_raw.png"
        markup_path.write_text(pango_markup(text, style), encoding="utf-8")
        run(
            [
                "magick",
                "-background",
                "none",
                f"pango:@{markup_path}",
                "-trim",
                "+repage",
                "-bordercolor",
                "none",
                "-border",
                "2x2",
                str(raw_path),
            ],
            cwd,
        )
        text_img = Image.open(raw_path).convert("RGBA")
        asset = Image.new(
            "RGBA",
            (text_img.width + style.pad_x * 2, text_img.height + style.pad_y * 2),
            style.bg,
        )
        asset.alpha_composite(text_img, (style.pad_x, style.pad_y))
        asset.save(out_path)
    return Image.open(out_path).convert("RGBA")


def event_opacity(event: TextEvent, t: float) -> float:
    fade = 0.045 if event.pop else 0.08
    if t < event.start or t > event.end:
        return 0.0
    fade_in = min(1.0, max(0.0, (t - event.start) / fade))
    fade_out = min(1.0, max(0.0, (event.end - t) / fade))
    return min(fade_in, fade_out)


def event_scale(event: TextEvent, t: float) -> float:
    if not event.pop:
        return 1.0
    elapsed = max(0.0, t - event.start)
    if elapsed <= 0.10:
        return 1.08
    if elapsed <= 0.20:
        progress = (elapsed - 0.10) / 0.10
        return 1.08 - 0.08 * progress
    return 1.0


def place(asset: Image.Image, event: TextEvent) -> tuple[int, int]:
    left = int(round(event.x - asset.width / 2))
    if event.anchor == "top":
        top = event.y
    elif event.anchor == "bottom":
        top = int(round(event.y - asset.height))
    else:
        top = int(round(event.y - asset.height / 2))
    return left, top


def apply_opacity(asset: Image.Image, opacity: float) -> Image.Image:
    if opacity >= 0.999:
        return asset
    out = asset.copy()
    alpha = out.getchannel("A").point(lambda p: int(p * opacity))
    out.putalpha(alpha)
    return out


def render_frames(
    events: list[TextEvent],
    styles: dict[str, TextStyle],
    width: int,
    height: int,
    fps: int,
    duration: float,
    frames_dir: Path,
    assets_dir: Path,
    cwd: Path,
) -> None:
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)

    assets = {
        (event.style, event.text): render_text_asset(event.text, event.style, styles[event.style], assets_dir, cwd)
        for event in events
    }
    frame_count = int(math.ceil(duration * fps))
    active_by_frame: list[list[TextEvent]] = [[] for _ in range(frame_count)]
    for event in events:
        first = max(0, int(math.floor(event.start * fps)))
        last = min(frame_count - 1, int(math.ceil(event.end * fps)))
        for idx in range(first, last + 1):
            active_by_frame[idx].append(event)

    for idx in range(frame_count):
        t = idx / fps
        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        for event in active_by_frame[idx]:
            opacity = event_opacity(event, t)
            if opacity <= 0:
                continue
            asset = assets[(event.style, event.text)]
            scale = event_scale(event, t)
            if scale != 1.0:
                asset = asset.resize(
                    (max(1, int(asset.width * scale)), max(1, int(asset.height * scale))),
                    Image.Resampling.LANCZOS,
                )
            asset = apply_opacity(asset, opacity)
            frame.alpha_composite(asset, place(asset, event))
        frame.save(frames_dir / f"frame_{idx:04d}.png", optimize=True)


def composite(
    base_video: Path,
    frames_dir: Path,
    output: Path,
    fps: int,
    duration: float,
    cwd: Path,
) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(base_video),
            "-framerate",
            str(fps),
            "-i",
            str(frames_dir / "frame_%04d.png"),
            "-filter_complex",
            "[0:v][1:v]overlay=0:0:format=auto[v]",
            "-map",
            "[v]",
            "-map",
            "0:a?",
            "-t",
            f"{duration:.3f}",
            "-r",
            str(fps),
            "-c:v",
            "h264_nvenc",
            "-preset",
            "p5",
            "-rc",
            "vbr",
            "-cq",
            "19",
            "-b:v",
            "12M",
            "-maxrate",
            "18M",
            "-bufsize",
            "24M",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(output),
        ],
        cwd,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Render Thai-safe Pango text overlays onto a clean video master."
    )
    parser.add_argument("--base-video", required=True, type=Path)
    parser.add_argument("--events-json", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width", default=1080, type=int)
    parser.add_argument("--height", default=1920, type=int)
    parser.add_argument("--fps", default=30, type=int)
    parser.add_argument("--duration", required=True, type=float)
    parser.add_argument("--frames-dir", type=Path)
    parser.add_argument("--assets-dir", type=Path)
    args = parser.parse_args()

    if not shutil.which("magick"):
        raise RuntimeError("ImageMagick magick.exe not found in PATH.")
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg not found in PATH.")
    if not args.base_video.exists():
        raise FileNotFoundError(args.base_video)

    cwd = args.output.resolve().parent
    frames_dir = args.frames_dir or cwd / "pango_overlay_frames"
    assets_dir = args.assets_dir or cwd / "pango_text_assets"
    styles, events = load_spec(args.events_json)
    render_frames(
        events,
        styles,
        args.width,
        args.height,
        args.fps,
        args.duration,
        frames_dir,
        assets_dir,
        cwd,
    )
    composite(args.base_video, frames_dir, args.output, args.fps, args.duration, cwd)
    print(args.output)


if __name__ == "__main__":
    main()
