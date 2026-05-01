import { useMemo } from 'react'
import * as THREE from 'three'
import { buildArcCurve, makeRng, tangentQuaternion } from './geometry'
import { useLivingGrowth } from './useLivingGrowth'

const stemMaterial = new THREE.MeshStandardMaterial({ color: '#3f6b3a', roughness: 0.75 })
const leafMaterial = new THREE.MeshStandardMaterial({ color: '#3f7d3d', roughness: 0.55, side: THREE.DoubleSide })

// A short leafy filler sprig: a curved stem (leaning from vertical toward
// its target angle, same as the main stems) with rounded leaflets alternating
// along it, used to fill gaps between blooms like real foliage.
export default function Greenery({ length = 0.9, phi = 0, theta = 0, seedValue = 1, delay = 0 }) {
  const parts = useMemo(() => {
    const rng = makeRng(Math.floor(seedValue * 1e6))
    const curve = buildArcCurve({ length, phi, theta, rng })
    const stemGeo = new THREE.TubeGeometry(curve, 10, 0.012, 5, false)

    // Leaflet count scales with the sprig's length so a longer stem grows
    // more small leaves along it, rather than a few leaves stretched bigger.
    const count = Math.max(5, Math.round(length * 11)) + Math.floor(rng() * 3)
    const leaflets = Array.from({ length: count }, (_, i) => {
      const t = (i + 1) / (count + 1)
      const side = i % 2 === 0 ? 1 : -1
      return {
        point: curve.getPoint(t),
        quat: tangentQuaternion(curve.getTangent(t)),
        x: side * 0.06,
        size: 0.075 - t * 0.02,
        rot: side * 0.5 + (rng() - 0.5) * 0.2,
      }
    })

    return { stemGeo, leaflets }
  }, [length, phi, theta, seedValue])

  const windRng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 999), [seedValue])
  const groupRef = useLivingGrowth(delay, windRng)

  return (
    <group ref={groupRef} scale={0.001}>
      <mesh geometry={parts.stemGeo} material={stemMaterial} />
      {parts.leaflets.map((leaf, i) => (
        <group key={i} position={leaf.point} quaternion={leaf.quat}>
          <mesh material={leafMaterial} position={[leaf.x, 0, 0]} rotation={[0.3, 0, leaf.rot]} scale={[1, 0.7, 0.25]}>
            <sphereGeometry args={[leaf.size, 8, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
