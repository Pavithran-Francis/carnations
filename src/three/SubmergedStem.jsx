import { useMemo } from 'react'
import * as THREE from 'three'
import { makeRng } from './geometry'
import { useLivingGrowth } from './useLivingGrowth'

const TOP_COLOR = new THREE.Color('#6f9c58')
const BOTTOM_COLOR = new THREE.Color('#2c4a28')

const stemMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.7,
  metalness: 0.05,
})

function buildSubmergedGeometry(rng, depth) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -depth, 0),
    new THREE.Vector3((rng() - 0.5) * depth * 0.18, -depth * 0.62, (rng() - 0.5) * depth * 0.18),
    new THREE.Vector3((rng() - 0.5) * depth * 0.12, -depth * 0.28, (rng() - 0.5) * depth * 0.12),
    new THREE.Vector3(0, 0, 0),
  ])
  const geo = new THREE.TubeGeometry(curve, 10, depth * 0.026, 6, false)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) + depth) / depth))
    tmp.copy(BOTTOM_COLOR).lerp(TOP_COLOR, t)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

// The part of a stem that stays inside the vase, below the rim - rendered
// unrotated (unlike the bloom above it, which fans out) so it stays close to
// the vase's central axis and reads as bundled stems visible through glass.
export default function SubmergedStem({ depth = 0.6, seedValue = 1, delay = 0 }) {
  const geometry = useMemo(() => {
    const rng = makeRng(Math.floor(seedValue * 1e6) + 4242)
    return buildSubmergedGeometry(rng, depth)
  }, [depth, seedValue])

  const windRng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 5151), [seedValue])
  const groupRef = useLivingGrowth(delay, windRng)

  return (
    <group ref={groupRef} scale={0.001}>
      <mesh geometry={geometry} material={stemMaterial} />
    </group>
  )
}
