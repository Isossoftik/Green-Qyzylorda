"""Rebuild the bundled OpenStreetMap excerpt with Pillow and mapbox-vector-tile."""
import concurrent.futures
import gzip
import json
import math
import subprocess
from pathlib import Path

import mapbox_vector_tile
from PIL import Image, ImageDraw

zoom = 13
scale = 512
lat, lon = 44.844, 65.496
x = (lon + 180) / 360 * 2**zoom
y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**zoom
left, top = int(x) - 2, int(y) - 2
size = 5
def fetch(url):
    return subprocess.check_output(["curl", "-fsSL", "--retry", "3", url])
url = json.loads(fetch("https://tiles.openfreemap.org/planet"))["tiles"][0]
canvas = Image.new("RGB", (size * scale, size * scale), "#172833")

def tile_at(pos):
    col, row = pos
    data = fetch(url.format(z=zoom, x=col+left, y=row+top))
    if data.startswith(b"\x1f\x8b"):
        data = gzip.decompress(data)
    layers = mapbox_vector_tile.decode(data, default_options={"y_coord_down": True})
    tile = Image.new("RGB", (scale, scale), "#182832")
    draw = ImageDraw.Draw(tile)
    for name in ["landuse", "landcover", "park", "water", "waterway", "building", "transportation"]:
        layer = layers.get(name, {})
        for feature in layer.get("features", []):
            prop = feature["properties"]
            road = prop.get("class", "")
            color = {"landuse":"#20313a","landcover":"#1c3834","park":"#1e4037","water":"#234c61","waterway":"#275165","building":"#283a44","transportation":"#354853"}[name]
            width = 1
            if road in ["primary","trunk","motorway","secondary"]:
                color, width = "#51616a", 3
            elif road in ["minor","tertiary"]:
                color, width = "#40515d", 2
            geom = feature["geometry"]
            typ, parts = geom["type"], geom["coordinates"]
            if typ in ["Polygon","LineString"]:
                parts = [parts]
            for part in parts:
                if typ in ["Polygon","MultiPolygon"]:
                    part = part[0]
                elif typ not in ["LineString","MultiLineString"]:
                    continue
                pts = [(int(p[0]*scale/layer["extent"]),int(p[1]*scale/layer["extent"])) for p in part]
                if len(pts)>2 and "Polygon" in typ:
                    draw.polygon(pts,fill=color)
                elif len(pts)>1:
                    draw.line(pts,fill=color,width=width)
    return pos, tile

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for (c,r), tile in pool.map(tile_at, [(c,r) for r in range(size) for c in range(size)]):
        canvas.paste(tile,(c*scale,r*scale))
public = Path(__file__).resolve().parents[1] / "public"
public.mkdir(exist_ok=True)
canvas.save(public/"qyzylorda.webp",quality=90)
def coord(c,r):
    return [math.degrees(math.atan(math.sinh(math.pi*(1-2*r/2**zoom)))),c/2**zoom*360-180]
(public/"map-bounds.json").write_text(json.dumps([coord(left,top+size),coord(left+size,top)]))


