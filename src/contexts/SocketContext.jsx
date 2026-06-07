import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { isAuthenticated, getToken } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  const stableGetToken = useCallback(() => getToken(), [])

  useEffect(() => {
    let isActive = true;

    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const token = stableGetToken()
    if (!token) return

    // Don't create a new socket if one already exists and is connected
    if (socketRef.current?.connected) {
      return
    }

    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.close()
    }

    // Lazy load socket.io-client
    import('socket.io-client').then(({ io }) => {
      if (!isActive) return;

      const newSocket = io(SOCKET_URL || window.location.origin, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      newSocket.on('connect', () => {
        setConnected(true)
      })

      newSocket.on('disconnect', () => {
        setConnected(false)
      })

      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message)
      })

      socketRef.current = newSocket
      setSocket(newSocket)
    }).catch(err => {
      console.error('Failed to load socket.io-client', err);
    });

    return () => {
      isActive = false;
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [isAuthenticated, stableGetToken])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
