import { createContext, useContext, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [facturaExpandida, setFacturaExpandida] = useState(false)
  return (
    <UIContext.Provider value={{ facturaExpandida, setFacturaExpandida }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  return useContext(UIContext)
}
