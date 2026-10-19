"""Render the actual game meshes, save editable Blender sources, and create UI thumbnails.

Run in a separate Blender background process; never clears the user's live scene.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'public/models/decorations'
PREVIEWS = ROOT / 'public/art/decorations'
SOURCES = ROOT / 'assets-source/decorations'
PREVIEWS.mkdir(parents=True, exist_ok=True)
SOURCES.mkdir(parents=True, exist_ok=True)

# This process is started with --factory-startup and owns this scene.
scene = bpy.context.scene
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
print('RENDER_ENGINE', scene.render.engine, flush=True)
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
formats = [i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format = next(f for f in formats if f.lower() == 'png')
scene.render.image_settings.color_mode = 'RGBA'
scene.world.color = (.3, .3, .3)
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.72, .78, .70, 1)
background.inputs['Strength'].default_value = .65

def area(name, location, power, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj

area('Key', (4, -6, 8), 1050, 5, (1, .88, .72))
area('Fill', (-5, -2, 5), 700, 5, (.77, .88, 1))
area('Rim', (2, 5, 7), 1000, 4, (1, .95, .82))
camera_data = bpy.data.cameras.new('Decoration Camera')
camera_data.type = 'ORTHO'
camera = bpy.data.objects.new('Decoration Camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

manifest = json.loads((MODELS / 'manifest.json').read_text(encoding='utf-8'))
for model in manifest:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODELS / (model['id'] + '.glb')))
    objects = set(bpy.data.objects) - before
    meshes = [o for o in objects if o.type == 'MESH']
    collection = bpy.data.collections.new('Song Decoration - ' + model['id'])
    scene.collection.children.link(collection)
    for obj in objects:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        collection.objects.link(obj)
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) / 2
    size = high - low
    front = model['id'] in ('outdoor-piano', 'watcher-statue', 'seagull', 'seashell', 'butterfly')
    camera.location = center + Vector((5.6, 8 if front else -8, 5.2))
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    inverse = camera.matrix_world.inverted()
    projected = [inverse @ p for p in points]
    width = max(p.x for p in projected) - min(p.x for p in projected)
    height = max(p.y for p in projected) - min(p.y for p in projected)
    camera_data.ortho_scale = max(width, height) * 1.18
    # Include the isolated scene so opening the .blend shows this model immediately.
    bpy.data.libraries.write(str(SOURCES / (model['id'] + '.blend')), {scene})
    scene.render.filepath = str(PREVIEWS / (model['id'] + '.png'))
    bpy.ops.render.render(write_still=True)
    print('DECORATION_RENDERED', model['id'], [round(v, 3) for v in size], flush=True)
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)
    # Releasing imported geometry keeps a batch of botanical models bounded in memory.
    for datablocks in (bpy.data.meshes, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)
print('ALL_DECORATIONS_RENDERED', len(manifest), flush=True)
