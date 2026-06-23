"""run_rhino3dm.py — re-run your Gable Studio constraints in plain python.

No Rhino required for the analysis. Does three things:
  1) recompute every metric from params.json with the SHARED gable_core maths,
  2) PARITY SELF-TEST: compare to the metrics the browser embedded in params.json,
  3) evaluate ruleset.json and print a PASS/FAIL table.
If `rhino3dm` is installed (pip install rhino3dm) it also writes gable.3dm with
the massing on Plinth / Room / Roof / Apertures layers — re-import that into the
web app to close the loop.

    python3 run_rhino3dm.py
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gable_core as gc  # noqa: E402


def load(name, fallback):
    path = os.path.join(HERE, name)
    if not os.path.exists(path):
        path = os.path.join(HERE, fallback)
    with open(path) as f:
        return json.load(f)


def main():
    bundle = load("params.json", "params.example.json")
    ruleset = load("ruleset.json", "ruleset.example.json")
    params, site = bundle["params"], bundle["site"]
    ref = bundle.get("metrics", {})

    model, metrics = gc.analyze(params, site)

    print("=" * 60)
    print("GABLE STUDIO — python re-run")
    print("=" * 60)

    # 1) metrics
    print("\nMETRICS")
    for k in sorted(metrics):
        print(f"  {k:<20} {metrics[k]:>12.4f}")

    # 2) parity self-test vs browser
    if ref:
        worst, wkey = 0.0, None
        for k, v in ref.items():
            d = abs(metrics.get(k, float('nan')) - v)
            if d > worst:
                worst, wkey = d, k
        ok = worst < 1e-6
        print(f"\nPARITY SELF-TEST vs browser metrics: worst Δ = {worst:.2e} on '{wkey}'  ->  {'OK ✓' if ok else 'MISMATCH ✗'}")
    else:
        print("\n(no embedded browser metrics to compare — running on example data)")

    # 3) rules
    vars = gc.flatten(params, metrics)
    ev = gc.evaluate_ruleset(ruleset, vars)
    print(f"\nRULES — {ruleset.get('name', 'ruleset')}")
    for res in ev["results"]:
        r = res["rule"]
        rhs = r["rhs"]
        tag = "PASS" if res["ok"] else "FAIL"
        hard = " (hard)" if r.get("hard") else ""
        val = "—" if res["value"] is None else f"{res['value']:.3f}"
        print(f"  [{tag}] {r['lhs']:<20} {r['op']:<8} {rhs}   value={val}{hard}")
    print(f"\nSCORE {ev['score'] * 100:.0f}%  ·  {ev['passCount']}/{ev['total']} rules  ·  "
          f"{'ALL HARD RULES PASS' if ev['hardPass'] else 'A HARD RULE FAILS'}")

    bake(model, params, site)


# --- optional geometry bake (needs: pip install rhino3dm) -------------------
def bake(model, params, site):
    try:
        import rhino3dm as r3
    except Exception:
        print("\n(skip .3dm bake — `pip install rhino3dm` to also write gable.3dm)")
        return
    P, north = model["P"], model["north"]
    f3 = r3.File3dm()
    f3.Settings.ModelUnitSystem = r3.UnitSystem.Meters

    def layer(name, rgb):
        l = r3.Layer()
        l.Name = name
        l.Color = (rgb[0], rgb[1], rgb[2], 255)
        return f3.Layers.Add(l)

    li = {n: layer(n, c) for n, c in
          [("Plinth", (138, 127, 109)), ("Walls", (210, 205, 190)),
           ("Roof", (201, 183, 156)), ("Apertures", (47, 109, 122))]}

    def attr(layer_index):
        a = r3.ObjectAttributes()
        a.LayerIndex = layer_index
        return a

    def pt(lx, ly, lz, rot, cx=0.0, cy=0.0):
        x, y, _ = gc.rotZ([lx, ly, 0], rot)
        wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
        return r3.Point3f(wx, wy, lz)

    def box_mesh(bottom, top):
        m = r3.Mesh()
        for p in bottom + top:
            m.Vertices.Add(p.X, p.Y, p.Z)
        for a, b, c, d in [(0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            m.Faces.AddFace(a, b, c, d)
        m.Normals.ComputeNormals()
        return m

    def add_box(W, L, zb, zt, R, cx, cy, lname):
        c = [(-W / 2, -L / 2), (W / 2, -L / 2), (W / 2, L / 2), (-W / 2, L / 2)]
        f3.Objects.AddMesh(box_mesh([pt(x, y, zb, R, cx, cy) for x, y in c], [pt(x, y, zt, R, cx, cy) for x, y in c]), attr(li[lname]))

    Pl, Wl, Rf, G = P["plinth"], P["walls"], P["roof"], model["roofGeom"]

    # plinth slab
    add_box(Pl["W"], Pl["L"], -Pl["t"], 0, Pl["R"], Pl["cx"], Pl["cy"], "Plinth")

    # walls: 4 slabs forming a tube (no floor/ceiling)
    hw, hl, tw = Wl["W"] / 2, Wl["L"] / 2, Wl["wt"]
    for (x0, x1, y0, y1) in [(hw - tw, hw, -hl, hl), (-hw, -hw + tw, -hl, hl), (-hw, hw, hl - tw, hl), (-hw, hw, -hl, -hl + tw)]:
        c = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        f3.Objects.AddMesh(box_mesh([pt(x, y, 0, Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c], [pt(x, y, Wl["h"], Wl["R"], Wl["cx"], Wl["cy"]) for x, y in c]), attr(li["Walls"]))

    # roof: two slope slabs with thickness (independent pitches)
    def slope(eaveX, ridgeX, eaveZ, nx):
        k = math.hypot(nx, 1.0) or 1.0
        nl = (nx / k, 0.0, 1.0 / k)
        top = [(eaveX, -Rf["L"] / 2, eaveZ), (ridgeX, -Rf["L"] / 2, G["zRidge"]), (ridgeX, Rf["L"] / 2, G["zRidge"]), (eaveX, Rf["L"] / 2, eaveZ)]
        bot = [(x - nl[0] * Rf["t"], y, z - nl[2] * Rf["t"]) for (x, y, z) in top]
        T = [pt(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in top]
        B = [pt(x, y, z, Rf["R"], Rf["cx"], Rf["cy"]) for (x, y, z) in bot]
        f3.Objects.AddMesh(box_mesh(B, T), attr(li["Roof"]))

    slope(-Rf["W"] / 2, G["ridgeX"], G["eaveZL"], -math.tan(math.radians(Rf["pitchL"])))
    slope(Rf["W"] / 2, G["ridgeX"], G["eaveZR"], math.tan(math.radians(Rf["pitchR"])))

    # aperture outlines on host faces
    for ap in model["apertures"]:
        f = model["frames"][ap["host"]]
        hu = gc.scale(f["uAxis"], ap["w"] / 2)
        hv = gc.scale(f["vAxis"], ap["h"] / 2)
        c0 = gc.add(ap["c"], gc.scale(f["n"], 0.03))
        cs = [gc.add(gc.add(c0, gc.scale(hu, -1)), gc.scale(hv, -1)),
              gc.add(gc.add(c0, hu), gc.scale(hv, -1)),
              gc.add(gc.add(c0, hu), hv),
              gc.add(gc.add(c0, gc.scale(hu, -1)), hv)]
        poly = r3.Polyline()
        for p in cs + [cs[0]]:
            poly.Add(p[0], p[1], p[2])
        f3.Objects.AddPolyline(poly, attr(li["Apertures"]))

    out = os.path.join(HERE, "gable.3dm")
    f3.Write(out, 7)
    print(f"\nwrote {out}  (layers: Plinth / Walls / Roof / Apertures) — re-import to close the loop")


if __name__ == "__main__":
    main()
