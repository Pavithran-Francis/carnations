import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildPetalGeometry, directionQuaternion, makeRng } from './geometry'

const petalMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.48,
  metalness: 0.02,
  side: THREE.DoubleSide,
})

let sharedPetalGeometry = null
function getPetalGeometry() {
  if (!sharedPetalGeometry) {
    sharedPetalGeometry = buildPetalGeometry({
      seed: 3,
      edgeRuffle: 0.015,
      ruffles: 3,
      cupWidth: 0.22,
      cupLength: 0.12,
      lengthSegments: 12,
      widthSegments: 12,
    })
  }
  return sharedPetalGeometry
}

// Many small, densely packed whorls (not a few big ones) is what actually
// reads as a real carnation/peony bloom instead of a flat paper flower -
// the reference is a tight, rounded pom-pom of petals, not a wide open disc.
const WHORLS = [
  { count: 13, phi: 0.09, length: 0.32, widthRatio: 0.72, yOffset: 0.055, color: '#d43a4c' },
  { count: 16, phi: 0.25, length: 0.37, widthRatio: 0.7, yOffset: 0.042, color: '#cc2d42' },
  { count: 18, phi: 0.43, length: 0.42, widthRatio: 0.68, yOffset: 0.03, color: '#c1233a' },
  { count: 20, phi: 0.61, length: 0.46, widthRatio: 0.66, yOffset: 0.018, color: '#b31d33' },
  { count: 20, phi: 0.79, length: 0.49, widthRatio: 0.64, yOffset: 0.006, color: '#a3182c' },
  { count: 18, phi: 0.96, length: 0.51, widthRatio: 0.62, yOffset: -0.008, color: '#8f1526' },
  { count: 16, phi: 1.11, length: 0.51, widthRatio: 0.6, yOffset: -0.02, color: '#7a1120' },
  { count: 14, phi: 1.24, length: 0.49, widthRatio: 0.58, yOffset: -0.032, color: '#650f1c' },
]

const dummy = new THREE.Object3D()
const colorObj = new THREE.Color()

export default function PetalCluster({ flowerScale = 0.55, seedValue = 1 }) {
  const meshRef = useRef()
  const rng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 555), [seedValue])

  const petals = useMemo(() => {
    const items = []
    WHORLS.forEach((whorl) => {
      const azOffset = rng() * Math.PI * 2
      const azJitter = (Math.PI / whorl.count) * 0.5
      for (let i = 0; i < whorl.count; i++) {
        const azimuth = (2 * Math.PI / whorl.count) * i + azOffset + (rng() - 0.5) * azJitter
        const phi = whorl.phi + (rng() - 0.5) * 0.08
        const length = whorl.length * flowerScale * (0.9 + rng() * 0.2)
        const width = length * whorl.widthRatio * (0.85 + rng() * 0.3)
        items.push({
          phi,
          azimuth,
          y: whorl.yOffset * flowerScale,
          length,
          width,
          twist: (rng() - 0.5) * 0.5,
          color: whorl.color,
        })
      }
    })
    return items
  }, [flowerScale, rng])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    petals.forEach((p, i) => {
      dummy.position.set(0, p.y, 0)
      dummy.quaternion.copy(directionQuaternion(p.phi, p.azimuth))
      dummy.rotateY(p.twist)
      dummy.scale.set(p.width, p.length, p.width * 0.7)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, colorObj.set(p.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [petals])

  return <instancedMesh ref={meshRef} args={[getPetalGeometry(), petalMaterial, petals.length]} />
}
