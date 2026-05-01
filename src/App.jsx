import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, useTexture, Loader } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import PlanetNode, { focusTrack } from './components/PlanetNode'
import StarMapPanel from './components/StarMapPanel'
import GoalInput from './components/GoalInput'
import Sidebar from './components/Sidebar'
import useTaskStore, { selectCurrentTasks } from './store/useTaskStore'
import * as THREE from 'three'

const defaultCamPos = new THREE.Vector3(0, 80, 150)
const farCamPos = new THREE.Vector3(0, 80, 150)

function Scene() {
  const tasks = useTaskStore(selectCurrentTasks)
  const { camera } = useThree()
  const controlsRef = useRef(null)

  // preload planet textures
  const planetTextures = useTexture([
    '/textures/planet1.jpg',
    '/textures/planet2.jpg',
    '/textures/planet3.jpg',
  ])
  const sunTexture = useTexture('/textures/sun.jpg')

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
      <ambientLight intensity={3} />
      <pointLight position={[30, 30, 30]} intensity={1.2} />
      <pointLight position={[-20, -10, -20]} intensity={0.5} color="#4466aa" />
      <PlanetNode task={displayTasks} radius={20} textures={planetTextures} rootTexture={sunTexture}/>
      <Stars
        radius={300}
        depth={150}
        count={10000}
        factor={8}
        saturation={0}
        fade
        speed={0.3}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        onStart={() => { draggedRef.current = false }}
        onEnd={() => {
          if (draggedRef.current) focusTrack.nodeId = null
        }}
      />
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.4}
          intensity={1.5}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

function App() {
  return (
    <div className="h-dvh w-screen bg-black relative overflow-hidden">
      <Sidebar />
      <StarMapPanel />
      <GoalInput />
      <Suspense fallback={null}>
        <Canvas camera={{ position: [0, 80, 150], fov: 50 }}>
          <Scene />
        </Canvas>
      </Suspense>
      <Loader
        containerStyles={{ background: 'black' }}
        innerStyles={{ background: '#0a0a1a' }}
        barStyles={{ background: '#ffaa00' }}
        dataStyles={{ color: '#ffaa00', fontFamily: 'sans-serif' }}
        dataInterpolation={(p) => `航向深空 ${Math.round(p)}%`}
      />
    </div>
  )
}

export default App
