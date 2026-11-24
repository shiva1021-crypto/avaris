"""Create delivery assets without modifying the supplied originals."""
import io, json, pathlib, struct
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(r'C:\Users\ACTIVE\Downloads\cinema_camera.glb')
data = source.read_bytes()
json_size = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + json_size])
binary = data[28 + json_size:]
images_by_view = {image['bufferView']: i for i, image in enumerate(doc['images'])}
packed = bytearray()
for index, view in enumerate(doc['bufferViews']):
    start = view.get('byteOffset', 0)
    chunk = binary[start:start + view['byteLength']]
    if index in images_by_view:
        image_index = images_by_view[index]
        image = Image.open(io.BytesIO(chunk)).convert('RGB')
        limit = 128 if image_index < 2 else (2048 if image_index in [2, 5, 6, 8] else 1024)
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=88, optimize=True)
        chunk = output.getvalue()
        doc['images'][image_index]['mimeType'] = 'image/jpeg'
    packed.extend(b'\0' * ((-len(packed)) % 4))
    view['byteOffset'] = len(packed)
    view['byteLength'] = len(chunk)
    packed.extend(chunk)
doc['buffers'][0]['byteLength'] = len(packed)
encoded = json.dumps(doc, separators=(',', ':')).encode()
encoded += b' ' * ((-len(encoded)) % 4)
packed.extend(b'\0' * ((-len(packed)) % 4))
glb = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(packed))
glb += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
glb += struct.pack('<II', len(packed), 0x004E4942) + packed
destination = root / 'public/assets/cinema-camera.glb'
destination.write_bytes(glb)
background = root / 'public/assets/studio-background.png'
Image.open(background).save(background.with_suffix('.webp'), quality=94, method=6)
print(f'Camera: {len(data):,} -> {len(glb):,} bytes')
print(f'Background WebP: {background.with_suffix(".webp").stat().st_size:,} bytes')
