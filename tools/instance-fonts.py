#!/usr/bin/env python3
"""Pin variable fonts to their single declared weight (static instance).

The downloaded woff2 files are full variable fonts (every weight in one file, ~48-85KB
each), so declaring a single @font-face weight still ships all masters. We instance each
file at the weight encoded in its filename, producing a much smaller static woff2 that
carries only the glyphs+outlines for that one weight. Glyph coverage (latin / latin-ext)
is already subset in the source, so we only pin the axes.
"""
import glob
import os
import re
from fontTools import ttLib
from fontTools.varLib.instancer import instantiateVariableFont

FONT_DIR = "assets/fonts"

def weight_of(name):
    m = re.search(r"-(\d{3})-", name)
    return int(m.group(1)) if m else 400

def main():
    total_before = total_after = 0
    for path in sorted(glob.glob(os.path.join(FONT_DIR, "*.woff2"))):
        name = os.path.basename(path)
        before = os.path.getsize(path)
        total_before += before
        f = ttLib.TTFont(path)
        if "fvar" not in f:
            total_after += before
            continue
        axes = {a.axisTag: a for a in f["fvar"].axes}
        pin = {}
        if "wght" in axes:
            pin["wght"] = float(weight_of(name))
        if "ital" in axes:
            pin["ital"] = 1.0 if "italic" in name else 0.0
        if "opsz" in axes:
            pin["opsz"] = axes["opsz"].maxValue if "playfair" in name else axes["opsz"].defaultValue
        instantiateVariableFont(f, pin, inplace=True, updateFontNames=False)
        f.flavor = "woff2"
        f.save(path)
        after = os.path.getsize(path)
        total_after += after
        print(f"{name}: {before//1024}KB -> {after//1024}KB")
    print(f"TOTAL: {total_before//1024}KB -> {total_after//1024}KB")

if __name__ == "__main__":
    main()
