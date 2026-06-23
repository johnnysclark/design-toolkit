# gh_component.py — body for a Grasshopper "Script" (python 3) component in
# Rhino 8. It outputs the massing geometry plus every metric and each rule's
# pass/fail, so you can wire constraints straight into a Grasshopper definition.
#
# COMPONENT INPUTS (right-click each input > set type; or zoom-in + rename):
#   bundle   (Text, item)  : path to your unzipped gable-studio-export folder
#                            (must contain gable_core.py + params.json + ruleset.json)
#
# COMPONENT OUTPUTS (rename the output params to match):
#   geo      : list of Breps  (plinth, room, roof) — the massing
#   apert    : list of Curves — aperture outlines
#   report   : Text — the metric + rule report
#   score    : Number — weighted score 0..1
#   passed   : Boolean — all hard rules pass?
#   names    : list of Text — metric names
#   values   : list of Number — metric values (parallel to names)
#
# The maths come from gable_core.py (same as the browser), so Grasshopper agrees
# with the web app by construction.

import os
import sys
import json
import Rhino.Geometry as rg

base = bundle if ("bundle" in globals() and bundle) else os.getcwd()
sys.path.insert(0, base)
import gable_core as gc


def _load(name, fallback):
    p = os.path.join(base, name)
    if not os.path.exists(p):
        p = os.path.join(base, fallback)
    with open(p) as f:
        return json.load(f)


def _pt(sx, sy, sz, rot, north, cx=0.0, cy=0.0):
    x, y, _ = gc.rotZ([sx, sy, 0], rot)
    wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
    return rg.Point3d(wx, wy, sz)


def _box(w, d, z0, z1, rot, north, cx=0.0, cy=0.0):
    hw, hd = w / 2.0, d / 2.0
    pts = [_pt(-hw, -hd, z0, rot, north, cx, cy), _pt(hw, -hd, z0, rot, north, cx, cy),
           _pt(hw, hd, z0, rot, north, cx, cy), _pt(-hw, hd, z0, rot, north, cx, cy),
           _pt(-hw, -hd, z1, rot, north, cx, cy), _pt(hw, -hd, z1, rot, north, cx, cy),
           _pt(hw, hd, z1, rot, north, cx, cy), _pt(-hw, hd, z1, rot, north, cx, cy)]
    return rg.Brep.CreateFromBox(pts)


_b = _load("params.json", "params.example.json")
_rs = _load("ruleset.json", "ruleset.example.json")
P, site = _b["params"], _b["site"]
model, metrics = gc.analyze(P, site)
north = model["north"]

# geometry
geo = [_box(P["Wp"], P["Dp"], 0, P["Hp"], P["Rp"], north),
       _box(P["Wr"], P["Dr"], P["Hp"], P["Hp"] + P["Hr"], P["Rr"], north, P["cx"], P["cy"])]
wrf, drf = P["Wroof"] / 2.0, P["Droof"] / 2.0
eave, ridge = P["Hp"] + P["Hr"], P["Hp"] + P["Hr"] + P["Hg"]
for quad in (
    [_pt(-wrf, -drf, eave, P["Rg"], north, P["cx"], P["cy"]), _pt(-wrf, drf, eave, P["Rg"], north, P["cx"], P["cy"]),
     _pt(0, drf, ridge, P["Rg"], north, P["cx"], P["cy"]), _pt(0, -drf, ridge, P["Rg"], north, P["cx"], P["cy"])],
    [_pt(0, -drf, ridge, P["Rg"], north, P["cx"], P["cy"]), _pt(0, drf, ridge, P["Rg"], north, P["cx"], P["cy"]),
     _pt(wrf, drf, eave, P["Rg"], north, P["cx"], P["cy"]), _pt(wrf, -drf, eave, P["Rg"], north, P["cx"], P["cy"])]):
    srf = rg.Brep.CreateFromCornerPoints(quad[0], quad[1], quad[2], quad[3], 1e-6)
    if srf:
        geo.append(srf)

# apertures as outline curves
apert = []
for ap in model["apertures"]:
    f = model["frames"][ap["host"]]
    hu = gc.scale(f["uAxis"], ap["w"] / 2.0)
    hv = gc.scale(f["vAxis"], ap["h"] / 2.0)
    c0 = gc.add(ap["c"], gc.scale(f["n"], 0.03))
    cs = [gc.add(gc.add(c0, gc.scale(hu, -1)), gc.scale(hv, -1)),
          gc.add(gc.add(c0, hu), gc.scale(hv, -1)),
          gc.add(gc.add(c0, hu), hv),
          gc.add(gc.add(c0, gc.scale(hu, -1)), hv)]
    pl = rg.Polyline([rg.Point3d(*p) for p in cs] + [rg.Point3d(*cs[0])])
    apert.append(pl.ToNurbsCurve())

# rules
vars = gc.flatten(P, metrics)
ev = gc.evaluate_ruleset(ruleset=_rs, vars=vars)
names = sorted(metrics.keys())
values = [metrics[k] for k in names]
score = ev["score"]
passed = ev["hardPass"]

lines = ["GABLE STUDIO (Grasshopper) — %s" % _rs.get("name", "ruleset")]
for res in ev["results"]:
    r = res["rule"]
    val = "-" if res["value"] is None else "%.3f" % res["value"]
    lines.append("[%s] %s %s %s  value=%s%s" % (
        "PASS" if res["ok"] else "FAIL", r["lhs"], r["op"], r["rhs"], val,
        " (hard)" if r.get("hard") else ""))
lines.append("SCORE %d%%  %d/%d  %s" % (
    round(score * 100), ev["passCount"], ev["total"],
    "ALL HARD RULES PASS" if passed else "A HARD RULE FAILS"))
report = "\n".join(lines)
