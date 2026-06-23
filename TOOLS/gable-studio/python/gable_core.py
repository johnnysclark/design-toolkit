"""gable_core.py — line-for-line python port of web/core.js.

Pure-stdlib geometry + metric proxies + rule evaluation for the prototypical
gable massing (plinth + room + single-ridge gable + 4 apertures). NO Rhino
imports here, so it runs in any python and is unit-testable. run_rhino3dm.py /
run_rhinocommon.py / gh_component.py import this module for the maths and only
add geometry/baking on top.

Conventions match core.js: +X East, +Y North, +Z Up, metres, degrees in.
Azimuth = degrees clockwise from North. Building base at z=0, grade at z=e.

Every metric is a simplified PEDAGOGICAL PROXY, identical to the browser tool.
If you edit a formula, edit web/core.js to match (test/ proves they agree).
"""
import math

D2R = math.pi / 180.0


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


# --- tiny vector helpers ----------------------------------------------------
def add(a, b): return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
def sub(a, b): return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
def scale(a, s): return [a[0] * s, a[1] * s, a[2] * s]
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def vlen(a): return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def norm(a):
    l = vlen(a) or 1.0
    return [a[0] / l, a[1] / l, a[2] / l]


def rotZ(p, deg):
    r = deg * D2R
    c, s = math.cos(r), math.sin(r)
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]


def dirAz(az_deg, alt_deg):
    a, e = az_deg * D2R, alt_deg * D2R
    return [math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)]


def azOf(n):
    d = math.atan2(n[0], n[1]) / D2R
    return (d + 360.0) % 360.0


DEFAULTS = {
    "params": {
        "Wp": 8, "Dp": 10, "Hp": 0.8, "Rp": 0, "e": 0.0,
        "Wr": 6, "Dr": 8, "Hr": 3.2, "Rr": 0, "cx": 0, "cy": 0,
        "Wroof": 6, "Droof": 8, "Hg": 2.4, "Rg": 0,
        "apertures": [
            {"id": "A1", "host": "wall_ny", "u": 0.5, "v": 0.5, "w": 2.6, "h": 1.6},
            {"id": "A2", "host": "wall_px", "u": 0.5, "v": 0.45, "w": 1.2, "h": 1.3},
            {"id": "A3", "host": "wall_py", "u": 0.5, "v": 0.35, "w": 1.4, "h": 1.0},
            {"id": "A4", "host": "roof_b", "u": 0.7, "v": 0.5, "w": 1.0, "h": 1.0},
        ],
    },
    "site": {
        "latitude": 42, "northAngle": 0, "windFromAz": 270, "windSpeed": 5,
        "deltaT": 6, "viewTargetAz": 180, "eyeHeight": 1.6,
    },
}

WALL_HOSTS = ["wall_py", "wall_ny", "wall_px", "wall_nx"]
ROOF_HOSTS = ["roof_a", "roof_b"]


def world_point(center_rel, z, elem_rot, center, north):
    p = rotZ([center_rel[0], center_rel[1], 0], elem_rot)
    in_bldg = [p[0] + center[0], p[1] + center[1], z]
    w = rotZ([in_bldg[0], in_bldg[1], 0], north)
    return [w[0], w[1], z]


def build_frames(P, north):
    roomC = [P["cx"], P["cy"]]
    wallZ = P["Hp"] + P["Hr"] / 2.0
    frames = {}

    def wall(key, n_local, tan_local, face_width, center_rel):
        frames[key] = {
            "kind": "wall",
            "n": norm(rotZ(n_local, P["Rr"] + north)),
            "c": world_point(center_rel, wallZ, P["Rr"], roomC, north),
            "uAxis": rotZ(tan_local, P["Rr"] + north),
            "vAxis": [0, 0, 1],
            "faceWidth": face_width, "faceHeight": P["Hr"],
            "area": face_width * P["Hr"],
        }

    wall("wall_px", [1, 0, 0], [0, 1, 0], P["Dr"], [P["Wr"] / 2, 0])
    wall("wall_nx", [-1, 0, 0], [0, 1, 0], P["Dr"], [-P["Wr"] / 2, 0])
    wall("wall_py", [0, 1, 0], [1, 0, 0], P["Wr"], [0, P["Dr"] / 2])
    wall("wall_ny", [0, -1, 0], [1, 0, 0], P["Wr"], [0, -P["Dr"] / 2])

    eaveZ = P["Hp"] + P["Hr"]
    s = math.hypot(P["Wroof"] / 2.0, P["Hg"]) or 1e-9

    def roof(key, sign):
        n_local = norm([sign * P["Hg"], 0, P["Wroof"] / 2.0])
        uphill = norm([-sign * P["Wroof"] / 2.0, 0, P["Hg"]])
        frames[key] = {
            "kind": "roof",
            "n": norm(rotZ(n_local, P["Rg"] + north)),
            "c": world_point([sign * P["Wroof"] / 4.0, 0], eaveZ + P["Hg"] / 2.0, P["Rg"], roomC, north),
            "uAxis": rotZ(uphill, P["Rg"] + north),
            "vAxis": rotZ([0, 1, 0], P["Rg"] + north),
            "faceWidth": s, "faceHeight": P["Droof"],
            "area": s * P["Droof"],
        }

    roof("roof_a", 1)
    roof("roof_b", -1)
    return frames


def plinth_sides(P, north):
    ag = max(0.0, P["Hp"] - P["e"])
    if ag <= 1e-6:
        return []
    zc = P["e"] + ag / 2.0

    def mk(n_local, w, center_rel):
        return {
            "name": "plinth", "kind": "plinth", "area": w * ag,
            "n": norm(rotZ(n_local, P["Rp"] + north)),
            "c": world_point(center_rel, zc, P["Rp"], [0, 0], north),
        }

    return [
        mk([1, 0, 0], P["Dp"], [P["Wp"] / 2, 0]),
        mk([-1, 0, 0], P["Dp"], [-P["Wp"] / 2, 0]),
        mk([0, 1, 0], P["Wp"], [0, P["Dp"] / 2]),
        mk([0, -1, 0], P["Wp"], [0, -P["Dp"] / 2]),
    ]


def build_apertures(P, frames):
    out = []
    for ap in P.get("apertures", []):
        f = frames.get(ap["host"], frames["wall_ny"])
        w = clamp(ap["w"], 0.05, f["faceWidth"])
        h = clamp(ap["h"], 0.05, f["faceHeight"])
        du = (clamp(ap["u"], 0, 1) - 0.5) * f["faceWidth"]
        dv = (clamp(ap["v"], 0, 1) - 0.5) * f["faceHeight"]
        c = add(add(f["c"], scale(f["uAxis"], du)), scale(f["vAxis"], dv))
        out.append({"id": ap["id"], "host": ap["host"], "kind": f["kind"],
                    "area": w * h, "w": w, "h": h, "n": f["n"], "c": c})
    return out


def build_model(params, site):
    P = dict(params)
    north = site.get("northAngle", 0) or 0
    frames = build_frames(P, north)
    walls = [dict(frames[k], name=k) for k in WALL_HOSTS]
    roofs = [dict(frames[k], name=k) for k in ROOF_HOSTS]
    plinth = plinth_sides(P, north)
    apertures = build_apertures(P, frames)
    return {"P": P, "site": site, "frames": frames,
            "faces": walls + roofs + plinth, "walls": walls, "roofs": roofs,
            "plinth": plinth, "apertures": apertures, "north": north}


DECLS = [("summer", 23.45), ("equinox", 0), ("winter", -23.45)]
HOURS = [8, 10, 12, 14, 16]
N_SUN = len(DECLS) * len(HOURS)
N_SEASON = len(HOURS)


def sun_samples(lat_deg):
    lat = lat_deg * D2R
    out = []
    for k, d in DECLS:
        dec = d * D2R
        for h in HOURS:
            H = (15 * (h - 12)) * D2R
            sin_alt = math.sin(lat) * math.sin(dec) + math.cos(lat) * math.cos(dec) * math.cos(H)
            alt = math.asin(clamp(sin_alt, -1, 1))
            L = [0, 0, 0]
            up = alt > 0
            if up:
                cos_az = (math.sin(dec) - math.sin(lat) * sin_alt) / ((math.cos(lat) * math.cos(alt)) or 1e-9)
                az = math.acos(clamp(cos_az, -1, 1))
                if H > 0:
                    az = 2 * math.pi - az
                L = [math.sin(az) * math.cos(alt), math.cos(az) * math.cos(alt), math.sin(alt)]
            out.append({"season": k, "L": L, "up": up})
    return out


def compute_metrics(model):
    P, site = model["P"], model["site"]
    faces, apertures = model["faces"], model["apertures"]
    north = model["north"]
    sun = sun_samples(site["latitude"])

    # Solar
    solar_env = solar_use = solar_south = solar_winter = solar_summer = 0.0
    for s in sun:
        if not s["up"]:
            continue
        for f in faces:
            solar_env += f["area"] * max(0.0, dot(f["n"], s["L"]))
        for a in apertures:
            g = a["area"] * max(0.0, dot(a["n"], s["L"]))
            solar_use += g
            if s["season"] == "winter":
                solar_winter += g
            if s["season"] == "summer":
                solar_summer += g
            az = azOf(a["n"])
            if 135 <= az <= 225:
                solar_south += g
    solar_env /= N_SUN
    solar_use /= N_SUN
    solar_south /= N_SUN
    solar_winter /= N_SEASON
    solar_summer /= N_SEASON
    overheat = (solar_summer / solar_winter) if solar_winter > 1e-6 else (99 if solar_summer > 0 else 0)

    # Wind
    f_wind = dirAz(site["windFromAz"], 0)
    wind_exposure = 0.0
    for f in faces:
        if abs(f["n"][2]) > 0.95:
            continue
        wind_exposure += f["area"] * max(0.0, dot(f["n"], f_wind))
    wind_pressure = 0.5 * 1.225 * site["windSpeed"] * site["windSpeed"] * wind_exposure

    u = rotZ(f_wind, 90)

    def half_along(rot, hw, hd):
        ex = rotZ([1, 0, 0], rot)
        ey = rotZ([0, 1, 0], rot)
        return hw * abs(dot(u, ex)) + hd * abs(dot(u, ey))

    room_half_u = half_along(P["Rr"] + north, P["Wr"] / 2, P["Dr"] / 2)
    plinth_half_u = half_along(P["Rp"] + north, P["Wp"] / 2, P["Dp"] / 2)
    room_cw = rotZ([P["cx"], P["cy"], 0], north)
    cu_room = dot(room_cw, u)
    gap_plus = (0 + plinth_half_u) - (cu_room + room_half_u)
    gap_minus = (cu_room - room_half_u) - (0 - plinth_half_u)
    min_gap = min(gap_plus, gap_minus)
    channel = (2 * room_half_u) / min_gap if min_gap > 0.05 else 0.0

    # Stack
    zmean = 0.0
    atot = 0.0
    for a in apertures:
        zmean += a["c"][2] * a["area"]
        atot += a["area"]
    zmean = zmean / atot if atot > 0 else 0.0
    Ain = Aout = zinA = zoutA = 0.0
    for a in apertures:
        is_out = a["kind"] == "roof" or a["c"][2] > zmean + 1e-9
        if is_out:
            Aout += a["area"]
            zoutA += a["c"][2] * a["area"]
        else:
            Ain += a["area"]
            zinA += a["c"][2] * a["area"]
    zin = zinA / Ain if Ain > 0 else 0.0
    zout = zoutA / Aout if Aout > 0 else 0.0
    stack_height = max(0.0, zout - zin)
    Astar = 1.0 / math.sqrt(1 / (Ain * Ain) + 1 / (Aout * Aout)) if (Ain > 0 and Aout > 0) else 0.0
    Cd, g, Tabs = 0.61, 9.81, 293.15
    stack_index = (Cd * Astar * math.sqrt(2 * g * stack_height * max(0.0, site["deltaT"]) / Tabs)
                   if (Astar > 0 and stack_height > 0) else 0.0)

    # Views
    w = rotZ([P["cx"], P["cy"], 0], north)
    eye = [w[0], w[1], P["Hp"] + site["eyeHeight"]]
    v_target = dirAz(site["viewTargetAz"], 0)
    view_amount = view_quality = sky_view = 0.0
    for a in apertures:
        d = sub(a["c"], eye)
        r = vlen(d)
        if r < 1e-3:
            continue
        dh = scale(d, 1 / r)
        omega = a["area"] * max(0.0, dot(dh, a["n"])) / (r * r)
        if a["kind"] == "roof":
            sky_view += a["area"] * max(0.0, dot(dh, [0, 0, 1])) / (r * r)
        else:
            view_amount += omega
            view_quality += omega * max(0.0, dot(dh, v_target))

    # Thermal mass / earth coupling
    perim = 2 * (P["Wp"] + P["Dp"])
    buried = min(P["e"], P["Hp"])
    soil_contact = perim * buried + P["Wp"] * P["Dp"]
    mass_volume = P["Wp"] * P["Dp"] * P["Hp"]
    room_volume = P["Wr"] * P["Dr"] * P["Hr"] + 0.5 * P["Wroof"] * P["Droof"] * P["Hg"]
    thermal_ratio = (mass_volume * 2.0) / room_volume if room_volume > 1e-6 else 0.0
    buried_fraction = buried / P["Hp"] if P["Hp"] > 1e-6 else 0.0

    # Derived
    envelope_area = sum(f["area"] for f in faces)
    glazing_area = sum(a["area"] for a in apertures)
    glazing_ratio = glazing_area / envelope_area if envelope_area > 1e-6 else 0.0
    surface_to_volume = envelope_area / room_volume if room_volume > 1e-6 else 0.0
    ridge_height = P["Hp"] + P["Hr"] + P["Hg"]
    pitch_deg = math.atan2(P["Hg"], P["Wroof"] / 2) / D2R

    return {
        "solarEnvelope": solar_env, "solarUseful": solar_use, "solarSouth": solar_south,
        "solarWinterUseful": solar_winter, "solarSummerUseful": solar_summer, "overheatRatio": overheat,
        "windExposure": wind_exposure, "windPressure": wind_pressure, "channelIndex": channel,
        "stackIndex": stack_index, "stackHeight": stack_height, "effectiveOpenArea": Astar,
        "viewAmount": view_amount, "viewQuality": view_quality, "skyView": sky_view,
        "soilContactArea": soil_contact, "massVolume": mass_volume, "thermalMassRatio": thermal_ratio,
        "buriedFraction": buried_fraction,
        "enclosedVolume": room_volume, "envelopeArea": envelope_area, "glazingArea": glazing_area,
        "glazingRatio": glazing_ratio, "surfaceToVolume": surface_to_volume,
        "footprint": P["Wp"] * P["Dp"], "ridgeHeight": ridge_height, "pitchDeg": pitch_deg,
    }


def analyze(params, site):
    model = build_model(params, site)
    return model, compute_metrics(model)


def flatten(params, metrics):
    out = {}
    for k, v in params.items():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            out[k] = v
    out.update(metrics)
    return out


def evaluate_rule(rule, vars):
    x = vars.get(rule["lhs"])
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return {"id": rule["id"], "ok": False, "value": None, "margin": None, "reason": "no value"}
    op, r = rule["op"], rule["rhs"]
    ok, margin = False, 0.0
    if op == "<":
        ok, margin = x < r, r - x
    elif op == "<=":
        ok, margin = x <= r, r - x
    elif op == ">":
        ok, margin = x > r, x - r
    elif op == ">=":
        ok, margin = x >= r, x - r
    elif op == "==":
        tol = rule.get("tol", 1e-6)
        ok, margin = abs(x - r) <= tol, -abs(x - r)
    elif op == "between":
        ok, margin = (r[0] <= x <= r[1]), min(x - r[0], r[1] - x)
    elif op == "outside":
        ok, margin = (x < r[0] or x > r[1]), max(r[0] - x, x - r[1])
    return {"id": rule["id"], "ok": ok, "value": x, "margin": margin}


def evaluate_ruleset(ruleset, vars):
    rules = (ruleset or {}).get("rules", [])
    results = [dict(rule=rule, **evaluate_rule(rule, vars)) for rule in rules]
    hard_pass = True
    wtot = wpass = 0.0
    for res in results:
        w = res["rule"].get("weight", 1)
        wtot += w
        if res["ok"]:
            wpass += w
        if res["rule"].get("hard", False) and not res["ok"]:
            hard_pass = False
    score = wpass / wtot if wtot > 0 else 1.0
    return {"results": results, "hardPass": hard_pass, "score": score,
            "passCount": sum(1 for r in results if r["ok"]), "total": len(results)}


def run(params, site, ruleset=None):
    model, metrics = analyze(params, site)
    vars = flatten(params, metrics)
    evald = evaluate_ruleset(ruleset, vars) if ruleset else None
    return {"model": model, "metrics": metrics, "vars": vars, "evaluation": evald}
