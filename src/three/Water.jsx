import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: '#1c5c78',
  transparent: true,
  opacity: 0.55,
  roughness: 0.12,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  side: THREE.DoubleSide,
})

// A water surface sitting inside the vase: always gently rippling (part of
// the same "never quite still" idea as the wind), and it slosh harder the
// faster `shakeEnergy.current` is driven - by fast orbit-dragging, standing
// in for "shaking" the vase - decaying back to calm on its own each frame.
export default function Water({ radius = 0.32, y = -0.56, shakeEnergy }) {
  const meshRef = useRef()
  const geometry = useMemo(() => new THREE.CircleGeometry(radius, 48), [radius])
  const basePositions = useMemo(() => geometry.attributes.position.array.slice(), [geometry])

  useFrame((state) => {
    if (shakeEnergy) shakeEnergy.current *= 0.94
    const energy = shakeEnergy ? shakeEnergy.current : 0
    const t = state.clock.elapsedTime
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = basePositions[i * 3]
      const yLocal = basePositions[i * 3 + 1]
      const r = Math.hypot(x, yLocal)
      const idle = 0.005 * Math.sin(r * 11 - t * 1.1) + 0.003 * Math.sin(x * 8 + t * 0.7)
      const slosh = energy * 0.05 * Math.sin(x * 5 - t * 7) * Math.exp(-r * 1.2)
      pos.array[i * 3 + 2] = idle + slosh
    }
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return <mesh ref={meshRef} geometry={geometry} material={waterMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} />
}
