import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Line, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useTaskStore from '../store/useTaskStore'

const _worldPos = new THREE.Vector3()

const atmosphereVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const atmosphereFrag = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uColor;
void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  // soft outer glow
  float softGlow = pow(fresnel, 3.0) * 0.4;
  // sharp sci-fi edge ring
  float edgeRing = pow(fresnel, 8.0) * 0.7;
  float alpha = softGlow + edgeRing;
  // tint edge brighter
  vec3 glowColor = mix(uColor, uColor * 2.5, pow(fresnel, 6.0));
  gl_FragColor = vec4(glowColor, alpha);
}`

export const focusTrack = {
  nodeId: null,
  pos: new THREE.Vector3(),
  orbitRadius: 1,
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function PlanetNode({ task, position = [0, 0, 0], radius = 1.5, level = 0, textures, rootTexture }) {
  const [hovered, setHovered] = useState(false)
  const [editLabel, setEditLabel] = useState(task.label)
  const selectTask = useTaskStore((s) => s.selectTask)
  const deselectTask = useTaskStore((s) => s.deselectTask)
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const renameTask = useTaskStore((s) => s.renameTask)
  const addChild = useTaskStore((s) => s.addChild)
  const addParent = useTaskStore((s) => s.addParent)
  const deleteTask = useTaskStore((s) => s.deleteTask)

  const meshRef = useRef(null)
  const matRef = useRef(null)
  const atmRef = useRef(null)
  const orbitRef = useRef(null)
  const selfRotRef = useRef(null)

  const children = task.children ?? []
  const isLeaf = children.length === 0
  const isSelected = selectedTaskId === task.id
  const isCompleted = task.status === 'completed'
  const isRoot = level === 0
  const texIndex = textures ? hashStr(task.id) % textures.length : 0

  useEffect(() => {
    if (isSelected) setEditLabel(task.label)
  }, [isSelected, task.label])

  const childData = useMemo(() => {
    if (children.length === 0) return []

    const n = children.length
    const childRadiusBase = 5
    const childRadius = childRadiusBase * Math.pow(0.55, level + 1)
    const depthScale = Math.pow(0.6, level)
    const minGap = radius * 5 * depthScale
    const orbitRadius = Math.max(
      radius + childRadius + minGap,
      (n * childRadius * 2) / Math.PI + minGap,
    )
    const angleStep = (Math.PI * 2) / n
    const tilt = level * 0.3

    return children.map((_, i) => {
      const angle = i * angleStep + level * 0.7
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle + tilt) * orbitRadius * 0.2
      return { offset: [x, y, z], childRadius, orbitRadius }
    })
  }, [children, radius, level])

  // orbital revolution + self-rotation + focus track + ring
  const orbitSpeed = 0.06 + level * 0.03
  const selfRotSpeed = 0.04 + level * 0.02
  useFrame((_, delta) => {
    if (orbitRef.current && children.length > 0) {
      orbitRef.current.rotation.y += delta * orbitSpeed
    }
    if (selfRotRef.current) {
      selfRotRef.current.rotation.y += delta * selfRotSpeed
    }
    if (focusTrack.nodeId === task.id && meshRef.current) {
      meshRef.current.getWorldPosition(focusTrack.pos)
    }
  })

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      if (isSelected) {
        deselectTask()
      } else {
        selectTask(task.id)
      }
    },
    [task.id, isSelected, selectTask, deselectTask],
  )

  const handlePointerDown = useCallback(
    (e) => {
      if (e.nativeEvent.button === 1) {
        e.stopPropagation()
        e.nativeEvent.preventDefault()
        meshRef.current?.getWorldPosition(_worldPos)
        focusTrack.nodeId = task.id
        focusTrack.pos.copy(_worldPos)
        focusTrack.orbitRadius = childData.length > 0 ? childData[0].orbitRadius : radius * 3
      }
    },
    [childData, radius, task.id],
  )

  const handlePointerOver = useCallback(
    (e) => {
      e.stopPropagation()
      setHovered(true)
      document.body.style.cursor = 'pointer'
    },
    [],
  )

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    document.body.style.cursor = ''
  }, [])

  const scale = isSelected ? 1.25 : hovered ? 1.2 : 1

  const commitRename = useCallback(() => {
    const trimmed = editLabel.trim()
    if (trimmed && trimmed !== task.label) {
      renameTask(task.id, trimmed)
    } else {
      setEditLabel(task.label)
    }
  }, [editLabel, task.id, task.label, renameTask])

  const handleRenameKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitRename()
      }
      if (e.key === 'Escape') {
        setEditLabel(task.label)
      }
    },
    [commitRename, task.label],
  )

  const htmlOffset = [position[0] + radius + 1.6, position[1] + radius * 0.4, position[2]]

  return (
    <group>
      {/* self-rotation group: planet + atmosphere */}
      <group ref={selfRotRef} position={position}>
        <mesh
          ref={meshRef}
          scale={scale}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          <meshStandardMaterial
            ref={matRef}
            map={isRoot && rootTexture ? rootTexture : textures ? textures[texIndex] : undefined}
            color="#ffffff"
            emissive={isRoot ? '#ffaa00' : isCompleted ? '#FFD700' : '#000000'}
            emissiveIntensity={isRoot ? 1.5 : isCompleted ? 1.2 : 0}
            roughness={isRoot ? 0.3 : isCompleted ? 0.15 : 0.85}
            metalness={isRoot ? 0.1 : isCompleted ? 0.8 : 0.05}
          />
        </mesh>

        {/* atmosphere glow */}
        <mesh scale={scale}>
          <sphereGeometry args={[radius * (isCompleted ? 1.55 : 1.35), 48, 48]} />
          <shaderMaterial
            ref={atmRef}
            vertexShader={atmosphereVert}
            fragmentShader={atmosphereFrag}
            uniforms={{ uColor: { value: new THREE.Color(isRoot ? '#ffaa00' : isCompleted ? '#FFD700' : '#ffffff') } }}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Html annotation (static, outside orbit group) */}
      {isSelected && (
        <Html
          position={htmlOffset}
          center
          occlude={false}
          zIndexRange={[10, 0]}
        >
          <div
            className="bg-gray-900/95 border border-cyan-500/30 rounded-xl px-4 py-3
                       text-white shadow-xl shadow-black/50 backdrop-blur-sm
                       select-none pointer-events-auto w-[240px] sm:w-[280px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleRenameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/10 text-cyan-200 text-sm font-bold
                           rounded-lg px-2 py-1 outline-none border border-white/10
                           focus:border-cyan-500/50 transition-colors min-w-0"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deselectTask()
                }}
                className="text-white/30 hover:text-white/70 transition-colors text-sm leading-none shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isCompleted ? '已完成' : '进行中'}
              </span>
              {isLeaf && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTask(task.id)
                  }}
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-medium
                             transition-all duration-200 ${
                               isCompleted
                                 ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                                 : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                             }`}
                >
                  {isCompleted ? '撤销' : '点亮'}
                </button>
              )}
            </div>

            {!isLeaf && (
              <p className="text-white/30 text-xs mb-2">
                全部子任务完成时自动点亮
              </p>
            )}

            <div className="border-t border-white/10 my-2" />

            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addChild(task.id)
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10
                             rounded-lg px-2 py-1.5 text-xs text-white/70 hover:text-white/90
                             transition-all duration-150"
                >
                  + 子目标
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addParent(task.id)
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10
                             rounded-lg px-2 py-1.5 text-xs text-white/70 hover:text-white/90
                             transition-all duration-150"
                >
                  + 父目标
                </button>
              </div>
              {!isRoot && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTask(task.id)
                    deselectTask()
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20
                             rounded-lg px-2 py-1.5 text-xs text-red-300 hover:text-red-200
                             transition-all duration-150"
                >
                  删除此节点
                </button>
              )}
            </div>
          </div>
        </Html>
      )}

      {/* orbiting children group */}
      {children.length > 0 && (
        <group position={position}>
          <group ref={orbitRef}>
            {childData.map((data, i) => (
              <group key={children[i].id}>
                <Line
                  points={[[0, 0, 0], data.offset]}
                  color="#8899aa"
                  opacity={isSelected ? 0.4 : 0.25}
                  transparent
                  lineWidth={isSelected ? 0.8 : 0.5}
                />
                <PlanetNode
                  task={children[i]}
                  position={data.offset}
                  radius={data.childRadius}
                  level={level + 1}
                  textures={textures}
                  rootTexture={rootTexture}
                />
              </group>
            ))}
          </group>
        </group>
      )}
    </group>
  )
}

export default React.memo(PlanetNode)
