import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useSettingsStore from '../store/useSettingsStore'

// 流星系统 - 支持数量设置
function Meteors({ count = 6 }) {
  const meteorsRef = useRef([])
  const timeRef = useRef(0)

  const meteorData = useMemo(() => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        Math.random() * 100 + 50,
        (Math.random() - 0.5) * 400
      ),
      velocity: new THREE.Vector3(
        -Math.random() * 100 - 50,
        -Math.random() * 50 - 20,
        (Math.random() - 0.5) * 20
      ),
      length: Math.random() * 20 + 10,
      speed: Math.random() * 0.5 + 0.5,
      resetTimer: Math.random() * 10,
    }))
  }, [count])

  useFrame((state, delta) => {
    timeRef.current += delta

    meteorsRef.current.forEach((mesh, i) => {
      if (!mesh || !meteorData[i]) return

      const meteor = meteorData[i]
      meteor.position.add(meteor.velocity.clone().multiplyScalar(delta * meteor.speed))

      const direction = meteor.velocity.clone().normalize()
      const tail = meteor.position.clone().add(direction.multiplyScalar(meteor.length))

      if (mesh.geometry) {
        const positions = mesh.geometry.attributes.position.array
        positions[0] = tail.x
        positions[1] = tail.y
        positions[2] = tail.z
        positions[3] = meteor.position.x
        positions[4] = meteor.position.y
        positions[5] = meteor.position.z
        mesh.geometry.attributes.position.needsUpdate = true
      }

      if (meteor.position.y < -100 || meteor.position.x < -300) {
        meteor.position.set(
          (Math.random() - 0.5) * 400,
          Math.random() * 100 + 50,
          (Math.random() - 0.5) * 400
        )
      }
    })
  })

  return (
    <>
      {meteorData.map((meteor, i) => (
        <line key={i} ref={(el) => (meteorsRef.current[i] = el)}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                meteor.position.x + meteor.velocity.x * meteor.length * 0.1,
                meteor.position.y + meteor.velocity.y * meteor.length * 0.1,
                meteor.position.z + meteor.velocity.z * meteor.length * 0.1,
                meteor.position.x,
                meteor.position.y,
                meteor.position.z,
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
          />
        </line>
      ))}
    </>
  )
}

// 小行星带
function AsteroidBelt() {
  const asteroidsRef = useRef([])

  const asteroidCount = 200
  const asteroidData = useMemo(() => {
    return Array.from({ length: asteroidCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 80 + Math.random() * 30,
      speed: (0.001 + Math.random() * 0.002) * (Math.random() > 0.5 ? 1 : -1),
      size: 0.2 + Math.random() * 0.8,
      offset: (Math.random() - 0.5) * 10,
    }))
  }, [])

  useFrame((state, delta) => {
    asteroidData.forEach((asteroid, i) => {
      asteroid.angle += asteroid.speed
      const x = Math.cos(asteroid.angle) * asteroid.radius
      const z = Math.sin(asteroid.angle) * asteroid.radius
      const y = Math.sin(asteroid.angle * 3) * asteroid.offset

      if (asteroidsRef.current[i]) {
        asteroidsRef.current[i].position.set(x, y, z)
        asteroidsRef.current[i].rotation.x += delta * 0.5
        asteroidsRef.current[i].rotation.y += delta * 0.3
      }
    })
  })

  return (
    <group rotation={[Math.PI / 6, 0, 0]}>
      {asteroidData.map((asteroid, i) => (
        <mesh
          key={i}
          ref={(el) => (asteroidsRef.current[i] = el)}
          position={[
            Math.cos(asteroid.angle) * asteroid.radius,
            asteroid.offset,
            Math.sin(asteroid.angle) * asteroid.radius
          ]}
        >
          <dodecahedronGeometry args={[asteroid.size, 0]} />
          <meshStandardMaterial
            color="#888888"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

// 太空尘埃粒子 - 球形分布
function SpaceDust({ count = 500 }) {
  const dustRef = useRef()
  const timeRef = useRef(0)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 300 + Math.random() * 100

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [count])

  useFrame((state, delta) => {
    timeRef.current += delta
    if (dustRef.current) {
      dustRef.current.rotation.y = timeRef.current * 0.005
    }
  })

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#ffffff"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  )
}

// 创建模糊圆形纹理 - 星云专用
function createNebulaTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const center = size / 2

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

// 星云背景效果 - 使用精灵实现圆形模糊粒子
function NebulaBackground() {
  const groupRef = useRef()
  const timeRef = useRef(0)

  const nebulaData = useMemo(() => {
    const texture = createNebulaTexture(256)
    const group1Data = []
    const group2Data = []

    // 星云颜色组1 - 紫蓝色调
    const colors1 = [
      new THREE.Color(0.6, 0.2, 0.9),  // 紫色
      new THREE.Color(0.3, 0.4, 0.9),  // 蓝色
      new THREE.Color(0.4, 0.6, 0.9),  // 浅蓝
    ]

    // 星云颜色组2 - 暖色调
    const colors2 = [
      new THREE.Color(0.9, 0.4, 0.5),  // 粉红
      new THREE.Color(0.8, 0.3, 0.7),  // 玫红
      new THREE.Color(0.5, 0.7, 0.9),  // 青蓝
    ]

    // 第一组 - 大型星云团
    for (let i = 0; i < 40; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1200 + Math.random() * 500

      group1Data.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.6,
          r * Math.cos(phi)
        ],
        color: colors1[Math.floor(Math.random() * colors1.length)].clone(),
        scale: 250 + Math.random() * 350,
        opacity: 0.1 + Math.random() * 0.06,
        rotationSpeed: (Math.random() - 0.5) * 0.0005,
      })
    }

    // 第二组 - 小型星云点
    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1400 + Math.random() * 500

      group2Data.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.7,
          r * Math.cos(phi)
        ],
        color: colors2[Math.floor(Math.random() * colors2.length)].clone(),
        scale: 120 + Math.random() * 180,
        opacity: 0.06 + Math.random() * 0.05,
        rotationSpeed: (Math.random() - 0.5) * 0.0003,
      })
    }

    return { group1Data, group2Data, texture }
  }, [])

  useFrame((state, delta) => {
    timeRef.current += delta
    if (groupRef.current) {
      // 整体缓慢旋转
      groupRef.current.rotation.y = timeRef.current * 0.002
    }
  })

  return (
    <group ref={groupRef}>
      {/* 大型星云团 - 使用Sprite始终面向相机 */}
      {nebulaData.group1Data.map((nebula, i) => (
        <sprite
          key={`nebula1-${i}`}
          position={nebula.position}
          scale={[nebula.scale, nebula.scale, 1]}
          frustumCulled={false}
        >
          <spriteMaterial
            map={nebulaData.texture}
            color={nebula.color}
            transparent
            opacity={nebula.opacity}
            depthTest={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
      {/* 小型星云点 - 使用Sprite始终面向相机 */}
      {nebulaData.group2Data.map((nebula, i) => (
        <sprite
          key={`nebula2-${i}`}
          position={nebula.position}
          scale={[nebula.scale, nebula.scale, 1]}
          frustumCulled={false}
        >
          <spriteMaterial
            map={nebulaData.texture}
            color={nebula.color}
            transparent
            opacity={nebula.opacity}
            depthTest={false}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  )
}

// 主特效组件
export { Meteors, AsteroidBelt, SpaceDust, NebulaBackground }

export default function SpaceEffects() {
  const enableMeteors = useSettingsStore((s) => s.enableMeteors)
  const enableAsteroidBelt = useSettingsStore((s) => s.enableAsteroidBelt)
  const enableSpaceDust = useSettingsStore((s) => s.enableSpaceDust)
  const enableNebula = useSettingsStore((s) => s.enableNebula)
  const meteorCount = useSettingsStore((s) => s.meteorCount)

  return (
    <group>
      {enableMeteors && <Meteors count={meteorCount} />}
      {enableAsteroidBelt && <AsteroidBelt />}
      {enableSpaceDust && <SpaceDust count={500} />}
      {enableNebula && <NebulaBackground />}
    </group>
  )
}
