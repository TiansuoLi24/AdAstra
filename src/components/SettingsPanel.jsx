import { useState } from 'react'
import useSettingsStore, { STAR_TYPES } from '../store/useSettingsStore'

// 滑块组件
function Slider({ label, value, min, max, step = 0.1, onChange, format }) {
  const displayValue = format ? format(value) : value.toFixed(1)

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/70">{label}</span>
        <span className="text-xs text-cyan-400 font-mono">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                   accent-cyan-500 hover:accent-cyan-400 transition-all
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-3.5
                   [&::-webkit-slider-thumb]:h-3.5
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-cyan-500
                   [&::-webkit-slider-thumb]:shadow-lg
                   [&::-webkit-slider-thumb]:shadow-cyan-500/30
                   [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:transition-transform
                   [&::-webkit-slider-thumb]:hover:scale-125"
      />
    </div>
  )
}

// 开关组件
function Toggle({ label, checked, onChange, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <span className="text-xs text-white/80">{label}</span>
        {description && (
          <p className="text-[10px] text-white/40 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200
                   ${checked ? 'bg-cyan-500' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md
                     transition-transform duration-200
                     ${checked ? 'translate-x-5' : 'translate-x-0'}`}
          style={{ left: '2px' }}
        />
      </button>
    </div>
  )
}

// 恒星类型选择器
function StarTypeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedType = STAR_TYPES[value]

  return (
    <div className="mb-4">
      <label className="text-xs text-white/70 mb-2 block">恒星类型</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2
                   bg-white/5 border border-white/10 rounded-lg
                   hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${selectedType.color}, ${selectedType.emissive})`,
              boxShadow: `0 0 8px ${selectedType.emissive}`
            }}
          />
          <span className="text-sm text-white">{selectedType.name}</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M4 2L8 6L4 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-1 bg-black/80 border border-white/10 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
          {Object.entries(STAR_TYPES).map(([key, type]) => (
            <button
              key={key}
              onClick={() => {
                onChange(key)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors
                         ${value === key ? 'bg-cyan-500/20' : ''}`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${type.color}, ${type.emissive})`,
                  boxShadow: `0 0 6px ${type.emissive}`
                }}
              />
              <span className={`text-xs ${value === key ? 'text-cyan-300' : 'text-white/70'}`}>
                {type.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SettingsPanel() {
  const settings = useSettingsStore()

  return (
    <div className="px-3 py-4 space-y-4">
      {/* 速度设置 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          轨道速度
        </h3>
        <Slider
          label="行星公转速度"
          value={settings.planetOrbitSpeed}
          min={0.1}
          max={5}
          onChange={settings.setPlanetOrbitSpeed}
          format={(v) => `${v.toFixed(1)}x`}
        />
        <Slider
          label="卫星公转速度"
          value={settings.moonOrbitSpeed}
          min={0.1}
          max={5}
          onChange={settings.setMoonOrbitSpeed}
          format={(v) => `${v.toFixed(1)}x`}
        />
        <Slider
          label="恒星自转速度"
          value={settings.starRotationSpeed}
          min={0.1}
          max={5}
          onChange={settings.setStarRotationSpeed}
          format={(v) => `${v.toFixed(1)}x`}
        />
      </section>

      <div className="border-t border-white/5" />

      {/* 恒星设置 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          恒星设置
        </h3>
        <StarTypeSelector
          value={settings.starType}
          onChange={settings.setStarType}
        />
      </section>

      <div className="border-t border-white/5" />

      {/* 行星颜色 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </h3>
      </section>

      <div className="border-t border-white/5" />

      {/* 太空特效 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18" />
            <path d="M18.5 8.5L12 12l-6.5-3.5L12 5l6.5 3.5z" />
            <path d="M18.5 15.5L12 19l-6.5-3.5L12 12l6.5 3.5z" />
          </svg>
          太空特效
        </h3>
        <Toggle
          label="星星背景"
          description="背景星空"
          checked={settings.enableStarBackground}
          onChange={settings.toggleStarBackground}
        />
        <Toggle
          label="流星"
          description="随机划过的流星"
          checked={settings.enableMeteors}
          onChange={settings.toggleMeteors}
        />
        <Toggle
          label="小行星带"
          description="恒星周围的小行星带"
          checked={settings.enableAsteroidBelt}
          onChange={settings.toggleAsteroidBelt}
        />
        <Toggle
          label="太空尘埃"
          description="漂浮的星际尘埃"
          checked={settings.enableSpaceDust}
          onChange={settings.toggleSpaceDust}
        />
        <Toggle
          label="星云背景"
          description="绚丽的星云效果"
          checked={settings.enableNebula}
          onChange={settings.toggleNebula}
        />
        {settings.enableStarBackground && (
          <Slider
            label="星星密度"
            value={settings.starCount}
            min={5000}
            max={50000}
            step={1000}
            onChange={settings.setStarCount}
            format={(v) => v.toLocaleString()}
          />
        )}
      </section>

      <div className="border-t border-white/5" />

      {/* 视觉效果 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          视觉效果
        </h3>
        <Slider
          label="泛光强度"
          value={settings.bloomIntensity}
          min={0.5}
          max={3}
          step={0.1}
          onChange={settings.setBloomIntensity}
          format={(v) => v.toFixed(1)}
        />
        <Slider
          label="流星数量"
          value={settings.meteorCount}
          min={0}
          max={20}
          step={1}
          onChange={settings.setMeteorCount}
          format={(v) => Math.round(v).toString()}
        />
      </section>

      <div className="border-t border-white/5" />

      {/* 轨道线设置 */}
      <section>
        <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <ellipse cx="12" cy="12" rx="10" ry="4" />
          </svg>
          轨道线
        </h3>
        <Toggle
          label="显示轨道线"
          description="显示行星公转路径"
          checked={settings.showOrbitLines}
          onChange={settings.toggleOrbitLines}
        />
        {settings.showOrbitLines && (
          <Slider
            label="轨道线透明度"
            value={settings.orbitLineOpacity}
            min={0.05}
            max={1}
            step={0.05}
            onChange={settings.setOrbitLineOpacity}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        )}
      </section>

      <div className="border-t border-white/5" />

      {/* 重置按钮 */}
      <button
        onClick={settings.resetToDefaults}
        className="w-full py-2 px-4 bg-white/5 hover:bg-white/10
                   border border-white/10 rounded-lg
                   text-xs text-white/60 hover:text-white/80
                   transition-all duration-200
                   flex items-center justify-center gap-2"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        重置为默认设置
      </button>
    </div>
  )
}
