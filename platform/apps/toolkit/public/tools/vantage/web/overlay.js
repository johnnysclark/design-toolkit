// overlay.js — the draughtsman's layer drawn over the live frame: the horizon
// (eye level) and the vanishing points of the scene's three axes. It reads the
// camera's real matrices (including any tilt-shift), so converging verticals (tilt)
// vs parallel verticals (shift) show up exactly as in hand-drawn perspective.

// Vanishing point of a world DIRECTION = where its point at infinity projects.
function vpOfDirection(THREE, camera, m, dir, W, H) {
  const v = new THREE.Vector4(dir.x, dir.y, dir.z, 0).applyMatrix4(m);
  if (Math.abs(v.w) < 1e-4) return { parallel: true }; // lines stay parallel in the image
  const ndcX = v.x / v.w, ndcY = v.y / v.w;
  return {
    parallel: false,
    x: (ndcX * 0.5 + 0.5) * W,
    y: (1 - (ndcY * 0.5 + 0.5)) * H
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function drawOverlay(ctx, THREE, camera, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  camera.updateMatrixWorld();
  const m = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);

  // --- horizon = eye level: VP of the camera's horizontal forward direction ----
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const horizFwd = new THREE.Vector3(fwd.x, 0, fwd.z);
  let horizonY = null;
  if (horizFwd.lengthSq() > 1e-6) {
    horizFwd.normalize();
    const hv = vpOfDirection(THREE, camera, m, horizFwd, W, H);
    if (!hv.parallel) horizonY = hv.y;
  }
  if (horizonY !== null && horizonY > -50 && horizonY < H + 50) {
    ctx.strokeStyle = "#111";
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(W, horizonY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#111";
    ctx.fillText("horizon · eye level", 8, clamp(horizonY - 10, 10, H - 10));
  }

  // --- depth vanishing point (the colonnade runs to it) ------------------------
  const depthVP = vpOfDirection(THREE, camera, m, new THREE.Vector3(0, 0, -1), W, H);
  if (!depthVP.parallel && depthVP.y > -200 && depthVP.y < H + 200) {
    ctx.strokeStyle = "rgba(31,111,235,0.45)";
    for (const cx of [0, W]) {
      ctx.beginPath(); ctx.moveTo(cx, H); ctx.lineTo(depthVP.x, depthVP.y); ctx.stroke();
    }
    dot(ctx, clamp(depthVP.x, 8, W - 8), clamp(depthVP.y, 8, H - 8), "#1f6feb", "VP");
  }

  // --- lateral vanishing point (2-point perspective second VP) -----------------
  const latVP = vpOfDirection(THREE, camera, m, new THREE.Vector3(1, 0, 0), W, H);
  if (!latVP.parallel && latVP.x > -400 && latVP.x < W + 400 && Math.abs(latVP.y - (horizonY ?? H / 2)) < 80) {
    dot(ctx, clamp(latVP.x, 8, W - 8), clamp(latVP.y, 8, H - 8), "#1f6feb", "VP");
  }

  // --- verticals: parallel (level / shift) vs converging (tilt) ---------------
  const vertVP = vpOfDirection(THREE, camera, m, new THREE.Vector3(0, 1, 0), W, H);
  ctx.fillStyle = "#111";
  if (vertVP.parallel || Math.abs(vertVP.y) > H * 6) {
    ctx.fillText("verticals parallel ‖", W - 132, H - 16);
  } else {
    const vx = clamp(vertVP.x, 10, W - 10);
    const vy = clamp(vertVP.y, 10, H - 10);
    dot(ctx, vx, vy, "#c2462f", "vertical VP");
    ctx.fillStyle = "#111";
    ctx.fillText("verticals converge", W - 142, H - 16);
  }

  ctx.restore();
}

function dot(ctx, x, y, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.fillText(label, x + 8, y);
}
