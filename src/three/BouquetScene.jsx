import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import CarnationMesh from './CarnationMesh'
import BabysBreathCluster from './BabysBreathCluster'
import Greenery from './Greenery'
import LeafOrnament from './LeafOrnament'
import SubmergedStem from './SubmergedStem'
import Vase from './Vase'
import Water from './Water'
import { directionQuaternion, makeRng } from './geometry'
import './BouquetScene.css'

const V_FOV_RAD = (45 * Math.PI) / 180
const FRAME_MARGIN = 1.15

const VASE_HEIGHT = 1.05
const VASE_MAX_RADIUS = 0.36
const NECK_RADIUS = 0.24
const BASE_STEM = 1.0
const BASE_FLOWER = 0.55
const FLOWER_COUNT = 29
const MAX_PHI = 1.02
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// Fibonacci-spiral sampling over a spherical cap gives good, gap-free
// coverage without ever falling into clean rings; jitter on top of it is
// what actually sells "hand-tied bouquet" instead of "lathe-turned bouquet".
function domePoint(index, count, maxPhi, angleMul = 1) {
  const frac = count <= 1 ? 0 : index / (count - 1)
  const cosPhi = 1 - frac * (1 - Math.cos(maxPhi))
  const phi = Math.acos(Math.min(1, Math.max(-1, cosPhi)))
  const theta = index * GOLDEN_ANGLE * angleMul
  return { phi, theta }
}

function neckBase(rng, radius) {
  const r = rng() * radius
  const a = rng() * Math.PI * 2
  return [Math.cos(a) * r, Math.sin(a) * r]
}

function buildStems() {
  const rng = makeRng(777)
  const stems = []
  for (let i = 0; i < FLOWER_COUNT; i++) {
    const base = domePoint(i, FLOWER_COUNT, MAX_PHI)
    const phi = Math.max(0, base.phi + (rng() - 0.5) * 0.3)
    const theta = base.theta + (rng() - 0.5) * 0.6
    const reach = 0.8 + rng() * 0.46
    const flowerScale = BASE_FLOWER * (0.8 + rng() * 0.42)
    const [bx, bz] = neckBase(rng, NECK_RADIUS * 0.85)
    const submergedDepth = VASE_HEIGHT * (0.74 + rng() * 0.18)
    stems.push({
      id: i,
      phi,
      theta,
      baseX: bx,
      baseZ: bz,
      stemLength: BASE_STEM * reach,
      flowerScale,
      submergedDepth,
      delay: rng() * 1.3,
      seedValue: 1 + i * 1.37 + rng(),
    })
  }
  return stems
}

function buildFillers() {
  const rng = makeRng(4242)
  const greeneryCount = 22
  const babysBreathCount = 12
  const leafCount = 9

  const greenery = []
  for (let i = 0; i < greeneryCount; i++) {
    const drooping = i % 3 === 0
    const base = domePoint(i, greeneryCount, drooping ? 1.75 : 1.15, 1.3)
    const phi = Math.max(0, base.phi + (rng() - 0.5) * 0.3)
    const theta = base.theta + (rng() - 0.5) * 0.6
    const [bx, bz] = neckBase(rng, NECK_RADIUS * (drooping ? 1.05 : 0.75))
    greenery.push({
      phi,
      theta,
      baseX: bx,
      baseZ: bz,
      reach: 0.95 + rng() * 0.55,
      seedValue: 100 + i * 7 + rng(),
      delay: rng() * 1.3,
    })
  }

  const babysBreath = []
  for (let i = 0; i < babysBreathCount; i++) {
    const base = domePoint(i, babysBreathCount, 0.98, 1.7)
    const phi = Math.max(0, base.phi + (rng() - 0.5) * 0.34)
    const theta = base.theta + (rng() - 0.5) * 0.7
    const reach = 1.15 + rng() * 0.55
    const [bx, bz] = neckBase(rng, NECK_RADIUS * 0.8)
    const puffs = Array.from({ length: 5 + Math.floor(rng() * 3) }, () => ({
      offset: [(rng() - 0.5) * 0.22, (rng() - 0.5) * 0.22, (rng() - 0.5) * 0.22],
      size: 0.7 + rng() * 0.7,
    }))
    babysBreath.push({ phi, theta, baseX: bx, baseZ: bz, reach, puffs, delay: rng() * 1.3, seedValue: 200 + i * 11 + rng() })
  }

  const leaves = []
  for (let i = 0; i < leafCount; i++) {
    const base = domePoint(i, leafCount, 0.85, 2.1)
    const phi = Math.max(0, base.phi + (rng() - 0.5) * 0.3)
    const theta = base.theta + (rng() - 0.5) * 0.7
    const [bx, bz] = neckBase(rng, NECK_RADIUS * 0.9)
    leaves.push({
      phi,
      theta,
      baseX: bx,
      baseZ: bz,
      length: 0.85 + rng() * 0.45,
      seedValue: 300 + i * 13 + rng(),
      delay: rng() * 1.3,
    })
  }

  return { babysBreath, greenery, leaves }
}

// The layout is fully deterministic (fixed RNG seeds), so it's built once at
// module scope - both the scene and the camera-framing math read the exact
// same data instead of the camera guessing at hand-picked size constants.
const STEMS = buildStems()
const FILLERS = buildFillers()

function itemEndpoint(item, reach) {
  const dirX = Math.sin(item.phi) * Math.cos(item.theta)
  const dirY = Math.cos(item.phi)
  const dirZ = Math.sin(item.phi) * Math.sin(item.theta)
  return {
    x: item.baseX + dirX * reach,
    y: dirY * reach,
    z: item.baseZ + dirZ * reach,
  }
}

function computeBounds() {
  let maxHoriz = VASE_MAX_RADIUS
  let minY = -VASE_HEIGHT
  let maxY = 0

  const consider = (item, reach) => {
    const p = itemEndpoint(item, reach)
    maxHoriz = Math.max(maxHoriz, Math.hypot(p.x, p.z))
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }

  STEMS.forEach((s) => consider(s, s.stemLength + s.flowerScale * 1.15))
  FILLERS.greenery.forEach((g) => consider(g, g.reach + 0.15))
  FILLERS.leaves.forEach((l) => consider(l, l.length))
  FILLERS.babysBreath.forEach((b) => consider(b, b.reach + 0.2))

  return {
    halfWidth: maxHoriz,
    halfHeight: (maxY - minY) / 2,
    centerY: (maxY + minY) / 2,
  }
}

const BOUNDS = computeBounds()

// Perspective FOV is vertical, so a tall/narrow viewport gives a narrower
// horizontal FOV too - without this the bouquet (wider than it is tall)
// gets cropped on phone-sized aspect ratios. Push the camera back just
// enough that both dimensions fit, whichever needs more distance.
function ResponsiveCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / size.height
    const distV = BOUNDS.halfHeight / Math.tan(V_FOV_RAD / 2)
    const distH = BOUNDS.halfWidth / (Math.tan(V_FOV_RAD / 2) * aspect)
    const distance = Math.max(distV, distH) * FRAME_MARGIN
    camera.position.set(0, BOUNDS.centerY, distance)
    camera.updateProjectionMatrix()
  }, [size, camera])

  return null
}

function BouquetContents({ shakeEnergy }) {
  return (
    <group>
      <Vase height={VASE_HEIGHT} />
      <Water shakeEnergy={shakeEnergy} />

      {STEMS.map((stem) => (
        <group key={stem.id}>
          <group position={[stem.baseX, 0, stem.baseZ]}>
            <SubmergedStem depth={stem.submergedDepth} seedValue={stem.seedValue} delay={stem.delay} />
          </group>
          <group position={[stem.baseX, 0, stem.baseZ]}>
            <CarnationMesh
              stemLength={stem.stemLength}
              flowerScale={stem.flowerScale}
              phi={stem.phi}
              theta={stem.theta}
              delay={stem.delay}
              seedValue={stem.seedValue}
            />
          </group>
        </group>
      ))}

      {FILLERS.greenery.map((sprig, i) => (
        <group key={i} position={[sprig.baseX, 0, sprig.baseZ]}>
          <Greenery length={sprig.reach} phi={sprig.phi} theta={sprig.theta} seedValue={sprig.seedValue} delay={sprig.delay} />
        </group>
      ))}

      {FILLERS.leaves.map((leaf, i) => (
        <group key={i} position={[leaf.baseX, 0, leaf.baseZ]} quaternion={directionQuaternion(leaf.phi, leaf.theta)}>
          <LeafOrnament length={leaf.length} seedValue={leaf.seedValue} delay={leaf.delay} />
        </group>
      ))}

      {FILLERS.babysBreath.map((cluster, i) => (
        <group key={i} position={[cluster.baseX, 0, cluster.baseZ]} quaternion={directionQuaternion(cluster.phi, cluster.theta)}>
          <BabysBreathCluster puffs={cluster.puffs} reach={cluster.reach} delay={cluster.delay} seedValue={cluster.seedValue} />
        </group>
      ))}
    </group>
  )
}

// Fast orbit-dragging stands in for "shaking" the vase: rather than pattern
// -matching a real shake gesture, any quick rotation pumps energy into the
// water (proportional to how fast), and it decays back to calm on its own
// (see Water.jsx) once the drag slows or stops.
function useShakeEnergy() {
  const shakeEnergy = useRef(0)
  const tracking = useRef({ lastAngle: null, lastTime: null })

  const handleChange = (e) => {
    const controls = e?.target
    if (!controls) return
    const camera = controls.object
    const target = controls.target
    const angle = Math.atan2(camera.position.x - target.x, camera.position.z - target.z)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const track = tracking.current
    if (track.lastAngle !== null) {
      const dt = Math.max(1, now - track.lastTime)
      const delta = Math.atan2(Math.sin(angle - track.lastAngle), Math.cos(angle - track.lastAngle))
      const angularSpeed = (Math.abs(delta) / dt) * 1000
      shakeEnergy.current = Math.min(4, shakeEnergy.current + angularSpeed * 0.05)
    }
    track.lastAngle = angle
    track.lastTime = now
  }

  return { shakeEnergy, handleChange }
}

export default function BouquetScene() {
  const { shakeEnergy, handleChange } = useShakeEnergy()

  return (
    <div className="bouquet-canvas-wrap">
      <Canvas camera={{ position: [0, BOUNDS.centerY, 3], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 2]} intensity={1.2} />
        <directionalLight position={[-3, 1.5, -2]} intensity={0.35} color="#ff9999" />
        <pointLight position={[0, 0.4, 0.5]} intensity={0.5} color="#ff4d5e" distance={5} />
        <pointLight position={[0.6, 0.3, 1.4]} intensity={1.4} color="#ffffff" distance={4} />
        <BouquetContents shakeEnergy={shakeEnergy} />
        <ResponsiveCamera />
        <OrbitControls
          enablePan={false}
          minDistance={1.3}
          maxDistance={10}
          target={[0, BOUNDS.centerY, 0]}
          autoRotate
          autoRotateSpeed={0.5}
          enableDamping
          dampingFactor={0.08}
          onChange={handleChange}
        />
      </Canvas>
    </div>
  )
}
