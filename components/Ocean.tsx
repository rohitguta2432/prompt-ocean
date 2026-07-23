'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';

export type OceanParams = {
  amplitude: number; choppiness: number; waveLength: number; speed: number;
  windDir: number; foam: number; deepColor: string; surfaceColor: string;
  sunColor: string; sunElevation: number; sunAzimuth: number; turbidity: number;
};

const VERT = /* glsl */ `
uniform float uTime, uAmplitude, uChoppiness, uWaveLength, uSpeed, uWindDir;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;

const int NUM_WAVES = 7;

// Sum of Gerstner (trochoidal) waves: crests sharpen because points move
// horizontally toward crests, not just up and down like a sine.
vec3 gerstner(vec2 p) {
  vec3 disp = vec3(0.0);
  for (int i = 0; i < NUM_WAVES; i++) {
    float fi = float(i);
    float ang = uWindDir + (fract(sin(fi * 12.9898) * 43758.5453) - 0.5) * 1.5;
    vec2 d = vec2(cos(ang), sin(ang));
    float L = max(uWaveLength * pow(0.62, fi), 2.0);
    float k = 6.28318 / L;
    float a = uAmplitude * pow(0.68, fi);
    float c = sqrt(9.8 / k) * uSpeed;          // deep-water dispersion relation
    float f = k * (dot(d, p) - c * uTime);
    float q = uChoppiness / (k * float(NUM_WAVES));
    disp.x += q * d.x * cos(f);
    disp.z += q * d.y * cos(f);
    disp.y += a * sin(f);
  }
  return disp;
}

void main() {
  vec2 p = position.xz;
  float eps = 1.2;
  vec3 d0 = gerstner(p);
  vec3 dX = gerstner(p + vec2(eps, 0.0));
  vec3 dZ = gerstner(p + vec2(0.0, eps));
  vec3 P0 = vec3(p.x, 0.0, p.y) + d0;
  vec3 PX = vec3(p.x + eps, 0.0, p.y) + dX;
  vec3 PZ = vec3(p.x, 0.0, p.y + eps) + dZ;
  vNormal = normalize(cross(PZ - P0, PX - P0));
  vCrest = clamp(d0.y / (uAmplitude * 1.6 + 0.001), -1.0, 1.0);
  vec4 world = modelMatrix * vec4(P0, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uDeepColor, uSurfaceColor, uSunColor, uSunDir, uSkyColor;
uniform float uFoam;
varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vCrest;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);

  float height = clamp(vCrest * 0.5 + 0.5, 0.0, 1.0);
  vec3 water = mix(uDeepColor, uSurfaceColor, height);

  // backlit crests: cheap subsurface-scattering feel
  float sss = pow(max(dot(v, -uSunDir), 0.0), 3.0) * height * 0.35;
  water += uSurfaceColor * sss;

  vec3 color = mix(water, uSkyColor, fresnel * 0.75);

  vec3 h = normalize(v + uSunDir);
  color += uSunColor * pow(max(dot(n, h), 0.0), 240.0) * 2.5;

  float foam = smoothstep(0.5, 0.95, vCrest) * uFoam;
  foam *= 0.75 + 0.25 * fract(sin(dot(floor(vWorldPos.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
  color = mix(color, vec3(0.96), clamp(foam, 0.0, 1.0));

  // fade into the horizon so the plane edge never shows
  float dist = length(vWorldPos - cameraPosition);
  color = mix(color, uSkyColor, smoothstep(90.0, 330.0, dist));

  gl_FragColor = vec4(color, 1.0);
}
`;

function sunVector(elevationDeg: number, azimuthDeg: number) {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
}

export default function Ocean({ target }: { target: OceanParams }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const skyRef = useRef<any>(null);
  // animated copy of the params — every frame it eases toward `target`,
  // which is what makes a new prompt morph the ocean instead of snapping it
  const anim = useRef({ ...target, deep: new THREE.Color(target.deepColor), surf: new THREE.Color(target.surfaceColor), sun: new THREE.Color(target.sunColor) });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAmplitude: { value: target.amplitude },
    uChoppiness: { value: target.choppiness },
    uWaveLength: { value: target.waveLength },
    uSpeed: { value: target.speed },
    uWindDir: { value: THREE.MathUtils.degToRad(target.windDir) },
    uFoam: { value: target.foam },
    uDeepColor: { value: new THREE.Color(target.deepColor) },
    uSurfaceColor: { value: new THREE.Color(target.surfaceColor) },
    uSunColor: { value: new THREE.Color(target.sunColor) },
    uSunDir: { value: sunVector(target.sunElevation, target.sunAzimuth) },
    uSkyColor: { value: new THREE.Color('#87b7d4') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(520, 520, 300, 300);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((state, dt) => {
    const a = anim.current;
    const ease = Math.min(1, dt * 1.6);
    for (const k of ['amplitude', 'choppiness', 'waveLength', 'speed', 'windDir', 'foam', 'sunElevation', 'sunAzimuth', 'turbidity'] as const) {
      a[k] += (target[k] - a[k]) * ease;
    }
    a.deep.lerp(new THREE.Color(target.deepColor), ease);
    a.surf.lerp(new THREE.Color(target.surfaceColor), ease);
    a.sun.lerp(new THREE.Color(target.sunColor), ease);

    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uAmplitude.value = a.amplitude;
    u.uChoppiness.value = a.choppiness;
    u.uWaveLength.value = a.waveLength;
    u.uSpeed.value = a.speed;
    u.uWindDir.value = THREE.MathUtils.degToRad(a.windDir);
    u.uFoam.value = a.foam;
    (u.uDeepColor.value as THREE.Color).copy(a.deep);
    (u.uSurfaceColor.value as THREE.Color).copy(a.surf);
    (u.uSunColor.value as THREE.Color).copy(a.sun);

    // keep specular light just above the horizon even at night, dimmed
    const litElevation = Math.max(a.sunElevation, 6);
    const sunDir = sunVector(litElevation, a.sunAzimuth);
    (u.uSunDir.value as THREE.Vector3).copy(sunDir);
    const dayness = THREE.MathUtils.clamp((a.sunElevation + 10) / 40, 0.12, 1);
    const sky = u.uSkyColor.value as THREE.Color;
    sky.set('#87b7d4').lerp(new THREE.Color('#0b1020'), 1 - dayness);
    sky.lerp(a.sun, THREE.MathUtils.clamp(1 - a.sunElevation / 25, 0, 0.55) * dayness);

    // drive the drei Sky material directly — no React re-renders per frame
    const skyMat = skyRef.current?.material;
    if (skyMat) {
      skyMat.uniforms.sunPosition.value.copy(sunVector(a.sunElevation, a.sunAzimuth));
      skyMat.uniforms.turbidity.value = a.turbidity;
    }
  });

  return (
    <>
      <Sky ref={skyRef} distance={4000} sunPosition={[0.3, 0.5, 0.2]} turbidity={target.turbidity} rayleigh={2} />
      {target.sunElevation < 2 && <Stars radius={300} depth={40} count={3000} factor={5} fade speed={0.5} />}
      <mesh geometry={geometry}>
        <shaderMaterial ref={matRef} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
      </mesh>
    </>
  );
}
