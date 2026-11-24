"""Mount the new camera on the supplied tripod, retaining its compressed textures."""
import json
import struct
from pathlib import Path

folder = Path(__file__).resolve().parent


def read_glb(path):
    data = path.read_bytes()
    length = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20+length]), data[28+length:]


rig, base = read_glb(folder.parent/"public/assets/tripod.glb")
cam, payload = read_glb(folder/"avaris-cinema.glb")
tables = ("bufferViews","accessors","samplers","images","textures","materials","meshes","nodes")
offset = {key:len(rig[key]) for key in tables}
for v in cam["bufferViews"]:
    v["byteOffset"] = len(base) + v.get("byteOffset",0)
for a in cam["accessors"]:
    a["bufferView"] += offset["bufferViews"]
for img in cam["images"]:
    img["bufferView"] += offset["bufferViews"]
for tex in cam["textures"]:
    tex["source"] += offset["images"]
    if "sampler" in tex: tex["sampler"] += offset["samplers"]
for mat in cam["materials"]:
    for fields in (mat,mat["pbrMetallicRoughness"]):
        for key,tex in fields.items():
            if key.endswith("Texture"): tex["index"] += offset["textures"]
for mesh in cam["meshes"]:
    for p in mesh["primitives"]:
        p["material"] += offset["materials"]
        p["indices"] += offset["accessors"]
        for k in p["attributes"]: p["attributes"][k] += offset["accessors"]
for node in cam["nodes"]:
    if "mesh" in node: node["mesh"] += offset["meshes"]
    if "children" in node: node["children"] = [idx+offset["nodes"] for idx in node["children"]]

# Centre of top plate measured from the decoded tripod vertices in metres.
root = cam["scenes"][cam["scene"]]["nodes"][0]
cam["nodes"][root]["translation"] = [0,1.38499999,.00003706]
rig["scenes"][rig["scene"]]["nodes"].append(root+offset["nodes"])
for key in tables: rig[key].extend(cam[key])
for key in ("extensionsUsed","extensionsRequired"):
    rig[key]=sorted(set(rig.get(key,[])) | set(cam.get(key,[])))
binary = base + payload
rig["buffers"][0]["byteLength"] = len(binary)
header = json.dumps(rig,separators=(",",":")).encode()
header += b" "*(-len(header)%4)
out = struct.pack("<4sIII4s",b"glTF",2,28+len(header)+len(binary),len(header),b"JSON")
out += header + struct.pack("<I4s",len(binary),b"BIN\0") + binary
(folder/"avaris-camera-tripod.glb").write_bytes(out)
