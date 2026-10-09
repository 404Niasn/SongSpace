# Logo 结构修正

内置 imagegen 编辑两轮后，卡片几何仍不可靠。最终另建可编辑 SVG 几何稿，使用同一个 90×126（5:7）圆角矩形复制五次，以 22.5° 步长围绕同一个握持点旋转，整体等比缩小。最下面卡片底边保持水平，最上面卡片右边保持垂直；为保证自然共同支点与中心圆留白，这两条边不再位于圆心轴线上。卡片全部位于唱片内，与中心标签留白。

最终文件：songspace-logo-refined-v9.svg、songspace-logo-refined-v9.png。PNG 使用 sharp 渲染该 SVG，没有修改生成位图。自制矢量稿消除渐变、统一线条、将门改为轮廓。已检查实际渲染效果。未替换应用资产。

## 内置 imagegen 修正提示词

Edit the MOST RECENT SongSpace logo image: mist-blue circular record, five cards upper-left, central ivory circle with house, two ivory lower-right arcs. This is a design repair, NOT a redesign. Keep exactly this structure and palette.
Correct the graphic design defects comprehensively:
1. FIVE IDENTICAL CARDS. Build one true rounded rectangle, width:height = 5:7, and duplicate it five times. Same dimensions and corner radius for every card. Do not draw shortened trapezoids or stretch individual cards. Each front-facing rectangle is flat, no perspective. The front ivory card must clearly have a broad natural playing-card shape, not a thin strip.
2. COMMON FAN PIVOT. Rotate these five duplicate rectangles about ONE common point near their lower-right corner, as playing cards held in a hand. Angles progress evenly across 90 degrees, first card horizontal, last vertical, with three evenly spaced intermediate cards. Their inner short ends gather into ONE compact layered grip. They must NOT march along a ring like separate paint-swatch samples. Natural substantial overlap; each top edge and enough face remain visible to count five.
3. BALANCED SCALE AND GAP. Reduce the whole card group about 15% and shift it outward toward upper-left. Maintain generous consistent blue breathing space from central label; minimum gap about 5% of disc diameter. Never cover central label. All cards remain inside disc with outer margin. First card's bottom edge horizontal, fifth card's right edge vertical; the entire group occupies upper-left quarter.
4. QUIETER CARD STYLING. Card colors from back to front: medium slate blue, light mist blue, pale sage mint, pale blue-gray, ivory. Use thin uniform ivory separation edges about the same weight as the groove lines. No thick white frames. Avoid individually varying border widths. Clearly identify exactly five cards.
5. COHERENT HOUSE. Keep the tiny simple pitched-roof house at disc center in the ivory circular label. Reduce house size about 12%. Draw the entire house with a single consistent medium-weight slate-blue line. Change the doorway to an OUTLINED opening instead of a heavy filled blob. Simple roof, walls, door only. No extra windows or chimney.
6. BALANCED GROOVES. Keep exactly TWO ivory concentric arcs at lower-right. Increase their thickness modestly to match the visual weight of the house stroke and card separation lines. Their lengths and radial placement counterbalance the quarter-circle card fan. Round ends, equal spacing.
7. PURE FLAT DESIGN. Disc fill is uniform solid pale mist blue #B4CADB, absolutely no gradient, no gloss, no lighting, no shadows, no texture. Ivory #FAFBF7, mint #A9D2C3, slate house #405D70. Near-white background. Crisp geometric vector-like brand-mark finish.
Do not change the disc boundary, central label position, card sector upper-left, groove sector lower-right, or overall symbol scale. No new elements, no letters, no words, no mascot, no mockup. Keep user's concept: outside record, five inside fanned collectible cards, center small house.
The result should look like a designer carefully corrected geometry and visual weight, not like a fresh generative reinterpretation.

## 第二轮卡组提示词

Edit ONLY the five upper-left cards in the attached most recent logo. Keep the circular blue record, central label, house with outlined door, lower-right thick arcs, colors and background unchanged.
REPLACE the entire card fan with a carefully constructed hand-held poker fan. Current fan looks like a stepped paint swatch sample and has inconsistent card proportions. Fix that.
Every card is the SAME rounded rectangular geometry with full width 140 pixels and full height 196 pixels on this 1254px square image. Five copies of this ONE rectangle. Do not design each separately. The entire front ivory card must show a visibly broad 5:7 rectangle, not the current narrow 100-by-190 strip.
Fan these five copies around ONE common lower corner pivot, near x=475 y=475 in the upper-left disc sector. Cards face outward away from the center. Rotation angles -90, -67.5, -45, -22.5, 0 degrees. Start with an upright rectangle whose lower-right corner is pivot; rotate around that lower-right corner. The fan runs from horizontal blue back card to vertical ivory front card. The cards layer naturally, all lower-right corners tightly convergent and largely hidden by the front cards, like playing cards held by a thumb. Do not have their bottoms follow a staircase arc. All five top edges visible, uniform rhythm and roughly equal revealed face widths.
Stack blue at back, then pale blue, mint, blue-gray, ivory at front. Fine consistent ivory separation. Move or scale the whole fan uniformly only if needed to fit inside disc and leave at least 40px clear blue gap from center label. Never deform individual cards. No contact with center circle.
One integrated compact fan, broad natural rectangles, not elongated strips, not wedges, not paint swatches. Flat solid graphic colors. No hands, no new symbols, no shadows, no text, no gradients. Leave everything outside card group unchanged.
