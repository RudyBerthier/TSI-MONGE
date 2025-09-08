// Utilitaires pour sécuriser les téléchargements PDF
import React from 'react'

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
    console.error('Erreur lors du téléchargement sécurisé:', error)
    alert('Erreur lors du téléchargement du fichier')
  }
}

export const openSecurePDFInNewTab = async (fileUrl, filename = 'document.pdf') => {
  try {
    // Détecter si on est sur mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Récupérer le fichier via une requête sécurisée
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
      // Sur mobile, utiliser une approche plus compatible
      // Créer un lien temporaire et le cliquer
      const tempLink = document.createElement('a')
      tempLink.href = blobUrl
      tempLink.target = '_blank'
      tempLink.rel = 'noopener noreferrer'
      tempLink.style.display = 'none'
      
      // Ajouter au DOM temporairement
      document.body.appendChild(tempLink)
      
      // Simuler un clic utilisateur
      tempLink.click()
      
      // Nettoyer
      document.body.removeChild(tempLink)
      
      // Si ça ne fonctionne pas, essayer directement l'URL puis téléchargement
      setTimeout(() => {
        try {
          // Essayer d'ouvrir directement l'URL
          window.open(fileUrl, '_blank', 'noopener,noreferrer')
        } catch (directError) {
          // Dernier recours : téléchargement
          downloadSecurePDF(fileUrl, filename)
        }
      }, 1000)
      
    } else {
      // Sur desktop, utiliser window.open
      const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        console.warn('Popup bloqué, fallback vers téléchargement')
        downloadSecurePDF(fileUrl, filename)
      } else {
        // Nettoyer l'URL blob après que la fenêtre soit fermée
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(blobUrl)
        })
      }
    }
    
    // Nettoyer après 5 minutes au cas où
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 5 * 60 * 1000)
    
  } catch (error) {
    console.error('Erreur lors de l\'ouverture sécurisée:', error)
    // Fallback vers téléchargement en cas d'erreur
    try {
      await downloadSecurePDF(fileUrl, filename)
    } catch (downloadError) {
      console.error('Erreur lors du téléchargement fallback:', downloadError)
      alert('Erreur lors de l\'ouverture du fichier')
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
    
    try {
      setIsLoading(true)
      
      // Appeler la fonction onClick personnalisée si fournie
      if (onClick) {
        onClick(e)
      }
      
      // Ouvrir le PDF de manière sécurisée (télécharge ET ouvre)
      await openSecurePDFInNewTab(fileUrl, filename)
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