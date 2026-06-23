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
          [("Plinth", (138, 127, 109)), ("Room", (210, 205, 190)),
           ("Roof", (201, 183, 156)), ("Apertures", (47, 109, 122))]}

    def attr(layer_index):
        a = r3.ObjectAttributes()
        a.LayerIndex = layer_index
        return a

    def pt(sx, sy, sz, rot, cx=0.0, cy=0.0):
        x, y, _ = gc.rotZ([sx, sy, 0], rot)
        wx, wy, _ = gc.rotZ([x + cx, y + cy, 0], north)
        return r3.Point3f(wx, wy, sz)

    def box_mesh(corners_bottom, corners_top):
        m = r3.Mesh()
        for p in corners_bottom + corners_top:
            m.Vertices.Add(p.X, p.Y, p.Z)
        # 0-3 bottom, 4-7 top
        faces = [(0, 1, 2, 3), (4, 5, 6, 7),
                 (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        for a, b, c, d in faces:
            m.Faces.AddFace(a, b, c, d)
        m.Normals.ComputeNormals()
        return m

    # plinth
    wp, dp = P["Wp"] / 2, P["Dp"] / 2
    pb = [pt(-wp, -dp, 0, P["Rp"]), pt(wp, -dp, 0, P["Rp"]), pt(wp, dp, 0, P["Rp"]), pt(-wp, dp, 0, P["Rp"])]
    ptp = [pt(-wp, -dp, P["Hp"], P["Rp"]), pt(wp, -dp, P["Hp"], P["Rp"]), pt(wp, dp, P["Hp"], P["Rp"]), pt(-wp, dp, P["Hp"], P["Rp"])]
    f3.Objects.AddMesh(box_mesh(pb, ptp), attr(li["Plinth"]))

    # room
    wr, dr = P["Wr"] / 2, P["Dr"] / 2
    z0, z1 = P["Hp"], P["Hp"] + P["Hr"]
    rb = [pt(-wr, -dr, z0, P["Rr"], P["cx"], P["cy"]), pt(wr, -dr, z0, P["Rr"], P["cx"], P["cy"]), pt(wr, dr, z0, P["Rr"], P["cx"], P["cy"]), pt(-wr, dr, z0, P["Rr"], P["cx"], P["cy"])]
    rt = [pt(-wr, -dr, z1, P["Rr"], P["cx"], P["cy"]), pt(wr, -dr, z1, P["Rr"], P["cx"], P["cy"]), pt(wr, dr, z1, P["Rr"], P["cx"], P["cy"]), pt(-wr, dr, z1, P["Rr"], P["cx"], P["cy"])]
    f3.Objects.AddMesh(box_mesh(rb, rt), attr(li["Room"]))

    # roof (two slopes as a mesh) — ridge along local Y
    wrf, drf, eave, ridge = P["Wroof"] / 2, P["Droof"] / 2, P["Hp"] + P["Hr"], P["Hp"] + P["Hr"] + P["Hg"]
    rm = r3.Mesh()
    verts = [pt(-wrf, -drf, eave, P["Rg"], P["cx"], P["cy"]), pt(-wrf, drf, eave, P["Rg"], P["cx"], P["cy"]),
             pt(0, -drf, ridge, P["Rg"], P["cx"], P["cy"]), pt(0, drf, ridge, P["Rg"], P["cx"], P["cy"]),
             pt(wrf, -drf, eave, P["Rg"], P["cx"], P["cy"]), pt(wrf, drf, eave, P["Rg"], P["cx"], P["cy"])]
    for p in verts:
        rm.Vertices.Add(p.X, p.Y, p.Z)
    rm.Faces.AddFace(0, 1, 3, 2)
    rm.Faces.AddFace(2, 3, 5, 4)
    rm.Normals.ComputeNormals()
    f3.Objects.AddMesh(rm, attr(li["Roof"]))

    # aperture outlines on host faces
    for ap in model["apertures"]:
        f = model["frames"][ap["host"]]
        hu = gc.scale(f["uAxis"], ap["w"] / 2)
        hv = gc.scale(f["vAxis"], ap["h"] / 2)
        off = gc.scale(f["n"], 0.03)
        c0 = gc.add(ap["c"], off)
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
    print(f"\nwrote {out}  (layers: Plinth / Room / Roof / Apertures) — re-import to close the loop")


if __name__ == "__main__":
    main()
