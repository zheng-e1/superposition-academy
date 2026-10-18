"""生成 OG 封面与 touch icon。中文用系统微软雅黑，避免额外字体依赖。"""
import math
from PIL import Image, ImageDraw, ImageFont

BG = (247, 246, 242)
INK = (25, 26, 30)
SUB = (93, 98, 107)
FAINT = (139, 144, 152)
ACCENT = (31, 95, 139)
TEAL = (15, 118, 110)


def font(size, bold=False):
    path = "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def mark(d, cx, cy, r, color, width=2):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
    # 倾斜椭圆：用多边形近似
    rx, ry = r, r * 0.42
    ang = math.radians(-32)
    pts = []
    for i in range(121):
        t = 2 * math.pi * i / 120
        x = rx * math.cos(t)
        y = ry * math.sin(t)
        xr = x * math.cos(ang) - y * math.sin(ang)
        yr = x * math.sin(ang) + y * math.cos(ang)
        pts.append((cx + xr, cy + yr))
    d.line(pts, fill=color, width=width)
    d.ellipse([cx - r * 0.13, cy - r * 0.13, cx + r * 0.13, cy + r * 0.13], fill=color)


def cover():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # 背景网格
    for x in range(0, W, 56):
        d.line([(x, 0), (x, H)], fill=(238, 236, 230), width=1)
    for y in range(0, H, 56):
        d.line([(0, y), (W, y)], fill=(238, 236, 230), width=1)

    # 右侧：布洛赫球 + 态矢
    cx, cy, r = 900, 305, 152

    def ellipse_pts(rx, ry, rot_deg):
        ang = math.radians(rot_deg)
        pts = []
        for i in range(121):
            t = 2 * math.pi * i / 120
            x = rx * math.cos(t)
            y = ry * math.sin(t)
            pts.append((cx + x * math.cos(ang) - y * math.sin(ang),
                        cy + x * math.sin(ang) + y * math.cos(ang)))
        return pts

    # 坐标轴
    d.line([(cx - r - 18, cy), (cx + r + 18, cy)], fill=(212, 208, 199), width=1)
    d.line([(cx, cy - r - 18), (cx, cy + r + 18)], fill=(212, 208, 199), width=1)

    # 球体：赤道 + 两条经线
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ACCENT, width=3)
    d.line(ellipse_pts(r, r * 0.24, 0), fill=ACCENT, width=2)
    d.line(ellipse_pts(r * 0.36, r, 0), fill=(196, 205, 212), width=2)
    d.line(ellipse_pts(r * 0.36, r, 0), fill=(196, 205, 212), width=2)
    d.line(ellipse_pts(r * 0.9, r * 0.2, 0), fill=(225, 221, 213), width=1)

    d.text((cx - 14, cy - r - 54), "|0〉", font=font(30), fill=SUB)
    d.text((cx - 14, cy + r + 22), "|1〉", font=font(30), fill=SUB)
    d.text((cx + r + 22, cy - 20), "|+〉", font=font(28), fill=SUB)

    # 态矢
    vx, vy = cx + r * 0.6, cy - r * 0.52
    d.line([(cx, cy), (vx, vy)], fill=ACCENT, width=5)
    d.ellipse([vx - 10, vy - 10, vx + 10, vy + 10], fill=ACCENT)
    d.ellipse([vx - 20, vy - 20, vx + 20, vy + 20], outline=ACCENT, width=2)
    # 左侧文案
    x0 = 86
    d.text((x0, 96), "叠加学堂 · SUPERPOSITION ACADEMY", font=font(22), fill=FAINT)
    d.text((x0, 156), "量子计算，", font=font(76, True), fill=INK)
    d.text((x0, 250), "从一块偏振片开始", font=font(76, True), fill=ACCENT)
    d.text((x0, 372), "免费开放 · 39 节 · 每个概念都能在浏览器里跑", font=font(26), fill=SUB)
    d.text((x0, 418), "偏振片 / 双缝 / 布洛赫球 / 线路实验室 / Grover / 纠错", font=font(22), fill=FAINT)

    d.line([(x0, 492), (x0 + 520, 492)], fill=(214, 210, 202), width=2)
    d.text((x0, 512), "superposition.academy", font=font(22), fill=FAINT)
    mark(d, x0 + 470, 520, 16, ACCENT, 2)

    img.save("public/og-cover.png", optimize=True)
    print("og-cover.png", img.size)


def touch_icon():
    size = 180
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    mark(d, size / 2, size / 2, size * 0.33, ACCENT, 5)
    img.save("public/apple-touch-icon.png", optimize=True)
    print("apple-touch-icon.png", img.size)




def favicon():
    sizes = [16, 32, 48, 64]
    imgs = []
    for s in sizes:
        img = Image.new("RGBA", (s, s), BG + (255,))
        d = ImageDraw.Draw(img)
        w = max(2, s // 16)
        mark(d, s / 2, s / 2, s * 0.36, ACCENT + (255,), w)
        imgs.append(img)
    imgs[-1].save("public/favicon.ico", format="ICO", sizes=[(s, s) for s in sizes])
    print("favicon.ico", sizes)


if __name__ == "__main__":
    cover()
    touch_icon()
    favicon()
