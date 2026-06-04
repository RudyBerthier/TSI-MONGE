import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

const hexToRgb = (hex) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  } else if (hex.length === 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  return `${+r}, ${+g}, ${+b}`;
};

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const { userSettings, updateUserSettings, isAuthenticated } = useAuth()

  // Determine initial dark mode (localStorage > system preference)
  const [darkMode, setDarkModeState] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return true
    return false
  })

  const [deepDarkPreview, setDeepDarkPreview] = useState(() => {
    return localStorage.getItem('deepDark') === 'true'
  })

  // We'll use this state temporarily while adjusting, 
  // and deepDark is the actual applied state.
  const [isDeepDark, setIsDeepDarkState] = useState(deepDarkPreview)

  const [accentColor, setAccentColorState] = useState(() => {
    return localStorage.getItem('accentColor') || 'blue' // blue, purple, green, orange, pink
  })

  // Synchronisation depuis le cloud vers l'état local au chargement
  useEffect(() => {
    if (userSettings && isAuthenticated) {
      if (userSettings.theme) setDarkModeState(userSettings.theme === 'dark')
      if (userSettings.deepDark !== undefined) setIsDeepDarkState(userSettings.deepDark === 'true')
      if (userSettings.accentColor) setAccentColorState(userSettings.accentColor)
    }
  }, [userSettings, isAuthenticated])

  // Setters personnalisés qui mettent à jour l'état local ET le cloud Supabase
  const setDarkMode = (value) => {
    const newVal = typeof value === 'function' ? value(darkMode) : value
    setDarkModeState(newVal)
    if (updateUserSettings) updateUserSettings({ theme: newVal ? 'dark' : 'light' })
  }

  const setAccentColor = (value) => {
    const newVal = typeof value === 'function' ? value(accentColor) : value
    setAccentColorState(newVal)
    if (updateUserSettings) updateUserSettings({ accentColor: newVal })
  }

  const colorVariants = {
    blue: { hex: '#1D4ED8', rgb: '29, 78, 216', darkHex: '#5B9BFF', darkRgb: '91, 155, 255' },
    purple: { hex: '#7C3AED', rgb: '124, 58, 237', darkHex: '#A78BFA', darkRgb: '167, 139, 250' },
    green: { hex: '#059669', rgb: '5, 150, 105', darkHex: '#34D399', darkRgb: '52, 211, 153' },
    orange: { hex: '#EA580C', rgb: '234, 88, 12', darkHex: '#FB923C', darkRgb: '251, 146, 60' },
    pink: { hex: '#DB2777', rgb: '219, 39, 119', darkHex: '#F472B6', darkRgb: '244, 114, 182' },
  }

  // Permet de déterminer si une couleur est custom ou dans les presets
  const isCustomColor = !colorVariants[accentColor]

  const getActiveColorTokens = () => {
    if (colorVariants[accentColor]) return colorVariants[accentColor]
    const rgb = hexToRgb(accentColor)
    return {
      hex: accentColor,
      rgb: rgb,
      darkHex: accentColor, // on pourrait calculer une teinte plus claire pour le dark mode, mais on garde la même pour le moment
      darkRgb: rgb
    }
  }

  const applyTheme = () => {
    const root = document.documentElement

    // 1. Dark Mode
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')

      // 1b. Deep Dark Mode (OLED)
      if (isDeepDark) {
        root.style.setProperty('--bg', '#000000')
        root.style.setProperty('--surface', '#0A0A0A')
        root.style.setProperty('--surface-2', '#121212')
        root.style.setProperty('--surface-3', '#1A1A1A')
        root.style.setProperty('--nav-bg', 'rgba(0, 0, 0, 0.9)')
        root.style.setProperty('--bg-dot', 'rgba(255, 255, 255, 0.05)')
        localStorage.setItem('deepDark', 'true')
      } else {
        root.style.removeProperty('--bg')
        root.style.removeProperty('--surface')
        root.style.removeProperty('--surface-2')
        root.style.removeProperty('--surface-3')
        root.style.removeProperty('--nav-bg')
        root.style.removeProperty('--bg-dot')
        localStorage.setItem('deepDark', 'false')
      }
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      // Remove deep dark overrides in light mode
      root.style.removeProperty('--bg')
      root.style.removeProperty('--surface')
      root.style.removeProperty('--surface-2')
      root.style.removeProperty('--surface-3')
      root.style.removeProperty('--nav-bg')
      root.style.removeProperty('--bg-dot')
    }

    // 2. Accent Color
    const color = getActiveColorTokens()
    localStorage.setItem('accentColor', accentColor)

    if (darkMode) {
      root.style.setProperty('--accent', color.darkHex)
      root.style.setProperty('--accent-rgb', color.darkRgb)
    } else {
      root.style.setProperty('--accent', color.hex)
      root.style.setProperty('--accent-rgb', color.rgb)
    }
  }

  useEffect(() => {
    applyTheme()
  }, [darkMode, isDeepDark, accentColor])

  // Écouter les changements de préférence système
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e) => {
      // Ne changer que si l'utilisateur n'a pas fait de choix manuel
      const savedTheme = localStorage.getItem('theme')
      if (!savedTheme) {
        setDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = () => setDarkMode(!darkMode)
  const toggleDeepDark = () => {
    const newVal = !isDeepDark
    setIsDeepDarkState(newVal)
    if (updateUserSettings) updateUserSettings({ deepDark: newVal ? 'true' : 'false' })
  }

  const value = {
    theme: darkMode ? 'dark' : 'light',
    isDark: darkMode,
    darkMode,
    setDarkMode,
    toggleTheme,
    isDeepDark,
    toggleDeepDark,
    accentColor,
    setAccentColor,
    colorVariants,
    isCustomColor
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
