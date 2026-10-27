#!/usr/bin/env python3
"""
Draws the cyberpunk backdrops of the Experience and Stack sections (public/assets/edgerunner/images/bg-*.svg):
circuit traces, chips, a hex-code matrix and HUD frames, in the style of a netrunner's interface.
Same seed, same picture. Run from the repo root: python3 scripts/edgerunner-art.py
"""
import math
import random

W, H = 1600, 900
CYAN, YELLOW, RED = '#00f0ff', '#fcee0a', '#ff2a55'
OUT = 'public/assets/edgerunner/images/'
FONT = "ui-monospace, 'SF Mono', Consolas, monospace"


def hexcode(r):
    return '%02X' % r.randrange(256)


class Art:
    def __init__(self, seed):
        self.r = random.Random(seed)
        self.body = []

    def add(self, markup):
        self.body.append(markup)

    def line(self, pts, color, opacity, width=1.5, dash=None):
        d = ' '.join(f'{x:.0f},{y:.0f}' for x, y in pts)
        extra = f' stroke-dasharray="{dash}"' if dash else ''
        self.add(f'<polyline points="{d}" fill="none" stroke="{color}" stroke-opacity="{opacity:.2f}" '
                 f'stroke-width="{width}" stroke-linejoin="round"{extra}/>')

    def node(self, x, y, color, opacity):
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="none" stroke="{color}" stroke-opacity="{opacity:.2f}" stroke-width="1.5"/>')
        self.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="1.8" fill="{color}" fill-opacity="{opacity:.2f}"/>')

    def text(self, x, y, s, color, opacity, size=11, anchor='start'):
        self.add(f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FONT}" font-size="{size}" fill="{color}" '
                 f'fill-opacity="{opacity:.2f}" text-anchor="{anchor}">{s}</text>')

    def rect(self, x, y, w, h, color, opacity, width=1.5, fill=None, fill_opacity=0.0):
        f = f'fill="{fill}" fill-opacity="{fill_opacity:.2f}"' if fill else 'fill="none"'
        self.add(f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" {f} stroke="{color}" '
                 f'stroke-opacity="{opacity:.2f}" stroke-width="{width}"/>')

    def trace(self, x, y, heading, steps, color, opacity, grid=20):
        """A circuit trace: straight runs joined by 45 and 90 degree turns, ending in a pad."""
        r = self.r
        pts = [(x, y)]
        for _ in range(steps):
            run = r.randrange(3, 10) * grid
            x += math.cos(math.radians(heading)) * run
            y += math.sin(math.radians(heading)) * run
            pts.append((x, y))
            heading += r.choice([-90, -45, -45, 0, 45, 45, 90])
            heading = (heading + 360) % 360
        self.line(pts, color, opacity, width=r.choice([1, 1.5, 2]))
        self.node(*pts[-1], color, min(1, opacity + 0.2))

    def chip(self, x, y, color):
        r = self.r
        w, h = r.randrange(80, 170), r.randrange(36, 74)
        self.rect(x, y, w, h, color, 0.55, fill=color, fill_opacity=0.05)
        for i in range(1, int(w // 14)):
            self.line([(x + i * 14, y), (x + i * 14, y - 6)], color, 0.5, 1)
            self.line([(x + i * 14, y + h), (x + i * 14, y + h + 6)], color, 0.5, 1)
        self.text(x + 8, y + 16, f'U{r.randrange(10, 99)}', YELLOW, 0.8, 11)
        self.text(x + 8, y + h - 9, f'0x{hexcode(r)}{hexcode(r)}', color, 0.6, 11)

    def matrix(self, x, y, cols, rows, path_len):
        """A grid of hex bytes with one highlighted route through it."""
        r = self.r
        cw, ch = 38, 30
        for j in range(rows):
            for i in range(cols):
                self.text(x + i * cw, y + j * ch, hexcode(r), CYAN, 0.2 + r.random() * 0.2, 15)
        cx, cy = r.randrange(cols), 0
        pts = []
        horizontal = True
        for _ in range(path_len):
            pts.append((cx, cy))
            if horizontal:
                cx = r.choice([i for i in range(cols) if i != cx])
            else:
                cy = r.choice([j for j in range(rows) if j != cy])
            horizontal = not horizontal
        centres = [(x + i * cw + 8, y + j * ch - 5) for i, j in pts]
        self.line(centres, YELLOW, 0.75, 1.5)
        for (i, j), (px, py) in zip(pts, centres):
            self.rect(px - 18, py - 12, 34, 22, YELLOW, 0.85, 1.5, YELLOW, 0.1)
            self.text(px - 9, py + 4, hexcode(r), YELLOW, 1, 15)

    def frame(self, margin=26, size=46):
        for sx, sy, dx, dy in [(margin, margin, 1, 1), (W - margin, margin, -1, 1),
                                (margin, H - margin, 1, -1), (W - margin, H - margin, -1, -1)]:
            self.line([(sx + dx * size, sy), (sx, sy), (sx, sy + dy * size)], CYAN, 0.7, 2)

    def ruler(self, y, x0, x1, color):
        for i in range(0, int((x1 - x0) / 12) + 1):
            x = x0 + i * 12
            self.line([(x, y), (x, y + (14 if i % 5 == 0 else 7))], color, 0.35, 1)
            if i % 10 == 0:
                self.text(x, y + 28, '%03d' % (i * 3), color, 0.28, 10)

    def save(self, name, fade_to):
        """Left side fades out so the text on top stays clean (`fade_to` = x where the art is at full strength)."""
        defs = (f'<defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="0">'
                f'<stop offset="0" stop-color="#fff" stop-opacity="0"/>'
                f'<stop offset="{fade_to / W:.2f}" stop-color="#fff" stop-opacity="1"/>'
                f'<stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>'
                f'<mask id="m"><rect width="{W}" height="{H}" fill="url(#f)"/></mask></defs>')
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
               f'{defs}<g mask="url(#m)">{"".join(self.body)}</g></svg>')
        with open(OUT + name, 'w') as handle:
            handle.write(svg)
        print(name, len(svg) // 1024, 'kB')


def experience():
    """A data line running through the page: traces flowing in from the right, chips on them, a byte matrix."""
    a = Art(2077)
    r = a.r
    a.ruler(58, 560, W - 40, CYAN)
    for _ in range(30):
        a.trace(W - r.randrange(0, 260), r.randrange(100, H - 60) // 20 * 20, r.choice([180, 180, 135, 225]),
                r.randrange(3, 7), r.choice([CYAN, CYAN, CYAN, YELLOW, RED]), 0.18 + r.random() * 0.4)
    for _ in range(7):
        a.chip(r.randrange(700, W - 220), r.randrange(110, H - 110), r.choice([CYAN, CYAN, YELLOW]))
    a.matrix(1130, 190, 8, 6, 6)
    a.matrix(820, 650, 6, 4, 4)
    a.add(f'<circle cx="1260" cy="560" r="150" fill="none" stroke="{CYAN}" stroke-opacity=".25" stroke-width="1.5" stroke-dasharray="3 9"/>')
    a.add(f'<circle cx="1260" cy="560" r="96" fill="none" stroke="{YELLOW}" stroke-opacity=".3" stroke-width="1.5"/>')
    a.line([(1100, 560), (1420, 560)], CYAN, 0.3, 1)
    a.line([(1260, 400), (1260, 720)], CYAN, 0.3, 1)
    a.frame()
    a.save('bg-experience.svg', 760)


def stack():
    """A deck seen from the front: a hub with rings and spokes, module bars, a byte matrix."""
    a = Art(2022)
    r = a.r
    cx, cy = 1180, 450
    for radius, dash, opacity in [(70, None, .5), (140, '4 8', .35), (220, None, .25), (310, '2 10', .3)]:
        a.add(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="{CYAN}" stroke-opacity="{opacity}" '
              f'stroke-width="1.5"{f" stroke-dasharray={chr(34)}{dash}{chr(34)}" if dash else ""}/>')
    for i in range(72):
        ang = math.radians(i * 5)
        inner, outer = 310, 310 + (16 if i % 6 == 0 else 8)
        a.line([(cx + math.cos(ang) * inner, cy + math.sin(ang) * inner),
                (cx + math.cos(ang) * outer, cy + math.sin(ang) * outer)], CYAN, 0.45, 1)
    for i in range(12):
        ang = math.radians(i * 30 + 15)
        far = 340 + r.randrange(0, 120)
        px, py = cx + math.cos(ang) * far, cy + math.sin(ang) * far
        a.line([(cx + math.cos(ang) * 70, cy + math.sin(ang) * 70), (px, py)], YELLOW if i % 4 == 0 else CYAN, 0.35, 1.5)
        a.node(px, py, YELLOW if i % 4 == 0 else CYAN, 0.8)
    a.add(f'<path d="M{cx} {cy - 70} A70 70 0 0 1 {cx + 70} {cy}" fill="none" stroke="{RED}" stroke-opacity=".9" stroke-width="3"/>')
    a.text(cx, cy + 5, 'SYS', YELLOW, 0.9, 20, 'middle')
    # Module bars with their fill level, bottom left of the art.
    for i in range(6):
        y = 640 + i * 34
        a.rect(560, y, 340, 16, CYAN, 0.5, 1.2)
        a.rect(562, y + 2, 336 * r.uniform(0.2, 0.95), 12, CYAN if i % 3 else YELLOW, 0, 0, YELLOW if i % 3 == 0 else CYAN, 0.5)
        a.text(912, y + 13, f'MOD_{hexcode(r)} {r.randrange(10, 100)}%', CYAN, 0.6, 11)
    a.matrix(760, 150, 8, 5, 5)
    for _ in range(14):
        a.trace(r.randrange(600, 1000) // 20 * 20, r.randrange(80, 820) // 20 * 20, r.choice([0, 45, 315]),
                r.randrange(3, 6), r.choice([CYAN, CYAN, YELLOW]), 0.16 + r.random() * 0.28)
    a.ruler(840, 560, W - 40, CYAN)
    a.frame()
    a.save('bg-stack.svg', 640)


if __name__ == '__main__':
    experience()
    stack()
