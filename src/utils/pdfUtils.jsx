// Utilitaires pour sécuriser les téléchargements PDF
import React from 'react'

// Fonction simple pour Safari iOS qui évite les blobs
export const openPDFDirectly = (fileUrl, filename = 'document.pdf') => {
  try {
    // Pour Safari iOS, essayer window.open immédiatement (doit être synchrone)
    const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer')
    
    // Vérifier si window.open a réussi
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Fallback avec lien temporaire
      const tempLink = document.createElement('a')
      tempLink.href = fileUrl
      tempLink.target = '_blank'
      tempLink.rel = 'noopener noreferrer'
      tempLink.style.display = 'none'
      
      // Sur Safari iOS, parfois un petit délai aide
      document.body.appendChild(tempLink)
      setTimeout(() => {
        tempLink.click()
        document.body.removeChild(tempLink)
      }, 10)
    }
  } catch (error) {
    // Dernier recours : essayer de télécharger
    try {
      const downloadLink = document.createElement('a')
      downloadLink.href = fileUrl
      downloadLink.download = filename
      downloadLink.style.display = 'none'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } catch (downloadError) {
      alert('Impossible d\'ouvrir le document. Vérifiez votre connexion.')
    }
  }
}

export const downloadSecurePDF = async (fileUrl, filename = 'document.pdf') => {
  try {
    // Récupérer le fichier via une requête sécurisée
    const response = await fetch(fileUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/pdf, application/octet-stream'
      }
    })

    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement: ${response.status}`)
    }

    // Créer un blob sécurisé
    const blob = await response.blob()
    
    // Vérifier le type MIME
    if (!blob.type.includes('pdf') && !blob.type.includes('octet-stream')) {
      throw new Error('Le fichier n\'est pas un PDF valide')
    }

    // Créer un URL blob temporaire
    const blobUrl = URL.createObjectURL(blob)
    
    // Créer un élément de téléchargement temporaire
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = filename
    downloadLink.style.display = 'none'
    
    // Ajouter au DOM, cliquer et nettoyer
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    
    // Nettoyer l'URL blob après un délai
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 100)
    
  } catch (error) {
    alert('Erreur lors du téléchargement du fichier')
  }
}

export const openSecurePDFInNewTab = async (fileUrl, filename = 'document.pdf') => {
  try {
    // Détecter le navigateur et le type d'appareil
    const userAgent = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    
    // Pour Safari iOS, utiliser une approche simple sans blob
    if (isSafari && isIOS) {
      // Essayer d'ouvrir directement l'URL dans Safari iOS
      try {
        const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer')
        if (!newWindow) {
          // Si window.open échoue, créer un lien et le cliquer
          const tempLink = document.createElement('a')
          tempLink.href = fileUrl
          tempLink.target = '_blank'
          tempLink.rel = 'noopener noreferrer'
          tempLink.style.display = 'none'
          
          document.body.appendChild(tempLink)
          tempLink.click()
          document.body.removeChild(tempLink)
        }
        return
      } catch (error) {
        alert('Impossible d\'ouvrir le document. Vérifiez votre connexion.')
        return
      }
    }
    
    // Pour les autres navigateurs, utiliser l'approche avec blob
    const response = await fetch(fileUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/pdf, application/octet-stream'
      }
    })

    if (!response.ok) {
      throw new Error(`Erreur lors du chargement: ${response.status}`)
    }

    // Créer un blob sécurisé
    const blob = await response.blob()
    
    // Vérifier le type MIME
    if (!blob.type.includes('pdf') && !blob.type.includes('octet-stream')) {
      throw new Error('Le fichier n\'est pas un PDF valide')
    }

    // Créer un URL blob temporaire
    const blobUrl = URL.createObjectURL(blob)
    
    if (isMobile) {
      // Sur mobile (non Safari iOS), utiliser une approche compatible
      const tempLink = document.createElement('a')
      tempLink.href = blobUrl
      tempLink.target = '_blank'
      tempLink.rel = 'noopener noreferrer'
      tempLink.style.display = 'none'
      
      document.body.appendChild(tempLink)
      tempLink.click()
      document.body.removeChild(tempLink)
      
      // Fallback après un délai
      setTimeout(() => {
        try {
          window.open(fileUrl, '_blank', 'noopener,noreferrer')
        } catch (directError) {
          downloadSecurePDF(fileUrl, filename)
        }
      }, 1000)
      
    } else {
      // Sur desktop
      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        downloadSecurePDF(fileUrl, filename)
      } else {
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(blobUrl)
        })
      }
    }
    
    // Nettoyer après 5 minutes
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 5 * 60 * 1000)
    
  } catch (error) {
    
    // Fallback final : essayer d'ouvrir directement l'URL
    try {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
    } catch (directError) {
      try {
        await downloadSecurePDF(fileUrl, filename)
      } catch (downloadError) {
        alert('Erreur lors de l\'ouverture du fichier')
      }
    }
  }
}

// Fonction pour créer un composant de lien sécurisé
export const SecurePDFLink = ({ fileUrl, filename, children, className, onClick, ...props }) => {
  const [isLoading, setIsLoading] = React.useState(false)
  
  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Éviter les clics multiples
    if (isLoading) return
    
    // Détecter Safari iOS pour une gestion spéciale
    const userAgent = navigator.userAgent
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    
    try {
      setIsLoading(true)
      
      // Appeler la fonction onClick personnalisée si fournie
      if (onClick) {
        onClick(e)
      }
      
      if (isSafari && isIOS) {
        // Pour Safari iOS, utiliser l'ouverture directe simple
        openPDFDirectly(fileUrl, filename)
      } else {
        // Pour les autres navigateurs, utiliser l'approche async
        await openSecurePDFInNewTab(fileUrl, filename)
      }
    } catch (error) {
      // Fallback final
      try {
        window.open(fileUrl, '_blank', 'noopener,noreferrer')
      } catch (fallbackError) {
        alert('Impossible d\'ouvrir le document')
      }
    } finally {
      // Retirer le loading après 2 secondes
      setTimeout(() => {
        setIsLoading(false)
      }, 2000)
    }
  }

  const handleTouchStart = (e) => {
    // Ajouter une classe pour indiquer l'activation tactile
    e.currentTarget.style.opacity = '0.7'
  }

  const handleTouchEnd = (e) => {
    // Retirer l'effet visuel
    e.currentTarget.style.opacity = ''
  }

  return (
    <button 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`${className} active:opacity-70 touch-manipulation ${isLoading ? 'animate-pulse' : ''}`}
      title={`${isLoading ? 'Ouverture...' : `Ouvrir ${filename || 'le document'}`}`}
      type="button"
      disabled={isLoading}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        cursor: isLoading ? 'wait' : 'pointer'
      }}
      {...props}
    >
      {children}
    </button>
  )
}