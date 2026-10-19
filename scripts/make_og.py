"""为每节课生成 1200x630 的分享卡（OG 图）。

用法：
    python scripts/make_og.py            # 生成 / 覆盖 public/og/*.png
    python scripts/make_og.py --prune    # 顺便删掉已不存在的课节图

依赖 Pillow 与 Windows 自带中文字体（msyhbd.ttc / msyh.ttc）。
在 Cloudflare 构建时不运行；图片随仓库提交。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "src" / "content" / "lessons"
OUT = ROOT / "public" / "og"

W, H = 1200, 630
BG = (247, 246, 242)
INK = (24, 26, 31)
SUB = (75, 85, 99)
FAINT = (139, 144, 152)

PARTS = {
    "p-start": ("00", "开始之前", (107, 114, 128)),
    "p-intuition": ("01", "量子直觉", (180, 83, 9)),
    "p-math": ("02", "数学最小必要", (31, 95, 139)),
    "p-qubit": ("03", "单量子比特", (15, 118, 110)),
    "p-entangle": ("04", "多比特与纠缠", (124, 58, 237)),
    "p-algo": ("05", "线路与算法", (180, 83, 9)),
    "p-hw": ("06", "硬件与工程", (51, 65, 85)),
    "p-app": ("07", "应用与生态", (14, 116, 144)),
    "p-lab": ("08", "量子实验室", (31, 95, 139)),
    "p-sweet": ("09", "甜点", (157, 23, 77)),
}

FONT_BOLD = Path("C:/Windows/Fonts/msyhbd.ttc")
FONT_REG = Path("C:/Windows/Fonts/msyh.ttc")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size, index=0)


def frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not match:
        return {}
    data: dict[str, str] = {}
    for line in match.group(1).splitlines():
        m = re.match(r"^([a-zA-Z]+):\s*(.*)$", line)
        if m:
            key, value = m.group(1), m.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            data[key] = value
    return data


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for ch in text:
        trial = current + ch
        if draw.textlength(trial, font=f) <= max_w or not current:
            current = trial
        else:
            lines.append(current)
            current = ch
    if current:
        lines.append(current)
    return lines


def render(slug: str, title: str, thesis: str, part: str, tag: str, minutes: str) -> None:
    num, part_title, accent = PARTS.get(part, ("--", "课程", (31, 95, 139)))
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, 14, H], fill=accent)

    brand = font(FONT_BOLD, 26)
    d.text((64, 54), "叠加学堂", font=brand, fill=INK)
    d.text((64 + d.textlength("叠加学堂", font=brand) + 14, 60), "SUPERPOSITION ACADEMY", font=font(FONT_REG, 17), fill=FAINT)

    part_font = font(FONT_REG, 22)
    part_text = f"{num} {part_title}"
    d.text((W - 64 - d.textlength(part_text, font=part_font), 60), part_text, font=part_font, fill=SUB)

    title_font = font(FONT_BOLD, 62)
    lines = wrap(d, title, title_font, W - 128)[:3]
    y = 168
    for line in lines:
        d.text((64, y), line, font=title_font, fill=INK)
        y += 84

    thesis_font = font(FONT_REG, 30)
    ty = y + 18
    for line in wrap(d, thesis, thesis_font, W - 128)[:2]:
        d.text((64, ty), line, font=thesis_font, fill=SUB)
        ty += 46

    d.line([64, H - 108, W - 64, H - 108], fill=(225, 223, 214), width=1)

    meta_font = font(FONT_REG, 21)
    d.text((64, H - 80), f"{tag} · {minutes} 分钟", font=meta_font, fill=SUB)
    domain = "diejiacademy.com"
    d.text((W - 64 - d.textlength(domain, font=meta_font), H - 80), domain, font=meta_font, fill=FAINT)

    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{slug}.png", optimize=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prune", action="store_true")
    args = parser.parse_args()

    if not FONT_BOLD.exists() or not FONT_REG.exists():
        print("找不到中文字体：需要 C:/Windows/Fonts/msyhbd.ttc 与 msyh.ttc", file=sys.stderr)
        return 1

    files = sorted(LESSONS.rglob("*.mdx"))
    seen: set[str] = set()
    for path in files:
        meta = frontmatter(path)
        slug = meta.get("slug")
        if not slug:
            continue
        seen.add(slug)
        render(slug, meta.get("title", slug), meta.get("thesis", ""), meta.get("part", ""), meta.get("tag", ""), meta.get("minutes", "0"))

    print(f"生成 {len(seen)} 张分享卡 -> {OUT}")

    if args.prune:
        for png in OUT.glob("*.png"):
            if png.stem not in seen and png.stem != "og-cover":
                png.unlink()
                print(f"删除多余：{png.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
