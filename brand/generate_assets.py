#!/usr/bin/env python3
"""
Builds every My Paisa launcher icon, adaptive-icon layer and splash image from
the supplied logo (brand/mypaisa-logo-source.png).

The mark itself is NOT redrawn - the source artwork is used as-is. What this
script does is the presentation work the source file was missing:

  * removes the flat white background (flood-filled from the edges, so any
    white detail inside the mark survives),
  * trims the surrounding dead space (the mark occupied only ~66% of its
    canvas, which made it render small and off-centre inside a launcher tile),
  * re-centres it on its visual bounding box,
  * composites it onto a proper app tile at every density Android asks for.

Run:  python3 brand/generate_assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

S = 1024
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE = os.path.join(HERE, 'mypaisa-logo-source.png')

BRAND = (0xFF, 0x75, 0x1F)
TILE_TOP = (0xFF, 0xFF, 0xFF)
TILE_BOT = (0xFF, 0xF3, 0xE6)
DARK_TOP = (0x1A, 0x14, 0x0E)
DARK_BOT = (0x0A, 0x0A, 0x0F)


def load_mark():
    """
    Extract the mark from the supplied artwork with genuinely clean alpha.

    The source PNG has an opaque white background. Naively making white
    transparent leaves a pale fringe: the anti-aliased pixels around every edge
    are orange-blended-with-white, and once the white behind them is removed
    those pixels still CARRY white, so the mark renders with a light halo. On
    the dark theme that halo is clearly visible.

    The fix is colour bleeding. The background is cut with a hard binary mask
    at full resolution, then the foreground colour is dilated outward into the
    transparent region. Every transparent pixel therefore holds orange rather
    than white. Downscaling afterwards anti-aliases the ALPHA channel while the
    RGB it samples is already the right hue, so edges stay clean at any size.
    """
    im = Image.open(SOURCE).convert('RGBA')
    w, h = im.size
    px = im.load()

    # --- 1. Flood-fill the background from the borders ---------------------
    # Region-based rather than "every white pixel", so white detail inside the
    # mark would survive.
    bg = bytearray(w * h)
    stack = []
    for x in range(w):
        stack.append((x, 0)); stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y)); stack.append((w - 1, y))

    def is_white(pt):
        return pt[0] > 232 and pt[1] > 232 and pt[2] > 232

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or bg[y * w + x]:
            continue
        if not is_white(px[x, y]):
            continue
        bg[y * w + x] = 1
        stack.append((x + 1, y)); stack.append((x - 1, y))
        stack.append((x, y + 1)); stack.append((x, y - 1))

    # --- 2. Hard binary alpha ---------------------------------------------
    alpha = Image.new('L', (w, h), 0)
    ap = alpha.load()
    rgb = Image.new('RGB', (w, h), (255, 255, 255))
    rp = rgb.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if bg[row + x]:
                ap[x, y] = 0
            else:
                ap[x, y] = 255
                rp[x, y] = px[x, y][:3]

    # --- 3. Bleed the foreground colour outward ---------------------------
    # Eight passes is comfortably more than the widest anti-aliased edge in the
    # source, and far more than downscaling will ever sample across.
    solid = [bool(ap[x, y]) for y in range(h) for x in range(w)]
    for _ in range(8):
        additions = []
        for y in range(h):
            row = y * w
            for x in range(w):
                if solid[row + x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and solid[ny * w + nx]:
                        additions.append((x, y, rp[nx, ny]))
                        break
        if not additions:
            break
        for x, y, colour in additions:
            rp[x, y] = colour
            solid[y * w + x] = True

    out = rgb.convert('RGBA')
    out.putalpha(alpha)

    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


MARK = load_mark()


def despill(img):
    """
    Remove any residual light fringe after resampling.

    LANCZOS has negative lobes, so it can ring past the input range at a hard
    alpha edge and lift a few boundary pixels toward white. Any pixel that is
    not fully opaque and has drifted light gets its colour pulled back to the
    brand orange. Alpha is untouched, so the silhouette does not change - only
    the colour those semi-transparent pixels carry.
    """
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                px[x, y] = (BRAND[0], BRAND[1], BRAND[2], 0)
            elif a < 255 and min(r, g, b) > 200:
                px[x, y] = (BRAND[0], BRAND[1], BRAND[2], a)
    return img


def fit_mark(box, ratio=1.0):
    """Scale the mark into a square canvas, optically centred."""
    target = max(1, int(box * ratio))
    m = MARK.copy()
    scale = min(target / m.width, target / m.height)
    m = m.resize((max(1, round(m.width * scale)), max(1, round(m.height * scale))), Image.LANCZOS)
    m = despill(m)

    canvas = Image.new('RGBA', (box, box), (0, 0, 0, 0))
    # The mark reads as an arrow pointing right, so its visual mass sits left of
    # the geometric centre. A small nudge stops it looking off-balance in a tile.
    nudge = round(box * 0.012)
    canvas.alpha_composite(m, ((box - m.width) // 2 + nudge, (box - m.height) // 2))
    return canvas


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom):
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(top, bottom, y / max(1, size - 1)))
    return img


def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def app_icon(size, rounded=True, dark=False, ratio=0.66):
    top, bot = (DARK_TOP, DARK_BOT) if dark else (TILE_TOP, TILE_BOT)
    tile = vertical_gradient(size, top, bot).convert('RGBA')
    tile.putalpha(rounded_mask(size, round(size * 15 / 64)) if rounded else 255)
    return Image.alpha_composite(tile, fit_mark(size, ratio))


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'PNG', optimize=True)


def main():
    print('Source mark trimmed to', MARK.size)

    save(fit_mark(1024, 1.0), os.path.join(HERE, 'mark-transparent.png'))
    save(fit_mark(512, 1.0), os.path.join(ROOT, 'src', 'assets', 'logo.png'))

    print('Master icons')
    save(app_icon(S), os.path.join(HERE, 'icon-1024.png'))
    save(app_icon(512), os.path.join(HERE, 'icon-512.png'))
    save(app_icon(512, dark=True), os.path.join(HERE, 'icon-512-dark.png'))

    print('Web / PWA icons')
    for n in (192, 512):
        save(app_icon(n), os.path.join(ROOT, 'public', 'icon-%d.png' % n))
    save(app_icon(180), os.path.join(ROOT, 'public', 'apple-touch-icon.png'))
    save(app_icon(64), os.path.join(ROOT, 'public', 'favicon.png'))
    save(fit_mark(512, 1.0), os.path.join(ROOT, 'public', 'logo.png'))

    print('Android launcher icons')
    densities = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    res = os.path.join(HERE, 'android-res')
    for d, px in densities.items():
        save(app_icon(px), os.path.join(res, 'mipmap-%s' % d, 'ic_launcher.png'))

        rnd = app_icon(px, rounded=False)
        m = Image.new('L', (px, px), 0)
        ImageDraw.Draw(m).ellipse([0, 0, px - 1, px - 1], fill=255)
        rnd.putalpha(m)
        save(rnd, os.path.join(res, 'mipmap-%s' % d, 'ic_launcher_round.png'))

        fg = round(px * 108 / 48)
        save(fit_mark(fg, 0.52), os.path.join(res, 'mipmap-%s' % d, 'ic_launcher_foreground.png'))

    print('Splash images')
    for name, dark in (('splash', True), ('splash_light', False)):
        px = 2732
        bg = DARK_BOT if dark else (0xFF, 0xFF, 0xFF)
        canvas = Image.new('RGB', (px, px), bg)
        mark = fit_mark(round(px * 0.24), 1.0)
        canvas.paste(mark, ((px - mark.width) // 2, (px - mark.height) // 2), mark)
        save(canvas, os.path.join(res, 'drawable', '%s.png' % name))
        small = canvas.resize((1280, 1280), Image.LANCZOS)
        for d in ('port-mdpi', 'port-hdpi', 'port-xhdpi', 'port-xxhdpi', 'port-xxxhdpi',
                  'land-mdpi', 'land-hdpi', 'land-xhdpi', 'land-xxhdpi', 'land-xxxhdpi'):
            save(small, os.path.join(res, 'drawable-%s' % d, '%s.png' % name))

    print('Done.')


if __name__ == '__main__':
    main()
