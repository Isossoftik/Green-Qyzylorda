"""Download only missing pinned weights. Run from the project root."""
import hashlib
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import runpy
settings=runpy.run_path(str(ROOT/"scripts/local-vision.py"))
folder=ROOT/".tools/vision"
folder.mkdir(parents=True,exist_ok=True)
for name,checksum in settings["FILES"].items():
    dest=folder/name
    def digest(file):
        with file.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
    if dest.exists() and digest(dest)==checksum:continue
    remote="onnx/model_quantized.onnx" if name=="model.onnx" else name
    tmp=dest.with_suffix(".download")
    url=f"https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/{settings['REVISION']}/{remote}"
    subprocess.run(["curl","--fail","--location","--retry","2",url,"-o",str(tmp)],check=True)
    if digest(tmp)!=checksum:raise ValueError("Checksum mismatch: "+name)
    tmp.replace(dest)
(folder/"python-path.txt").write_text(sys.executable,encoding="utf8")
print("Verified:", folder)
