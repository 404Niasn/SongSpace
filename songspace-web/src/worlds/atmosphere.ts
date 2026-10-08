import * as T from 'three'
import type { WorldId } from './types'
export function atmosphere(world: WorldId, evening: boolean) {
  const colors = evening
    ? ['#13283c', '#697184']
    : world === 'sea'
      ? ['#b98185', '#f5cfaa']
      : world === 'jiangnan'
        ? ['#a4bfc8', '#e7dcca']
        : ['#a5c7c0', '#e3e5c9']
  const material = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new T.Color(colors[0]) },
      horizon: { value: new T.Color(colors[1]) },
    },
    vertexShader:
      'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 zenith;uniform vec3 horizon;varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float h=pow(max(0.,d.y),.55);vec3 c=mix(horizon,zenith,h);float sun=max(0.,dot(d,normalize(vec3(-.8,.24,-1.))));c+=vec3(1.,.65,.33)*pow(sun,32.)*.2;c=mix(c,vec3(1.,.87,.63),smoothstep(.9988,.9998,sun));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  })
  const sky = new T.Mesh(new T.SphereGeometry(230, 32, 16), material)
  sky.frustumCulled = false
  sky.renderOrder = -10
  return sky
}
