"""parity_check.py — prove python/gable_core.py matches web/core.js.

Reads test/_parity.json (written by `node test/parity.mjs`), recomputes every
metric with the python core, and compares. Run from TOOLS/gable-studio/:
    node test/parity.mjs && python3 test/parity_check.py
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))
import gable_core as gc  # noqa: E402

ABS_TOL = 1e-6
REL_TOL = 1e-9

data = json.load(open(os.path.join(HERE, "_parity.json")))
worst = {"key": None, "case": None, "abs": 0.0, "rel": 0.0, "js": None, "py": None}
fails = 0
checks = 0

for case in data:
    _, m = gc.analyze(case["params"], case["site"])
    for k, jval in case["metrics"].items():
        checks += 1
        pval = m[k]
        diff = abs(pval - jval)
        rel = diff / (abs(jval) + 1e-12)
        if diff > worst["abs"]:
            worst = {"key": k, "case": case["name"], "abs": diff, "rel": rel, "js": jval, "py": pval}
        if diff > ABS_TOL and rel > REL_TOL:
            fails += 1
            print(f"  MISMATCH  {case['name']:>16}  {k:<20}  js={jval!r}  py={pval!r}  d={diff:.2e}")

print(f"\nchecked {checks} metric values across {len(data)} cases")
print(f"worst delta: {worst['key']} ({worst['case']})  abs={worst['abs']:.2e}  rel={worst['rel']:.2e}")
if fails:
    print(f"\nPARITY FAILED: {fails} mismatch(es) beyond tol (abs>{ABS_TOL}, rel>{REL_TOL})")
    sys.exit(1)
print("\nPARITY OK — python core matches JS core within tolerance.")
