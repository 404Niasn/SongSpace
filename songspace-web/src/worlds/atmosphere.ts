import * as T from 'three'
import type { WorldId } from './types'
import type { WeatherId } from '../game/content'
export function atmosphere(world: WorldId, evening: boolean, weather: WeatherId = 'clear') {
  const muted = ['rain', 'snow', 'overcast'].includes(weather)
  const colors = world === 'space' ? ['#030617', '#191d46'] : world === 'fuji' && weather === 'clear' && !evening ? ['#a8c9e5', '#f4dce3'] : weather === 'snow' ? ['#879eaf', '#e2ebf0'] : weather === 'overcast' ? ['#697580', '#b7c0c7'] : weather === 'rain' ? ['#657d89', '#b5c4ca'] : weather === 'sunset' ? ['#b56d89', '#f6bf86'] : evening
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
      sunVisibility: { value: world === 'space' || muted ? 0 : 1 },
      nebula: { value: world === 'space' ? 1 : 0 },
    },
    vertexShader:
      'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 zenith;uniform vec3 horizon;uniform float sunVisibility;uniform float nebula;varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float h=pow(max(0.,d.y),.55);vec3 c=mix(horizon,zenith,h);float sun=max(0.,dot(d,normalize(vec3(-.8,.24,-1.))));c+=vec3(1.,.65,.33)*pow(sun,32.)*.2*sunVisibility;c=mix(c,vec3(1.,.87,.63),smoothstep(.9988,.9998,sun)*sunVisibility);float dust=exp(-pow((d.y-.32-d.x*.25-sin(d.z*3.)*.08)*9.,2.));float filaments=.55+.23*sin(d.x*19.+sin(d.z*13.))+.13*sin(d.x*47.-d.z*29.);c+=nebula*dust*filaments*mix(vec3(.045,.09,.14),vec3(.12,.055,.12),.5+.5*sin(d.x*4.+d.z));gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  })
  const sky = new T.Mesh(new T.SphereGeometry(230, 32, 16), material)
  sky.frustumCulled = false
  sky.renderOrder = -10
  return sky
}
