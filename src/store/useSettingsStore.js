import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveSettingsAPI } from '../services/apiService'

// 行星纹理类型
export const PLANET_TYPES = {
  terrestrial: {
    name: '类地行星',
    nameEn: 'Terrestrial',
    baseColors: ['#4a90d9', '#72d6e5', '#4b70dd', '#2d5a3d', '#5a8f5a'],
    emissiveColors: ['#3a7fc9', '#62c6d5', '#3b60cd', '#1d4a2d', '#4a7f4a'],
    atmColors: ['#6ab0e9', '#8ae6f5', '#6b80ed', '#3d6a4d', '#6a9f6a'],
  },
  gas: {
    name: '气态巨行星',
    nameEn: 'Gas Giant',
    baseColors: ['#e6c87a', '#d4a574', '#f4d59e', '#ffaa66', '#ff9933'],
    emissiveColors: ['#d6b86a', '#c49564', '#e4c58e', '#ef9a56', '#ef8933'],
    atmColors: ['#f6d88a', '#e4b584', '#fff5ae', '#ffba76', '#ffa943'],
  },
  rocky: {
    name: '岩石行星',
    nameEn: 'Rocky',
    baseColors: ['#c1440e', '#8c8c8c', '#d4a574', '#aa6633', '#cc8844'],
    emissiveColors: ['#b13400', '#7c7c7c', '#c49564', '#9a5633', '#bc7834'],
    atmColors: ['#d1541e', '#9c9c9c', '#e4b584', '#ba7643', '#dc9844'],
  },
  ice: {
    name: '冰冻行星',
    nameEn: 'Ice Planet',
    baseColors: ['#a8d8ea', '#c5e8f7', '#87ceeb', '#b0e0e6', '#e0f4ff'],
    emissiveColors: ['#88c8da', '#a5d8e7', '#77beeb', '#90d0d6', '#d0f4ff'],
    atmColors: ['#b8e8fa', '#d5f0f7', '#97deff', '#c0f0f6', '#f0f8ff'],
  },
  water: {
    name: '水行星',
    nameEn: 'Water Planet',
    baseColors: ['#1e3a5f', '#2c5282', '#1a365d', '#2b6cb0', '#234e70'],
    emissiveColors: ['#0e2a4f', '#1c4262', '#0a264d', '#1b5ca0', '#133e60'],
    atmColors: ['#2e4a6f', '#3c6282', '#2b466d', '#3b7cc0', '#336e80'],
  },
}

// 行星类型比例配置 (用于随机选择)
export const PLANET_TYPE_WEIGHTS = {
  terrestrial: 1,
  gas: 50,
  rocky: 20,
  ice: 9,
  water: 20,
  total: 100
}

// 不包含气态行星的比例（用于 level >= 1）
export const PLANET_TYPE_WEIGHTS_NO_GAS = {
  terrestrial: 1,
  rocky: 20,
  ice: 9,
  water: 20,
  total: 50
}

// 恒星类型配置
export const STAR_TYPES = {
  sun: {
    name: '太阳',
    color: '#ffcc44',
    emissive: '#ffaa00',
    atmosphere: '#ffdd88',
    size: 1,
    glowIntensity: 2.0,
  },
  neutronStar: {
    name: '中子星',
    color: '#aaddff',
    emissive: '#88ddff',
    atmosphere: '#ffffff',
    size: 0.3,
    glowIntensity: 3.0,
    pulse: true,
    pulseSpeed: 3,
  },
  blackHole: {
    name: '黑洞',
    color: '#000000',
    emissive: '#4400aa',
    atmosphere: '#220055',
    size: 1.2,
    glowIntensity: 2.5,
    eventHorizon: true,
  },
  redDwarf: {
    name: '红矮星',
    color: '#ff4422',
    emissive: '#ff6644',
    atmosphere: '#ff8866',
    size: 0.6,
    glowIntensity: 1.2,
  },
  blueGiant: {
    name: '蓝巨星',
    color: '#4488ff',
    emissive: '#66aaff',
    atmosphere: '#88ccff',
    size: 2.0,
    glowIntensity: 3.5,
  },
  whiteDwarf: {
    name: '白矮星',
    color: '#eeeeff',
    emissive: '#ffffff',
    atmosphere: '#ddddff',
    size: 0.5,
    glowIntensity: 2.5,
  },
  nebula: {
    name: '星云核心',
    color: '#ff66aa',
    emissive: '#ff88cc',
    atmosphere: '#ffaacc',
    size: 2.5,
    glowIntensity: 2.0,
    nebula: true,
  },
}

// 预设行星颜色方案
export const PLANET_COLOR_PRESETS = [
  { name: '太阳系', colors: ['#c1440e', '#4a90d9', '#e6c87a', '#72d6e5', '#4b70dd', '#d4a574', '#f4d59e', '#8c8c8c'] },
  { name: '冰冻星球', colors: ['#aaddff', '#88ccee', '#66bbee', '#44aadd', '#2299cc', '#0088bb', '#0077aa', '#006699'] },
  { name: '熔岩星球', colors: ['#ff4422', '#ff6633', '#ee5522', '#dd4411', '#cc3300', '#bb2200', '#aa1100', '#990000'] },
  { name: '气态巨行星', colors: ['#ffaa66', '#ff9933', '#ee8844', '#dd7722', '#cc6611', '#bb5500', '#aa4400', '#993300'] },
  { name: '外星世界', colors: ['#aa44ff', '#8844dd', '#6633bb', '#5522aa', '#441199', '#330088', '#220077', '#110066'] },
  { name: '金属星球', colors: ['#cccccc', '#aaaaaa', '#888888', '#999999', '#bbbbbb', '#777777', '#666666', '#555555'] },
]

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // 轨道速度设置
      planetOrbitSpeed: 1.0,
      moonOrbitSpeed: 1.0,
      starRotationSpeed: 1.0,

      // 恒星设置
      starType: 'sun',

      // 特效开关
      enableMeteors: true,
      enableAsteroidBelt: false,
      enableSpaceDust: true,
      enableNebula: true,
      enableStarBackground: true,

      // 视觉效果
      bloomIntensity: 1.0,
      starCount: 20000,
      meteorCount: 6,

      // 轨道线设置
      showOrbitLines: true,
      orbitLineOpacity: 0.3,

      // 动作
      setPlanetOrbitSpeed: (speed) => set({ planetOrbitSpeed: speed }),
      setMoonOrbitSpeed: (speed) => set({ moonOrbitSpeed: speed }),
      setStarRotationSpeed: (speed) => set({ starRotationSpeed: speed }),
      setStarType: (type) => set({ starType: type }),
      toggleMeteors: () => set((state) => ({ enableMeteors: !state.enableMeteors })),
      toggleAsteroidBelt: () => set((state) => ({ enableAsteroidBelt: !state.enableAsteroidBelt })),
      toggleSpaceDust: () => set((state) => ({ enableSpaceDust: !state.enableSpaceDust })),
      toggleNebula: () => set((state) => ({ enableNebula: !state.enableNebula })),
      toggleStarBackground: () => set((state) => ({ enableStarBackground: !state.enableStarBackground })),
      setBloomIntensity: (intensity) => set({ bloomIntensity: intensity }),
      setStarCount: (count) => set({ starCount: count }),
      setMeteorCount: (count) => set({ meteorCount: count }),
      toggleOrbitLines: () => set((state) => ({ showOrbitLines: !state.showOrbitLines })),
      setOrbitLineOpacity: (opacity) => set({ orbitLineOpacity: opacity }),

      // 重置为默认
      resetToDefaults: () => set({
        planetOrbitSpeed: 1.0,
        moonOrbitSpeed: 1.0,
        starRotationSpeed: 1.0,
        starType: 'sun',
        enableMeteors: true,
        enableAsteroidBelt: false,
        enableSpaceDust: true,
        enableNebula: true,
        enableStarBackground: true,
        bloomIntensity: 1.0,
        starCount: 20000,
        meteorCount: 6,
        showOrbitLines: true,
        orbitLineOpacity: 0.3,
      }),

      // Server sync
      loadFromServer: (settings) => {
        if (!settings || Object.keys(settings).length === 0) return
        set((state) => {
          const allowed = [
            'planetOrbitSpeed', 'moonOrbitSpeed', 'starRotationSpeed',
            'starType', 'enableMeteors', 'enableAsteroidBelt', 'enableSpaceDust',
            'enableNebula', 'enableStarBackground', 'bloomIntensity',
            'starCount', 'meteorCount', 'showOrbitLines', 'orbitLineOpacity',
          ]
          const updates = {}
          allowed.forEach((k) => {
            if (settings[k] !== undefined) updates[k] = settings[k]
          })
          return updates
        })
      },

      syncToServer: () => {
        const raw = localStorage.getItem('ad-astra-auth')
        if (!raw) return
        try {
          const { state } = JSON.parse(raw)
          if (!state.isAuthenticated || !state.token) return
          const dataKeys = [
            'planetOrbitSpeed', 'moonOrbitSpeed', 'starRotationSpeed',
            'starType', 'enableMeteors', 'enableAsteroidBelt', 'enableSpaceDust',
            'enableNebula', 'enableStarBackground', 'bloomIntensity',
            'starCount', 'meteorCount', 'showOrbitLines', 'orbitLineOpacity',
          ]
          const settingsData = {}
          dataKeys.forEach((k) => { settingsData[k] = get()[k] })
          saveSettingsAPI(state.token, settingsData).catch(() => {})
        } catch {}
      },
    }),
    {
      name: 'ad-astra-settings',
    },
  ),
)

// Auto-sync to server when settings change (debounced)
let syncTimer = null
useSettingsStore.subscribe((state, prevState) => {
  const keys = [
    'planetOrbitSpeed', 'moonOrbitSpeed', 'starRotationSpeed',
    'starType', 'enableMeteors', 'enableAsteroidBelt', 'enableSpaceDust',
    'enableNebula', 'enableStarBackground', 'bloomIntensity',
    'starCount', 'meteorCount', 'showOrbitLines', 'orbitLineOpacity',
  ]
  const changed = keys.some((k) => state[k] !== prevState[k])
  if (changed) {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      useSettingsStore.getState().syncToServer()
    }, 2000)
  }
})

export default useSettingsStore
