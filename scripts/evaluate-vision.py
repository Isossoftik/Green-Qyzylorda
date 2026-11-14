"""Measure the frozen real-photo set using the application's persistent CPU worker."""
import hashlib,json,statistics,subprocess,sys,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=root/"tests/vision-data"
rows=json.loads((data/"manifest.json").read_text(encoding="utf8"))
start=time.perf_counter()
with subprocess.Popen([sys.executable,"-I","-u",str(root/"scripts/local-vision.py"),str(root/".tools/vision")],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,encoding="utf8") as proc:
    ready=json.loads(proc.stdout.readline())
    load_ms=round((time.perf_counter()-start)*1000)
    matrix=[[0]*5 for _ in range(5)]
    predictions=[]
    for row in rows:
        file=data/row["file"]
        assert hashlib.sha256(file.read_bytes()).hexdigest()==row["sha256"]
        proc.stdin.write(json.dumps({"file":str(file)})+"\n");proc.stdin.flush()
        result=json.loads(proc.stdout.readline())
        matrix[row["label"]][result["index"]]+=1
        predictions.append({"file":row["file"],"actual":row["label"],"predicted":result["index"],"ms":result["ms"]})
    peak=None
    if sys.platform=="win32":
        peak=int(subprocess.check_output(["powershell","-NoProfile","-Command",f"(Get-Process -Id {proc.pid}).PeakWorkingSet64"]).strip())
    proc.stdin.close()
correct=sum(matrix[i][i] for i in range(5))
report={**ready,"load_ms":load_ms,"worker_peak_bytes":peak,"correct":correct,"count":len(rows),"accuracy":correct/len(rows),"median_ms":statistics.median(r["ms"] for r in predictions),"confusion":matrix,"photos":predictions}
print(json.dumps(report,indent=2))
(data/"results.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf8")
