"""Render exported model geometry offline for silhouette inspection (not a WebGL screenshot)."""
import json
import math
import sys
from PIL import Image, ImageDraw, ImageFont

def sub(a, b): return [x-y for x, y in zip(a, b)]
def dot(a, b): return sum(x*y for x, y in zip(a, b))
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def unit(a):
    length = math.sqrt(dot(a, a)) or 1
    return [v/length for v in a]

models = json.load(open(sys.argv[1], encoding='utf-8'))
columns = len(models)
cell_width = 600 if columns == 3 else 800
rows = 3 if columns == 3 else 2
image = Image.new('RGB', (cell_width * columns, 500 * rows), '#edf1eb')
draw = ImageDraw.Draw(image)
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 25)
for row in range(rows):
    eye = [[4, 2.8, -5], [-5, 1.8, 0], [-4, 2.8, 5]][row] if columns == 3 else ([4, 2.8, -5] if row == 0 else [-4, 2.8, 5])
    direction = unit(sub([0, .8, 0], eye))
    right = unit(cross(direction, [0, 1, 0])); up = cross(right, direction)
    for col, model in enumerate(models):
        faces = []
        scale = 160 if model['id'] == 'ae86' else 135 if model.get('mounted') else 185
        for face in (model.get('cutaway') if row == 1 and model.get('cutaway') else model['triangles']):
            points = face['points']
            normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])))
            light = .60 + abs(dot(normal, unit([-2, 5, -3]))) * .38
            color = tuple(min(255, int(int(face['color'][i:i+2], 16)*light)) for i in (0, 2, 4))
            projected = [(col*cell_width + cell_width/2 + dot(sub(p, [0, .8, 0]), right)*scale, row*500 + 300 - dot(sub(p, [0, .8, 0]), up)*scale) for p in points]
            depth = sum(dot(sub(p, eye), direction) for p in points)/3
            faces.append((depth, projected, color))
        for _, polygon, color in sorted(faces, key=lambda face: -face[0]): draw.polygon(polygon, fill=color)
        caption = {'ae86': 'AE86', 'motorcycle': '烂摩托', 'bicycle-rack': '后架单车'}[model['id']] + (' · 前侧' if row == 0 else ' · 侧面' if columns == 3 and row == 1 else ' · 后侧')
        if row == 1 and model.get('cutaway'): caption = 'AE86 · 驾驶舱剖视（隐藏车顶和玻璃）'
        draw.text((col*cell_width+30, row*500+445), caption, font=font, fill='#35493d')
for col in range(1, columns): draw.line((col*cell_width, 0, col*cell_width, 500*rows), fill='#d4ded3', width=1)
image.save(sys.argv[2])
