"""Bevelled aluminium record slipcase and lined sliding tray, in game coordinates."""
import bpy
import bmesh
from pathlib import Path
from mathutils import Vector

ROOT=Path('D:/MyProject/SongSpace/songspace-web')
collection=bpy.data.collections.new('SongSpace_RecordCase_Studio')
bpy.context.scene.collection.children.link(collection)
materials={}
for name,color,metal,rough in [('CasePaint',(.035,.12,.085,1),.65,.28),('EdgeMetal',(.48,.55,.49,1),.85,.25),('Felt',(.018,.035,.025,1),0,.98),('Board',(.09,.12,.09,1),0,.8)]:
    mat=bpy.data.materials.new('RecordCase_'+name);mat.use_nodes=True;mat.diffuse_color=color
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=color;shader.inputs['Metallic'].default_value=metal;shader.inputs['Roughness'].default_value=rough
    materials[name]=mat
batches={}
def box(group,material,loc,size,bevel=.012):
    bm=bmesh.new();bmesh.ops.create_cube(bm,size=1)
    for v in bm.verts:v.co=Vector((v.co.x*size[0],v.co.y*size[1],v.co.z*size[2]))
    bmesh.ops.bevel(bm,geom=list(bm.edges),offset=min(bevel,min(size)*.3),segments=3,affect='EDGES')
    bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.verts.ensure_lookup_table()
    verts,faces=batches.setdefault((group,material),([],[]));start=len(verts)
    verts.extend([tuple(v.co+Vector(loc)) for v in bm.verts]);faces.extend([tuple(start+v.index for v in f.verts) for f in bm.faces]);bm.free()

for z in [-.3,.3]:box('Case','CasePaint',(0,0,z),(3.12,3.12,.075),.02)
for x in [-1.52,1.52]:box('Case','CasePaint',(x,0,0),(.08,3.12,.6),.018)
box('Case','CasePaint',(0,1.52,0),(3.12,.08,.6),.018)
# Recessed lining and a thin open mouth give the drawer a real insertion gap.
for x in [-1.47,1.47]:box('Case','Felt',(x,0,0),(.018,2.97,.49),.003)
for z in [-.34,.34]:
    for x in [-1.545,1.545]:box('Case','EdgeMetal',(x,0,z),(.021,3.02,.012),.003)
for x in [-1.52,1.52]:
    for y in [-1.50,1.50]:
        box('Case','EdgeMetal',(x,y,.342),(.085,.085,.008),.008)
        box('Case','EdgeMetal',(x,y,-.342),(.085,.085,.008),.008)
box('Tray','Board',(0,-.03,-.23),(2.91,2.94,.06),.012)
box('Tray','Felt',(0,-.03,-.193),(2.77,2.80,.015),.005)
for x in [-1.43,1.43]:
    box('Tray','Board',(x,-.03,0),(.055,2.94,.5),.012)
    box('Tray','Felt',(x*.975,-.03,.02),(.016,2.80,.40),.004)
    box('Tray','EdgeMetal',(x,-.03,.252),(.025,2.86,.012),.003)
box('Tray','CasePaint',(0,-1.49,0),(2.91,.09,.545),.015)
box('Tray','EdgeMetal',(0,-1.545,.02),(2.85,.012,.50),.003)
# Folded cloth pull tab, stitched edges and a recessed rivet plate.
box('Tray','Felt',(0,-1.68,.03),(.30,.34,.027),.009)
for x in [-.115,.115]:
    for j in range(9):box('Tray','Board',(x,-1.55-j*.027,.048),(.009,.012,.003),.001)
box('Tray','EdgeMetal',(0,-1.55,.048),(.22,.035,.008),.005)

objects=[]
for (group,material),(verts,faces) in batches.items():
    # Blender Z-up -> glTF Y-up, matching the game's vertical sleeve orientation.
    mesh=bpy.data.meshes.new('RecordCase_'+group+'_'+material)
    mesh.from_pydata([(x,-z,y) for x,y,z in verts],[],faces);mesh.update()
    obj=bpy.data.objects.new(group+'_'+material,mesh);collection.objects.link(obj);mesh.materials.append(materials[material]);objects.append(obj)
old_selected=list(bpy.context.selected_objects);old_active=bpy.context.view_layer.objects.active
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/record-case.glb'),use_selection=True,export_format='GLB',export_yup=True)
bpy.data.libraries.write(str(ROOT/'assets-source/record-case.blend'),{collection})
for obj in objects:obj.select_set(False)
for obj in old_selected:obj.select_set(True)
bpy.context.view_layer.objects.active=old_active
print('RECORD_CASE_EXPORTED',len(objects),sum(len(o.data.polygons) for o in objects))
