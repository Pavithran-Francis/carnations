import { useMemo } from 'react'
import * as THREE from 'three'
import { buildLeafGeometry, makeRng } from './geometry'
import { useLivingGrowth } from './useLivingGrowth'

const leafMaterial = new THREE.MeshStandardMaterial({ color: '#356b34', roughness: 0.5, side: THREE.DoubleSide })

// A single broad leaf tucked in near the vase rim, the way real arrangements
// use a few bigger leaves for structure rather than only fine filler greenery.
export default function LeafOrnament({ length = 0.6, seedValue = 1, delay = 0 }) {
  // Width/curl stay near-constant as length grows, so a longer leaf reads as
  // a longer thin blade rather than a proportionally bigger leaf overall.
  const geometry = useMemo(
    () => buildLeafGeometry({ length, width: 0.11 + length * 0.05, curl: 0.05 + length * 0.03, bend: 0.05 + length * 0.03, segments: 12 }),
    [length]
  )
  const windRng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 999), [seedValue])
  const groupRef = useLivingGrowth(delay, windRng)

  return (
    <group ref={groupRef} scale={0.001}>
      <mesh geometry={geometry} material={leafMaterial} />
    </group>
  )
}
