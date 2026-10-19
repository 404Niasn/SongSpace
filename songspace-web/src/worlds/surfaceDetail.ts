import * as T from 'three'

// World-space detail survives merged geometry without needing an image per building.
export function weatheredSurface(color: string, kind: 'wood' | 'plaster' | 'stone') {
  const material = new T.MeshStandardMaterial({ color, roughness: kind === 'wood' ? .72 : .93 })
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vSurfaceDetail;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfaceDetail=(modelMatrix*vec4(transformed,1.)).xyz;')
    shader.fragmentShader = 'varying vec3 vSurfaceDetail;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 p=vSurfaceDetail;
      float grain=fract(sin(dot(floor(p*160.),vec3(127.1,311.7,74.7)))*43758.5453);
      ${kind === 'wood' ? `float vein=sin(p.y*35.+sin(p.x*2.+p.z*3.)*1.4);
      diffuseColor.rgb*=.88+grain*.10+vein*.055;` : kind === 'plaster' ? `float stain=sin(p.x*1.7+sin(p.z*2.1))*.5+.5;
      float damp=(1.-smoothstep(.3,1.35+stain*.4,p.y))*.22;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.24,.31,.23),damp)*(.94+grain*.09);` : `float course=step(.94,fract(p.y*5.));
      diffuseColor.rgb*=.9+grain*.10-course*.13;`}
    `)
  }
  material.customProgramCacheKey = () => `surface-${kind}-v1`
  return material
}
