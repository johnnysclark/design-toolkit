// dof.js — depth-of-field as a post-process, driven by the SAME thin-lens formula
// as optics.js so the blur on screen tracks the numbers in the panel. The scene is
// rendered to a colour+depth target; a full-screen pass computes each pixel's
// blur-disc diameter b = A·f·|d−s| / (d·(s−f)) (in metres on the sensor), converts
// it to pixels via the frame height, and does a depth-aware disc gather. Needs only
// `three` (no postprocessing addons).

export function createDof(THREE, renderer) {
  const rt = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.HalfFloatType
  });
  rt.depthTexture = new THREE.DepthTexture(2, 2);
  rt.depthTexture.type = THREE.UnsignedIntType;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rt.texture },
      tDepth: { value: rt.depthTexture },
      uTexel: { value: new THREE.Vector2(0.5, 0.5) },
      uFrameH: { value: 600 },     // px height of the rendered frame
      uFocal: { value: 0.05 },     // metres
      uAperture: { value: 0.018 }, // metres (focal / f-number)
      uFocus: { value: 4.0 },      // metres
      uSensorH: { value: 0.024 },  // metres
      uNear: { value: 0.1 },
      uFar: { value: 2000 },
      uMaxBlur: { value: 36 },     // px clamp
      uEnabled: { value: 1 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      #include <packing>
      varying vec2 vUv;
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 uTexel;
      uniform float uFrameH, uFocal, uAperture, uFocus, uSensorH, uNear, uFar, uMaxBlur, uEnabled;

      float distAt(vec2 uv) {
        float depth = texture2D(tDepth, uv).x;
        float viewZ = perspectiveDepthToViewZ(depth, uNear, uFar);
        return -viewZ; // metres from the camera
      }
      float blurPxAt(float d) {
        if (d <= 0.0) return 0.0;
        float b = uAperture * uFocal * abs(d - uFocus) / (d * (uFocus - uFocal)); // m on sensor
        return min((b / uSensorH) * uFrameH, uMaxBlur);
      }

      const int TAPS = 48;
      const float GOLDEN = 2.39996323;

      // Linear → sRGB for display (we sample a linear render target and write to the
      // sRGB canvas ourselves, since a custom pass gets no automatic conversion).
      vec3 toSRGB(vec3 c) {
        c = clamp(c, 0.0, 1.0);
        return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, step(c, vec3(0.0031308)));
      }

      void main() {
        vec3 center = texture2D(tColor, vUv).rgb;
        vec3 outc = center;
        float cd = distAt(vUv);
        float cBlur = blurPxAt(cd);

        if (uEnabled >= 0.5 && cBlur >= 0.75) {
          vec3 sum = center;
          float wsum = 1.0;
          for (int i = 1; i <= TAPS; i++) {
            float fi = float(i);
            float r = sqrt(fi / float(TAPS)) * cBlur;       // px from centre (even disc fill)
            float a = fi * GOLDEN;
            vec2 suv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
            float sd = distAt(suv);
            float sBlur = blurPxAt(sd);
            // accept a neighbour if its own blur disc reaches this far (scatter-as-gather),
            // and let nearer (foreground) pixels spread onto farther ones.
            float w = step(r - 1.0, sBlur);
            if (sd < cd) w = max(w, clamp(sBlur / max(r, 1.0), 0.0, 1.0));
            sum += texture2D(tColor, suv).rgb * w;
            wsum += w;
          }
          outc = sum / wsum;
        }
        gl_FragColor = vec4(toSRGB(outc), 1.0);
      }
    `
  });

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);

  let dpr = 1;
  function setSize(w, h, pixelRatio) {
    dpr = pixelRatio;
    const pw = Math.max(2, Math.round(w * dpr));
    const ph = Math.max(2, Math.round(h * dpr));
    rt.setSize(pw, ph);
    material.uniforms.uTexel.value.set(1 / pw, 1 / ph);
    material.uniforms.uFrameH.value = ph;
  }

  // params: { focalMm, fNumber, focusM, sensorHmm, near, far, enabled }
  function render(scene, camera, params) {
    material.uniforms.uFocal.value = params.focalMm / 1000;
    material.uniforms.uAperture.value = params.focalMm / params.fNumber / 1000;
    material.uniforms.uFocus.value = params.focusM;
    material.uniforms.uSensorH.value = params.sensorHmm / 1000;
    material.uniforms.uNear.value = camera.near;
    material.uniforms.uFar.value = camera.far;
    material.uniforms.uEnabled.value = params.enabled ? 1 : 0;

    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  function dispose() {
    rt.dispose();
    material.dispose();
    quad.geometry.dispose();
  }

  return { setSize, render, dispose };
}
