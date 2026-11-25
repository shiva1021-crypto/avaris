"""Convert the supplied Mixamo FBX into a web-ready GLB for the digital scene.

Run with the local Blender-enabled Python environment:
    C:\\Users\\ACTIVE\\AppData\\Local\\Temp\\avaris-model-env\\Scripts\\python.exe scripts/convert_character.py

The original FBX is never modified. The idle action, armature, skin weights and mesh silhouette
are preserved; only embedded texture resolution and encoding are reduced.
"""

import json
import os

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "Breathing Idle.fbx")
OUTPUT = os.path.join(
    ROOT, "public", "assets", "digital-marketing", "character", "mybi-idle-character.glb"
)
REPORT = os.path.join(ROOT, "public", "assets", "digital-marketing", "character", "conversion-report.json")

# Texture budget: body colour stays at 2048px for silhouette/clothing detail;
# supporting maps are reduced where they have little visible impact at scene scale.
TEXTURE_SIZES = {
    "file9": 2048,     # body base colour: kept at 2048 for skin/clothing detail
    "file3": 1024,     # normal map: does not affect silhouette, halve to save ~500 KB
    "file4": 512,      # specular IOR level: almost flat, tiny at 512
    "file5": 1024,     # roughness
    "file6": 1024,     # hair base colour with alpha hair cards: dominant size driver
    "file6.001": 1024, # unused alternate
    "file6.002": 1024, # unused alternate
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def main():
    if not os.path.exists(SOURCE):
        raise SystemExit("Missing source FBX: " + SOURCE)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

    clear_scene()
    bpy.ops.import_scene.fbx(filepath=SOURCE, use_custom_normals=True)

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 299
    scene.render.fps = 30

    armature = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE")
    action = armature.animation_data.action

    original = {}
    for image in bpy.data.images:
        if image.size[0] == 0:
            continue
        original[image.name] = list(image.size)
        target = TEXTURE_SIZES.get(image.name, 1024)
        if image.size[0] > target or image.size[1] > target:
            image.scale(target, target)

    # Preserve alpha on the hair cards: WebP is supported by three.js GLTFLoader
    # through EXT_texture_webp and keeps transparency without a PNG-sized file.
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        export_image_format="WEBP",
        export_image_quality=85,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=True,
        export_frame_step=1,
        export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=True,
        export_yup=True,
        export_apply=False,
        export_unused_images=False,
        export_cameras=False,
        export_lights=False,
    )

    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    report = {
        "source": os.path.relpath(SOURCE, ROOT).replace("\\", "/"),
        "output": os.path.relpath(OUTPUT, ROOT).replace("\\", "/"),
        "source_bytes": os.path.getsize(SOURCE),
        "output_bytes": os.path.getsize(OUTPUT),
        "animation_action": action.name,
        "animation_frames": [int(action.frame_range[0]), int(action.frame_range[1])],
        "fps": scene.render.fps,
        "armature_bones": len(armature.data.bones),
        "mesh_objects": [obj.name for obj in mesh_objects],
        "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
        "polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
        "textures": {
            name: {"original": size, "exported": list(bpy.data.images[name].size)}
            for name, size in original.items()
            if name in bpy.data.images
        },
    }
    with open(REPORT, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
