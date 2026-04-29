import * as THREE from 'three'

// Simple mulberry32 PRNG so a flower's "random" ruffle is reproducible from
// a single numeric seed instead of threading many Math.random calls.
export function makeRng(seed) {
  let a = seed >>> 0 || 1
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A narrow blade-shaped leaf/petal-like flat surface (double-sided in use)
// with a gentle lengthwise curl, built from a simple lathe-free triangle strip.
export function buildLeafGeometry({ length = 1, width = 0.16, curl = 0.18, bend = 0.12, segments = 10 }) {
  const positions = []
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const w = width * Math.sin(Math.PI * t) // tapers to a point at both ends
    const y = t * length
    const x = bend * Math.sin(t * Math.PI) * length * 0.3
    const z = curl * t * t
    positions.push(x - w / 2, y, z, x + w / 2, y, z)
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = a + 2
    const d = b + 2
    indices.push(a, b, c, b, d, c)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// A single cupped, teardrop-shaped petal in unit size (base at y=0, tip at
// y=1, roughly 1 unit wide) - meant to be scaled per-instance (width, length,
// depth) rather than rebuilt per petal, so a whole flower's worth of petals
// can share one geometry through an InstancedMesh. The cross-section curves
// inward like a spoon (real volume, not a flat card) and the tip gets a
// gentle wave so the margin still reads as slightly fringed up close.
export function buildPetalGeometry({ lengthSegments = 8, widthSegments = 7, cupWidth = 0.32, cupLength = 0.16, edgeRuffle = 0.05, ruffles = 5, seed = 1 }) {
  const rng = makeRng(Math.floor(seed * 10000) + 17)
  const positions = []
  const colors = []
  const rowLen = widthSegments + 1

  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments
    const profile = Math.pow(Math.sin(Math.min(1, t * 1.02) * Math.PI * 0.86 + 0.05), 0.6)
    // Multiplies against the per-instance whorl color (three.js combines
    // vertex color and instance color), giving each petal a lit-tip /
    // shadowed-base gradient without needing per-instance vertex data.
    const shade = 0.68 + 0.34 * t
    for (let j = 0; j <= widthSegments; j++) {
      const s = j / widthSegments - 0.5
      const ruffle = 1 + edgeRuffle * Math.sin(s * ruffles * Math.PI * 2 + seed) * t * t
      const x = s * profile * ruffle
      const y = t
      const z = cupWidth * s * s * profile + cupLength * t * t + (rng() - 0.5) * 0.006
      positions.push(x, y, z)
      colors.push(shade, shade, shade)
    }
  }

  const indices = []
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * rowLen + j
      const b = a + 1
      const c = a + rowLen
      const d = c + 1
      indices.push(a, b, d, a, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

const UP = new THREE.Vector3(0, 1, 0)
const tmpDir = new THREE.Vector3()

// Quaternion pointing local +Y toward the given spherical direction, used to
// aim a whole stem (grown along its own +Y axis) outward from the bouquet's
// tie point without fighting Euler-order ambiguity.
export function directionQuaternion(phi, theta) {
  tmpDir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).normalize()
  return new THREE.Quaternion().setFromUnitVectors(UP, tmpDir)
}

// Quaternion pointing local +Y along an arbitrary tangent direction, used to
// orient leaves/calyx/flowers that sit partway along a curved stem so they
// face the way the stem is heading at that point, not a fixed global angle.
export function tangentQuaternion(tangent) {
  return new THREE.Quaternion().setFromUnitVectors(UP, tangent.clone().normalize())
}

const IDENTITY_Q = new THREE.Quaternion()

// A stem that stands straight up for a while and only leans over toward its
// final (phi, theta) direction as it nears the tip - a spherical interpolation
// from "pointing up" to "pointing at the target", biased late by bendPower so
// the base of a bunch of these all stay vertical together (like real stems
// gathered in a vase) while the blooms fan out naturally, not like rigid
// spokes all radiating from one point.
export function buildArcCurve({ length, phi, theta, rng, bendPower = 1.7, wiggle = 0.05, segments = 6 }) {
  const target = directionQuaternion(phi, theta)
  const points = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const slerpT = Math.pow(t, bendPower)
    const q = new THREE.Quaternion().copy(IDENTITY_Q).slerp(target, slerpT)
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const radius = t * length
    const interior = rng && i > 0 && i < segments
    const wobble = interior ? wiggle * length * (rng() - 0.5) : 0
    const wobble2 = interior ? wiggle * length * (rng() - 0.5) : 0
    points.push(new THREE.Vector3(dir.x * radius + wobble, dir.y * radius, dir.z * radius + wobble2))
  }
  return new THREE.CatmullRomCurve3(points)
}
