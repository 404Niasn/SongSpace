# 仅修正底下两张蓝卡：尝试稿

内置 imagegen 编辑两轮，以固定白卡为尺寸基准，要求修改底部两卡。结果仍未可靠达到同尺寸，底卡被横向拉宽，不能作为已完成的尺寸修正。未替换应用资产。

## 首轮提示词

Edit ONLY the TWO LOWEST BLUE CARDS in the most recent SongSpace logo. The user explicitly says these two cards are not the same size as the white front card. Previous edits wrongly focused on the white card. DO NOT modify the white card this time.
REFERENCE SIZE: the existing front IVORY VERTICAL CARD is the authoritative master rectangle, approximately 134px wide and 193px tall, with modest rounded corners. Keep it EXACTLY as it is: same shape, size, right-edge alignment, position and color.
1. LOWEST DARK BLUE CARD: remake its full shape as an EXACT ROTATED COPY of that white rectangle, 193px long horizontally and 134px high vertically. It currently appears about193px by100px and therefore too flat. Increase its HEIGHT upward by roughly34px, keeping its horizontal LOWER EDGE and LEFT/RIGHT positions UNCHANGED. The bottom edge remains at the existing approved level. Its left vertical edge should visibly be taller, and its upper-left rounded corner should be about34px higher than before. The next card occludes only the upper-right portion; do not let that occlusion eliminate the taller left edge. All four full underlying sides form a true rounded rectangle, not a trapezoid.
2. SECOND LOWEST LIGHT BLUE CARD: remake it as the SAME134-by193 master rectangle rotated to its current approximately22.5-degree-from-horizontal orientation. Its long dimension stays193px, its SHORT dimension becomes134px. Preserve its existing fan angle and lower inner corner as much as possible, expanding the width perpendicular to its long axis mostly toward upper-left. It should read as a full-width playing card, not a narrow strip. Natural overlap with dark-blue below and mint above, but enough exposed face to recognise the same physical size.
3. Do NOT change the WHITE front card, the mint card, the pale blue-gray card, or their placements. Do not rescale the whole fan. Match these two bottom cards to the white card; do not change white to match blue.
KEEP all other pixels conceptually identical: mist-blue circular disc, central ivory circle and two-block building icon, two thick ivory lower-right groove arcs, background and palette.
No redesign, no added objects, no guides, no text. This is a targeted correction of the two bottom cards' SHORT DIMENSION and complete equal-size rectangular silhouettes, using the white card as the fixed master.

## 第二轮提示词

只修改参考图最底下的两张蓝色卡片，其他所有内容原样保留。
白色卡片是尺寸模板：宽134、高193。白卡不许动。
最底下横放蓝卡必须是宽193、高134的圆角矩形。现在横卡太扁，请把其顶部向上扩展30像素，让左侧短边明显更高。底边保持原来水平位置，左右位置不动。左上角上移30像素，左边必须竖直，矩形完整宽高与旋转后的白卡完全相同。它只是上部右侧被上一张卡挡住，左边仍需要看得出正常卡片宽度。
倒数第二张浅蓝卡也必须是白卡同尺寸134×193的矩形，只旋转到原来的角度。把它的短边加宽约20像素，让它更宽、不要像一条窄长条。保留与上下卡片的自然叠放。
严禁修改白卡、绿色卡、最上方浅灰蓝卡。严禁改唱片、中间楼房图标、右下两条波纹、色彩、位置布局。
任务就是使底下两张卡变宽，成为与白卡同样大小的真正扑克牌矩形。不要只是移动，不要只是变色，不要维持原来的短扁形状。
