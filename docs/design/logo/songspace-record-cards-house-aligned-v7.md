# 水平、垂直边缘与卡片比例校准稿

内置 imagegen 编辑两轮。目标：最下卡底边水平、最上卡右边垂直，卡片等比缩小，保持自然矩形与五卡扇形。设计预览，未替换应用资产。生成稿仍存在位置和比例偏差，不能当作精确几何定稿。

## 首轮提示词

Precision edit of the MOST RECENT SongSpace logo: mist-blue circular record, five fanned cards upper-left, central ivory label with slate house, two lower-right ivory record arcs.
USER'S EXACT GEOMETRY MUST TAKE PRIORITY:
Use an invisible horizontal and vertical crosshair through the exact RECORD CENTER (also the house-label center). Do NOT draw the crosshair.
1. The FIRST / LOWEST / LEFTMOST blue card is oriented EXACTLY HORIZONTALLY. Its LONG LOWER EDGE lies on the invisible HORIZONTAL line extending left from the record center (9 o'clock ray). The whole card lies ABOVE that line. That bottom edge is perfectly level, no tilt.
2. The FIFTH / HIGHEST / RIGHTMOST ivory card is oriented EXACTLY VERTICALLY. Its LONG RIGHT EDGE lies on the invisible VERTICAL line extending upward from the record center (12 o'clock ray). The whole card lies LEFT of that line. That right edge is perfectly upright, no tilt.
3. The other THREE cards bridge these two extreme orientations with uniform angular increments: 22.5, 45, 67.5 degrees between the horizontal first card and vertical fifth card. This produces a complete 90-degree fan contained strictly in the upper-left quadrant.
4. All FIVE cards are IDENTICAL REAL RECTANGLES with natural playing-card proportions, width:height = 5:7, modest equal rounded corners, straight parallel opposite edges. Do not stretch into thin strips, wedges, trapezoids or triangular slices.
5. SHRINK each card uniformly about 15% relative to previous image to make room for natural proportions and exact alignment. Fan them with overlapping short inner ends gathered near the upper-left outside rim of the central circular label. Keep a slim blue breathing gap from the center label; do not cover the label or house. Preserve a layered held-playing-cards arrangement and make all five independently countable.
6. Stack order and colors unchanged: blue at bottom/back, then mist blue, mint, light blue-gray, ivory at top/front. Uniform narrow ivory edges. Fit all cards entirely inside the disc, with outer margin.
INVARIANTS: Keep outer disc shape/size/position/color, centered ivory house label, house graphic, lower-right two groove arcs, background EXACTLY unchanged. Only adjust the card geometry uniformly and their rotations/positions. No added axes, guides or text.
Flat restrained geometric logo, uniform solid fills, no gradients, no shadows, no 3D.
Critical checkpoints: LOWEST card's bottom edge is HORIZONTAL ON THE CENTERLINE; HIGHEST card's right edge is VERTICAL ON THE CENTERLINE; five natural-proportion equal rectangles, slightly smaller, evenly overlapping between those boundaries.

## 修正提示词

Edit target: MOST RECENT mist-blue record logo with five cards upper-left, central house, lower-right arcs.
Surgical correction ONLY to cards. Preserve all other pixels conceptually.
The first blue card's lowest horizontal edge is TOO HIGH. Move it downward so its horizontal bottom edge lines up exactly with the HOUSE CENTER / DISC CENTER horizontal level. In this square image that is around y=625, not y=580. Its bottom edge should lie on the horizontal radial line from the left disc rim toward center, with the card entirely above it. First card must be a TRUE HORIZONTAL rounded rectangle, long dimension horizontal, short dimension vertical. Its sloping upper visible area is only caused by overlapping cards, not trapezoid geometry.
The final ivory card is TOO NARROW. Make ALL five cards true natural playing-card proportions 5:7, identical 115px short width and 161px long height approximately at this image size (adjust uniformly if necessary). The front ivory card's right edge must stay exactly VERTICAL and lie on the disc center vertical line around x=625. It is entirely to the LEFT of this line. Its inner short end should finish before the center label top, leaving a small blue gap.
Reposition all five around a compact common inner pivot outside the upper-left circular label rim. Rotations between first HORIZONTAL and last VERTICAL at even increments of 22.5 degrees: five rectangles spanning exactly 90 degrees. Keep natural hand-held overlap, fan completely within upper-left quadrant. The colors, corner radii, and narrow ivory edging remain. All five rectangular top edges countable. Uniform moderate shrinking is preferred to elongating cards.
No alteration to disc, center label, house, grooves, background, palette, flat style. NO new guides or lines. Critical measurable features: first bottom edge horizontal at center Y; fifth right edge vertical at center X; front ivory width:height 5:7, NOT a thin strip.
