"""Original SongSpace sakura asset. Run in Blender through MCP; no external assets."""
import bpy
import bmesh
import math
import random
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path('D:/MyProject/SongSpace/songspace-web')
OUT = ROOT / 'public/models'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(86)
previous = bpy.data.collections.get('SongSpace_Sakura_Studio')
if previous:
    for obj in list(previous.objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if data.users == 0: bpy.data.meshes.remove(data)
    bpy.data.collections.remove(previous)
collection = bpy.data.collections.new('SongSpace_Sakura_Studio')
bpy.context.scene.collection.children.link(collection)
parts = {key: [[], [], []] for key in ['Bark', 'Blossoms', 'Leaves']}

def face(key, points, color):
    verts, faces, colors = parts[key]
    start = len(verts)
    verts.extend([tuple(p) for p in points])
    faces.append(tuple(range(start, start + len(points))))
    colors.extend([color] * len(points))

def wood(path, radius):
    rings = []
    for i, center in enumerate(path):
        tangent = (path[min(i+1, len(path)-1)] - path[max(0, i-1)]).normalized()
        u = tangent.cross(Vector((0, 1, .1))).normalized()
        v = tangent.cross(u).normalized()
        r = radius * (1 - i/(len(path)-1)*.88)
        rings.append([center + (u*math.cos(j*math.tau/9) + v*math.sin(j*math.tau/9)) * r * (1 + .08*math.sin(j*7+i)) for j in range(9)])
    for i in range(len(rings)-1):
        for j in range(9):
            shade = .76 + rng.random()*.35
            face('Bark', [rings[i][j], rings[i][(j+1)%9], rings[i+1][(j+1)%9], rings[i+1][j]], (.22*shade, .12*shade, .085*shade, 1))

def curved(start, end, radius, sag=.15):
    path = []
    for i in range(8):
        t = i/7
        path.append(start.lerp(end, t) + Vector((math.sin(t*math.pi)*sag, 0, math.sin(t*math.pi)*.17)))
    wood(path, radius)

def flower(center, size):
    # Each petal has a cupped, notched silhouette, instead of a spherical canopy.
    normal = Vector((rng.uniform(-.8,.8), rng.uniform(-.8,.8), rng.uniform(.2,1))).normalized()
    q = Vector((0,0,1)).rotation_difference(normal)
    hue = rng.random()
    color = (.98, .54 + hue*.23, .66 + hue*.19, 1)
    for j in range(5):
        a = j*math.tau/5 + hue
        local = [(0,0,.009), (.035,-.021,.002), (.080,-.023,.013), (.099,-.006,.025), (.088,0,.018), (.099,.006,.025), (.080,.023,.013), (.035,.021,.002)]
        pivot = center + q @ Vector((math.cos(a)*.031, math.sin(a)*.031, -.014)) * size
        outline = [pivot + q @ (Quaternion((0,0,1), a) @ (Vector(p)*size)) for p in local]
        # Fan triangles preserve the notch and avoid n-gon exporter ambiguity.
        for k in range(1,len(outline)-1):
            face('Blossoms', [outline[0], outline[k], outline[k+1]], color)
    core = [center + q @ Vector((math.cos(j*math.tau/5)*.018*size, math.sin(j*math.tau/5)*.018*size, .01)) for j in range(5)]
    face('Blossoms', core, (.72, .32, .26, 1))

curved(Vector((0,0,0)), Vector((.17,-.12,2.45)), .24, .14)
for i in range(6):
    a = i*2.4
    curved(Vector((math.cos(a)*.63, math.sin(a)*.63,.025)), Vector((.05,0,.48)), .065, .03)
for i in range(8):
    a = i*2.399
    fork = Vector((.12,-.08,1.45 + i%3*.25))
    end = Vector((math.cos(a)*(1.3+rng.random()*.4), math.sin(a)*(1.2+rng.random()*.4), 2.8+rng.random()*.7))
    curved(fork,end,.09,.13)
    for j in range(4):
        a2 = a + (j-1.5)*.65
        tip = end + Vector((math.cos(a2)*(.65+rng.random()*.3), math.sin(a2)*(.65+rng.random()*.3), rng.uniform(.05,.7)))
        curved(end,tip,.033,.08)
        for k in range(2):
            twig = tip + Vector((rng.uniform(-.4,.4),rng.uniform(-.4,.4),rng.uniform(-.05,.25)))
            curved(end.lerp(tip,.6),twig,.012,.025)
            for n in range(10):
                center = twig + Vector((rng.gauss(0,.23),rng.gauss(0,.22),rng.gauss(0,.16)))
                flower(center,rng.uniform(.65,1.1))
        for n in range(3):
            center = tip + Vector((rng.uniform(-.2,.2),rng.uniform(-.2,.2),rng.uniform(-.1,.1)))
            direction = Vector((math.cos(a2),math.sin(a2),.2))*.19
            across = Vector((-math.sin(a2),math.cos(a2),0))*.045
            face('Leaves',[center,center+direction*.45+across,center+direction,center+direction*.45-across],(.22,.38,.13,1))

objects=[]
for key,(verts,faces,colors) in parts.items():
    mesh=bpy.data.meshes.new('Sakura_'+key)
    mesh.from_pydata(verts,[],faces); mesh.update()
    attr=mesh.color_attributes.new(name='BotanicalColor',type='FLOAT_COLOR',domain='POINT')
    for entry,color in zip(attr.data,colors): entry.color=color
    bm=bmesh.new(); bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(mesh); bm.free(); mesh.update()
    obj=bpy.data.objects.new('Sakura_'+key,mesh); collection.objects.link(obj); objects.append(obj)
    mat=bpy.data.materials.new('Sakura_'+key); mat.use_nodes=True
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    vc=mat.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name=attr.name
    mat.node_tree.links.new(vc.outputs['Color'],shader.inputs['Base Color'])
    shader.inputs['Roughness'].default_value=.88 if key=='Bark' else .7
    mat.diffuse_color=colors[0]
    if key != 'Bark': mat.use_backface_culling=False
    mesh.materials.append(mat)
    if key=='Bark':
        for poly in mesh.polygons: poly.use_smooth=True

selected=list(bpy.context.selected_objects); active=bpy.context.view_layer.objects.active
bpy.ops.object.select_all(action='DESELECT')
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'sakura-botanical.glb'),use_selection=True,export_format='GLB',export_yup=True)
source=ROOT/'assets-source'; source.mkdir(exist_ok=True)
bpy.data.libraries.write(str(source/'sakura-botanical.blend'),{collection})
for obj in objects: obj.select_set(False)
for obj in selected: obj.select_set(True)
bpy.context.view_layer.objects.active=active
print('SAKURA_EXPORTED',[(o.name,len(o.data.polygons)) for o in objects],(OUT/'sakura-botanical.glb').stat().st_size)
