import { useMemo } from 'react'
import * as THREE from 'three'
import { buildArcCurve, buildLeafGeometry, makeRng, tangentQuaternion } from './geometry'
import { useLivingGrowth } from './useLivingGrowth'
import PetalCluster from './PetalCluster'

const STEM_COLOR_TOP = new THREE.Color('#8fbf6b')
const STEM_COLOR_BOTTOM = new THREE.Color('#3f6b3a')
const LEAF_COLOR = new THREE.Color('#5f9650')
const CALYX_COLOR = new THREE.Color('#3c6b38')

const stemMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.75,
  metalness: 0.05,
})
const leafMaterial = new THREE.MeshStandardMaterial({
  color: LEAF_COLOR,
  roughness: 0.7,
  metalness: 0.05,
  side: THREE.DoubleSide,
})
const calyxMaterial = new THREE.MeshStandardMaterial({
  color: CALYX_COLOR,
  roughness: 0.8,
  metalness: 0.02,
})

const TUBULAR_SEGMENTS = 16
const RADIAL_SEGMENTS = 6

function buildStemGeometry(curve, stemLength) {
  const geo = new THREE.TubeGeometry(curve, TUBULAR_SEGMENTS, stemLength * 0.028, RADIAL_SEGMENTS, false)
  const rowLen = RADIAL_SEGMENTS + 1
  const colors = new Float32Array((TUBULAR_SEGMENTS + 1) * rowLen * 3)
  const tmp = new THREE.Color()
  for (let i = 0; i <= TUBULAR_SEGMENTS; i++) {
    const t = i / TUBULAR_SEGMENTS
    tmp.copy(STEM_COLOR_BOTTOM).lerp(STEM_COLOR_TOP, t)
    for (let j = 0; j < rowLen; j++) {
      const idx = i * rowLen + j
      colors[idx * 3] = tmp.r
      colors[idx * 3 + 1] = tmp.g
      colors[idx * 3 + 2] = tmp.b
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

export default function CarnationMesh({ stemLength = 1, flowerScale = 0.55, phi = 0, theta = 0, delay = 0, seedValue = 1 }) {
  const parts = useMemo(() => {
    const rng = makeRng(Math.floor(seedValue * 1e6))
    const curve = buildArcCurve({ length: stemLength, phi, theta, rng })
    const stemGeo = buildStemGeometry(curve, stemLength)
    const leafFlip = rng() > 0.5 ? 1 : -1
    const leafGeo1 = buildLeafGeometry({ length: stemLength * 0.3, width: stemLength * 0.05, curl: stemLength * 0.05 })
    const leafGeo2 = buildLeafGeometry({ length: stemLength * 0.24, width: stemLength * 0.045, curl: stemLength * 0.04 })
    const calyxGeo = new THREE.CylinderGeometry(flowerScale * 0.16, flowerScale * 0.22, flowerScale * 0.3, 10)

    const leaf1T = 0.56
    const leaf2T = 0.42
    const calyxT = Math.max(0.7, 1 - (flowerScale * 0.1) / stemLength)

    return {
      stemGeo,
      leafFlip,
      leafGeo1,
      leafGeo2,
      calyxGeo,
      leaf1Point: curve.getPoint(leaf1T),
      leaf1Quat: tangentQuaternion(curve.getTangent(leaf1T)),
      leaf2Point: curve.getPoint(leaf2T),
      leaf2Quat: tangentQuaternion(curve.getTangent(leaf2T)),
      calyxPoint: curve.getPoint(calyxT),
      calyxQuat: tangentQuaternion(curve.getTangent(calyxT)),
      tipPoint: curve.getPoint(1),
      tipQuat: tangentQuaternion(curve.getTangent(1)),
    }
  }, [stemLength, flowerScale, phi, theta, seedValue])

  const windRng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 999), [seedValue])
  const groupRef = useLivingGrowth(delay, windRng)

  return (
    <group ref={groupRef} scale={0.001}>
      <mesh geometry={parts.stemGeo} material={stemMaterial} />

      <group position={parts.leaf1Point} quaternion={parts.leaf1Quat}>
        <group rotation={[0, 0, (Math.PI / 5) * parts.leafFlip]}>
          <mesh geometry={parts.leafGeo1} material={leafMaterial} />
        </group>
      </group>
      <group position={parts.leaf2Point} quaternion={parts.leaf2Quat}>
        <group rotation={[0.3, Math.PI, (-Math.PI / 4.2) * parts.leafFlip]}>
          <mesh geometry={parts.leafGeo2} material={leafMaterial} />
        </group>
      </group>

      <mesh geometry={parts.calyxGeo} material={calyxMaterial} position={parts.calyxPoint} quaternion={parts.calyxQuat} />

      <group position={parts.tipPoint} quaternion={parts.tipQuat}>
        <PetalCluster flowerScale={flowerScale} seedValue={seedValue} />
      </group>
    </group>
  )
}
