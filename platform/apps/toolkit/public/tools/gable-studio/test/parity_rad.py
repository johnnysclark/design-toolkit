"""parity_rad.py — proves python/radiation.py matches web/radiation.js.

Reads the JS reference (test/_rad_parity.json, written by rad_ref.mjs), rebuilds
the model + recomputes occluded per-surface incident radiation in python, and
checks every value agrees within tolerance. Run AFTER rad_ref.mjs:
    node test/rad_ref.mjs && python3 test/parity_rad.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))
from gable_core import build_model          # noqa: E402
from radiation import incident_by_model      # noqa: E402

ABS_TOL = 1e-6

with open(os.path.join(HERE, "_rad_parity.json")) as fh:
    ref = json.load(fh)

model = build_model(ref["params"], ref["site"])
res = incident_by_model(model, ref["R"])
jref = ref["result"]

fails = 0
worst = 0.0
worst_name = ""


def compare(name, a, b):
    global fails, worst, worst_name
    diff = abs(a - b)
    if diff > worst:
        worst = diff
        worst_name = name
    if diff > ABS_TOL:
        fails += 1
        print("  MISMATCH %-22s js=%.8f py=%.8f diff=%.2e" % (name, a, b, diff))


for i, (jf, pf) in enumerate(zip(jref["faceVals"], res["faceVals"])):
    compare("face[%d] %s" % (i, pf["name"]), jf["kwh"], pf["kwh"])
for i, (ja, pa) in enumerate(zip(jref["apVals"], res["apVals"])):
    compare("ap[%d] %s" % (i, pa["id"]), ja["kwh"], pa["kwh"])
compare("envelopeMean", jref["envelopeMean"], res["envelopeMean"])
compare("glazingMean", jref["glazingMean"], res["glazingMean"])

n = len(res["faceVals"]) + len(res["apVals"]) + 2
print("worst Δ = %.2e at %s" % (worst, worst_name))
if fails:
    print("\nRAD PARITY FAILED: %d mismatch(es) beyond %g" % (fails, ABS_TOL))
    sys.exit(1)
print("RAD PARITY OK — python radiation matches JS within %g across %d values" % (ABS_TOL, n))
