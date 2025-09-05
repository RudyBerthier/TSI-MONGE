// Utilitaires pour sécuriser les téléchargements PDF
import React from 'react'

export const downloadSecurePDF = async (fileUrl, filename = 'document.pdf') => {
  try {
    // Récupérer le fichier via une requête sécurisée
    const response = await fetch(`/api/documents/download${fileUrl.replace('/uploads', '')}`, {
      method: 'GET',
      credentials: 'include', // Inclure les cookies d'authentification si nécessaire
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
    // Récupérer le fichier via une requête sécurisée
    const response = await fetch(`/api/documents/download${fileUrl.replace('/uploads', '')}`, {
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

    // Créer un URL blob temporaire et ouvrir dans un nouvel onglet
    const blobUrl = URL.createObjectURL(blob)
    const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
    
    if (!newWindow) {
      // Si le popup est bloqué, forcer le téléchargement
      downloadSecurePDF(fileUrl, filename)
    } else {
      // Nettoyer l'URL blob après que la fenêtre soit fermée
      newWindow.addEventListener('beforeunload', () => {
        URL.revokeObjectURL(blobUrl)
      })
      
      // Nettoyer après 5 minutes au cas où
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 5 * 60 * 1000)
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'ouverture sécurisée:', error)
    alert('Erreur lors de l\'ouverture du fichier')
  }
}

// Fonction pour créer un composant de lien sécurisé
export const SecurePDFLink = ({ fileUrl, filename, children, className, onClick, ...props }) => {
  const handleClick = (e) => {
    e.preventDefault()
    
    // Appeler la fonction onClick personnalisée si fournie
    if (onClick) {
      onClick(e)
    }
    
    // Ouvrir le PDF de manière sécurisée
    openSecurePDFInNewTab(fileUrl, filename)
  }

  return (
    <button 
      onClick={handleClick}
      className={className}
      title={`Ouvrir ${filename || 'le document'}`}
      {...props}
    >
      {children}
    </button>
  )
}