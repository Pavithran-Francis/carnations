import { useMemo } from 'react'
import * as THREE from 'three'

// Chic, slightly bulbous modern vase profile (radius, height-from-base),
// revolved into a lathe. Rim sits at local y = 0 so stems planted at y = 0
// read as "emerging from the opening".
const PROFILE = [
  [0, 0],
  [0.3, 0],
  [0.34, 0.06],
  [0.36, 0.32],
  [0.35, 0.58],
  [0.31, 0.82],
  [0.285, 0.94],
  [0.3, 1.0],
  [0.33, 1.03],
  [0.315, 1.05],
]

export default function Vase({ height = 1.05 }) {
  const geometry = useMemo(() => {
    const points = PROFILE.map(([r, y]) => new THREE.Vector2(r, y - height))
    return new THREE.LatheGeometry(points, 56)
  }, [height])

  return (
    <mesh geometry={geometry}>
      {/* Transmission-based glass goes visually invisible against a pure
          black scene background (nothing behind it to refract/highlight),
          so this leans on a translucent dark base color + strong clearcoat
          shine instead - reads as glass without vanishing entirely. */}
      <meshPhysicalMaterial
        color="#453a54"
        transparent
        opacity={0.5}
        roughness={0.05}
        ior={1.5}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.03}
        reflectivity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
