import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function ImageCarousel({ mediaUrls, className = '' }) {
    const urls = Array.isArray(mediaUrls) ? mediaUrls : mediaUrls.split(',').filter(Boolean)
    const [currentIndex, setCurrentIndex] = useState(0)

    if (!urls || urls.length === 0) return null
    if (urls.length === 1) {
        return (
            <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${urls[0]}`}
                alt="Media content"
                className={`w-full max-h-[600px] object-contain ${className}`}
            />
        )
    }

    const next = (e) => {
        e.stopPropagation();
        setCurrentIndex(i => (i + 1) % urls.length)
    }

    const prev = (e) => {
        e.stopPropagation();
        setCurrentIndex(i => (i - 1 + urls.length) % urls.length)
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center group overflow-hidden">
            <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${urls[currentIndex]}`}
                alt={`Media content ${currentIndex + 1}`}
                className={`w-full max-h-[600px] object-contain transition-opacity duration-300 ${className}`}
            />

            {/* Arrows */}
            <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-black/70"
            >
                <ChevronLeft size={20} />
            </button>
            <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-black/70"
            >
                <ChevronRight size={20} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition z-10">
                {urls.map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-blue-500 w-3' : 'bg-white/60'}`}
                    />
                ))}
            </div>

            {/* Counter badge top right */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm opacity-0 group-hover:opacity-100 transition">
                {currentIndex + 1}/{urls.length}
            </div>
        </div>
    )
}
