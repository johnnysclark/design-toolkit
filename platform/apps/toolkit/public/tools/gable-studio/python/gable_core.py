"""gable_core.py — line-for-line python port of web/core.js (v2).

Pure-stdlib geometry + metric proxies + rule evaluation for the v2 form:
three independent plan rectangles (PLINTH slab / WALLS clipped by the roof into a
fully-enclosed gable / ROOF overhang with two independent pitches) + 4 apertures,
on a ravine-edge terrain. NO Rhino
imports. If you edit a formula, edit web/core.js to match (test/ proves parity).

Conventions: +X East, +Y North, +Z Up, metres, degrees in. Floor (plinth top)
is the datum z=0; walls rise 0..h. Metrics are simplified proxies.
"""
import math

D2R = math.pi / 180.0


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


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
    return (math.atan2(n[0], n[1]) / D2R + 360.0) % 360.0


DEFAULTS = {
    "params": {
        "plinth": {"cx": 0, "cy": 0, "W": 10, "L": 12, "R": 0, "t": 0.5},
        "walls": {"cx": 0, "cy": -0.5, "W": 7, "L": 9, "R": 0, "h": 3.2, "wt": 0.25},
        "roof": {"cx": 0, "cy": -0.5, "W": 9.5, "L": 11, "R": 0, "ridgeRise": 2.4, "pitchL": 30, "pitchR": 30, "ridgePos": 0, "t": 0.35},
        "apertures": [
            {"id": "A1", "host": "wall_ny", "u": 0.5, "v": 0.5, "w": 3.0, "h": 1.8},
            {"id": "A2", "host": "wall_px", "u": 0.5, "v": 0.45, "w": 1.2, "h": 1.4},
            {"id": "A3", "host": "wall_py", "u": 0.5, "v": 0.32, "w": 1.4, "h": 1.0},
            {"id": "A4", "host": "roof_r", "u": 0.7, "v": 0.5, "w": 1.2, "h": 1.2},
        ],
    },
    "site": {
        "latitude": 42, "longitude": -71, "northAngle": 0, "windFromAz": 270, "windSpeed": 5,
        "deltaT": 6, "viewTargetAz": 180, "eyeHeight": 1.6,
        "terrain": {"plateauZ": -0.8, "ravineDepth": 9, "ravineEdge": 6, "ravineWidth": 5, "ravineAngle": 18, "undAmp": 0.25},
    },
}

WALL_HOSTS = ["wall_py", "wall_ny", "wall_px", "wall_nx"]
ROOF_HOSTS = ["roof_l", "roof_r"]


def terrain_height(x, y, T):
    a = T["ravineAngle"] * D2R
    d = x * math.cos(a) + y * math.sin(a)
    t = clamp((d - T["ravineEdge"]) / (T["ravineWidth"] or 1), 0, 1)
    t = t * t * (3 - 2 * t)
    return T["plateauZ"] - T["ravineDepth"] * t + T["undAmp"] * math.sin(x * 0.15) * math.cos(y * 0.17)


def world_point(center_rel, z, elem_rot, center, north):
    p = rotZ([center_rel[0], center_rel[1], 0], elem_rot)
    w = rotZ([p[0] + center[0], p[1] + center[1], 0], north)
    return [w[0], w[1], z]


# --- roof underside: the height the gable-enclosed walls rise to (port of
# web/core.js). roofUnderZ is piecewise-linear along any straight edge (one kink,
# at the ridge crossing), so the wall clip is EXACT with a single inserted vertex.
def roof_local_x(wx, wy, Rf, north):
    a = rotZ([wx, wy, 0], -north)
    rl = rotZ([a[0] - Rf["cx"], a[1] - Rf["cy"], 0], -Rf["R"])
    return rl[0]


def roof_under_z_at(rlx, Rf, G):
    slope = G["tanL"] if rlx <= G["ridgeX"] else G["tanR"]
    topZ = G["zRidge"] - abs(rlx - G["ridgeX"]) * slope
    return topZ - Rf["t"] * math.sqrt(1 + slope * slope)


def roof_under_z_world(wx, wy, Rf, G, north):
    return roof_under_z_at(roof_local_x(wx, wy, Rf, north), Rf, G)


def clip_wall_outer(A, B, face_width, Rf, G, north):
    rlA = roof_local_x(A[0], A[1], Rf, north)
    rlB = roof_local_x(B[0], B[1], Rf, north)
    ts = [0.0]
    if (rlA - G["ridgeX"]) * (rlB - G["ridgeX"]) < 0:
        ts.append((G["ridgeX"] - rlA) / (rlB - rlA))
    ts.append(1.0)
    hs = [roof_under_z_world(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, Rf, G, north) for t in ts]
    verts = [[0.0, 0.0], [face_width, 0.0]]
    for i in range(len(ts) - 1, -1, -1):
        verts.append([ts[i] * face_width, hs[i]])
    a2 = cu = cz = 0.0
    nv = len(verts)
    for i in range(nv):
        p = verts[i]
        q = verts[(i + 1) % nv]
        cr = p[0] * q[1] - q[0] * p[1]
        a2 += cr
        cu += (p[0] + q[0]) * cr
        cz += (p[1] + q[1]) * cr
    signed = a2 / 2
    big = abs(signed) > 1e-12
    uC = cu / (6 * signed) if big else face_width / 2
    zC = cz / (6 * signed) if big else 0.0
    eave = hs[0]
    for h in hs:
        if h < eave:
            eave = h
    fr = uC / face_width if face_width > 1e-12 else 0.5
    return {
        "area": abs(signed),
        "centroid": [A[0] + (B[0] - A[0]) * fr, A[1] + (B[1] - A[1]) * fr, zC],
        "eaveHeight": eave,
        "apC": [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, eave / 2],
    }


def clipped_wall_quads(x0, x1, y0, y1, W, Rf, G, north):
    Wc = [W["cx"], W["cy"]]
    longX = abs(x1 - x0) >= abs(y1 - y0)

    def edge_pt(side, s):
        if longX:
            return [x0 + (x1 - x0) * s, y1 if side else y0]
        return [x1 if side else x0, y0 + (y1 - y0) * s]

    def cross(side):
        a = world_point(edge_pt(side, 0), 0, W["R"], Wc, north)
        b = world_point(edge_pt(side, 1), 0, W["R"], Wc, north)
        ra = roof_local_x(a[0], a[1], Rf, north)
        rb = roof_local_x(b[0], b[1], Rf, north)
        if (ra - G["ridgeX"]) * (rb - G["ridgeX"]) < 0:
            return (G["ridgeX"] - ra) / (rb - ra)
        return None

    ss = [0.0, 1.0]
    for c in (cross(0), cross(1)):
        if c is not None:
            ss.append(c)
    ss.sort()
    uniq = [v for i, v in enumerate(ss) if i == 0 or v != ss[i - 1]]

    def col(s):
        a = world_point(edge_pt(0, s), 0, W["R"], Wc, north)
        b = world_point(edge_pt(1, s), 0, W["R"], Wc, north)
        return {"aB": a, "aT": [a[0], a[1], roof_under_z_world(a[0], a[1], Rf, G, north)],
                "bB": b, "bT": [b[0], b[1], roof_under_z_world(b[0], b[1], Rf, G, north)]}

    cols = [col(s) for s in uniq]
    quads = []
    for i in range(len(cols) - 1):
        p = cols[i]
        q = cols[i + 1]
        quads.append([p["aB"], q["aB"], q["aT"], p["aT"]])
        quads.append([p["bB"], p["bT"], q["bT"], q["bB"]])
        quads.append([p["aT"], q["aT"], q["bT"], p["bT"]])
        quads.append([p["aB"], p["bB"], q["bB"], q["aB"]])
    a0 = cols[0]
    aN = cols[len(cols) - 1]
    quads.append([a0["aB"], a0["aT"], a0["bT"], a0["bB"]])
    quads.append([aN["aB"], aN["bB"], aN["bT"], aN["aT"]])
    return quads


def build_frames(P, north):
    frames = {}
    W = P["walls"]
    Wc = [W["cx"], W["cy"]]
    Rf = P["roof"]
    Rc = [Rf["cx"], Rf["cy"]]

    zRidge = W["h"] + Rf["ridgeRise"]
    ridgeX = Rf["ridgePos"] * (Rf["W"] / 2)
    halfL = ridgeX + Rf["W"] / 2
    halfR = Rf["W"] / 2 - ridgeX
    tanL = math.tan(Rf["pitchL"] * D2R)
    tanR = math.tan(Rf["pitchR"] * D2R)
    eaveZL = zRidge - halfL * tanL
    eaveZR = zRidge - halfR * tanR
    G = {"zRidge": zRidge, "ridgeX": ridgeX, "halfL": halfL, "halfR": halfR,
         "eaveZL": eaveZL, "eaveZR": eaveZR, "tanL": tanL, "tanR": tanR}

    def wall(key, n_local, tan_local, face_width, center_rel):
        hf = face_width / 2
        A = world_point([center_rel[0] - tan_local[0] * hf, center_rel[1] - tan_local[1] * hf], 0, W["R"], Wc, north)
        B = world_point([center_rel[0] + tan_local[0] * hf, center_rel[1] + tan_local[1] * hf], 0, W["R"], Wc, north)
        clip = clip_wall_outer(A, B, face_width, Rf, G, north)
        frames[key] = {
            "kind": "wall", "n": norm(rotZ(n_local, W["R"] + north)),
            "c": clip["centroid"], "apC": clip["apC"],
            "uAxis": rotZ(tan_local, W["R"] + north), "vAxis": [0, 0, 1],
            "faceWidth": face_width, "faceHeight": clip["eaveHeight"], "area": clip["area"],
        }

    wall("wall_px", [1, 0, 0], [0, 1, 0], W["L"], [W["W"] / 2, 0])
    wall("wall_nx", [-1, 0, 0], [0, 1, 0], W["L"], [-W["W"] / 2, 0])
    wall("wall_py", [0, 1, 0], [1, 0, 0], W["W"], [0, W["L"] / 2])
    wall("wall_ny", [0, -1, 0], [1, 0, 0], W["W"], [0, -W["L"] / 2])

    frames["roof_l"] = {
        "kind": "roof", "n": norm(rotZ([-tanL, 0, 1], Rf["R"] + north)),
        "c": world_point([(ridgeX - Rf["W"] / 2) / 2, 0], (zRidge + eaveZL) / 2, Rf["R"], Rc, north),
        "uAxis": rotZ(norm([1, 0, tanL]), Rf["R"] + north), "vAxis": rotZ([0, 1, 0], Rf["R"] + north),
        "faceWidth": halfL * math.sqrt(1 + tanL * tanL), "faceHeight": Rf["L"],
        "area": halfL * math.sqrt(1 + tanL * tanL) * Rf["L"],
    }
    frames["roof_r"] = {
        "kind": "roof", "n": norm(rotZ([tanR, 0, 1], Rf["R"] + north)),
        "c": world_point([(ridgeX + Rf["W"] / 2) / 2, 0], (zRidge + eaveZR) / 2, Rf["R"], Rc, north),
        "uAxis": rotZ(norm([-1, 0, tanR]), Rf["R"] + north), "vAxis": rotZ([0, 1, 0], Rf["R"] + north),
        "faceWidth": halfR * math.sqrt(1 + tanR * tanR), "faceHeight": Rf["L"],
        "area": halfR * math.sqrt(1 + tanR * tanR) * Rf["L"],
    }
    frames["_roofGeom"] = G
    return frames


def plinth_faces(P, north, T):
    Pl = P["plinth"]
    Pc = [Pl["cx"], Pl["cy"]]
    topZ, botZ = 0.0, -Pl["t"]
    faces = [{"name": "plinth_top", "kind": "plinth", "area": Pl["W"] * Pl["L"], "n": [0, 0, 1], "c": world_point([0, 0], topZ, Pl["R"], Pc, north)}]

    def side(n_local, w, center_rel):
        return {"name": "plinth_side", "kind": "plinth", "area": w * Pl["t"], "n": norm(rotZ(n_local, Pl["R"] + north)), "c": world_point(center_rel, (topZ + botZ) / 2, Pl["R"], Pc, north)}

    faces += [side([1, 0, 0], Pl["L"], [Pl["W"] / 2, 0]), side([-1, 0, 0], Pl["L"], [-Pl["W"] / 2, 0]),
              side([0, 1, 0], Pl["W"], [0, Pl["L"] / 2]), side([0, -1, 0], Pl["W"], [0, -Pl["L"] / 2])]
    return faces


def build_apertures(P, frames):
    out = []
    for ap in P.get("apertures", []):
        f = frames.get(ap["host"], frames["wall_ny"])
        anchor = f.get("apC", f["c"])   # walls anchor on the lower-zone centre (apC); roofs use c
        w = clamp(ap["w"], 0.05, f["faceWidth"])
        h = clamp(ap["h"], 0.05, f["faceHeight"])
        du = (clamp(ap["u"], 0, 1) - 0.5) * f["faceWidth"]
        dv = (clamp(ap["v"], 0, 1) - 0.5) * f["faceHeight"]
        c = add(add(anchor, scale(f["uAxis"], du)), scale(f["vAxis"], dv))
        out.append({"id": ap["id"], "host": ap["host"], "kind": f["kind"], "area": w * h, "w": w, "h": h, "n": f["n"], "c": c})
    return out


def build_model(params, site):
    north = site.get("northAngle", 0) or 0
    P = params
    frames = build_frames(P, north)
    walls = [dict(frames[k], name=k) for k in WALL_HOSTS]
    roofs = [dict(frames[k], name=k) for k in ROOF_HOSTS]
    plinth = plinth_faces(P, north, site["terrain"])
    apertures = build_apertures(P, frames)
    return {"P": P, "site": site, "north": north, "frames": frames, "roofGeom": frames["_roofGeom"],
            "faces": walls + roofs + plinth, "walls": walls, "roofs": roofs, "plinth": plinth, "apertures": apertures}


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
    faces, apertures, north = model["faces"], model["apertures"], model["north"]
    sun = sun_samples(site["latitude"])

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
            if 135 <= azOf(a["n"]) <= 225:
                solar_south += g
    solar_env /= N_SUN
    solar_use /= N_SUN
    solar_south /= N_SUN
    solar_winter /= N_SEASON
    solar_summer /= N_SEASON
    overheat = (solar_summer / solar_winter) if solar_winter > 1e-6 else (99 if solar_summer > 0 else 0)

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

    walls_half_u = half_along(P["walls"]["R"] + north, P["walls"]["W"] / 2, P["walls"]["L"] / 2)
    plinth_half_u = half_along(P["plinth"]["R"] + north, P["plinth"]["W"] / 2, P["plinth"]["L"] / 2)
    cu_walls = dot(rotZ([P["walls"]["cx"], P["walls"]["cy"], 0], north), u)
    cu_plinth = dot(rotZ([P["plinth"]["cx"], P["plinth"]["cy"], 0], north), u)
    gap_plus = (cu_plinth + plinth_half_u) - (cu_walls + walls_half_u)
    gap_minus = (cu_walls - walls_half_u) - (cu_plinth - plinth_half_u)
    min_gap = min(gap_plus, gap_minus)
    channel = (2 * walls_half_u) / min_gap if min_gap > 0.05 else 0.0

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
    stack_index = (0.61 * Astar * math.sqrt(2 * 9.81 * stack_height * max(0.0, site["deltaT"]) / 293.15)
                   if (Astar > 0 and stack_height > 0) else 0.0)

    eye_w = rotZ([P["walls"]["cx"], P["walls"]["cy"], 0], north)
    eye = [eye_w[0], eye_w[1], site["eyeHeight"]]
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

    Pl = P["plinth"]
    gc = rotZ([Pl["cx"], Pl["cy"], 0], north)
    ground = terrain_height(gc[0], gc[1], site["terrain"])
    botZ = -Pl["t"]
    buried_side = clamp(min(ground, 0) - botZ, 0, Pl["t"])
    perim = 2 * (Pl["W"] + Pl["L"])
    soil_contact = perim * buried_side + (Pl["W"] * Pl["L"] if buried_side > 1e-6 else 0.0)
    mass_volume = Pl["W"] * Pl["L"] * Pl["t"]
    buried_fraction = buried_side / Pl["t"] if Pl["t"] > 1e-6 else 0.0

    inner_w = max(0.0, P["walls"]["W"] - 2 * P["walls"]["wt"])
    inner_l = max(0.0, P["walls"]["L"] - 2 * P["walls"]["wt"])
    roof_void = 0.5 * P["roof"]["W"] * P["roof"]["L"] * max(0.0, P["roof"]["ridgeRise"])
    enclosed_volume = inner_w * inner_l * P["walls"]["h"] + roof_void
    thermal_ratio = (mass_volume * 2.0) / enclosed_volume if enclosed_volume > 1e-6 else 0.0
    envelope_area = sum(f["area"] for f in faces)
    glazing_area = sum(a["area"] for a in apertures)
    glazing_ratio = glazing_area / envelope_area if envelope_area > 1e-6 else 0.0
    surface_to_volume = envelope_area / enclosed_volume if enclosed_volume > 1e-6 else 0.0
    ridge_height = P["walls"]["h"] + P["roof"]["ridgeRise"]
    pitch_deg = (P["roof"]["pitchL"] + P["roof"]["pitchR"]) / 2

    return {
        "solarEnvelope": solar_env, "solarUseful": solar_use, "solarSouth": solar_south,
        "solarWinterUseful": solar_winter, "solarSummerUseful": solar_summer, "overheatRatio": overheat,
        "windExposure": wind_exposure, "windPressure": wind_pressure, "channelIndex": channel,
        "stackIndex": stack_index, "stackHeight": stack_height, "effectiveOpenArea": Astar,
        "viewAmount": view_amount, "viewQuality": view_quality, "skyView": sky_view,
        "soilContactArea": soil_contact, "massVolume": mass_volume, "thermalMassRatio": thermal_ratio,
        "buriedFraction": buried_fraction,
        "enclosedVolume": enclosed_volume, "envelopeArea": envelope_area, "glazingArea": glazing_area,
        "glazingRatio": glazing_ratio, "surfaceToVolume": surface_to_volume,
        "footprint": Pl["W"] * Pl["L"], "ridgeHeight": ridge_height, "pitchDeg": pitch_deg,
        "pitchLeft": P["roof"]["pitchL"], "pitchRight": P["roof"]["pitchR"],
    }


def analyze(params, site):
    model = build_model(params, site)
    return model, compute_metrics(model)


def flatten(params, metrics):
    out = {}
    for grp in ("plinth", "walls", "roof"):
        for k, v in params[grp].items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                out["%s_%s" % (grp, k)] = v
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
