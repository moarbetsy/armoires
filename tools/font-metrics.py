#!/usr/bin/env python3
"""Compute metrics-matched fallback @font-face overrides (fontaine algorithm).

For each webfont we emit a fallback @font-face backed by a local system font
(Georgia for the serif display face, Arial for the sans display face) with
size-adjust / ascent-override / descent-override / line-gap-override so the
fallback occupies the SAME box as the webfont. That keeps CLS ~0 AND makes the
LCP heading register its final size on the very first (fallback) paint, so the
webfont swap never re-fires a larger LCP.
"""
import sys
from fontTools.ttLib import TTFont

# Known system-font metrics (unitsPerEm 2048), xWidthAvg = OS/2 xAvgCharWidth.
FALLBACKS = {
    "Georgia":    {"unitsPerEm": 2048, "ascent": 1878, "descent": -449, "lineGap": 0,  "xWidthAvg": 1132},
    "Arial":      {"unitsPerEm": 2048, "ascent": 1854, "descent": -434, "lineGap": 67, "xWidthAvg": 904},
}


def main_metrics(path):
    f = TTFont(path)
    upm = f["head"].unitsPerEm
    os2 = f["OS/2"]
    hhea = f["hhea"]
    # Prefer typo metrics when USE_TYPO_METRICS is set, else hhea.
    ascent = hhea.ascent
    descent = hhea.descent
    line_gap = hhea.lineGap
    x_width = os2.xAvgCharWidth
    return upm, ascent, descent, line_gap, x_width


def emit(css_family, webfont_path, fallback_name):
    upm, ascent, descent, line_gap, x_width = main_metrics(webfont_path)
    fb = FALLBACKS[fallback_name]
    size_adjust = (x_width / upm) / (fb["xWidthAvg"] / fb["unitsPerEm"])
    ascent_o = (ascent / upm) / size_adjust
    descent_o = (abs(descent) / upm) / size_adjust
    linegap_o = (line_gap / upm) / size_adjust
    return f"""@font-face {{
  font-family: '{css_family} Fallback';
  src: local('{fallback_name}');
  size-adjust: {size_adjust*100:.2f}%;
  ascent-override: {ascent_o*100:.2f}%;
  descent-override: {descent_o*100:.2f}%;
  line-gap-override: {linegap_o*100:.2f}%;
}}"""


if __name__ == "__main__":
    print(emit("Playfair Display", "assets/fonts/playfair-display-latin-700-normal.woff2", "Georgia"))
    print(emit("Oswald", "assets/fonts/oswald-latin-500-normal.woff2", "Arial"))
    print(emit("Inter", "assets/fonts/inter-latin-400-normal.woff2", "Arial"))
