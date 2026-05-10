import { createContext, useContext, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [facturaExpandida, setFacturaExpandida] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navbarOculto, setNavbarOculto] = useState(false)
  return (
    <UIContext.Provider value={{ facturaExpandida, setFacturaExpandida, sidebarCollapsed, setSidebarCollapsed, navbarOculto, setNavbarOculto }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
