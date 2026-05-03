/**
 * 程序化行星纹理生成器
 * 生成高质量的太阳系风格行星纹理
 */

// 太阳系行星颜色参考
export const PLANET_COLORS = {
  mercury: { base: '#8c8c8c', accent: '#6b6b6b', highlight: '#b5b5b5' },
  venus: { base: '#e6c87a', accent: '#d4a84b', highlight: '#fff4d6' },
  earth: { base: '#4a90d9', accent: '#2e5a87', highlight: '#7ec8e3' },
  mars: { base: '#c1440e', accent: '#8b2500', highlight: '#e77d5a' },
  jupiter: { base: '#d4a574', accent: '#b8860b', highlight: '#f5deb3' },
  saturn: { base: '#f4d59e', accent: '#daa520', highlight: '#fff8dc' },
  uranus: { base: '#72d6e5', accent: '#4fb3bf', highlight: '#b0e0e6' },
  neptune: { base: '#4b70dd', accent: '#2a4494', highlight: '#7eb3e8' },
  pluto: { base: '#cdc1b5', accent: '#a09080', highlight: '#e5ddd5' },
}

// 程序化纹理生成函数
export function generateProceduralTexture(options = {}) {
  const {
    width = 512,
    height = 256,
    baseColor = '#4a90d9',
    accentColor = '#2e5a87',
    highlightColor = '#7ec8e3',
    type = 'rocky', // rocky, gas, ice, volcanic
    seed = Math.random() * 10000,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // 简单的伪随机函数
  const random = (x, y, s = seed) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453
    return n - Math.floor(n)
  }

  // Perlin-like noise
  const noise = (x, y, octaves = 4) => {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0
    for (let i = 0; i < octaves; i++) {
      value += amplitude * (random(x * frequency, y * frequency) * 2 - 1)
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    return (value / maxValue + 1) / 2
  }

  // 解析颜色
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 }
  }

  const baseRgb = hexToRgb(baseColor)
  const accentRgb = hexToRgb(accentColor)
  const highlightRgb = hexToRgb(highlightColor)

  // 根据类型生成纹理
  if (type === 'rocky') {
    // 岩石行星纹理
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width
        const v = y / height
        
        const n1 = noise(u * 8, v * 8)
        const n2 = noise(u * 16, v * 16, 3)
        const n3 = noise(u * 4, v * 4)
        
        const crater = random(u * 20, v * 20) > 0.97 ? 0.3 : 0
        
        const mix = n1 * 0.5 + n2 * 0.3 + n3 * 0.2 - crater
        
        let r = baseRgb.r, g = baseRgb.g, b = baseRgb.b
        if (mix > 0.6) {
          const t = (mix - 0.6) / 0.4
          r = baseRgb.r + (highlightRgb.r - baseRgb.r) * t
          g = baseRgb.g + (highlightRgb.g - baseRgb.g) * t
          b = baseRgb.b + (highlightRgb.b - baseRgb.b) * t
        } else if (mix < 0.4) {
          const t = (0.4 - mix) / 0.4
          r = baseRgb.r + (accentRgb.r - baseRgb.r) * t * 0.5
          g = baseRgb.g + (accentRgb.g - baseRgb.g) * t * 0.5
          b = baseRgb.b + (accentRgb.b - baseRgb.b) * t * 0.5
        }
        
        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  } else if (type === 'gas') {
    // 气态行星纹理（带状）
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width
        const v = y / height
        
        const band = Math.sin(v * Math.PI * 12 + noise(u * 2, v * 2) * 2) * 0.5 + 0.5
        const turbulence = noise(u * 4, v * 20, 3) * 0.3
        const swirl = noise(u * 8 + v * 0.5, v * 8, 2) * 0.2
        
        const mix = band + turbulence + swirl
        
        let r = baseRgb.r, g = baseRgb.g, b = baseRgb.b
        if (mix > 0.7) {
          const t = (mix - 0.7) / 0.3
          r = baseRgb.r + (highlightRgb.r - baseRgb.r) * t * 0.7
          g = baseRgb.g + (highlightRgb.g - baseRgb.g) * t * 0.7
          b = baseRgb.b + (highlightRgb.b - baseRgb.b) * t * 0.7
        } else if (mix < 0.3) {
          const t = (0.3 - mix) / 0.3
          r = baseRgb.r + (accentRgb.r - baseRgb.r) * t * 0.8
          g = baseRgb.g + (accentRgb.g - baseRgb.g) * t * 0.8
          b = baseRgb.b + (accentRgb.b - baseRgb.b) * t * 0.8
        }
        
        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  } else if (type === 'ice') {
    // 冰行星纹理
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width
        const v = y / height
        
        const n1 = noise(u * 6, v * 6)
        const n2 = noise(u * 12, v * 12, 2)
        const veins = Math.abs(Math.sin(v * 50 + n1 * 10)) > 0.95 ? 0.3 : 0
        
        const mix = n1 * 0.6 + n2 * 0.4 - veins
        
        let r = baseRgb.r, g = baseRgb.g, b = baseRgb.b
        if (mix > 0.6) {
          const t = (mix - 0.6) / 0.4
          r = baseRgb.r + (highlightRgb.r - baseRgb.r) * t
          g = baseRgb.g + (highlightRgb.g - baseRgb.g) * t
          b = baseRgb.b + (highlightRgb.b - baseRgb.b) * t
        }
        
        ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  } else if (type === 'volcanic') {
    // 火山行星纹理
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width
        const v = y / height
        
        const n1 = noise(u * 10, v * 10)
        const lava = random(u * 30, v * 30) > (0.92 - n1 * 0.1) ? 1 : 0
        
        if (lava > 0.5) {
          const brightness = 0.8 + random(u, v) * 0.2
          ctx.fillStyle = `rgb(${Math.floor(255 * brightness)}, ${Math.floor(100 * brightness)}, ${Math.floor(0)})`
        } else {
          const mix = n1
          let r = baseRgb.r, g = baseRgb.g, b = baseRgb.b
          if (mix > 0.5) {
            const t = (mix - 0.5) / 0.5
            r = baseRgb.r + (accentRgb.r - baseRgb.r) * t * 0.5
            g = baseRgb.g + (accentRgb.g - baseRgb.g) * t * 0.5
            b = baseRgb.b + (accentRgb.b - baseRgb.b) * t * 0.5
          }
          ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
        }
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.9)
}

// 预定义的行星配置
export const PLANET_PRESETS = [
  { name: 'sun', type: 'sun', colors: { base: '#ffdd44', accent: '#ff8800', highlight: '#ffffaa' } },
  { name: 'rocky', type: 'rocky', colors: PLANET_COLORS.mercury },
  { name: 'rocky', type: 'rocky', colors: PLANET_COLORS.venus },
  { name: 'rocky', type: 'rocky', colors: PLANET_COLORS.earth },
  { name: 'rocky', type: 'rocky', colors: PLANET_COLORS.mars },
  { name: 'rocky', type: 'rocky', colors: PLANET_COLORS.pluto },
  { name: 'gas', type: 'gas', colors: PLANET_COLORS.jupiter },
  { name: 'gas', type: 'gas', colors: PLANET_COLORS.saturn },
  { name: 'ice', type: 'ice', colors: PLANET_COLORS.uranus },
  { name: 'ice', type: 'ice', colors: PLANET_COLORS.neptune },
]

// 生成纹理纹理并返回Texture对象
export function createPlanetTextures(THREE) {
  return PLANET_PRESETS.map((preset) => {
    const dataUrl = generateProceduralTexture({
      width: 512,
      height: 256,
      baseColor: preset.colors.base,
      accentColor: preset.colors.accent,
      highlightColor: preset.colors.highlight,
      type: preset.type,
      seed: Math.random() * 10000,
    })
    const texture = new THREE.TextureLoader().load(dataUrl)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  })
}

// 创建太阳纹理
export function createSunTexture(THREE) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.2, '#fff4d6')
  gradient.addColorStop(0.4, '#ffcc00')
  gradient.addColorStop(0.7, '#ff8800')
  gradient.addColorStop(1, '#ff4400')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 512, 512)
  
  // 添加太阳黑子
  const random = (x, y) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - Math.floor(n)
  }
  
  for (let i = 0; i < 20; i++) {
    const x = random(i, 1) * 512
    const y = random(i, 2) * 512
    const r = 5 + random(i, 3) * 20
    const alpha = 0.3 + random(i, 4) * 0.3
    
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(180, 100, 0, ${alpha})`
    ctx.fill()
  }
  
  const dataUrl = canvas.toDataURL('image/png')
  const texture = new THREE.TextureLoader().load(dataUrl)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
