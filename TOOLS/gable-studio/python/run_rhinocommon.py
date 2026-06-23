# run_rhinocommon.py — paste into the Rhino 8 ScriptEditor (Tools > Script,
# python 3) and Run. Builds the v2 massing (plinth SLAB + walls TUBE + two-pitch
# ROOF) on tidy layers, labels it with the live score, evaluates your rules, and
# prints the report.
#
# SETUP: needs gable_core.py + params.json (+ ruleset.json) from your export
# bundle. SAVE this script into that unzipped folder, or set BUNDLE_DIR below.
# Layers: Plinth / Walls / Roof / Apertures / Report (the web app re-imports
# Plinth/Walls/Roof to recover parameters).

import os
import sys
import json
import math

BUNDLE_DIR = r""   # <- set to your unzipped gable-studio-export folder, or save this file into it

import rhinoscriptsyntax as rs  # noqa: E402

_base = BUNDLE_DIR or (os.path.dirname(__file__) if "__file__" in globals() else os.getcwd())
sys.path.insert(0, _base)
import gable_core as gc  # noqa: E402


def _load(name, fallback):
    p = os.path.join(_base, name)
    if not os.path.exists(p):
        p = os.path.join(_base, fallback)
    with open(p) as f:
        return json.load(f)


def _layer(name, rgb):
    if not rs.IsLayer(name):
        rs.AddLayer(name, rgb)
    return name


def main():
    bundle = _load("params.json", "params.example.json")
    ruleset = _load("ruleset.json", "ruleset.example.json")
    P, site = bundle["params"], bundle["site"]
    model, metrics = gc.analyze(P, site)
    north = model["north"]
    G = model["roofGeom"]

    def w(lx, ly, lz, R, cx=0.0, cy=0.0):
        x, y, _ = gc.rotZ([lx, ly, 0], R)
        wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
        return (wx, wy, lz)

    rs.EnableRedraw(False)
    for n, c in [("Plinth", (138, 127, 109)), ("Walls", (210, 205, 190)), ("Roof", (201, 183, 156)), ("Apertures", (47, 109, 122)), ("Report", (40, 40, 40))]:
        _layer(n, c)

    def box(layer, W, L, zb, zt, R, cx=0.0, cy=0.0):
        c = [(-W / 2, -L / 2), (W / 2, -L / 2), (W / 2, L / 2), (-W / 2, L / 2)]
        pts = [w(x, y, zb, R, cx, cy) for x, y in c] + [w(x, y, zt, R, cx, cy) for x, y in c]
        oid = rs.AddBox(pts)
        if oid:
            rs.ObjectLayer(oid, layer)

    Pl, Wl, Rf = P["plinth"], P["walls"], P["roof"]
    box("Plinth", Pl["W"], Pl["L"], -Pl["t"], 0, Pl["R"], Pl["cx"], Pl["cy"])

    hw, hl, tw = Wl["W"] / 2, Wl["L"] / 2, Wl["wt"]
    for (x0, x1, y0, y1) in [(hw - tw, hw, -hl, hl), (-hw, -hw + tw, -hl, hl), (-hw, hw, hl - tw, hl), (-hw, hw, -hl, -hl + tw)]:
        c = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        pts = [w(x, y, 0, Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c] + [w(x, y, Wl["h"], Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c]
        oid = rs.AddBox(pts)
        if oid:
            rs.ObjectLayer(oid, "Walls")

    def slope(eaveX, ridgeX, eaveZ, nx):
        k = math.hypot(nx, 1.0) or 1.0
        nl = (nx / k, 0.0, 1.0 / k)
        top = [(eaveX, -Rf["L"] / 2, eaveZ), (ridgeX, -Rf["L"] / 2, G["zRidge"]), (ridgeX, Rf["L"] / 2, G["zRidge"]), (eaveX, Rf["L"] / 2, eaveZ)]
        bot = [(x - nl[0] * Rf["t"], y, z - nl[2] * Rf["t"]) for (x, y, z) in top]
        pts = [w(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in bot] + [w(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in top]
        oid = rs.AddBox(pts)
        if oid:
            rs.ObjectLayer(oid, "Roof")

    slope(-Rf["W"] / 2, G["ridgeX"], G["eaveZL"], -math.tan(math.radians(Rf["pitchL"])))
    slope(Rf["W"] / 2, G["ridgeX"], G["eaveZR"], math.tan(math.radians(Rf["pitchR"])))

    for ap in model["apertures"]:
        f = model["frames"][ap["host"]]
        hu = gc.scale(f["uAxis"], ap["w"] / 2.0)
        hv = gc.scale(f["vAxis"], ap["h"] / 2.0)
        c0 = gc.add(ap["c"], gc.scale(f["n"], 0.03))
        cs = [gc.add(gc.add(c0, gc.scale(hu, -1)), gc.scale(hv, -1)), gc.add(gc.add(c0, hu), gc.scale(hv, -1)),
              gc.add(gc.add(c0, hu), hv), gc.add(gc.add(c0, gc.scale(hu, -1)), hv)]
        cid = rs.AddPolyline([tuple(p) for p in cs] + [tuple(cs[0])])
        if cid:
            rs.ObjectLayer(cid, "Apertures")

    vars = gc.flatten(P, metrics)
    ev = gc.evaluate_ruleset(ruleset, vars)
    dot = rs.AddTextDot("score %d%% (%d/%d)" % (round(ev["score"] * 100), ev["passCount"], ev["total"]),
                        w(0, 0, Wl["h"] + Rf["ridgeRise"] + 1.0, 0, Wl["cx"], Wl["cy"]))
    rs.ObjectLayer(dot, "Report")
    rs.EnableRedraw(True)

    print("=" * 56)
    print("GABLE STUDIO — Rhino re-run  ·  %s" % ruleset.get("name", "ruleset"))
    print("=" * 56)
    for k in sorted(metrics):
        print("  %-20s %12.4f" % (k, metrics[k]))
    print("\nRULES")
    for res in ev["results"]:
        r = res["rule"]
        val = "—" if res["value"] is None else "%.3f" % res["value"]
        print("  [%s] %-20s %-8s %s   value=%s%s" % ("PASS" if res["ok"] else "FAIL", r["lhs"], r["op"], r["rhs"], val, " (hard)" if r.get("hard") else ""))
    print("\nSCORE %d%%  ·  %d/%d  ·  %s" % (round(ev["score"] * 100), ev["passCount"], ev["total"], "ALL HARD RULES PASS" if ev["hardPass"] else "A HARD RULE FAILS"))


main()
