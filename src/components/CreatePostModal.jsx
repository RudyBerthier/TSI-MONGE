import { useState, useRef, useEffect } from 'react'
import { X, Image as ImageIcon, Camera, Type, Move, Upload, Check, ChevronLeft, ChevronRight, Trash2, Pencil, Eraser, FlipHorizontal2, BarChart2 } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import imageCompression from 'browser-image-compression'
export function CreatePostModal({ user, onClose, onPostCreated }) {
    const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

    // States: 'select_media', 'camera', 'crop', 'edit', 'caption'
    const [step, setStep] = useState('camera')

    // Media (Now arrays to support multiple)
    const [mediaFiles, setMediaFiles] = useState([])
    const [mediaPreviews, setMediaPreviews] = useState([])
    const [mediaTypes, setMediaTypes] = useState([]) // Array of 'image' | 'video'
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

    // Cropping
    const [crop, setCrop] = useState()
    const [completedCrop, setCompletedCrop] = useState(null)
    const imgRef = useRef(null)
    const [aspect, setAspect] = useState(1) // 1:1 default

    // Camera
    const videoRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [facingMode, setFacingMode] = useState('user')
    const [cameraMode, setCameraMode] = useState('POST') // 'STORY' | 'POST' | 'REELS'
    const CAMERA_MODES = ['STORY', 'POST', 'REELS']

    // Editing - Text Overlays
    const [texts, setTexts] = useState([]) // { id, text, color, x, y, size }
    const [activeTextId, setActiveTextId] = useState(null)
    const [isTyping, setIsTyping] = useState(false)
    const [currentTextColor, setCurrentTextColor] = useState('#FFFFFF')
    const [currentTextInput, setCurrentTextInput] = useState('')

    // Final Post
    const [caption, setCaption] = useState('')
    const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState(false)
    const [posting, setPosting] = useState(false)

    // Refs for rendering
    const canvasRef = useRef(null)
    const containerRef = useRef(null)
    const fileInputRef = useRef(null)

    // Drawing
    const drawCanvasRef = useRef(null)
    const [isDrawMode, setIsDrawMode] = useState(false)
    const [drawColor, setDrawColor] = useState('#FFFFFF')
    const [isEraser, setIsEraser] = useState(false)
    const isDrawingActive = useRef(false)
    const lastDrawPoint = useRef(null)

    const colors = ['#FFFFFF', '#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']

    // Poll feature for Story Mode
    const [poll, setPoll] = useState(null) // { id, x, y, question, options }
    const [isPollCreatorOpen, setIsPollCreatorOpen] = useState(false)
    const [pollInputs, setPollInputs] = useState({ question: '', options: ['', ''] })
    const [activePollDrag, setActivePollDrag] = useState(false)
    const [isOverTrash, setIsOverTrash] = useState(false)
    const trashZoneRef = useRef(null)

    // ─── Camera Handling ──────────────────────────────────────────────
    const startCamera = async (mode) => {
        const facing = mode ?? facingMode
        try {
            if (stream) stream.getTracks().forEach(t => t.stop())
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing },
                audio: false
            })
            setStream(mediaStream)
            setStep('camera')
        } catch (err) {
            console.error("Camera access denied", err)
            alert("Impossible d'accéder à la caméra.")
        }
    }

    const flipCamera = async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newFacing)
        await startCamera(newFacing)
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }

    // Auto-start camera on mount
    useEffect(() => {
        startCamera()
    }, [])

    useEffect(() => {
        if (step === 'camera' && !stream) {
            startCamera()
        }
    }, [step])

    useEffect(() => {
        if (step === 'camera' && videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
        return () => {
            if (step !== 'camera') stopCamera()
        }
    }, [step, stream])

    useEffect(() => {
        if (step !== 'edit' || !drawCanvasRef.current || !containerRef.current) return
        const { width, height } = containerRef.current.getBoundingClientRect()
        if (width > 0 && height > 0) {
            drawCanvasRef.current.width = Math.round(width)
            drawCanvasRef.current.height = Math.round(height)
        }
    }, [step, currentMediaIndex])

    useEffect(() => {
        setIsDrawMode(false)
        setIsEraser(false)
    }, [currentMediaIndex])

    const capturePhoto = () => {
        if (!videoRef.current) return
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext('2d')
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

        canvas.toBlob((blob) => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
            setMediaFiles([file])
            setMediaPreviews([URL.createObjectURL(file)])
            setMediaTypes(['image'])
            setCurrentMediaIndex(0)
            stopCamera()
            // Story → skip crop, direct to edit ; Post → crop ; Reels → edit
            setStep(cameraMode === 'POST' ? 'crop' : 'edit')
        }, 'image/jpeg', 0.9)
    }

    // ─── Drawing Handlers ─────────────────────────────────────────────
    const isDrawCanvasEmpty = (canvas) => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
        return !data.some(v => v !== 0)
    }

    const getDrawPoint = (e) => {
        const canvas = drawCanvasRef.current
        if (!canvas) return null
        const rect = canvas.getBoundingClientRect()
        const touch = e.touches?.[0] || e
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        }
    }

    const handleDrawStart = (e) => {
        e.preventDefault()
        isDrawingActive.current = true
        const point = getDrawPoint(e)
        if (!point) return
        lastDrawPoint.current = point
        const canvas = drawCanvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over'
        ctx.beginPath()
        ctx.arc(point.x, point.y, isEraser ? 14 : 3, 0, Math.PI * 2)
        ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : drawColor
        ctx.fill()
    }

    const handleDrawMove = (e) => {
        if (!isDrawingActive.current) return
        e.preventDefault()
        const point = getDrawPoint(e)
        if (!point || !lastDrawPoint.current) return
        const canvas = drawCanvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over'
        ctx.beginPath()
        ctx.moveTo(lastDrawPoint.current.x, lastDrawPoint.current.y)
        ctx.lineTo(point.x, point.y)
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : drawColor
        ctx.lineWidth = isEraser ? 28 : 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
        lastDrawPoint.current = point
    }

    const handleDrawEnd = () => {
        isDrawingActive.current = false
        lastDrawPoint.current = null
    }

    const clearDrawing = () => {
        const canvas = drawCanvasRef.current
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    }

    // ─── File Handling ────────────────────────────────────────────────
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        // Limit to 10 files
        const selectedFiles = files.slice(0, 10)

        const newMediaFiles = [...mediaFiles, ...selectedFiles].slice(0, 10)
        const newPreviews = newMediaFiles.map(f => URL.createObjectURL(f))
        const newTypes = newMediaFiles.map(f => f.type.startsWith('video/') ? 'video' : 'image')

        setMediaFiles(newMediaFiles)
        setMediaPreviews(newPreviews)
        setMediaTypes(newTypes)
        setCurrentMediaIndex(mediaFiles.length) // point to the new first one added

        const type = newTypes[mediaFiles.length]
        if (type === 'image') setStep('crop')
        else setStep('edit')
    }

    // ─── Cropping Logic ───────────────────────────────────────────────
    const onImageLoad = (e) => {
        if (aspect) {
            const { width, height } = e.currentTarget
            setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height))
        }
    }

    const applyCrop = async () => {
        if (!completedCrop || !imgRef.current) {
            setStep('edit')
            return
        }

        const image = imgRef.current
        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        canvas.width = completedCrop.width * scaleX
        canvas.height = completedCrop.height * scaleY

        const ctx = canvas.getContext('2d')

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY
        )

        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty')
                return
            }
            const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" })

            const newMediaFiles = [...mediaFiles]
            newMediaFiles[currentMediaIndex] = croppedFile

            const newPreviews = [...mediaPreviews]
            newPreviews[currentMediaIndex] = URL.createObjectURL(croppedFile)

            setMediaFiles(newMediaFiles)
            setMediaPreviews(newPreviews)

            setStep('edit')
        }, 'image/jpeg', 0.9)
    }

    // ─── Poll Drag Logic ──────────────────────────────────────────────
    const startPollDragging = (e) => {
        if (!poll) return
        e.stopPropagation()
        const touch = e.type === 'touchstart' ? e.touches[0] : e
        if (!containerRef.current) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const centerX = containerRect.left + (poll.x / 100) * containerRect.width
        const centerY = containerRect.top + (poll.y / 100) * containerRect.height
        const offsetX = touch.clientX - centerX
        const offsetY = touch.clientY - centerY

        setActivePollDrag(true)

        const handleMove = (moveEvent) => {
            const mvTouch = moveEvent.type === 'touchmove' ? moveEvent.touches[0] : moveEvent
            let newX = ((mvTouch.clientX - offsetX - containerRect.left) / containerRect.width) * 100
            let newY = ((mvTouch.clientY - offsetY - containerRect.top) / containerRect.height) * 100

            newX = Math.max(5, Math.min(newX, 95))
            newY = Math.max(5, Math.min(newY, 95))

            setPoll(prev => prev ? { ...prev, x: newX, y: newY } : null)
        }

        const handleUp = () => {
            document.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseup', handleUp)
            document.removeEventListener('touchmove', handleMove)
            document.removeEventListener('touchend', handleUp)
            setActivePollDrag(false)
        }

        document.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseup', handleUp)
        document.addEventListener('touchmove', handleMove, { passive: false })
        document.addEventListener('touchend', handleUp)
    }
    const startDragging = (e, id) => {
        if (isTyping) return
        const touch = e.type === 'touchstart' ? e.touches[0] : e
        if (!containerRef.current) return

        const containerRect = containerRef.current.getBoundingClientRect()

        // Le texte est centré sur (x%, y%) via translate(-50%,-50%).
        // On calcule l'offset entre le doigt et ce centre exact.
        const text = texts.find(t => t.id === id)
        if (!text) return
        const centerX = containerRect.left + (text.x / 100) * containerRect.width
        const centerY = containerRect.top + (text.y / 100) * containerRect.height
        const offsetX = touch.clientX - centerX
        const offsetY = touch.clientY - centerY

        setActiveTextId(id)

        const handleMove = (moveEvent) => {
            const mvTouch = moveEvent.type === 'touchmove' ? moveEvent.touches[0] : moveEvent

            let newX = ((mvTouch.clientX - offsetX - containerRect.left) / containerRect.width) * 100
            let newY = ((mvTouch.clientY - offsetY - containerRect.top) / containerRect.height) * 100

            newX = Math.max(2, Math.min(newX, 98))
            newY = Math.max(2, Math.min(newY, 98))

            setTexts(prev => prev.map(t => t.id === id ? { ...t, x: newX, y: newY } : t))

            // Check if hovering over trash zone
            if (trashZoneRef.current) {
                const tr = trashZoneRef.current.getBoundingClientRect()
                const cx = mvTouch.clientX, cy = mvTouch.clientY
                setIsOverTrash(cx >= tr.left && cx <= tr.right && cy >= tr.top && cy <= tr.bottom)
            }
        }

        const handleUp = (upEvent) => {
            document.removeEventListener('mousemove', handleMove)
            document.removeEventListener('mouseup', handleUp)
            document.removeEventListener('touchmove', handleMove)
            document.removeEventListener('touchend', handleUp)

            // If released over trash zone, delete the text
            const upTouch = upEvent?.changedTouches ? upEvent.changedTouches[0] : upEvent
            if (upTouch && trashZoneRef.current) {
                const tr = trashZoneRef.current.getBoundingClientRect()
                if (upTouch.clientX >= tr.left && upTouch.clientX <= tr.right &&
                    upTouch.clientY >= tr.top && upTouch.clientY <= tr.bottom) {
                    setTexts(prev => prev.filter(t => t.id !== id))
                }
            }

            setActiveTextId(null)
            setIsOverTrash(false)
        }

        document.addEventListener('mousemove', handleMove)
        document.addEventListener('mouseup', handleUp)
        document.addEventListener('touchmove', handleMove, { passive: false })
        document.addEventListener('touchend', handleUp)
    }

    const saveText = () => {
        if (!currentTextInput.trim()) {
            setIsTyping(false)
            return
        }

        setTexts(prev => [
            ...prev,
            {
                id: Date.now(),
                text: currentTextInput,
                color: currentTextColor,
                x: 50, // Center roughly
                y: 50,
                size: 24
            }
        ])
        setCurrentTextInput('')
        setIsTyping(false)
    }

    // ─── Submission Logic ─────────────────────────────────────────────
    // For now, texts are only applied to the *currently viewed* media in the edit step.
    // To support text per-image, `texts` should be an array of arrays or an object mapped by index.
    // For simplicity, we apply the current texts to the currently selected index, and others are untouched.
    const prepareFinalFile = async (index) => {
        const type = mediaTypes[index]
        const file = mediaFiles[index]
        const preview = mediaPreviews[index]

        if (type === 'video' || index !== currentMediaIndex) return file

        const hasTexts = texts.length > 0
        const hasDrawing = drawCanvasRef.current && !isDrawCanvasEmpty(drawCanvasRef.current)
        if (!hasTexts && !hasDrawing) return file

        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                // Bake drawing canvas (compute object-contain offset inside the container)
                if (hasDrawing && drawCanvasRef.current && containerRef.current) {
                    const dc = drawCanvasRef.current
                    const cRect = containerRef.current.getBoundingClientRect()
                    const imgAspect = img.naturalWidth / img.naturalHeight
                    const conAspect = cRect.width / cRect.height
                    let rW, rH, oX, oY
                    if (imgAspect > conAspect) {
                        rW = cRect.width; rH = cRect.width / imgAspect
                        oX = 0; oY = (cRect.height - rH) / 2
                    } else {
                        rH = cRect.height; rW = cRect.height * imgAspect
                        oX = (cRect.width - rW) / 2; oY = 0
                    }
                    ctx.drawImage(dc, oX, oY, rW, rH, 0, 0, img.naturalWidth, img.naturalHeight)
                }

                // Bake text overlays
                if (hasTexts) {
                    texts.forEach(t => {
                        ctx.font = `bold ${Math.floor(canvas.width * 0.05)}px sans-serif`
                        ctx.fillStyle = t.color
                        ctx.textAlign = 'left'
                        ctx.textBaseline = 'top'
                        ctx.shadowColor = 'rgba(0,0,0,0.5)'
                        ctx.shadowBlur = 4
                        ctx.shadowOffsetX = 2
                        ctx.shadowOffsetY = 2
                        ctx.fillText(t.text, (t.x / 100) * canvas.width, (t.y / 100) * canvas.height)
                    })
                }

                canvas.toBlob((blob) => {
                    resolve(new File([blob], `edited_post_${index}.jpg`, { type: 'image/jpeg' }))
                }, 'image/jpeg', 0.9)
            }
            img.src = preview
        })
    }

    const submitPost = async () => {
        try {
            setPosting(true)
            const token = localStorage.getItem('token')

            const formData = new FormData()
            
            // Stories don't have text captions the same way feed posts do
            if (cameraMode !== 'STORY') {
                formData.append('content', caption)
                formData.append('is_close_friends_only', isCloseFriendsOnly)
            }

            if (mediaFiles.length > 0) {
                // Prepare all files concurrently
                let finalFiles = await Promise.all(
                    mediaFiles.map((_, idx) => prepareFinalFile(idx))
                )

                // Compress images
                const compressOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
                finalFiles = await Promise.all(finalFiles.map(async (f) => {
                    if (f.type.startsWith('image/') && !f.type.includes('gif')) {
                        try { return await imageCompression(f, compressOptions) } catch (err) { return f }
                    }
                    return f
                }))

                finalFiles.forEach(file => {
                    formData.append('media', file)
                })
            } else if (cameraMode !== 'STORY' && !caption.trim()) {
                setPosting(false)
                return
            } else if (cameraMode === 'STORY' && mediaFiles.length === 0) {
                setPosting(false)
                return
            }

            // Route based on what the user selected in the camera mode
            const apiEndpoint = cameraMode === 'STORY' ? '/api/users/stories' : '/api/users/posts'

            // Append Poll if exists (only for STORIES)
            if (cameraMode === 'STORY' && poll) {
                const validOptions = poll.options.filter(o => o.trim() !== '')
                if (poll.question.trim() !== '' && validOptions.length >= 2) {
                    formData.append('poll', JSON.stringify({
                        question: poll.question,
                        options: validOptions,
                        x: poll.x,
                        y: poll.y
                    }))
                }
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (!response.ok) throw new Error("Erreur de publication")

            const newItem = await response.json()
            onPostCreated && onPostCreated(newItem)
            onClose()
        } catch (err) {
            console.error(err)
            alert("Erreur lors de la création.")
        } finally {
            setPosting(false)
        }
    }

    // ─── Renderers ────────────────────────────────────────────────────
    const renderSelectMedia = () => (
        <div className="flex flex-col h-full sm:h-auto bg-black overflow-hidden" style={{ minHeight: 480 }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition">
                    <X size={26} />
                </button>
                <span className="text-white font-bold text-[15px] tracking-tight">Nouvelle publication</span>
                <div className="w-10" />
            </div>

            {/* Visual center */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <ImageIcon size={40} className="text-white/70" />
                </div>
                <p className="text-white/40 text-sm font-medium">Photo · Vidéo</p>
            </div>

            {/* 2 action buttons */}
            <div className="grid grid-cols-2 border-t border-white/10 shrink-0">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 py-5 hover:bg-white/10 active:bg-white/20 transition"
                >
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                        <Upload size={20} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Galerie</span>
                </button>
                <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center gap-2 py-5 hover:bg-white/10 active:bg-white/20 transition border-l border-white/10"
                >
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                        <Camera size={20} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Caméra</span>
                </button>
            </div>
        </div>
    )

    const renderCamera = () => (
        <div className="relative h-full sm:h-[600px] w-full bg-black flex flex-col">
            {/* Top controls */}
            <div className="absolute top-0 inset-x-0 h-16 z-10 flex items-center px-4 bg-gradient-to-b from-black/50 to-transparent">
                <button onClick={() => { stopCamera(); onClose() }} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition">
                    <X size={22} />
                </button>
            </div>

            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
            </div>

            {/* Mode selector */}
            <div className="flex items-center justify-center gap-6 pb-2 shrink-0 bg-black">
                {CAMERA_MODES.map(mode => (
                    <button
                        key={mode}
                        onClick={() => setCameraMode(mode)}
                        className="relative flex flex-col items-center transition-all"
                    >
                        <span className={`text-[13px] font-bold tracking-widest transition-all ${cameraMode === mode ? 'text-white scale-110' : 'text-white/40'}`}>
                            {mode}
                        </span>
                        {cameraMode === mode && (
                            <span className="mt-1 w-1 h-1 rounded-full bg-white" />
                        )}
                    </button>
                ))}
            </div>

            {/* Shutter row: [gallery] [shutter] [flip] */}
            <div className="h-28 bg-black flex items-center justify-between px-8 shrink-0">
                {/* Gallery */}
                <button
                    onClick={() => { stopCamera(); fileInputRef.current?.click() }}
                    className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center active:scale-95 transition"
                    title="Galerie"
                >
                    <ImageIcon size={24} className="text-white" />
                </button>

                {/* Shutter */}
                <button
                    onClick={capturePhoto}
                    className={`rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition ${cameraMode === 'STORY' ? 'w-24 h-24 p-2' : 'w-20 h-20 p-1.5'}`}
                >
                    <div className={`w-full h-full rounded-full ${cameraMode === 'STORY' ? 'bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600' : 'bg-white'}`} />
                </button>

                {/* Flip */}
                <button
                    onClick={flipCamera}
                    className="w-12 h-12 bg-white/15 border border-white/20 rounded-full flex items-center justify-center text-white active:scale-95 transition"
                    title="Retourner la caméra"
                >
                    <FlipHorizontal2 size={22} />
                </button>
            </div>
        </div>
    )

    const renderCrop = () => (
        <div className="relative h-full sm:h-[600px] w-full bg-black flex flex-col overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-20 flex items-center justify-between px-4">
                <button onClick={() => setStep('camera')} className="w-10 h-10 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition">
                    <ChevronLeft size={28} />
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => setAspect(1)} className={`text-white px-3 py-1 rounded-full text-sm font-bold border ${aspect === 1 ? 'border-white bg-white/20' : 'border-white/50'}`}>1:1</button>
                    <button onClick={() => setAspect(4 / 5)} className={`text-white px-3 py-1 rounded-full text-sm font-bold border ${aspect === 4 / 5 ? 'border-white bg-white/20' : 'border-white/50'}`}>4:5</button>
                    <button onClick={() => setAspect(16 / 9)} className={`text-white px-3 py-1 rounded-full text-sm font-bold border ${aspect === 16 / 9 ? 'border-white bg-white/20' : 'border-white/50'}`}>16:9</button>
                    <button onClick={() => setAspect(undefined)} className={`text-white px-3 py-1 rounded-full text-sm font-bold border ${aspect === undefined ? 'border-white bg-white/20' : 'border-white/50'}`}>Libre</button>
                </div>
                <button onClick={applyCrop} className="px-4 py-1.5 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition text-sm">
                    Suivant
                </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center pt-16 pb-4">
                {mediaPreviews.length > 1 && (
                    <button
                        onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentMediaIndex === 0}
                        className="absolute left-2 z-30 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}

                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-full"
                >
                    <img
                        ref={imgRef}
                        src={mediaPreviews[currentMediaIndex]}
                        onLoad={onImageLoad}
                        alt="Crop me"
                        className="max-w-full max-h-[500px] object-contain"
                    />
                </ReactCrop>

                {mediaPreviews.length > 1 && (
                    <button
                        onClick={() => setCurrentMediaIndex((prev) => Math.min(mediaPreviews.length - 1, prev + 1))}
                        disabled={currentMediaIndex === mediaPreviews.length - 1}
                        className="absolute right-2 z-30 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition"
                    >
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>
    )

    const renderEdit = () => (
        <div className="relative h-full sm:h-[600px] w-full bg-black flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-20 flex items-center justify-between px-4">
                <button onClick={() => { setIsDrawMode(false); setIsEraser(false); setStep(mediaTypes[currentMediaIndex] === 'image' ? 'crop' : 'select_media') }} className="w-10 h-10 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition">
                    <ChevronLeft size={28} />
                </button>
                <div className="flex items-center gap-3">
                    {mediaTypes[currentMediaIndex] === 'image' && (
                        <>
                            <button
                                onClick={() => { setIsDrawMode(prev => !prev); setIsTyping(false) }}
                                className={`w-10 h-10 text-white rounded-full flex items-center justify-center transition ${isDrawMode ? 'bg-white/30 ring-2 ring-white/60' : 'hover:bg-white/20'}`}
                                title="Dessiner"
                            >
                                <Pencil size={20} />
                            </button>
                            <button
                                onClick={() => { setIsTyping(true); setIsDrawMode(false) }}
                                className="w-10 h-10 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition"
                                title="Ajouter du texte"
                            >
                                <Type size={22} />
                            </button>
                            {cameraMode === 'STORY' && (
                                <button
                                    onClick={() => { setIsPollCreatorOpen(true); setIsTyping(false); setIsDrawMode(false) }}
                                    className="w-10 h-10 text-white hover:bg-white/20 rounded-full flex items-center justify-center transition"
                                    title="Ajouter un sondage"
                                >
                                    <BarChart2 size={22} />
                                </button>
                            )}
                        </>
                    )}
                    <button 
                        onClick={() => { 
                            setIsDrawMode(false); 
                            setIsEraser(false); 
                            
                            // Stories skip the caption screen and publish directly
                            if (cameraMode === 'STORY') {
                                submitPost();
                            } else {
                                setStep('caption');
                            }
                        }} 
                        disabled={posting}
                        className="px-4 py-1.5 bg-white text-black font-bold rounded-full hover:bg-gray-100 disabled:opacity-50 transition text-sm flex items-center gap-2"
                    >
                        {posting ? 'Envoi...' : (cameraMode === 'STORY' ? 'Partager' : 'Suivant')}
                    </button>
                </div>
            </div>

            {/* Media Container (Where dragging happens) */}
            <div ref={containerRef} className="flex-1 relative flex items-center justify-center">
                {mediaPreviews.length > 1 && (
                    <button
                        onClick={() => setCurrentMediaIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentMediaIndex === 0}
                        className="absolute left-2 z-30 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                )}

                {mediaTypes[currentMediaIndex] === 'video' ? (
                    <video src={mediaPreviews[currentMediaIndex]} controls className="max-w-full max-h-full object-contain" />
                ) : (
                    <img src={mediaPreviews[currentMediaIndex]} alt="Preview" className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                )}

                {mediaPreviews.length > 1 && (
                    <button
                        onClick={() => setCurrentMediaIndex((prev) => Math.min(mediaPreviews.length - 1, prev + 1))}
                        disabled={currentMediaIndex === mediaPreviews.length - 1}
                        className="absolute right-2 z-30 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition"
                    >
                        <ChevronRight size={20} />
                    </button>
                )}

                {/* Baked Texts */}
                {texts.map(t => (
                    <div
                        key={t.id}
                        id={`text-overlay-${t.id}`}
                        onMouseDown={(e) => startDragging(e, t.id)}
                        onTouchStart={(e) => startDragging(e, t.id)}
                        className="absolute cursor-move select-none"
                        style={{
                            left: `${t.x}%`,
                            top: `${t.y}%`,
                            color: t.color,
                            fontSize: `${t.size}px`,
                            fontWeight: 'bold',
                            textShadow: '0px 2px 4px rgba(0,0,0,0.6)',
                            transform: 'translate(-50%, -50%)',
                            zIndex: activeTextId === t.id ? 30 : 10,
                            opacity: activeTextId === t.id && isOverTrash ? 0.4 : 1,
                            transition: 'opacity 0.15s'
                        }}
                    >
                        {t.text}
                    </div>
                ))}

                {/* Draggable Poll */}
                {poll && (
                    <div
                        id="poll-overlay"
                        className="absolute cursor-move select-none animate-in fade-in zoom-in"
                        onMouseDown={startPollDragging}
                        onTouchStart={startPollDragging}
                        style={{
                            left: `${poll.x}%`,
                            top: `${poll.y}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: activePollDrag ? 35 : 25
                        }}
                    >
                        <div className="w-[260px] max-w-[80vw] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20 pointer-events-none">
                            <button
                                onClick={(e) => { e.stopPropagation(); setPoll(null) }}
                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg pointer-events-auto active:scale-95 transition"
                            >
                                <X size={16} />
                            </button>
                            <div className="flex justify-center mb-2">
                                <BarChart2 size={28} className="text-gray-700 dark:text-gray-300" />
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold text-[15px] text-center mb-4 leading-tight">
                                {poll.question || 'Sondage...'}
                            </p>
                            <div className="flex flex-col gap-2">
                                {poll.options.filter(o => o.trim() !== '').map((opt, i) => (
                                    <div key={i} className="h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 flex items-center justify-center px-4 shadow-sm">
                                        <span className="text-gray-800 dark:text-gray-200 font-semibold text-sm truncate">{opt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Draw Canvas */}
                {mediaTypes[currentMediaIndex] === 'image' && (
                    <canvas
                        ref={drawCanvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{
                            pointerEvents: isDrawMode ? 'auto' : 'none',
                            cursor: isDrawMode ? (isEraser ? 'cell' : 'crosshair') : 'default',
                            touchAction: 'none',
                            zIndex: 15
                        }}
                        onMouseDown={handleDrawStart}
                        onMouseMove={handleDrawMove}
                        onMouseUp={handleDrawEnd}
                        onMouseLeave={handleDrawEnd}
                        onTouchStart={handleDrawStart}
                        onTouchMove={handleDrawMove}
                        onTouchEnd={handleDrawEnd}
                    />
                )}
            </div>

            {/* Trash Drop Zone — appears while dragging text */}
            {activeTextId !== null && (
                <div
                    ref={trashZoneRef}
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1.5 px-8 py-3 rounded-2xl transition-all duration-150 pointer-events-none
                        ${isOverTrash
                            ? 'bg-red-500/90 scale-110 shadow-[0_0_24px_rgba(239,68,68,0.6)]'
                            : 'bg-black/50 scale-100'
                        }`}
                >
                    <Trash2 size={22} className={`transition-colors ${isOverTrash ? 'text-white' : 'text-white/80'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${isOverTrash ? 'text-white' : 'text-white/60'}`}>
                        {isOverTrash ? 'Supprimer' : 'Glisser ici'}
                    </span>
                </div>
            )}

            {/* Draw Toolbar */}
            {isDrawMode && (
                <div className="absolute bottom-0 inset-x-0 z-20 pb-5 pt-12 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2.5 px-4 flex-wrap">
                    <button
                        onClick={() => setIsEraser(prev => !prev)}
                        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition ${isEraser ? 'border-white bg-white/30' : 'border-white/50 hover:border-white/80'}`}
                        title="Gomme"
                    >
                        <Eraser size={16} className="text-white" />
                    </button>
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => { setDrawColor(c); setIsEraser(false) }}
                            className={`w-8 h-8 rounded-full shrink-0 border-2 transition ${!isEraser && drawColor === c ? 'border-white scale-125' : 'border-transparent hover:border-white/50'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    <button
                        onClick={clearDrawing}
                        className="w-9 h-9 rounded-full border-2 border-white/50 flex items-center justify-center shrink-0 hover:border-white/80 transition"
                        title="Effacer tout"
                    >
                        <Trash2 size={14} className="text-white" />
                    </button>
                </div>
            )}

            {/* Typing Overlay */}
            {isTyping && (
                <div className="absolute inset-0 z-50 bg-black/70 flex flex-col backdrop-blur-md">
                    <div className="flex items-center justify-between p-4">
                        <button onClick={() => setIsTyping(false)} className="text-white hover:text-gray-300">Annuler</button>
                        <button onClick={saveText} className="text-white font-bold hover:text-gray-300">Terminé</button>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-8">
                        <input
                            autoFocus
                            type="text"
                            value={currentTextInput}
                            onChange={(e) => setCurrentTextInput(e.target.value)}
                            placeholder="Tapez quelque chose..."
                            className="w-full bg-transparent border-none text-center text-3xl font-bold focus:ring-0 focus:outline-none placeholder-white/50"
                            style={{ color: currentTextColor, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                        />
                    </div>

                    {/* Color picker */}
                    <div className="h-20 flex items-center justify-center gap-3 px-4 pb-4 overflow-x-auto">
                        {colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setCurrentTextColor(c)}
                                className={`w-8 h-8 rounded-full border-2 shrink-0 shadow-lg ${currentTextColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Poll Creator Overlay */}
            {isPollCreatorOpen && (
                <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-5">
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart2 size={20} className="text-blue-500" /> Créer un sondage
                            </h3>
                            <button onClick={() => setIsPollCreatorOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Question</label>
                                <input
                                    type="text"
                                    value={pollInputs.question}
                                    onChange={e => setPollInputs(p => ({ ...p, question: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ring-blue-500 transition-all"
                                    placeholder="Posez une question..."
                                    maxLength={80}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Options</label>
                                {pollInputs.options.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={e => {
                                                const newOpts = [...pollInputs.options]
                                                newOpts[i] = e.target.value
                                                setPollInputs(p => ({ ...p, options: newOpts }))
                                            }}
                                            className="flex-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ring-blue-500 transition-all"
                                            placeholder={`Option ${i + 1}`}
                                            maxLength={40}
                                        />
                                        {i >= 2 && (
                                            <button
                                                onClick={() => {
                                                    const newOpts = pollInputs.options.filter((_, idx) => idx !== i)
                                                    setPollInputs(p => ({ ...p, options: newOpts }))
                                                }}
                                                className="w-12 shrink-0 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {pollInputs.options.length < 4 && (
                                    <button
                                        onClick={() => setPollInputs(p => ({ ...p, options: [...p.options, ''] }))}
                                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-400 text-sm font-semibold hover:border-gray-300 dark:hover:border-zinc-700 transition"
                                    >
                                        + Ajouter une option
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const q = pollInputs.question.trim()
                                const opts = pollInputs.options.filter(o => o.trim() !== '')
                                if (!q || opts.length < 2) {
                                    alert('Posez une question et donnez au moins 2 options.')
                                    return
                                }
                                setPoll({
                                    id: Date.now(),
                                    question: q,
                                    options: opts.slice(0, 4),
                                    x: 50,
                                    y: 50
                                })
                                setIsPollCreatorOpen(false)
                                setPollInputs({ question: '', options: ['', ''] })
                            }}
                            className="w-full mt-6 py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md"
                        >
                            Ajouter à la story
                        </button>
                    </div>
                </div>
            )}
        </div>
    )


    const renderCaption = () => (
        <div className="flex flex-col h-full w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10 shrink-0">
                <button onClick={() => mediaFiles.length > 0 ? setStep('edit') : setStep('select_media')} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">Nouvelle publication</h2>
                <button
                    onClick={submitPost}
                    disabled={posting || (mediaFiles.length === 0 && !caption.trim())}
                    className="text-blue-500 font-bold text-sm hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                    {posting ? 'Envoi...' : 'Partager'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <UserAvatar user={user} size={32} />
                        <span className="font-bold text-[14px] text-gray-900 dark:text-white">{user?.username}</span>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                {isCloseFriendsOnly ? "Amis proches" : "Public"}
                            </span>
                            <button
                                onClick={() => setIsCloseFriendsOnly(!isCloseFriendsOnly)}
                                className={`w-11 h-6 rounded-full p-1 transition-colors flex items-center ${isCloseFriendsOnly ? 'bg-green-500 justify-end' : 'bg-gray-300 dark:bg-zinc-700 justify-start'}`}
                            >
                                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder={mediaFiles.length > 0 ? "Écrivez une légende..." : "Quoi de neuf ?"}
                        className="w-full bg-transparent text-[15px] resize-none focus:outline-none dark:text-white placeholder-gray-400 min-h-[150px]"
                        autoFocus
                    />
                </div>

                {mediaPreviews.length > 0 && (
                    <div className="w-20 h-28 shrink-0 flex flex-col gap-2">
                        {mediaPreviews.map((preview, i) => (
                            <div key={i} className={`w-full h-full bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative ${i !== currentMediaIndex ? 'hidden' : ''}`}>
                                {mediaTypes[i] === 'video' ? (
                                    <video src={preview} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={preview} className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/10"></div>
                                {texts.length > 0 && i === currentMediaIndex && (
                                    <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 flex items-center text-white">
                                        <Type size={10} />
                                    </div>
                                )}
                                {mediaPreviews.length > 1 && (
                                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded-full font-bold">
                                        {i + 1}/{mediaPreviews.length}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center sm:p-4" onClick={onClose}>
            <div
                className={`bg-white dark:bg-zinc-900 w-full shadow-2xl overflow-hidden transition-all duration-300 ${step === 'camera' || step === 'edit'
                    ? 'max-w-[450px] sm:rounded-2xl'
                    : 'max-w-lg sm:rounded-2xl' // For select_media and caption
                    } h-[100dvh] sm:h-auto`}
                onClick={e => e.stopPropagation()}
                style={{
                    maxHeight: '100dvh'
                }}
            >
                {/* Hidden input used for baking text into image */}
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

                {step === 'select_media' && renderSelectMedia()}
                {step === 'camera' && renderCamera()}
                {step === 'crop' && renderCrop()}
                {step === 'edit' && renderEdit()}
                {step === 'caption' && renderCaption()}
            </div>
        </div>
    )
}
