"""Offline inspection of the exact game meshes; background WebGL shaders are not reproduced."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT.parent / '.runtime/space-upgrade'
SOURCE = ROOT / 'assets-source/space-upgrade'
SOURCE.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
for obj in list(scene.objects): bpy.data.objects.remove(obj, do_unlink=True)
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.025, .04, .08, 1)
background.inputs['Strength'].default_value = .6
data = bpy.data.lights.new('Cold sunlight', 'SUN'); data.energy = 2.5; data.angle = .12; data.color = (.8, .89, 1)
sun = bpy.data.objects.new('Cold sunlight', data); scene.collection.objects.link(sun); sun.rotation_euler = (math.radians(28), math.radians(-26), math.radians(-30))
data = bpy.data.lights.new('Blue fill', 'AREA'); data.energy = 22000; data.size = 70; data.color = (.55, .68, 1)
fill = bpy.data.objects.new('Blue fill', data); scene.collection.objects.link(fill); fill.location = (-45, -40, 65); fill.rotation_euler = (-fill.location).to_track_quat('-Z', 'Y').to_euler()
camera_data = bpy.data.cameras.new('Space Camera'); camera_data.type = 'ORTHO'
camera = bpy.data.objects.new('Space Camera', camera_data); scene.collection.objects.link(camera); scene.camera = camera
scene.render.resolution_percentage = 100
formats = [i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format = next(f for f in formats if f.lower() == 'png')
for asset in ['space-world', 'orbital-habitat', 'lunar-rover', 'relay-antenna', 'space-obstacles']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUTPUT / (asset + '.glb')))
    objects = set(bpy.data.objects) - before
    bpy.context.view_layer.update()
    if asset == 'space-world':
        target = Vector((0, 0, 9)); camera.location = target + Vector((105, -125, 108)); camera_data.ortho_scale = 118
        scene.render.resolution_x = 1800; scene.render.resolution_y = 1320
        scene.render.film_transparent = False
    else:
        points = [o.matrix_world @ Vector(corner) for o in objects if o.type == 'MESH' for corner in o.bound_box]
        low = Vector(tuple(min(p[i] for p in points) for i in range(3))); high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
        target = (low + high) / 2
        camera.location = target + Vector((7, -10, 6))
        camera_data.ortho_scale = max(high - low) * 1.35
        scene.render.resolution_x = 1200; scene.render.resolution_y = 900
        scene.render.film_transparent = True
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.data.libraries.write(str(SOURCE / (asset + '.blend')), {scene})
    scene.render.filepath = str(OUTPUT / (asset + '.png'))
    bpy.ops.render.render(write_still=True)
    print('SPACE_RENDERED', asset, flush=True)
    for obj in objects: bpy.data.objects.remove(obj, do_unlink=True)
print('SPACE_PREVIEWS_COMPLETE', flush=True)
