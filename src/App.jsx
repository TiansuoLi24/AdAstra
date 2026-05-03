import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, Loader } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import PlanetNode, { focusTrack } from './components/PlanetNode'
import StarMapPanel from './components/StarMapPanel'
import GoalInput from './components/GoalInput'
import Sidebar from './components/Sidebar'
import SpaceEffects from './components/SpaceEffects'
import LoginModal from './components/LoginModal'
import useTaskStore, { selectCurrentTasks } from './store/useTaskStore'
import useSettingsStore from './store/useSettingsStore'
import * as THREE from 'three'

const defaultCamPos = new THREE.Vector3(0, 80, 150)
const farCamPos = new THREE.Vector3(0, 80, 150)

// 360度全景星空背景
function DynamicStars() {
  const starsRef = useRef()
  const starCount = useSettingsStore((s) => s.starCount)
  const enableStarBackground = useSettingsStore((s) => s.enableStarBackground)

  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.002
    }
  })

  if (!enableStarBackground) return null

  return (
    <Stars
      ref={starsRef}
      radius={800}
      depth={400}
      count={starCount}
      factor={8}
      saturation={0}
      speed={0.2}
    />
  )
}

function Scene() {
  const tasks = useTaskStore(selectCurrentTasks)
  const { camera } = useThree()
  const controlsRef = useRef(null)

  const [visibleTasks, setVisibleTasks] = useState(tasks)
  const phaseRef = useRef('idle')
  const [, forceRender] = useState(0)

  // focus tracking state
  const focusOffset = useRef(new THREE.Vector3())
  const focusTarget = useRef(new THREE.Vector3())
  const wasTracking = useRef(false)

  // left-drag detection
  const draggedRef = useRef(false)

  useEffect(() => {
    const onMove = (e) => {
      if (e.buttons === 1) draggedRef.current = true
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // detect map switch and clear tracking
  const currentMapId = useTaskStore((s) => s.currentMapId)
  const prevMapIdRef = useRef(currentMapId)

  const startTransition = useCallback(() => {
    phaseRef.current = 'out'
  }, [])

  useEffect(() => {
    if (prevMapIdRef.current !== currentMapId) {
      prevMapIdRef.current = currentMapId
      focusTrack.nodeId = null
      startTransition()
    }
  }, [currentMapId, startTransition])

  useFrame((_, delta) => {
    // ---- map-switch transition ----
    if (phaseRef.current === 'out') {
      camera.position.lerp(farCamPos, delta * 8)
      if (camera.position.distanceTo(farCamPos) < 1.5) {
        camera.position.copy(farCamPos)
        phaseRef.current = 'idle'
        setVisibleTasks(tasks)
        forceRender((n) => n + 1)
      }
      return
    }

    // ---- focus tracking ----
    if (focusTrack.nodeId) {
      const ctrl = controlsRef.current

      if (!wasTracking.current) {
        const dir = camera.position.clone().sub(focusTrack.pos).normalize()
        const dist = focusTrack.orbitRadius * 2.5
        focusOffset.current.copy(dir.multiplyScalar(dist))
        focusTarget.current.copy(focusTrack.pos)
        wasTracking.current = true
      }

      // keep target locked on planet
      focusTarget.current.lerp(focusTrack.pos, delta * 8)
      if (ctrl) {
        ctrl.target.lerp(focusTarget.current, delta * 8)
      }

      // maintain direction from planet but respect user-scrolled distance
      const dir = focusOffset.current.clone().normalize()
      const dist = camera.position.distanceTo(focusTrack.pos)
      camera.position.lerp(
        focusTrack.pos.clone().addScaledVector(dir, dist),
        delta * 6,
      )
    } else {
      wasTracking.current = false
    }
  })

  const displayTasks = phaseRef.current === 'out' ? visibleTasks : tasks
  if (!displayTasks) return null

  return (
    <>
      {/* 环境光和点光源 */}
      <ambientLight intensity={2.5} color="#6688aa" />
      <pointLight position={[30, 30, 30]} intensity={1.5} color="#ffcc88" />
      <pointLight position={[-20, -10, -20]} intensity={0.6} color="#4466aa" />
      <pointLight position={[0, 50, 0]} intensity={0.4} color="#ffffff" />

      {/* 动态星空 */}
      <DynamicStars />

      {/* 太空特效 */}
      <SpaceEffects />

      {/* 行星系统 */}
      <PlanetNode task={displayTasks} radius={20} />

      {/* 轨道控制器 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={30}
        maxDistance={400}
        onStart={() => { draggedRef.current = false }}
        onEnd={() => {
          if (draggedRef.current) focusTrack.nodeId = null
        }}
      />

      {/* 后期处理 - Bloom发光效果 */}
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.2}
          intensity={1.5}
          luminanceSmoothing={0.4}
          mipmapBlur
          radius={0.8}
        />
      </EffectComposer>
    </>
  )
}

function App() {
  return (
    <div className="h-dvh w-screen bg-black relative overflow-hidden">
      {/* 背景渐变 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, #0a0a1f 0%, #000000 100%)'
        }}
      />

      <Sidebar />
      <StarMapPanel />
      <GoalInput />
      <LoginModal />

      <Suspense fallback={null}>
        <Canvas 
          camera={{ position: [0, 80, 150], fov: 50, far: 3000 }}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
        >
          <Scene />
        </Canvas>
      </Suspense>

      <Loader
        containerStyles={{ background: 'linear-gradient(to bottom, #000000, #0a0a1a)' }}
        innerStyles={{ background: '#0a0a1a' }}
        barStyles={{ background: 'linear-gradient(to right, #4dd0e1, #ffaa00)' }}
        dataStyles={{ color: '#4dd0e1', fontFamily: 'system-ui' }}
        dataInterpolation={(p) => `穿越星际 ${Math.round(p)}%`}
      />
    </div>
  )
}

export default App
