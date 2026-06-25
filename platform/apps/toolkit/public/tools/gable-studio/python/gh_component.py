# gh_component.py — body for a Grasshopper "Script" (python 3) component in
# Rhino 8. Outputs the v2 massing geometry plus every metric and each rule's
# pass/fail, so you can wire constraints straight into a Grasshopper definition.
#
# COMPONENT INPUTS (right-click each input > set type):
#   bundle   (Text, item)  : path to your unzipped gable-studio-export folder
#                            (must contain gable_core.py + params.json + ruleset.json)
#
# COMPONENT OUTPUTS (rename to match):
#   geo      : list of Breps  (plinth slab, 4 walls, 2 roof slopes)
#   apert    : list of Curves — aperture outlines
#   report   : Text — metric + rule report
#   score    : Number — weighted score 0..1
#   passed   : Boolean — all hard rules pass?
#   names    : list of Text — metric names    (parallel to `values`)
#   values   : list of Number — metric values
#
# The maths come from gable_core.py (same as the browser), so Grasshopper agrees
# with the web app by construction.

import os
import sys
import json
import math
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


_b = _load("params.json", "params.example.json")
_rs = _load("ruleset.json", "ruleset.example.json")
P, site = _b["params"], _b["site"]
model, metrics = gc.analyze(P, site)
north = model["north"]
G = model["roofGeom"]


def W(lx, ly, lz, R, cx=0.0, cy=0.0):
    x, y, _ = gc.rotZ([lx, ly, 0], R)
    wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
    return rg.Point3d(wx, wy, lz)


def box(Wd, Ld, zb, zt, R, cx=0.0, cy=0.0):
    c = [(-Wd / 2, -Ld / 2), (Wd / 2, -Ld / 2), (Wd / 2, Ld / 2), (-Wd / 2, Ld / 2)]
    pts = [W(x, y, zb, R, cx, cy) for x, y in c] + [W(x, y, zt, R, cx, cy) for x, y in c]
    return rg.Brep.CreateFromBox(pts)


Pl, Wl, Rf = P["plinth"], P["walls"], P["roof"]
geo = [box(Pl["W"], Pl["L"], -Pl["t"], 0, Pl["R"], Pl["cx"], Pl["cy"])]

hw, hl, tw = Wl["W"] / 2, Wl["L"] / 2, Wl["wt"]
for (x0, x1, y0, y1) in [(hw - tw, hw, -hl, hl), (-hw, -hw + tw, -hl, hl), (-hw, hw, hl - tw, hl), (-hw, hw, -hl, -hl + tw)]:
    c = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pts = [W(x, y, 0, Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c] + [W(x, y, Wl["h"], Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c]
    geo.append(rg.Brep.CreateFromBox(pts))


def slope(eaveX, ridgeX, eaveZ, nx):
    k = math.hypot(nx, 1.0) or 1.0
    nl = (nx / k, 0.0, 1.0 / k)
    top = [(eaveX, -Rf["L"] / 2, eaveZ), (ridgeX, -Rf["L"] / 2, G["zRidge"]), (ridgeX, Rf["L"] / 2, G["zRidge"]), (eaveX, Rf["L"] / 2, eaveZ)]
    bot = [(x - nl[0] * Rf["t"], y, z - nl[2] * Rf["t"]) for (x, y, z) in top]
    pts = [W(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in bot] + [W(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in top]
    return rg.Brep.CreateFromBox(pts)


geo.append(slope(-Rf["W"] / 2, G["ridgeX"], G["eaveZL"], -math.tan(math.radians(Rf["pitchL"]))))
geo.append(slope(Rf["W"] / 2, G["ridgeX"], G["eaveZR"], math.tan(math.radians(Rf["pitchR"]))))
geo = [g for g in geo if g]

apert = []
for ap in model["apertures"]:
    f = model["frames"][ap["host"]]
    hu = gc.scale(f["uAxis"], ap["w"] / 2.0)
    hv = gc.scale(f["vAxis"], ap["h"] / 2.0)
    c0 = gc.add(ap["c"], gc.scale(f["n"], 0.03))
    cs = [gc.add(gc.add(c0, gc.scale(hu, -1)), gc.scale(hv, -1)), gc.add(gc.add(c0, hu), gc.scale(hv, -1)),
          gc.add(gc.add(c0, hu), hv), gc.add(gc.add(c0, gc.scale(hu, -1)), hv)]
    pl = rg.Polyline([rg.Point3d(*p) for p in cs] + [rg.Point3d(*cs[0])])
    apert.append(pl.ToNurbsCurve())

vars = gc.flatten(P, metrics)
ev = gc.evaluate_ruleset(_rs, vars)
names = sorted(metrics.keys())
values = [metrics[k] for k in names]
score = ev["score"]
passed = ev["hardPass"]

lines = ["GABLE STUDIO (Grasshopper) — %s" % _rs.get("name", "ruleset")]
for res in ev["results"]:
    r = res["rule"]
    val = "-" if res["value"] is None else "%.3f" % res["value"]
    lines.append("[%s] %s %s %s  value=%s%s" % ("PASS" if res["ok"] else "FAIL", r["lhs"], r["op"], r["rhs"], val, " (hard)" if r.get("hard") else ""))
lines.append("SCORE %d%%  %d/%d  %s" % (round(score * 100), ev["passCount"], ev["total"], "ALL HARD RULES PASS" if passed else "A HARD RULE FAILS"))
report = "\n".join(lines)
