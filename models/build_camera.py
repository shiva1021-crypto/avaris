"""Build the Avaris cinema rig. Run with Blender Python (bpy) and Pillow.

Coordinates below are design millimetres. Front is -X, operator side is -Y.
The export origin is the centre of the dovetail underside. Scale is inferred.
"""
import math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
pi = math.pi
section = "Chassis"


def material(name, rgb, metal, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    shader = m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*rgb, 1)
    return m


alloy = material("Black anodised alloy", (.009,.010,.012), .78,.30)
panel = material("Satin black panel", (.014,.015,.017), .62,.38)
rubber = material("Grip elastomer", (.007,.0075,.008), .04,.59)
black = material("Flocked optical baffles", (.0025,.0027,.003), .05,.68)
black.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value=.13
steel = material("Bead-blasted titanium", (.28,.30,.32), .88,.27)
red = material("Crimson anodised witness rings", (.43,.012,.052), .66,.29)
ink = material("Ivory enamel", (.67,.68,.64), .05,.42)
screen = material("Smoked monitor glass", (.011,.016,.021), .34,.16)
optic = material("Multicoated front element", (.06,.02,.04), .38,.14)


def finish(o, name, loc, mat):
    o.name = name
    o.location = loc
    o.data.materials.append(mat)
    o["assembly"] = section
    return o


def bevel(o, width):
    if width:
        b = o.modifiers.new("Machined radius", "BEVEL")
        b.width = width
        b.segments = 3
        n = o.modifiers.new("Face weighted normals", "WEIGHTED_NORMAL")
        n.keep_sharp = True
    return o


def box(name, loc, size, mat=alloy, radius=1):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    for v in o.data.vertices:
        for i in range(3):
            v.co[i] *= size[i]
    return bevel(finish(o,name,loc,mat),radius)


def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    o = bpy.data.objects.new(name,data)
    scene.collection.objects.link(o)
    return finish(o,name,(0,0,0),mat)


def lathe(name, loc, profile, mat, axis="X", steps=80, teeth=0):
    # Cross-section traverses the outside and returns on the inner bore.
    points, faces = [], []
    for axial, radius in profile:
        for j in range(steps):
            t = 2*pi*j/steps
            r = radius + (1.05 if teeth and j % 4 in (1,2) else 0)
            points.append((axial,r*math.cos(t),r*math.sin(t)))
    for i in range(len(profile)):
        nxt = (i+1) % len(profile)
        for j in range(steps):
            k = (j+1)%steps
            faces.append((i*steps+j,i*steps+k,nxt*steps+k,nxt*steps+j))
    o = mesh(name,points,faces,mat)
    o.location = loc
    if axis=="Y": o.rotation_euler.z=pi/2
    if axis=="Z": o.rotation_euler.y=-pi/2
    for p in o.data.polygons: p.use_smooth = not teeth
    # Split normals at the boundaries between lathed surfaces.
    for e in o.data.edges:
        if e.vertices[0]//steps==e.vertices[1]//steps: e.use_edge_sharp=True
    return o


def ring(name,loc,r,length,mat,axis="X",bore=.15,steps=64,teeth=0):
    h = length/2
    b = min(.48,h*.32,(r-bore)*.3)
    return lathe(name,loc,[(-h,r-b),(-h+b,r),(h-b,r),(h,r-b),(h,bore),(-h,bore)],mat,axis,steps,teeth)


def fastener(loc,axis="Y",r=1.8):
    ring("Socket cap",loc,r,.65,steel,axis,r*.48,18)
    ring("Hex socket",loc,r*.56,.71,black,axis,r*.25,6)


def cable(name, points, thickness):
    c=bpy.data.curves.new(name,"CURVE")
    c.dimensions="3D"; c.resolution_u=16; c.bevel_depth=thickness; c.bevel_resolution=3
    s=c.splines.new("BEZIER"); s.bezier_points.add(len(points)-1)
    for b,p in zip(s.bezier_points,points):
        b.co=p; b.handle_left_type=b.handle_right_type="AUTO"
    o=bpy.data.objects.new(name,c); scene.collection.objects.link(o)
    finish(o,name,(0,0,0),rubber)


def rounded_loop(w,h,r):
    pts=[]
    for sy,sz,start in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
        for a in range(start,start+91,15):
            t=math.radians(a)
            pts.append((sy*(w/2-r)+r*math.cos(t),sz*(h/2-r)+r*math.sin(t)))
    return pts


def hood(name,loops,mat):
    pts=[]; faces=[]
    for x,w,h,r in loops:
        outline=rounded_loop(w,h,r)
        pts.extend((x,y,z+89) for y,z in outline)
    n=len(outline)
    for i in range(len(loops)):
        for j in range(n):
            k=(j+1)%n; m=(i+1)%len(loops)
            faces.append((i*n+j,i*n+k,m*n+k,m*n+j))
    return bevel(mesh(name,pts,faces,mat),.35)


# Chassis, control cluster, side covers, grille and V-lock battery.
box("Sensor housing",(36,0,90),(115,73,85),alloy,5)
for sign in (-1,1):
    y=sign*37
    box("Service cover gasket",(44,y,89),(70,2.4,76),black,2)
    box("Service cover",(44,y+sign*1.3,89),(68,1.8,74),panel,2)
    for x in (13,75):
        for z in (56,122): fastener((x,y+sign*2.4,z))
    for row in range(12):
        for col in range(2):
            box("Cooling slot",(84+col*4.5,y,60+row*5),(3.1,1.3,2.9),black,.65)
box("Operator keypad",(-7,-37.2,89),(23,3,76),panel,2)
for z in (81,94,107,120):
    for x in (-12,-3):
        ring("Key bezel",(x,-39,z),3.9,2,black,"Y")
        ring("Tactile key",(x,-40.2,z),3,1.6,panel,"Y")
ring("Record guard",(-7,-39.8,64),5.5,2.8,black,"Y")
ring("Record switch",(-7,-41.3,64),4.1,1.6,red,"Y")
box("Battery latch",(96,0,89),(9,64,71),black,3)
box("Rear power pack",(114,0,89),(32,71,78),alloy,5)
box("Battery cap",(128,0,89),(5,67,71),panel,2)
for y in (-26,26):
    for z in (60,118): fastener((130.6,y,z),"X")
for z in (74,83,92):
    box("Battery grip recess",(130.65,0,z),(.6,32,1.8),black,.28)
box("Power pack release",(101,-35.7,90),(8,2.7,5),red,1)

section="Cine lens"
zc=89
lathe("Stepped prime barrel",(-20,0,zc),[(-115,43),(-107,45),(-82,45),(-75,43),(-54,42),(-43,38),(-21,35),(-18,32),(2,32),(2,21),(-115,21)],alloy)
for x,r,w in [(-124,45,2.2),(-72,42.4,1.1),(-45,36.3,.8)]:
    ring("Anodised lens index",(x,0,zc),r,w,red,bore=r-2)
for x,r,w in [(-111,45,14),(-80,42.3,8)]:
    ring("Geared focus collar",(x,0,zc),r,w,rubber,bore=r-3,steps=384,teeth=96)
for x,r in [(-135,43),(-131,44),(-98,44),(-62,39),(-50,36),(-29,33)]:
    ring("Turned shoulder",(x,0,zc),r,1.6,black,bore=r-2)
# Printed distance scale wrapped around the barrel.
def image_material(name,img,base):
    import tempfile
    path=Path(tempfile.gettempdir())/(name+".png")
    img.save(path)
    m=base.copy(); m.name=name
    tex=m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image=bpy.data.images.load(str(path)); tex.image.pack()
    coords=m.node_tree.nodes.new("ShaderNodeUVMap"); coords.uv_map="UVMap"
    m.node_tree.links.new(coords.outputs["UV"],tex.inputs["Vector"])
    m.node_tree.links.new(tex.outputs["Color"],m.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    return m

im=Image.new("RGB",(2048,128),(48,49,52))
draw=ImageDraw.Draw(im)
font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",36)
for i in range(96):
    x=i*2048/96
    draw.line((x,0,x,32 if i%4 else 48),fill=(201,198,189),width=2)
    if i%4==0:
        draw.text((x+3,53),str([1.2,1.4,1.6,2,2.5,3,4,5,7,10,15,25][(i//4)%12]),font=font,fill=(210,207,196))
marks=image_material("Engraved distance scale",im,alloy)
# Fine powder-coat variation across the large operator-side access cover.
grain=np.random.default_rng(31).normal(0,2,(512,512,1))+np.array([37,39,43])
coat=image_material("Fine textured graphite",Image.fromarray(grain.clip(0,255).astype("uint8")),panel)
for cover in scene.objects:
    if cover.name.startswith("Service cover") and "gasket" not in cover.name:
        cover.data.materials[0]=coat
verts=[]; faces=[]
for i in range(129):
    a=2*pi*i/128
    for x in (-101,-90):
        verts.append((x,45.1*math.cos(a),zc+45.1*math.sin(a)))
for i in range(128): faces.append((2*i,2*i+2,2*i+3,2*i+1))
o=mesh("Distance scale sleeve",verts,faces,marks)
uv=o.data.uv_layers.new()
for p in o.data.polygons:
    p.use_smooth=True
    for idx in p.loop_indices:
        k=o.data.loops[idx].vertex_index;uv.data[idx].uv=(k//2/128,k%2)

# Curved optical glass with layered off-axis coating reflections.
v,u=np.mgrid[-1:1:512j,-1:1:512j]
rr=np.hypot(v,u)
pix=np.zeros((512,512,3))+[13,14,18]
for cx,cy,color in [(.39,-.39,[210,59,104]),(-.36,.43,[5,65,56])]:
    rad=np.hypot(u-cx,v-cy)
    light=np.exp(-rad**2/.16)*(.75+.25*(.5+.5*np.cos(21*rr+.6))**3)
    pix+=light[:,:,None]*color
pix*=np.clip(.50+rr*2,.5,1)[:,:,None]
glass=image_material("Rose and teal optical coating",Image.fromarray(pix.clip(0,255).astype("uint8")),optic)
glass_node=glass.node_tree.nodes["Principled BSDF"]
glass.node_tree.links.new(glass.node_tree.nodes["Image Texture"].outputs["Color"],glass_node.inputs["Emission Color"])
glass_node.inputs["Emission Strength"].default_value=.22
verts=[(-144,0,zc)]; faces=[]
for i in range(1,15):
    r=36*i/14
    for j in range(96):
        a=2*pi*j/96
        verts.append((-144+4*(r/36)**2,r*math.cos(a),zc+r*math.sin(a)))
        k=1+(i-1)*96+j; l=1+(i-1)*96+(j+1)%96
        faces.append((0,l,k) if i==1 else (k-96,l-96,l,k))
o=mesh("Convex optical element",verts,faces,glass); uv=o.data.uv_layers.new()
for p in o.data.polygons:
    p.use_smooth=True
    for idx in p.loop_indices:
        co=o.data.vertices[o.data.loops[idx].vertex_index].co
        uv.data[idx].uv=(.5+co.y/72,.5+(co.z-zc)/72)
for i in range(5):
    ring("Internal light trap",(-142-i*.9,0,zc),37.5+i*1.05,1.3,black,bore=35.6+i*1.04)

section="Matte box"
hood("Flared shade",[(-134,102,91,7),(-158,137,122,7),(-158,129,114,5),(-134,91,82,5)],black)
hood("Front filter frame",[(-158,138,123,7),(-163,138,123,7),(-163,130,115,5),(-158,130,115,5)],alloy)
hood("Rear filter tray",[(-134,106,95,6),(-130,106,95,6),(-130,91,82,5),(-134,91,82,5)],alloy)
# Continuous rebate from the filter tray to the optical rim. Both ends lap
# adjoining parts so the studio cannot show between them at oblique angles.
n=128
verts=[]; faces=[]
for x,half_w,half_h,r in [(-137,51,46,0),(-132,51,46,0),
                          (-132,0,0,34.8),(-139,0,0,34.8)]:
    for i in range(n):
        a=2*pi*i/n
        cy,sz=math.cos(a),math.sin(a)
        distance=r or min(half_w/max(abs(cy),1e-8),half_h/max(abs(sz),1e-8))
        verts.append((x,distance*cy,zc+distance*sz))
for row in range(4):
    for i in range(n):
        j=(i+1)%n; nxt=(row+1)%4
        faces.append((row*n+i,row*n+j,nxt*n+j,nxt*n+i))
mesh("Solid light-tight lens adapter",verts,faces,black)
hood("Stepped filter-retainer lip",[(-142,111,100,5),(-144,111,100,5),
     (-144,105,94,4),(-142,105,94,4)],alloy)
ring("Optics retaining bezel",(-140,0,zc),42,2.8,alloy,bore=36.1,steps=128)
for side in (-1,1):
    for z in (65,112):
        box("Tray lock",(-146,side*61,z),(9,5,13),alloy,1.4)
        fastener((-146,side*64,z))
    ring("Flag pivot",(-156,side*55,153),4.2,6,alloy,"Y")
    ring("Flag pivot index",(-156,side*58,153),2.5,1,red,"Y")
flag=box("Adjustable top flag",(-179,0,163),(52,140,2),black,.9)
flag.rotation_euler.y=.42
for y in (-48,-20,20,48): ring("Flag hinge",(-155,y,153),3.1,13,black,"Y")

section="Support and follow focus"
box("Quick release dovetail",(0,0,4),(108,50,8),alloy,2)
box("Sliding carriage",(0,0,14),(85,60,12),black,2)
box("Rail bridge",(12,0,29),(83,64,22),alloy,3)
box("Riser",(34,0,43),(103,59,10),alloy,1.7)
for y in (-22,22):
    ring("Hollow support rail",(-38,y,26),7.5,259,steel,bore=5.6)
    for x in (-134,-36,42): ring("Rail clamp",(x,y,26),9.7,9,black,bore=7.45)
box("Matte box support",(-134,0,37),(8,54,16),alloy,2)
for x in range(-12,84,8): ring("Cage threaded insert",(x,-30,43),2.6,1.6,black,"Y",1.65,18)
box("Focus rail bracket",(-79,-32,32),(15,32,16),alloy,2)
box("Focus swing arm",(-78,-43,48),(9,8,35),panel,2)
ring("Focus pinion",(-78,-44,65),13,8,alloy,"X",2,160,40)
for y,r,w,m in [(-47,24,7,alloy),(-52,22.5,3,red),(-55,21,6,rubber),(-59,17,2,panel)]:
    ring("Follow focus handwheel",(-74,y,36),r,w,m,"Y",1.1,128,32 if m==rubber else 0)
box("Carriage release",(-27,-29,6),(9,5,6),red,1)

section="Top handle"
box("Top cheese plate",(31,0,135),(107,56,6),alloy,2)
for x in range(-12,79,10):
    for y in (-21,21): ring("Tapped mount",(x,y,138),2.8,.6,black,"Z",1.9,20)
for x in (-9,34):
    box("Accessory bridge foot",(x,-14,140),(9,11,6),black,1.2)
    ring("Accessory rod clamp",(x,-14,146),5.5,7,alloy,bore=3.4)
ring("Accessory rod",(12,-14,146),3.5,54,steel,bore=1.6)
for x in (54,68):
    box("Top latch",(x,-16,140),(10,8,4),panel,1.4)
    fastener((x,-16,142.2),"Z")
for x in (3,78):
    box("Handle stanchion",(x,0,155),(9,13,35),alloy,2.6)
    for z in (149,158): fastener((x,-6.7,z))
ring("Grip core",(35,0,174),9,105,black)
# Perforated grip shell with open holes and bevelled lips.
verts=[]; faces=[]
for i in range(17):
    for j in range(10):
        base=len(verts)
        for typ in ("outer","lip","inner"):
            for k in range(12):
                a=2*pi*k/12
                cs,sn=math.cos(a),math.sin(a)
                f=max(abs(cs),abs(sn))
                dx,dtheta=(cs/f*1.9,sn/f*pi/10) if typ=="outer" else (cs*1.38,sn*.173)
                t=(j+.5)*2*pi/10+dtheta
                r=10 if typ!="inner" else 9.1
                verts.append((6+(i+.5)*3.8+dx,r*math.cos(t),174+r*math.sin(t)))
        for k in range(12):
            n=(k+1)%12
            for q in (0,12): faces.append((base+q+k,base+q+n,base+q+12+n,base+q+12+k))
mesh("Perforated grip sleeve",verts,faces,alloy)
for x in (3,75): ring("Grip ferrule",(x,0,174),10.6,6,panel)
ring("Handle end trim",(87,0,174),8.8,1.3,red,bore=6.7)

section="Monitor and swivel"
ring("Swivel hinge",(-21,0,175),6.3,18,alloy,"Y")
fastener((-21,-9.4,175),"Y",3.5)
box("Monitor shoe",(-21,0,184),(10,12,12),alloy,1.4)
origin=Vector((-23,0,219))
angle=-1.07
def monitor(name,local,size,mat,r):
    x,y,z=local
    p=origin+Vector((x*math.cos(angle)-y*math.sin(angle),x*math.sin(angle)+y*math.cos(angle),z))
    o=box(name,p,size,mat,r);o.rotation_euler.z=angle
    return o
monitor("Field monitor enclosure",(0,0,0),(102,11,62),alloy,4.4)
monitor("Bonded bezel",(0,-5.7,0),(99,2.8,59),black,1.35)
monitor("Optical screen",(0,-7.2,0),(94,.9,53),screen,.43)
for z,m in [(10,steel),(-8,red)]:
    monitor("I/O bezel",(51,0,z),(1.4,6,13),m,.65)
    monitor("Recessed port",(51.8,0,z),(.4,3.8,9),black,.2)
for x in range(-36,39,6): monitor("Rear cooling flute",(x,5.7,-15),(3,1,13),black,.5)
cable("Monitor lead",[(1,-43,202),(9,-43,198),(30,-31,191),(44,-14,168),(44,5,145),(47,12,138)],1.55)

# Save editable components, then batch static surfaces by assembly for delivery.
objects=list(scene.objects)
root=bpy.data.objects.new("Avaris | tripod mount",None); scene.collection.objects.link(root)
root.scale=(.001,)*3
for o in objects: o.parent=root
scene.unit_settings.system="METRIC"
scene.render.fps=24
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"Avaris Cinema.blend"),compress=True)
bpy.ops.object.select_all(action="DESELECT")
for name in sorted({o["assembly"] for o in objects}):
    group=[o for o in scene.objects if o.get("assembly")==name]
    for o in group: o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    bpy.context.object.name=name
    bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=str(OUT/"avaris-cinema.glb"),export_yup=True,export_texcoords=True)

# Fixed fluid head and twin-tube legs. Z=0 is the underside of the camera shoe.
section="Fixed studio tripod"
cast=material("Black cast magnesium",(.012,.013,.014),.57,.37)
tube=material("Black satin leg tubing",(.013,.014,.016),.83,.29)
box("Sliding head saddle",(0,0,-2.5),(91,45,5),alloy,2)
box("Tilt cradle",(0,0,-8),(63,43,10),cast,4)
ring("Transverse tilt drum",(0,0,-21),21,51,cast,"Y")
for side in (-1,1):
    ring("Tilt bearing shoulder",(0,side*25,-21),19,4,alloy,"Y")
    ring("Drag dial outer lip",(0,side*28,-21),14.7,4,cast,"Y")
    ring("Drag dial inset",(0,side*30,-21),11.7,1.4,panel,"Y")
    ring("Drag dial face",(0,side*31,-21),9.7,1.3,alloy,"Y")
    for x in (-15,15): fastener((x,side*23,-9),"Y",1.2)
lathe("Tapered fluid-head body",(0,0,0),[
    (-52,18),(-50,21),(-44,23),(-36,25),(-30,27),(-24,27),
    (-22,24),(-22,1),(-52,1)],cast,"Z")
ring("Pan drum",(0,0,-55),27,8,alloy,"Z")
ring("Pan bearing trim",(0,0,-59),28,2.1,red,"Z")
ring("Pan lock collar",(0,0,-64),27.5,8.5,cast,"Z",steps=192,teeth=48)
ring("Pan skirt",(0,0,-70),28,4,rubber,"Z")
lathe("Tripod spider",(0,0,0),[(-87,21),(-85,25),(-77,27),(-73,25),
    (-72,22),(-72,1),(-87,1)],cast,"Z")

def shaft(name,start,end,radius,mat):
    delta=end-start
    part=ring(name,(start+end)*.5,radius,delta.length,mat,steps=32)
    part.rotation_mode="QUATERNION"
    part.rotation_quaternion=delta.to_track_quat("X","Z")
    return part

for index in range(3):
    a=math.radians(4+120*index)
    radial=Vector((math.cos(a),math.sin(a),0))
    across=Vector((-math.sin(a),math.cos(a),0))
    down=Vector((0,0,-1))
    pivot=radial*27+down*84
    direction=(radial*.39+down).normalized()
    shaft("Leg hinge barrel",pivot-across*12,pivot+across*12,7.3,cast)
    for sign in (-1,1):
        tip=pivot+across*(sign*13)
        shaft("Hinge axle cap",tip,tip+across*sign*1.8,5,alloy)
        shaft("Recessed hinge pin",tip+across*sign*1.8,tip+across*sign*2.3,2.3,black)
        upper=pivot+across*(sign*6.6)
        shaft("Twin upper leg tube",upper,upper+direction*376,5.6,tube)
    for distance in (22,343,375):
        clamp=box("Twin-tube bridge",pivot+direction*distance,(13,26,13),cast,3)
        clamp.rotation_euler.z=a
    shaft("Telescoping lower leg",pivot+direction*367,pivot+direction*890,6.5,tube)
    shaft("Rubber foot",pivot+direction*883,pivot+direction*902,9,rubber)

stand_parts=[o for o in scene.objects if o.get("assembly")==section]
stand_root=bpy.data.objects.new("Fixed tripod",None)
scene.collection.objects.link(stand_root)
stand_root.scale=(.001,)*3
for part in stand_parts:
    part.parent=stand_root
    part.select_set(True)
bpy.context.view_layer.objects.active=stand_parts[0]
bpy.ops.object.convert(target="MESH")
bpy.ops.object.join()
stand=bpy.context.object
stand.name="Fluid head and twin-tube legs"
bpy.ops.export_scene.gltf(filepath=str(OUT/"avaris-camera-tripod.glb"),export_yup=True)
stand.hide_render=True

# Studio proof from the exported geometry, with broad strip reflections.
def aim(o,at): o.rotation_euler=(Vector(at)-o.location).to_track_quat("-Z","Y").to_euler()
def light(name,loc,size,power,color):
    d=bpy.data.lights.new(name,"AREA");d.energy=power;d.shape="DISK";d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;aim(o,(0,0,.11))
scene.world=bpy.data.worlds.new("Slate studio");scene.world.color=(.23,.24,.27)
light("Softbox",(-.4,-.3,.55),.35,8,(1,.95,.92))
light("Overhead strip",(.25,.2,.43),.29,11,(.78,.85,1))
light("Left edge",(-.35,.24,.2),.16,4,(.92,.92,1))
light("Front bounce",(.12,-.45,.17),.28,1.1,(.88,.91,1))
box("Studio floor",(0,0,-.009),(200,200,.017),material("Studio grey",(.20,.22,.25),0,.64),0)
d=bpy.data.cameras.new("Product proof");cam=bpy.data.objects.new("Product proof",d);scene.collection.objects.link(cam)
scene.camera=cam;d.type="ORTHO";d.ortho_scale=.41;d.clip_start=.001
scene.render.engine="CYCLES";scene.cycles.samples=14;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=820;scene.render.resolution_percentage=100
for name,eye in [("three-quarter",(-.78,-.61,.185)),("side",(-.04,-.92,.20))]:
    cam.location=eye;aim(cam,(-.034,0,.124))
    scene.render.filepath=str(OUT/("avaris-"+name+".jpg"));scene.render.image_settings.file_format="JPEG"
    bpy.ops.render.render(write_still=True)

