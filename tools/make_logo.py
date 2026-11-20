"""Render Arabic text in Aref Ruqaa to pure SVG paths (no font needed at view time),
then build logo.svg, favicon.svg, PNG icons and favicon.ico."""
import io
import pathlib
import sys

import cairosvg
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

FONT = sys.argv[1]
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

MAROON = "#7A1F2B"
CREAM = "#FBF6EC"

font_bytes = open(FONT, "rb").read()
tt = TTFont(io.BytesIO(font_bytes))
gs = tt.getGlyphSet()
upem = tt["head"].unitsPerEm
blob = hb.Blob(font_bytes)
hbfont = hb.Font(hb.Face(blob))


def shape_path(text):
    """Return (svg path d, width, ymin, ymax) in font units, y flipped (SVG down)."""
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {})
    pen = SVGPathPen(gs)
    x = 0
    order = tt.getGlyphOrder()
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tp = TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset))
        gs[name].draw(tp)
        x += pos.x_advance
    # bounds
    from fontTools.pens.boundsPen import BoundsPen
    bp = BoundsPen(gs)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        gs[name].draw(TransformPen(bp, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)))
        x += pos.x_advance
    xmin, ymin, xmax, ymax = bp.bounds
    return pen.getCommands(), (xmin, ymin, xmax, ymax)


def wordmark(text, color, pad=0.06):
    d, (x0, y0, x1, y1) = shape_path(text)
    w, h = x1 - x0, y1 - y0
    p = h * pad
    vb = f"{x0 - p:.0f} {y0 - p:.0f} {w + 2 * p:.0f} {h + 2 * p:.0f}"
    return d, vb, (w + 2 * p) / (h + 2 * p)


# 1) Wide logo (one line) for header / hero
d, vb, ratio = wordmark("اللِّسانُ المُبين", MAROON)
logo = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" '
        f'aria-label="اللسان المبين"><path fill="{MAROON}" d="{d}"/></svg>\n')
(OUT / "logo.svg").write_text(logo, encoding="utf-8")
logo_cream = logo.replace(MAROON, CREAM)
(OUT / "logo-cream.svg").write_text(logo_cream, encoding="utf-8")

# 2) Square favicon: maroon tile, two lines cream "اللسان / المبين"
d1, b1 = shape_path("اللِّسانُ")
d2, b2 = shape_path("المُبين")
S = 1000
def place(d, b, cy, maxw, maxh):
    x0, y0, x1, y1 = b
    sc = min(maxw / (x1 - x0), maxh / (y1 - y0))
    tx = S / 2 - sc * (x0 + x1) / 2
    ty = cy - sc * (y0 + y1) / 2
    return f'<path transform="translate({tx:.1f} {ty:.1f}) scale({sc:.4f})" d="{d}"/>'
fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">'
       f'<rect width="{S}" height="{S}" rx="180" fill="{MAROON}"/>'
       f'<g fill="{CREAM}">'
       + place(d1, b1, 330, 800, 330)
       + place(d2, b2, 690, 800, 330)
       + '</g></svg>\n')
(OUT / "favicon.svg").write_text(fav, encoding="utf-8")

for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png"), (32, "favicon-32.png")]:
    cairosvg.svg2png(bytestring=fav.encode(), write_to=str(OUT / name), output_width=size, output_height=size)

big = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=fav.encode(), output_width=256, output_height=256)))
big.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# preview of the wide logo
cairosvg.svg2png(bytestring=logo.encode(), write_to="/tmp/logo-preview.png", output_width=900)
print("logo ratio", round(ratio, 2))
