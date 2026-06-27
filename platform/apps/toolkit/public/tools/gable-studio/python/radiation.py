"""radiation.py — line-for-line python port of web/radiation.js.

Tregenza-145 sky-patch geometry + OCCLUDED per-surface incident radiation
(kWh/m²) from a cumulative sky matrix R[145]. Includes ports of core.js's
Möller–Trumbore raycast (ray_hits_any) and massing_triangles, so self-shadowing
is in the headline number. This is the parity-bound "consume the sky matrix"
half of the Benchmark Track; test/parity_rad.py proves it matches web/radiation.js.
If you edit web/radiation.js (or the raycast/massing in web/core.js), edit here.

Conventions: +X East, +Y North, +Z Up; azimuth clockwise from N.
"""
import math
from gable_core import rotZ, build_model

D2R = math.pi / 180.0

# Tregenza dome: 7 altitude bands (12° each) + a zenith cap = 145 patches.
BANDS = [[30, 0, 12], [30, 12, 24], [24, 24, 36], [24, 36, 48], [18, 48, 60], [12, 60, 72], [6, 72, 84]]


def tregenza_patches():
    patches = []
    for band in BANDS:
        count, a0, a1 = band[0], band[1], band[2]
        altC = (a0 + a1) / 2.0
        dAz = 2 * math.pi / count
        omega = dAz * (math.sin(a1 * D2R) - math.sin(a0 * D2R))
        ca = math.cos(altC * D2R)
        sa = math.sin(altC * D2R)
        for k in range(count):
            az = (k + 0.5) * dAz
            patches.append({"dir": [math.sin(az) * ca, math.cos(az) * ca, sa], "omega": omega, "alt": altC})
    patches.append({"dir": [0, 0, 1], "omega": 2 * math.pi * (1 - math.sin(84 * D2R)), "alt": 90})
    return patches


PATCHES = tregenza_patches()


def incident_on_surface(R, normal, patches=None):
    if patches is None:
        patches = PATCHES
    s = 0.0
    for p in range(len(patches)):
        d = patches[p]["dir"]
        dotv = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2]
        if dotv > 0:
            s += R[p] * dotv
    return s


# --- ports of core.js massingTriangles + rayHitsAny -------------------------
def massing_triangles(model):
    P = model["P"]
    n = model["north"]
    G = model["roofGeom"]
    tris = []

    def push(a, b, c):
        tris.extend([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]])

    def quad(a, b, c, d):
        push(a, b, c)
        push(a, c, d)

    def wp(lx, ly, lz, R, cx, cy):
        p = rotZ([lx, ly, 0], R)
        w = rotZ([p[0] + cx, p[1] + cy, 0], n)
        return [w[0], w[1], lz]

    def prism(corners2, zb, zt, R, cx, cy):
        b = [wp(x, y, zb, R, cx, cy) for (x, y) in corners2]
        t = [wp(x, y, zt, R, cx, cy) for (x, y) in corners2]
        quad(b[0], b[1], b[2], b[3])
        quad(t[3], t[2], t[1], t[0])
        for i in range(4):
            j = (i + 1) % 4
            quad(b[i], b[j], t[j], t[i])

    Pl = P["plinth"]

    def rect(W, L):
        return [[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]]

    prism(rect(Pl["W"], Pl["L"]), -Pl["t"], 0, Pl["R"], Pl["cx"], Pl["cy"])

    Wl = P["walls"]
    hw = Wl["W"] / 2
    hl = Wl["L"] / 2
    tw = Wl["wt"]
    for (x0, x1, y0, y1) in [[hw - tw, hw, -hl, hl], [-hw, -hw + tw, -hl, hl], [-hw, hw, hl - tw, hl], [-hw, hw, -hl, -hl + tw]]:
        prism([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0, Wl["h"], Wl["R"], Wl["cx"], Wl["cy"])

    Rf = P["roof"]

    def slope(eaveX, ridgeX, eaveZ, nx):
        k = math.hypot(nx, 1) or 1
        nl = [nx / k, 0, 1 / k]
        top = [[eaveX, -Rf["L"] / 2, eaveZ], [ridgeX, -Rf["L"] / 2, G["zRidge"]], [ridgeX, Rf["L"] / 2, G["zRidge"]], [eaveX, Rf["L"] / 2, eaveZ]]
        bot = [[p[0] - nl[0] * Rf["t"], p[1], p[2] - nl[2] * Rf["t"]] for p in top]

        def TW(p):
            return wp(p[0], p[1], p[2], Rf["R"], Rf["cx"], Rf["cy"])

        T = [TW(p) for p in top]
        B = [TW(p) for p in bot]
        quad(T[0], T[1], T[2], T[3])
        quad(B[3], B[2], B[1], B[0])
        for i in range(4):
            j = (i + 1) % 4
            quad(T[i], T[j], B[j], B[i])

    slope(-Rf["W"] / 2, G["ridgeX"], G["eaveZL"], -math.tan(Rf["pitchL"] * D2R))
    slope(Rf["W"] / 2, G["ridgeX"], G["eaveZR"], math.tan(Rf["pitchR"] * D2R))
    return tris


def ray_hits_any(o, d, tris, maxT):
    EPS = 1e-6
    i = 0
    n = len(tris)
    while i < n:
        ax, ay, az = tris[i], tris[i + 1], tris[i + 2]
        e1x, e1y, e1z = tris[i + 3] - ax, tris[i + 4] - ay, tris[i + 5] - az
        e2x, e2y, e2z = tris[i + 6] - ax, tris[i + 7] - ay, tris[i + 8] - az
        px = d[1] * e2z - d[2] * e2y
        py = d[2] * e2x - d[0] * e2z
        pz = d[0] * e2y - d[1] * e2x
        det = e1x * px + e1y * py + e1z * pz
        if -EPS < det < EPS:
            i += 9
            continue
        inv = 1.0 / det
        tx, ty, tz = o[0] - ax, o[1] - ay, o[2] - az
        u = (tx * px + ty * py + tz * pz) * inv
        if u < 0 or u > 1:
            i += 9
            continue
        qx = ty * e1z - tz * e1y
        qy = tz * e1x - tx * e1z
        qz = tx * e1y - ty * e1x
        v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv
        if v < 0 or u + v > 1:
            i += 9
            continue
        t = (e2x * qx + e2y * qy + e2z * qz) * inv
        if t > 1e-4 and t < maxT:
            return True
        i += 9
    return False


def occluded_incident_at(R, point, normal, tris, patches=None):
    if patches is None:
        patches = PATCHES
    o = [point[0] + normal[0] * 0.03, point[1] + normal[1] * 0.03, point[2] + normal[2] * 0.03]
    s = 0.0
    for p in range(len(patches)):
        d = patches[p]["dir"]
        dotv = normal[0] * d[0] + normal[1] * d[1] + normal[2] * d[2]
        if dotv <= 0:
            continue
        if ray_hits_any(o, d, tris, 1e9):
            continue
        s += R[p] * dotv
    return s


def incident_by_model(model, R, patches=None):
    if patches is None:
        patches = PATCHES
    tris = massing_triangles(model)
    face_vals = [{"name": f["name"], "area": f["area"], "kwh": occluded_incident_at(R, f["c"], f["n"], tris, patches)} for f in model["faces"]]
    ap_vals = [{"id": a["id"], "area": a["area"], "kwh": occluded_incident_at(R, a["c"], a["n"], tris, patches)} for a in model["apertures"]]
    fa = sum(f["area"] * f["kwh"] for f in face_vals)
    fw = sum(f["area"] for f in face_vals)
    ga = sum(a["area"] * a["kwh"] for a in ap_vals)
    gw = sum(a["area"] for a in ap_vals)
    return {"faceVals": face_vals, "apVals": ap_vals,
            "envelopeMean": fa / fw if fw > 0 else 0, "glazingMean": ga / gw if gw > 0 else 0}
