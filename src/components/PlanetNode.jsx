import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Line, Html, Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useTaskStore from '../store/useTaskStore'
import useSettingsStore, { STAR_TYPES, PLANET_TYPES, PLANET_TYPE_WEIGHTS, PLANET_TYPE_WEIGHTS_NO_GAS } from '../store/useSettingsStore'
import useAuthStore from '../store/useAuthStore'

// 行星纹理类型映射到着色器中的数字
const PLANET_TEXTURE_TYPES = {
  terrestrial: 0,
  gas: 1,
  rocky: 2,
  ice: 3,
  water: 4,
}

const _worldPos = new THREE.Vector3()

// 大气层顶点着色器 - 增强版
const atmosphereVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 大气层片元着色器 - 增强渐变光效
const atmosphereFrag = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  
  // 多层光晕效果
  float innerGlow = pow(fresnel, 2.5) * 0.5;
  float midGlow = pow(fresnel, 5.0) * 0.8;
  float outerGlow = pow(fresnel, 12.0) * 1.5;
  
  // 动态闪烁
  float flicker = 0.9 + 0.1 * sin(uTime * 2.0 + vUv.x * 10.0);
  
  float alpha = (innerGlow + midGlow + outerGlow) * uIntensity * flicker;
  
  // 边缘更亮的效果
  vec3 glowColor = mix(uColor * 1.2, uColor * 2.5, pow(fresnel, 4.0));
  gl_FragColor = vec4(glowColor, clamp(alpha, 0.0, 1.0));
}`

// 光环顶点着色器
const ringVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 光环片元着色器
const ringFrag = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uTime;
void main() {
  float dist = abs(vUv.y - 0.5) * 2.0;
  float alpha = smoothstep(1.0, 0.3, dist);
  float stripe = step(0.5, fract(vUv.x * 30.0 + uTime * 0.5));
  alpha *= 0.3 + stripe * 0.2;
  gl_FragColor = vec4(uColor, alpha * 0.6);
}`

// 黑洞吸积盘顶点着色器
const blackHoleAccretionVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 黑洞吸积楼盘元着色器 - 侧视图双弧效果
const blackHoleAccretionFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vUv - center) * 2.0;
  float angle = atan(vUv.y - 0.5, vUv.x - 0.5);

  // 吸积盘边界
  float innerEdge = 0.18;
  float outerEdge = 0.92;

  // 多普勒效应 - 一侧亮一侧暗
  float doppler = 1.0 + 0.8 * cos(angle + uTime * 0.2);

  // 旋转条纹
  float stripe1 = sin(angle * 24.0 + uTime * 1.8 - dist * 18.0) * 0.5 + 0.5;
  float stripe2 = sin(angle * 16.0 - uTime * 1.2 + dist * 12.0) * 0.5 + 0.5;
  float stripe3 = sin(angle * 8.0 + uTime * 0.8) * 0.5 + 0.5;

  // 颜色 - 白色基调
  vec3 color = mix(uColor1, uColor2, stripe1 * 0.5 + stripe3 * 0.3);
  color += vec3(1.0) * pow(stripe2, 4.0) * 0.5;
  color *= doppler;

  // 边缘衰减
  float innerFade = smoothstep(0.0, innerEdge, dist);
  float outerFade = 1.0 - smoothstep(0.65, outerEdge, dist);
  float edgeFade = innerFade * outerFade;

  // 透明度
  float alpha = edgeFade * (0.6 + stripe1 * 0.35) * 0.95;

  gl_FragColor = vec4(color, alpha);
}`

// 引力透镜扭曲着色器
const gravitationalLensFrag = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vUv - center);

  // 多重爱因斯坦环
  float ring1 = smoothstep(0.30, 0.33, dist) * (1.0 - smoothstep(0.33, 0.36, dist));
  float ring2 = smoothstep(0.38, 0.41, dist) * (1.0 - smoothstep(0.41, 0.44, dist));
  float ring3 = smoothstep(0.46, 0.49, dist) * (1.0 - smoothstep(0.49, 0.52, dist));

  float intensity = ring1 * 0.7 + ring2 * 0.5 + ring3 * 0.3;

  // 中心暗区
  float darkCenter = 1.0 - smoothstep(0.0, 0.28, dist);

  vec3 color = vec3(0.5, 0.6, 1.0) * intensity;
  float alpha = intensity * 0.8 + (darkCenter * 0.15);

  gl_FragColor = vec4(color, alpha);
}`

// 行星纹理顶点着色器
const planetTextureVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 行星纹理片元着色器 - 使用程序生成的纹理叠加颜色
const planetTextureFrag = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uBaseColor;
uniform vec3 uEmissiveColor;
uniform float uEmissiveIntensity;
uniform float uTextureOpacity;
uniform float uTime;
uniform int uPlanetType;

// 简单的噪声函数
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for(int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// 气态巨行星纹理（条纹/漩涡）
float gasGiantPattern(vec2 uv, float time) {
  float pattern = 0.0;
  float bands = sin(uv.y * 30.0 + sin(uv.x * 8.0 + time * 0.1) * 2.0) * 0.5 + 0.5;
  float turbulence = fbm(uv * 5.0 + vec2(time * 0.02, 0.0));
  pattern = mix(bands, turbulence, 0.3);
  return pattern;
}

// 类地行星纹理（地形）
float terrestrialPattern(vec2 uv, float time) {
  float n1 = fbm(uv * 8.0 + time * 0.01);
  float n2 = fbm(uv * 16.0 + time * 0.02);
  float n3 = fbm(uv * 32.0);
  float detail = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  return detail;
}

// 冰行星纹理
float icePattern(vec2 uv, float time) {
  float n = fbm(uv * 12.0 + time * 0.005);
  float cracks = sin(uv.x * 50.0 + n * 10.0) * sin(uv.y * 50.0 + n * 10.0);
  cracks = pow(abs(cracks), 0.5);
  return mix(0.7, 1.0, cracks);
}

// 岩石行星纹理 - 粗糙不规则
float rockyPattern(vec2 uv, float time) {
  float n1 = fbm(uv * 15.0);
  float n2 = fbm(uv * 30.0 + vec2(100.0, 50.0));
  float n3 = noise(uv * 60.0);
  float pattern = n1 * 0.4 + n2 * 0.3 + n3 * 0.3;
  // 添加一些锐利的边缘
  float edges = pow(abs(sin(uv.x * 20.0 + n1 * 5.0) * sin(uv.y * 20.0 + n1 * 5.0)), 0.3);
  pattern = mix(pattern, edges, 0.2);
  return pattern;
}

// 水行星纹理 - 波纹和漩涡
float waterPattern(vec2 uv, float time) {
  float n = fbm(uv * 8.0 + vec2(time * 0.03, 0.0));
  float waves = sin(uv.y * 40.0 + n * 5.0 + time * 0.1) * 0.5 + 0.5;
  float spirals = sin(length(uv - 0.5) * 30.0 - time * 0.2 + n * 3.0) * 0.5 + 0.5;
  float pattern = mix(waves, spirals, 0.4);
  pattern = mix(0.4, 1.0, pattern);
  return pattern;
}

void main() {
  // 根据行星类型生成纹理
  float textureValue = 0.5;
  if(uPlanetType == 0) {
    // 类地行星 - 地形纹理
    textureValue = terrestrialPattern(vUv, uTime);
  } else if(uPlanetType == 1) {
    // 气态巨行星 - 条纹/漩涡纹理
    textureValue = gasGiantPattern(vUv, uTime);
  } else if(uPlanetType == 2) {
    // 岩石行星 - 粗糙纹理
    textureValue = rockyPattern(vUv, uTime);
  } else if(uPlanetType == 3) {
    // 冰行星 - 裂纹纹理
    textureValue = icePattern(vUv, uTime);
  } else if(uPlanetType == 4) {
    // 水行星 - 波纹纹理
    textureValue = waterPattern(vUv, uTime);
  } else {
    // 默认纹理
    textureValue = fbm(vUv * 10.0);
  }

  // 将纹理值转换为灰度纹理
  vec3 textureColor = vec3(textureValue);

  // 叠加用户颜色
  vec3 finalColor = mix(uBaseColor * textureValue, uBaseColor, 1.0 - uTextureOpacity);

  // 添加发光效果
  finalColor += uEmissiveColor * uEmissiveIntensity * 0.3;

  // 简单的光照
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;
  finalColor *= diffuse;

  gl_FragColor = vec4(finalColor, 1.0);
}`

// 恒星着色器 - 用于特殊恒星效果
const starVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosition = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const starFrag = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform float uTime;
uniform float uIntensity;
uniform float uPulse;
uniform float uPulseSpeed;
void main() {
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));

  // 脉冲效果
  float pulse = uPulse > 0.0 ? 0.7 + 0.3 * sin(uTime * uPulseSpeed) : 1.0;

  // 恒星表面效果
  float surface = pow(fresnel, 1.5) * 0.5 + 0.5;
  vec3 color = mix(uColor, uEmissive, surface);

  // 外层光晕
  float glow = pow(fresnel, 3.0) * uIntensity * pulse;
  color += uEmissive * glow;

  gl_FragColor = vec4(color, 1.0);
}`

// 两极光柱顶点着色器
const jetVert = /* glsl */ `
varying float vProgress;
varying vec2 vUv;
void main() {
  vProgress = (position.y + 0.5);
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// 两极光柱片元着色器
const jetFrag = /* glsl */ `
varying float vProgress;
varying vec2 vUv;
void main() {
  // vProgress: 0 在底部，1 在顶部
  float lenFade = 1.0 - vProgress;
  vec4 color = vec4(0.5, 0.85, 1.0, lenFade);
  gl_FragColor = color;
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

// 根据权重随机选择行星类型
function getRandomPlanetType(taskId, level) {
  const weights = level === 0 ? PLANET_TYPE_WEIGHTS : PLANET_TYPE_WEIGHTS_NO_GAS
  const availableTypes = Object.keys(weights).filter(k => k !== 'total')
  const totalWeight = weights.total

  // 使用哈希生成随机数
  const hash = hashStr(taskId + 'planetType')
  const rand = (hash % 1000) / 1000 // 0-1之间的随机数

  let cumulative = 0
  for (const type of availableTypes) {
    cumulative += weights[type] / totalWeight
    if (rand < cumulative) {
      return type
    }
  }
  return availableTypes[0] // 默认返回第一个
}

function PlanetNode({ task, position = [0, 0, 0], radius = 1.5, level = 0 }) {
  const [hovered, setHovered] = useState(false)
  const [editLabel, setEditLabel] = useState(task.label)
  const selectTask = useTaskStore((s) => s.selectTask)
  const deselectTask = useTaskStore((s) => s.deselectTask)
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId)
  const toggleTask = useTaskStore((s) => s.toggleTask)
  const renameTask = useTaskStore((s) => s.renameTask)
  const addChild = useTaskStore((s) => s.addChild)
  const deleteTask = useTaskStore((s) => s.deleteTask)

  // 认证相关
  const { isAuthenticated, openLoginModal } = useAuthStore()

  // 包装操作，需要登录
  const requireAuth = useCallback((action) => {
    if (!isAuthenticated) {
      openLoginModal()
      return false
    }
    action()
    return true
  }, [isAuthenticated, openLoginModal])

  // Settings
  const planetOrbitSpeed = useSettingsStore((s) => s.planetOrbitSpeed)
  const moonOrbitSpeed = useSettingsStore((s) => s.moonOrbitSpeed)
  const starType = useSettingsStore((s) => s.starType)
  const showOrbitLines = useSettingsStore((s) => s.showOrbitLines)
  const orbitLineOpacity = useSettingsStore((s) => s.orbitLineOpacity)

  const meshRef = useRef(null)
  const planetRef = useRef(null)
  const atmRef = useRef(null)
  const selfRotRef = useRef(null)
  const ringRef = useRef(null)
  const starRef = useRef(null)
  const accretionRef = useRef(null)
  const jetRef = useRef(null)

  // 每个轨道组独立的 ref
  const orbitRefs = useRef([])
  const setOrbitRef = useCallback((index) => (ref) => {
    if (ref) orbitRefs.current[index] = ref
  }, [])

  const children = task.children ?? []
  const isLeaf = children.length === 0
  const isSelected = selectedTaskId === task.id
  const isCompleted = task.status === 'completed'
  const isRoot = level === 0

  // 使用 ref 持久化行星类型（不变），颜色根据完成状态动态计算
  const planetTypeRef = useRef(null)
  if (planetTypeRef.current === null) {
    planetTypeRef.current = getRandomPlanetType(task.id, level)
  }
  const planetType = planetTypeRef.current
  const typeConfig = PLANET_TYPES[planetType]

  // 颜色根据完成状态动态决定
  const colorIndex = hashStr(task.id) % typeConfig.baseColors.length
  const base = isCompleted ? typeConfig.baseColors[colorIndex] : '#888888'
  const emissive = isCompleted ? typeConfig.emissiveColors[colorIndex] : '#555555'
  const atmosphere = isCompleted ? typeConfig.atmColors[colorIndex] : '#999999'
  const planetColors = { base, emissive, atmosphere, planetType }

  // 恒星配置
  const starConfig = STAR_TYPES[starType] || STAR_TYPES.sun

  useEffect(() => {
    if (isSelected) setEditLabel(task.label)
  }, [isSelected, task.label])

  const childData = useMemo(() => {
    if (children.length === 0) return []

    const n = children.length
    // 减小子星球大小
    const childRadiusBase = 3.0
    const childRadius = childRadiusBase * Math.pow(0.6, level + 1)

    // 根据 level 设置轨道参数
    const orbitParams = {
      0: { orbitGap: 40, firstOrbitOffset: 100 },  // 行星：恒星的孩子
      1: { orbitGap: 12, firstOrbitOffset: 20 },   // 卫星：行星的孩子
      2: { orbitGap: 6, firstOrbitOffset: 10 },    // 三级节点
      3: { orbitGap: 3, firstOrbitOffset: 6 }       // 四级节点
    }
    const params = orbitParams[level] || { orbitGap: 3, firstOrbitOffset: 6 }
    const orbitGap = params.orbitGap
    const firstOrbitRadius = radius + params.firstOrbitOffset

    // 计算需要的轨道数量（每条轨道最多3个）
    const maxPerOrbit = 3
    const numOrbits = Math.ceil(n / maxPerOrbit)

    const orbitRadii = Array.from({ length: numOrbits }, (_, i) => {
      return firstOrbitRadius + orbitGap * i
    })

    // 随机分配每颗行星到哪条轨道（每条轨道最多3个）
    // 使用 child.id 的哈希确保每次渲染位置一致
    const childOrbitAssignments = Array.from({ length: n }, (_, i) => {
      const childId = children[i].id || String(i)
      return Math.abs(hashStr(childId)) % numOrbits
    })

    const tilt = level * 0.15
    const uniqueOrbitIndices = [...new Set(childOrbitAssignments)]

    return { childOrbitAssignments, uniqueOrbitIndices, children: children.map((child, i) => {
      const orbitIndex = childOrbitAssignments[i]
      const posInOrbit = i % maxPerOrbit
      const orbitRadius = orbitRadii[orbitIndex]

      // 同一轨道上的行星均匀分布
      const angleOffset = (Math.PI * 2) / maxPerOrbit
      // 奇偶轨道错开起始角度
      const baseAngle = orbitIndex % 2 === 0 ? 0 : angleOffset / 2
      const angle = baseAngle + posInOrbit * angleOffset

      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle * 1.5 + tilt) * orbitRadius * 0.08

      return { offset: [x, y, z], childRadius, orbitRadius, orbitIndex }
    }) }
  }, [children, radius, level])

  // 动态速度 - 应用设置的速度倍率
  const orbitSpeed = useMemo(() => {
    const baseSpeed = 0.05
    const levelSpeed = level * 0.015
    const baseOrbitSpeed = Math.max(0.02, baseSpeed - levelSpeed * 0.3)
    // level >= 1 是子节点（包括卫星），使用卫星速度；level = 0 是根节点（恒星）
    const speedMultiplier = level >= 1 ? moonOrbitSpeed : planetOrbitSpeed
    return baseOrbitSpeed * speedMultiplier
  }, [level, planetOrbitSpeed, moonOrbitSpeed])

  const selfRotSpeed = useMemo(() => {
    const baseRot = 0.03 + level * 0.015 + Math.random() * 0.01
    return baseRot * (starType === 'neutronStar' ? 3 : 1)
  }, [level, starType])

  // 根据轨道索引计算速度
  const getOrbitSpeed = (orbitIndex) => {
    const baseSpeed = 0.0324
    const speedMultiplier = level >= 1 ? moonOrbitSpeed : planetOrbitSpeed
    return (baseSpeed - orbitIndex * 0.008) * speedMultiplier
  }

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    // 每个轨道独立旋转
    const { uniqueOrbitIndices = [] } = childData || {}
    uniqueOrbitIndices.forEach((orbitIndex, refIndex) => {
      const ref = orbitRefs.current[refIndex]
      if (ref) {
        ref.rotation.y += delta * getOrbitSpeed(orbitIndex)
      }
    })
    
    // 自转动画
    if (selfRotRef.current) {
      selfRotRef.current.rotation.y += delta * selfRotSpeed
    }
    
    // 更新大气层shader时间
    if (atmRef.current) {
      atmRef.current.uniforms.uTime.value = time
    }

    // 更新行星纹理shader时间
    if (planetRef.current && planetRef.current.material && planetRef.current.material.uniforms) {
      planetRef.current.material.uniforms.uTime.value = time
    }
    
    // 光环旋转
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 0.02
    }
    
    // 中子星脉冲效果
    if (isRoot && starType === 'neutronStar' && starRef.current) {
      const pulse = 1.5 + 1.0 * Math.sin(time * 3)
      starRef.current.emissiveIntensity = pulse
    }

    // 黑洞吸积盘旋转动画
    if (isRoot && starType === 'blackHole' && accretionRef.current) {
      accretionRef.current.material.uniforms.uTime.value = time
    }
    
    // 焦点追踪
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

  const scale = isSelected ? 1.3 : hovered ? 1.15 : 1

  const atmIntensity = isSelected ? 1.8 : isRoot ? starConfig.glowIntensity : isCompleted ? 1.5 : hovered ? 1.3 : 1.0

  // 恒星颜色
  const starEmissiveColor = isRoot ? starConfig.emissive : planetColors.emissive
  const starAtmColor = isRoot ? starConfig.atmosphere : planetColors.atmosphere
  const starBaseColor = isRoot ? starConfig.color : planetColors.base

  const emissiveColor = isRoot ? starConfig.emissive : isCompleted ? '#FFD700' : planetColors.emissive
  const emissiveIntensity = isSelected ? 1.8 : isRoot ? starConfig.glowIntensity : isCompleted ? 1.5 : hovered ? 0.8 : 0.3

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

  const htmlOffset = [position[0] + radius + 2, position[1] + radius * 0.5, position[2]]

  const hasRing = !isRoot && !isLeaf && hashStr(task.id + 'ring') % 5 === 0

  return (
    <group>
      {/* 自转组：行星 + 大气层 + 光环 */}
      <group ref={selfRotRef} position={position}>
        {/* 主行星球体 - 根节点使用恒星着色器 */}
        <mesh
          ref={(node) => {
            meshRef.current = node
            planetRef.current = node
          }}
          scale={scale}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <sphereGeometry args={[radius, 64, 64]} />
          {isRoot ? (
            starType === 'neutronStar' ? (
              <meshStandardMaterial
                ref={starRef}
                color="#aaddff"
                emissive="#88ddff"
                emissiveIntensity={3.0}
                roughness={0.1}
                metalness={0.9}
              />
            ) : starType === 'blackHole' ? (
              <meshBasicMaterial color="#000000" />
            ) : (
              <shaderMaterial
                ref={starRef}
                vertexShader={starVert}
                fragmentShader={starFrag}
                uniforms={{
                  uColor: { value: new THREE.Color(starConfig.color) },
                  uEmissive: { value: new THREE.Color(starConfig.emissive) },
                  uTime: { value: 0 },
                  uIntensity: { value: starConfig.glowIntensity },
                  uPulse: { value: 0.0 },
                  uPulseSpeed: { value: 5 },
                }}
              />
            )
          ) : (
            <shaderMaterial
              vertexShader={planetTextureVert}
              fragmentShader={planetTextureFrag}
              uniforms={{
                uBaseColor: { value: new THREE.Color(planetColors.base) },
                uEmissiveColor: { value: new THREE.Color(emissiveColor) },
                uEmissiveIntensity: { value: emissiveIntensity },
                uTextureOpacity: { value: 0.6 },
                uTime: { value: 0 },
                uPlanetType: { value: PLANET_TEXTURE_TYPES[planetColors.planetType] || 0 }
              }}
            />
          )}
        </mesh>

        {/* 中子星两极光柱 */}
        {isRoot && starType === 'neutronStar' && (
          <>
            {/* 上极光柱 - 从恒星上极穿过圆心到下极，绕Z轴倾斜30度 */}
            <mesh
              ref={jetRef}
              rotation={[0, 0, Math.PI / 6]}
            >
              <cylinderGeometry args={[0.04 * radius, 0.1 * radius, radius * 12, 24, 1, true]} />
              <meshBasicMaterial
                color="#88ddff"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            {/* 下极光柱 - 同上，夹角180度 */}
            <mesh
              rotation={[0, 0, Math.PI + Math.PI / 6]}
            >
              <cylinderGeometry args={[0.04 * radius, 0.1 * radius, radius * 12, 24, 1, true]} />
              <meshBasicMaterial
                color="#88ddff"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </>
        )}

        {/* 增强版大气层光效 */}
        <mesh scale={scale}>
          <sphereGeometry args={[radius * (isCompleted ? 1.45 : 1.32), 48, 48]} />
          <shaderMaterial
            ref={atmRef}
            vertexShader={atmosphereVert}
            fragmentShader={atmosphereFrag}
            uniforms={{
              uColor: { value: new THREE.Color(starAtmColor) },
              uTime: { value: 0 },
              uIntensity: { value: atmIntensity }
            }}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* 额外的外层光晕 */}
        <mesh scale={scale}>
          <sphereGeometry args={[radius * 1.8, 32, 32]} />
          <shaderMaterial
            vertexShader={atmosphereVert}
            fragmentShader={atmosphereFrag}
            uniforms={{
              uColor: { value: new THREE.Color(starAtmColor) },
              uTime: { value: 0 },
              uIntensity: { value: atmIntensity * 0.3 }
            }}
            transparent
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* 土星环效果 */}
        {hasRing && (
          <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
            <ringGeometry args={[radius * 1.4, radius * 2.2, 64]} />
            <shaderMaterial
              vertexShader={ringVert}
              fragmentShader={ringFrag}
              uniforms={{
                uColor: { value: new THREE.Color(isCompleted ? '#FFD700' : '#ffffff') },
                uTime: { value: 0 }
              }}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* 黑洞事件视界 - 纯黑球体 */}
        {isRoot && starType === 'blackHole' && (
          <mesh scale={scale}>
            <sphereGeometry args={[radius * 1.1, 48, 48]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
        )}

        {/* 黑洞吸积盘 - 扁平圆形，白色基调 */}
        {isRoot && starType === 'blackHole' && (
          <group rotation={[Math.PI / 2.2, 0.3, 0]}>
            <mesh ref={accretionRef}>
              <circleGeometry args={[radius * 3.5, 64]} />
              <shaderMaterial
                vertexShader={blackHoleAccretionVert}
                fragmentShader={blackHoleAccretionFrag}
                uniforms={{
                  uTime: { value: 0 },
                  uColor1: { value: new THREE.Color('#ffffff') },
                  uColor2: { value: new THREE.Color('#aaccff') },
                }}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )}

        {/* 黑洞事件视界边缘光圈 - 始终朝向摄像机 */}
        {isRoot && starType === 'blackHole' && (
          <Billboard>
            <mesh scale={scale}>
              <torusGeometry args={[radius * 1.15, radius * 0.1, 16, 64]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.95}
              />
            </mesh>
          </Billboard>
        )}

        {/* 引力透镜光环 */}
        {isRoot && starType === 'blackHole' && (
          <mesh scale={scale} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[radius * 12, radius * 12]} />
            <shaderMaterial
              vertexShader={blackHoleAccretionVert}
              fragmentShader={gravitationalLensFrag}
              uniforms={{
                uTime: { value: 0 },
              }}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}
      </group>

      {/* 选中时显示编辑面板 */}
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
                defaultValue={editLabel}
                onInput={(e) => {
                  setEditLabel(e.target.value)
                }}
                onBlur={() => commitRename()}
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
                    requireAuth(() => toggleTask(task.id))
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
                    requireAuth(() => {
                      if (level < 3) {
                        addChild(task.id)
                      }
                    })
                  }}
                  disabled={level >= 3}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10
                             rounded-lg px-2 py-1.5 text-xs text-white/70 hover:text-white/90
                             transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  + 子目标
                </button>
              </div>
              {!isRoot && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    requireAuth(() => {
                      deleteTask(task.id)
                      deselectTask()
                    })
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

      {/* 公转子节点组 */}
      {children.length > 0 && (
        <group position={position}>
          {/* 每个轨道独立旋转 */}
          {childData.uniqueOrbitIndices?.map((orbitIndex, refIndex) => {
            const orbitRadius = (childData.children.find(d => d.orbitIndex === orbitIndex) || {}).orbitRadius
            return (
              <group key={orbitIndex} ref={setOrbitRef(refIndex)}>
                {/* 轨道圆环 - 只渲染一次 */}
                {showOrbitLines && orbitRadius && (
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[orbitRadius - 0.1, orbitRadius + 0.1, 64]} />
                    <meshBasicMaterial
                      color={isSelected ? '#4dd0e1' : '#445566'}
                      transparent
                      opacity={isSelected ? orbitLineOpacity * 0.5 : orbitLineOpacity * 0.25}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
                {/* 轨道上的天体 */}
                {childData.children.map((data, i) => {
                  if (data.orbitIndex !== orbitIndex) return null
                  return (
                    <group key={children[i].id}>
                      {/* 轨道连接线 */}
                      {showOrbitLines && (
                        <Line
                          points={[[0, 0, 0], data.offset]}
                          color={isSelected ? '#4dd0e1' : '#556677'}
                          opacity={isSelected ? orbitLineOpacity * 2 : orbitLineOpacity}
                          transparent
                          lineWidth={isSelected ? 1.2 : 0.7}
                        />
                      )}

                      {/* 子行星 */}
                      <PlanetNode
                        key={children[i].id}
                        task={children[i]}
                        position={data.offset}
                        radius={data.childRadius}
                        level={level + 1}
                      />
                    </group>
                  )
                })}
              </group>
            )
          })}
        </group>
      )}
    </group>
  )
}

export default React.memo(PlanetNode)
