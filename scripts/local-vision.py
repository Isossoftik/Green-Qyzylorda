"""Persistent CPU-only CLIP inference over JSON lines on standard input/output."""
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

REVISION = "6b7c523703ae26e39be4b03774966f8571c7f523"
MODEL = "CLIP ViT-B/32 INT8 · " + REVISION[:12]
FILES = {"model.onnx": "0898a3facfdb27f0a041e57649b4989cfd094e4a0040d6ae75ed69917dfc7328",
         "tokenizer.json": "f7f3b7af117d467b58374797691a6438d3e6b9e9cef800dfd5dced7f697a90cd"}
PROMPTS = ["a photo of a dried out dead tree", "a photo of a damaged tree with broken branches or trunk",
           "a photo of litter and garbage on the ground", "a photo of damaged urban landscaping",
           "an unrelated scene or no clearly visible environmental problem"]
MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)


def text_inputs(folder):
    # Inputs are fixed lower-case English prompts, so byte encoding is ASCII identity.
    model = json.loads((folder / "tokenizer.json").read_text(encoding="utf8"))["model"]
    vocab = model["vocab"]
    ranks = {tuple(pair.split()): i for i, pair in enumerate(model["merges"])}
    def encode(word):
        symbols = list(word)
        symbols[-1] += "</w>"
        while len(symbols) > 1:
            pairs = list(zip(symbols, symbols[1:]))
            best = min(pairs, key=lambda p: ranks.get(p, float("inf")))
            if best not in ranks:
                break
            merged = []
            i = 0
            while i < len(symbols):
                if tuple(symbols[i:i+2]) == best:
                    merged.append("".join(best))
                    i += 2
                else:
                    merged.append(symbols[i])
                    i += 1
            symbols = merged
        return [vocab[s] for s in symbols]
    rows = [[vocab["<|startoftext|>"]] + [i for w in p.split() for i in encode(w)] +
            [vocab["<|endoftext|>"]] for p in PROMPTS]
    length = max(map(len, rows))
    ids = np.full((len(rows), length), vocab["<|endoftext|>"], dtype=np.int64)
    mask = np.zeros_like(ids)
    for i,row in enumerate(rows):
        ids[i,:len(row)] = row
        mask[i,:len(row)] = 1
    return {"input_ids":ids,"attention_mask":mask}


def pixels(file):
    with Image.open(file) as src:
        if src.width * src.height > 25_000_000:
            raise ValueError("Too many pixels")
        image = ImageOps.exif_transpose(src).convert("RGB")
        w,h = image.size
        # Crop the central square before resampling for extreme aspect ratios.
        short = min(w,h)
        if max(w,h) > 16*short:
            left,top=(w-short)//2,(h-short)//2
            image=image.crop((left,top,left+short,top+short))
            w,h=image.size
        image=image.resize((224*w//min(w,h),224*h//min(w,h)),Image.Resampling.BICUBIC)
        left,top=(image.width-224)//2,(image.height-224)//2
        image=image.crop((left,top,left+224,top+224))
        array=(np.asarray(image,dtype=np.float32)/255-MEAN)/STD
        return np.ascontiguousarray(array.transpose(2,0,1)[None])


class Classifier:
    def __init__(self,folder):
        for name,expected in FILES.items():
            with (folder/name).open("rb") as f:
                if hashlib.file_digest(f,"sha256").hexdigest()!=expected:
                    raise ValueError("Incompatible model file: "+name)
        opts=ort.SessionOptions()
        opts.intra_op_num_threads=3
        opts.inter_op_num_threads=1
        opts.enable_cpu_mem_arena=False
        opts.add_session_config_entry("session.intra_op.allow_spinning","0")
        self.session=ort.InferenceSession(str(folder/"model.onnx"),opts,providers=["CPUExecutionProvider"])
        self.text=text_inputs(folder)
        if {x.name:x.type for x in self.session.get_inputs()}!={"input_ids":"tensor(int64)","attention_mask":"tensor(int64)","pixel_values":"tensor(float)"}:
            raise ValueError("Unexpected ONNX input signature")
        if "logits_per_image" not in {x.name for x in self.session.get_outputs()}:
            raise ValueError("Missing image logits")

    def analyze(self,file):
        start=time.perf_counter()
        logits=self.session.run(["logits_per_image"],{**self.text,"pixel_values":pixels(file)})[0]
        if logits.shape!=(1,5) or not np.isfinite(logits).all():
            raise ValueError("Invalid model output")
        return {"index":int(logits.argmax()),"ms":round((time.perf_counter()-start)*1000,1),"model":MODEL}


if __name__=="__main__":
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    classifier=Classifier(Path(sys.argv[1]).resolve(strict=True))
    print(json.dumps({"ready":True,"model":MODEL,"provider":"CPUExecutionProvider"}),flush=True)
    for line in sys.stdin:
        try:
            result=classifier.analyze(json.loads(line)["file"])
        except (OSError,ValueError,KeyError,Image.DecompressionBombError):
            result={"error":"Invalid or unreadable image"}
        print(json.dumps(result),flush=True)
