# run_rhinocommon.py — paste into the Rhino 8 ScriptEditor (Tools > Script,
# python 3) and Run. Builds the massing on tidy layers, labels it with the live
# metrics, evaluates your rules, and prints the report to the command line.
#
# SETUP: this needs gable_core.py + params.json (+ ruleset.json) from your export
# bundle. Either SAVE this script into that unzipped folder, or set BUNDLE_DIR
# below to its path. The maths come straight from gable_core, so Rhino agrees
# with the browser by construction.
#
# Layers baked: Plinth / Room / Roof / Apertures / Report  (the web app re-imports
# Plinth/Room/Roof to recover parameters).

import os
import sys
import json

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


def _w(sx, sy, sz, rot, north, cx=0.0, cy=0.0):
    x, y, _ = gc.rotZ([sx, sy, 0], rot)
    wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
    return (wx, wy, sz)


def main():
    bundle = _load("params.json", "params.example.json")
    ruleset = _load("ruleset.json", "ruleset.example.json")
    P, site = bundle["params"], bundle["site"]
    model, metrics = gc.analyze(P, site)
    north = model["north"]

    rs.EnableRedraw(False)
    L = {n: _layer(n, c) for n, c in [
        ("Plinth", (138, 127, 109)), ("Room", (210, 205, 190)),
        ("Roof", (201, 183, 156)), ("Apertures", (47, 109, 122)), ("Report", (40, 40, 40))]}

    # plinth + room as boxes (8 corners each)
    def box(layer, w, d, z0, z1, rot, cx=0.0, cy=0.0):
        hw, hd = w / 2.0, d / 2.0
        c = [_w(-hw, -hd, z0, rot, north, cx, cy), _w(hw, -hd, z0, rot, north, cx, cy),
             _w(hw, hd, z0, rot, north, cx, cy), _w(-hw, hd, z0, rot, north, cx, cy),
             _w(-hw, -hd, z1, rot, north, cx, cy), _w(hw, -hd, z1, rot, north, cx, cy),
             _w(hw, hd, z1, rot, north, cx, cy), _w(-hw, hd, z1, rot, north, cx, cy)]
        oid = rs.AddBox(c)
        rs.ObjectLayer(oid, layer)
        return oid

    box("Plinth", P["Wp"], P["Dp"], 0, P["Hp"], P["Rp"])
    box("Room", P["Wr"], P["Dr"], P["Hp"], P["Hp"] + P["Hr"], P["Rr"], P["cx"], P["cy"])

    # roof: two planar slopes meeting at the ridge (ridge along local Y)
    wrf, drf = P["Wroof"] / 2.0, P["Droof"] / 2.0
    eave, ridge = P["Hp"] + P["Hr"], P["Hp"] + P["Hr"] + P["Hg"]
    A = [_w(-wrf, -drf, eave, P["Rg"], north, P["cx"], P["cy"]), _w(-wrf, drf, eave, P["Rg"], north, P["cx"], P["cy"]),
         _w(0, drf, ridge, P["Rg"], north, P["cx"], P["cy"]), _w(0, -drf, ridge, P["Rg"], north, P["cx"], P["cy"])]
    B = [_w(0, -drf, ridge, P["Rg"], north, P["cx"], P["cy"]), _w(0, drf, ridge, P["Rg"], north, P["cx"], P["cy"]),
         _w(wrf, drf, eave, P["Rg"], north, P["cx"], P["cy"]), _w(wrf, -drf, eave, P["Rg"], north, P["cx"], P["cy"])]
    for quad in (A, B):
        sid = rs.AddSrfPt(quad)
        if sid:
            rs.ObjectLayer(sid, "Roof")

    # apertures as rectangles on their host faces
    for ap in model["apertures"]:
        f = model["frames"][ap["host"]]
        hu = gc.scale(f["uAxis"], ap["w"] / 2.0)
        hv = gc.scale(f["vAxis"], ap["h"] / 2.0)
        c0 = gc.add(ap["c"], gc.scale(f["n"], 0.03))
        cs = [gc.add(gc.add(c0, gc.scale(hu, -1)), gc.scale(hv, -1)),
              gc.add(gc.add(c0, hu), gc.scale(hv, -1)),
              gc.add(gc.add(c0, hu), hv),
              gc.add(gc.add(c0, gc.scale(hu, -1)), hv)]
        cid = rs.AddPolyline([tuple(p) for p in cs] + [tuple(cs[0])])
        rs.ObjectLayer(cid, "Apertures")

    # rules + labels
    vars = gc.flatten(P, metrics)
    ev = gc.evaluate_ruleset(ruleset, vars)
    top = _w(0, 0, P["Hp"] + P["Hr"] + P["Hg"] + 1.0, 0, north, P["cx"], P["cy"])
    dot = rs.AddTextDot("score %d%% (%d/%d)" % (round(ev["score"] * 100), ev["passCount"], ev["total"]), top)
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
        print("  [%s] %-20s %-8s %s   value=%s%s" % (
            "PASS" if res["ok"] else "FAIL", r["lhs"], r["op"], r["rhs"], val,
            " (hard)" if r.get("hard") else ""))
    print("\nSCORE %d%%  ·  %d/%d  ·  %s" % (
        round(ev["score"] * 100), ev["passCount"], ev["total"],
        "ALL HARD RULES PASS" if ev["hardPass"] else "A HARD RULE FAILS"))


main()
