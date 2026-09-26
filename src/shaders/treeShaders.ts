import * as THREE from 'three';

export interface BarkShaderUniforms {
  uGrowth: { value: number };
  uTime: { value: number };
  uWindStrength: { value: number };
  uFinaleGlow: { value: number };
}

/**
 * Injects GPU-driven biological radial trunk/branch growth, juvenile-shoot self-pruning,
 * and gentle outer-twig wind sway into Three.js's native PBR MeshStandardMaterial.
 * Preserves full Three.js sRGB texture decoding, bump mapping, shadow receiving, and tone mapping.
 */
export function applyBarkGrowthShader(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: BarkShaderUniforms
): void {
  shader.uniforms.uGrowth = uniforms.uGrowth;
  shader.uniforms.uTime = uniforms.uTime;
  shader.uniforms.uWindStrength = uniforms.uWindStrength;
  shader.uniforms.uFinaleGlow = uniforms.uFinaleGlow;

  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    /* glsl */ `
    #include <common>
    attribute vec3 aSpinePos;
    attribute float aBirth;
    attribute float aMature;
    attribute float aPrune;
    attribute float aLevel;

    uniform float uGrowth;
    uniform float uTime;
    uniform float uWindStrength;

    varying float vLocalGrowth;

    float smoothGrowth(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / max(0.0001, edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }
    `
  );

  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    /* glsl */ `
    vec3 transformed = vec3(position);
    float emergeFactor = smoothGrowth(aBirth, aMature, uGrowth);
    float pruneFactor = aPrune > 0.0 ? (1.0 - smoothGrowth(aPrune, aPrune + 0.14, uGrowth)) : 1.0;
    float localGrowth = emergeFactor * pruneFactor;
    vLocalGrowth = localGrowth;

    vec3 radialOffset = transformed - aSpinePos;
    float juvenileToAncientCurve = mix(
      pow(localGrowth, 1.22),
      pow(localGrowth, 0.70),
      clamp(aLevel * 0.5, 0.0, 1.0)
    );
    float ancientGirthBoost = mix(0.012, 1.0, pow(smoothGrowth(0.05, 0.72, uGrowth), 1.32));
    float radiusScale = juvenileToAncientCurve * mix(ancientGirthBoost, 1.0, clamp(aLevel * 0.6, 0.0, 1.0));

    transformed = aSpinePos + radialOffset * radiusScale;

    float outerBranchFactor = smoothstep(0.8, 3.5, aLevel) * clamp(transformed.y / 7.0, 0.0, 1.2) * localGrowth;
    transformed.x += sin(uTime * 0.95 + transformed.y * 0.55 + transformed.x * 0.4) * 0.022 * outerBranchFactor * uWindStrength;
    transformed.z += cos(uTime * 0.82 + transformed.z * 0.5 + transformed.y * 0.45) * 0.022 * outerBranchFactor * uWindStrength;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    /* glsl */ `
    #include <common>
    varying float vLocalGrowth;
    `
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <clipping_planes_fragment>',
    /* glsl */ `
    #include <clipping_planes_fragment>
    if (vLocalGrowth < 0.035) {
      discard;
    }
    `
  );
}
