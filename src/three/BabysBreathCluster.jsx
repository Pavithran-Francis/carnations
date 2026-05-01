import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeRng } from './geometry'
import { useLivingGrowth } from './useLivingGrowth'

const dummy = new THREE.Object3D()

// One small spray of baby's-breath puffs, grown in and swayed the same way
// as everything else planted in the bouquet - each cluster is its own tiny
// instanced mesh so it can pop in independently instead of appearing whole.
export default function BabysBreathCluster({ puffs, reach = 1, delay = 0, seedValue = 1 }) {
  const meshRef = useRef()
  const windRng = useMemo(() => makeRng(Math.floor(seedValue * 1e6) + 999), [seedValue])
  const groupRef = useLivingGrowth(delay, windRng)

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    puffs.forEach((puff, i) => {
      dummy.position.set(puff.offset[0], reach + puff.offset[1], puff.offset[2])
      dummy.scale.setScalar(puff.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [puffs, reach])

  return (
    <group ref={groupRef} scale={0.001}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, puffs.length]}>
        <sphereGeometry args={[0.055, 7, 7]} />
        <meshStandardMaterial color="#f5efe2" roughness={0.85} metalness={0} />
      </instancedMesh>
    </group>
  )
}
