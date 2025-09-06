import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

let notificationId = 0

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])

  const addNotification = (message, type = 'success', duration = 5000) => {
    const id = ++notificationId
    const notification = { id, message, type, duration }
    
    setNotifications(prev => [...prev, notification])

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const showSuccess = (message, duration) => addNotification(message, 'success', duration)
  const showError = (message, duration) => addNotification(message, 'error', duration)
  const showInfo = (message, duration) => addNotification(message, 'info', duration)
  const showWarning = (message, duration) => addNotification(message, 'warning', duration)

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning
  }
}

export const NotificationContainer = ({ notifications, removeNotification }) => {
  if (!notifications?.length) return null

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />
      case 'error': return <AlertCircle size={20} />
      case 'warning': return <AlertCircle size={20} />
      case 'info': return <Info size={20} />
      default: return <Info size={20} />
    }
  }

  const getColors = (type) => {
    switch (type) {
      case 'success': return 'bg-green-50 text-green-800 border-green-200'
      case 'error': return 'bg-red-50 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'info': return 'bg-blue-50 text-blue-800 border-blue-200'
      default: return 'bg-gray-50 text-gray-800 border-gray-200'
    }
  }

  const getIconColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      case 'info': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
          getIcon={getIcon}
          getColors={getColors}
          getIconColor={getIconColor}
        />
      ))}
    </div>
  )
}

const NotificationItem = ({ notification, onRemove, getIcon, getColors, getIconColor }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 50)
  }, [])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(onRemove, 300) // Match animation duration
  }

  return (
    <div
      className={`
        ${getColors(notification.type)}
        border rounded-lg shadow-lg p-4 min-w-80
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'translate-x-full opacity-0' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`${getIconColor(notification.type)} flex-shrink-0 mt-0.5`}>
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {notification.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className={`${getIconColor(notification.type)} hover:opacity-70 transition-opacity flex-shrink-0`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}