"""Original batched game assets for forest, coast and Jiangnan. Blender/MCP entrypoint."""
import bpy, bmesh, math, random
from pathlib import Path
from mathutils import Vector

ROOT=Path('D:/MyProject/SongSpace/songspace-web')
rng=random.Random(137)
made=[]
def build(name):
    previous=bpy.data.collections.get('SongSpace_'+name)
    if previous:
        for obj in list(previous.objects):
            mesh=obj.data;bpy.data.objects.remove(obj,do_unlink=True)
            if mesh.users==0:bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(previous)
    collection=bpy.data.collections.new('SongSpace_'+name)
    bpy.context.scene.collection.children.link(collection)
    batches={}
    def face(mat,points,color):
        verts,faces,colors=batches.setdefault(mat,([],[],[]));n=len(verts)
        verts.extend([tuple(p) for p in points]);faces.append(tuple(range(n,n+len(points))));colors.extend([color]*len(points))
    def tube(mat,path,radius,color,sides=7,taper=.85):
        rings=[]
        for i,center in enumerate(path):
            tangent=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
            u=tangent.cross(Vector((0,1,.1))).normalized();v=tangent.cross(u).normalized()
            rings.append([center+(u*math.cos(j*math.tau/sides)+v*math.sin(j*math.tau/sides))*radius*(1-i/(len(path)-1)*taper) for j in range(sides)])
        face(mat,list(reversed(rings[0])),color);face(mat,rings[-1],color)
        for i in range(len(rings)-1):
            for j in range(sides):face(mat,[rings[i][j],rings[i][(j+1)%sides],rings[i+1][(j+1)%sides],rings[i+1][j]],color)
    def export():
        objects=[]
        for mat,(verts,faces,colors) in batches.items():
            mesh=bpy.data.meshes.new(name+'_'+mat);mesh.from_pydata(verts,[],faces);mesh.update()
            attr=mesh.color_attributes.new(name='SurfaceColor',type='FLOAT_COLOR',domain='POINT')
            for entry,color in zip(attr.data,colors):entry.color=color
            bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
            material=bpy.data.materials.new(name+'_'+mat);material.use_nodes=True;material.diffuse_color=colors[0]
            shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
            node=material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name=attr.name
            material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.85
            mesh.materials.append(material)
            for poly in mesh.polygons:poly.use_smooth=mat=='Wood'
            obj=bpy.data.objects.new(name+'_'+mat,mesh);collection.objects.link(obj);objects.append(obj)
        selected=list(bpy.context.selected_objects);active=bpy.context.view_layer.objects.active
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{name}.glb'),use_selection=True,export_format='GLB',export_yup=True)
        bpy.data.libraries.write(str(ROOT/'assets-source'/f'{name}.blend'),{collection})
        for obj in objects:obj.select_set(False)
        for obj in selected:obj.select_set(True)
        bpy.context.view_layer.objects.active=active
        made.append((name,len(objects),sum(len(o.data.polygons) for o in objects)))
    return face,tube,export

face,tube,export=build('forest-pine')
tube('Wood',[Vector((math.sin(i*.6)*.06,0,i*.55)) for i in range(12)],.24,(.22,.14,.085,1),10)
for tier in range(8):
    z=1.6+tier*.6;reach=2.15-tier*.22
    for j in range(7):
        a=j*math.tau/7+tier*1.7
        start=Vector((0,0,z));end=Vector((math.cos(a)*reach,math.sin(a)*reach,z-.12))
        tube('Wood',[start,start.lerp(end,.4)+Vector((0,0,-.16)),end],.052,(.27,.19,.11,1))
        for tuft in range(6):
            t=.25+tuft*.14;center=start.lerp(end,t)
            for k in range(12):
                angle=a+k*2.399
                base=center+Vector((rng.uniform(-.14,.14),rng.uniform(-.14,.14),rng.uniform(-.1,.1)))
                tip=base+Vector((math.cos(angle)*.38,math.sin(angle)*.38,.18+rng.random()*.18))
                across=Vector((-math.sin(angle),math.cos(angle),0))*.065
                color=(.09+tier*.012+rng.random()*.03,.22+tier*.018+rng.random()*.06,.12+tier*.01,1)
                face('Needles',[base,base.lerp(tip,.4)+across,tip,base.lerp(tip,.4)-across],color)
export()

face,tube,export=build('coastal-palm')
path=[Vector((.65*(i/16)**2,0,5.5*i/16)) for i in range(17)]
tube('Wood',path,.22,(.34,.25,.16,1),10)
for i in range(22):
    z=.22+i*.23;center=Vector((.65*(z/5.5)**2,0,z))
    for j in range(10):
        a=j*math.tau/10;b=(j+1)*math.tau/10;r=.22*(1-z/5.5*.7)
        face('Wood',[center+Vector((math.cos(a)*r,math.sin(a)*r,0)),center+Vector((math.cos(b)*r,math.sin(b)*r,0)),center+Vector((math.cos(b)*r,math.sin(b)*r,.035)),center+Vector((math.cos(a)*r,math.sin(a)*r,.035))],(.43,.33,.22,1))
for j in range(12):
    a=j*2.399
    def spine(t):return Vector((.65+math.cos(a)*t*3.2,math.sin(a)*t*3.2,5.5+math.sin(t*math.pi)*.8-t*t*1.8))
    tube('Wood',[spine(i/12) for i in range(13)],.026,(.32,.39,.14,1),5)
    for i in range(1,20):
        t=i/20;center=spine(t);width=math.sin(t*math.pi)**.7*.62
        for side in [-1,1]:
            tip=center+Vector((-math.sin(a)*side*width+math.cos(a)*.18,math.cos(a)*side*width+math.sin(a)*.18,-.15))
            tangent=Vector((math.cos(a),math.sin(a),0))*.055
            face('Fronds',[center,center.lerp(tip,.4)+tangent,tip,center.lerp(tip,.4)-tangent],(.13+rng.random()*.06,.30+rng.random()*.1,.12,1))
export()

face,tube,export=build('jiangnan-roof')
def profile(t):return 1.6-1.65*t+.28*t**6
for side in [-1,1]:
    for row in range(10):
        t0=row/10;t1=min(1,(row+1)/10+.015)
        for col in range(22):
            z0=-3.3+col*.3
            shade=.8+rng.random()*.28;color=(.105*shade,.16*shade,.17*shade,1)
            for k in range(5):
                a=k/5*math.pi;b=(k+1)/5*math.pi
                face('Tiles',[Vector((side*t0*3.2,z0+k/5*.3,profile(t0)+math.sin(a)*.045+.018)),Vector((side*t0*3.2,z0+(k+1)/5*.3,profile(t0)+math.sin(b)*.045+.018)),Vector((side*t1*3.2,z0+(k+1)/5*.3,profile(t1)+math.sin(b)*.045)),Vector((side*t1*3.2,z0+k/5*.3,profile(t1)+math.sin(a)*.045))],color)
    for z in [-3.32,3.32]:tube('Tiles',[Vector((side*t/12*3.2,z,profile(t/12))) for t in range(13)],.075,(.2,.25,.23,1),taper=0)
    for i in range(14):
        z=-3.2+i*.49
        tube('Wood',[Vector((0,z,1.23)),Vector((side*3.15,z,-.10))],.05,(.23,.18,.12,1),5)
tube('Ridge',[Vector((0,z,1.66+abs(z/3.4)**8*.17)) for z in [-3.5,-3,-2,-1,0,1,2,3,3.5]],.12,(.25,.31,.28,1),8,taper=0)
export()
print('FIRST_WORLDS_EXPORTED',made)
