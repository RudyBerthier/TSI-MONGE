import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Share2, Play, Music, Trophy, Clock, Heart, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Wrapped() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/spotify/wrapped', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-green-400 to-blue-500"
        />
      </div>
    );
  }

  if (!stats || stats.totalPlays === 0) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
        <Music size={64} className="text-white/20 mb-6" />
        <h1 className="text-3xl font-black text-white mb-4">Pas encore assez de données</h1>
        <p className="text-white/50 max-w-md mb-8">
          Écoute plus de musique sur TSI Monge pour débloquer ton Wrapped personnalisé.
        </p>
        <Link to="/library" className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
          Retour à la bibliothèque
        </Link>
      </div>
    );
  }

  const slides = [
    // 0: Intro
    {
      bg: 'bg-indigo-900',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10 }}
            className="w-48 h-48 bg-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-center mb-8 relative"
          >
            <Music size={80} className="text-white" />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-white rounded-3xl"
            />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black text-white mb-4 leading-tight"
          >
            TSI Monge <br /><span className="text-green-400">Wrapped</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/60 text-lg"
          >
            Prêt à redécouvrir ton année musicale ?
          </motion.p>
        </div>
      )
    },
    // 1: Total Time
    {
      bg: 'bg-green-600',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <Clock size={48} className="text-white/30 mb-8" />
          <h2 className="text-2xl font-bold text-white/80 mb-2">Tu as été bien occupé...</h2>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            className="text-8xl font-black text-white my-6"
          >
            {stats.totalPlays}
          </motion.div>
          <p className="text-2xl font-bold text-white">titres écoutés au total</p>
          <p className="text-white/60 mt-4">C'est plus que 85% des élèves de la promo !</p>
        </div>
      )
    },
    // 2: Top Artist
    {
      bg: 'bg-orange-600',
      content: (
        <div className="flex flex-col items-center justify-center h-full px-6">
          <Trophy size={48} className="text-white/30 mb-8 mx-auto" />
          <h2 className="text-2xl font-bold text-white/80 mb-10 text-center">Ton artiste inséparable</h2>
          
          <div className="space-y-6 w-full max-w-sm mx-auto">
            {stats.topArtists.slice(0, 5).map((artist, idx) => (
              <motion.div
                key={artist.name}
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-white font-bold text-lg">{artist.name}</div>
                  <div className="text-white/50 text-sm">{artist.count} écoutes</div>
                </div>
                {idx === 0 && <Heart size={20} className="text-red-400 fill-red-400" />}
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    // 3: Top Track
    {
      bg: 'bg-pink-600',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <Play size={48} className="text-white/30 mb-8" />
          <h2 className="text-2xl font-bold text-white/80 mb-6">En boucle, jour et nuit...</h2>
          
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            whileInView={{ rotate: 0, scale: 1 }}
            className="bg-white p-4 rounded-3xl shadow-2xl mb-10 transform -rotate-3"
          >
            <div className="w-64 h-64 bg-gray-200 rounded-2xl mb-4 overflow-hidden">
               {stats.topTracks[0]?.image ? (
                 <img src={stats.topTracks[0].image} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                    <Music size={64} className="text-white" />
                 </div>
               )}
            </div>
            <div className="text-black font-black text-xl truncate w-64">{stats.topTracks[0]?.name.split(' - ')[0]}</div>
            <div className="text-black/50 font-bold truncate w-64">{stats.topTracks[0]?.name.split(' - ')[1]}</div>
          </motion.div>
          
          <p className="text-2xl font-bold text-white">Ton titre n°1</p>
        </div>
      )
    },
    // 4: Summary Card
    {
      bg: 'bg-black',
      content: (
        <div className="flex flex-col items-center justify-center h-full px-6">
          <div id="wrapped-card" className="w-full max-w-sm bg-gradient-to-br from-[#1DB954] to-[#191414] p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <Music size={20} className="text-black" />
              </div>
              <div className="text-white font-black text-xl">TSI MONGE</div>
            </div>

            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Mon Top Artiste</h3>
            <p className="text-white text-3xl font-black mb-10">{stats.topArtists[0]?.name}</p>

            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Mon Top Titre</h3>
            <p className="text-white text-2xl font-bold mb-10 leading-tight">{stats.topTracks[0]?.name}</p>

            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Total Titres</h3>
                <p className="text-white text-4xl font-black">{stats.totalPlays}</p>
              </div>
              <div className="text-white/20 font-black text-5xl">2026</div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 w-full max-w-sm">
            <button 
              onClick={() => alert('Capture d\'écran prête ! Partage-la sur Insta 🚀')}
              className="w-full py-4 bg-white text-black font-bold rounded-full flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <Share2 size={20} /> Partager mon Wrapped
            </button>
            <Link to="/library" className="w-full py-4 bg-white/10 text-white font-bold rounded-full text-center hover:bg-white/20 transition-colors">
              Retour à la musique
            </Link>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`fixed inset-0 z-[100] ${slides[currentSlide].bg} transition-colors duration-700 overflow-hidden flex flex-col`}>
      {/* Top Bar / Progress */}
      <div className="pt-6 px-4 flex gap-1 z-50">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ 
                width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' 
              }}
              transition={{ duration: i === currentSlide ? 5 : 0.3 }}
              onAnimationComplete={() => {
                if (i === currentSlide && currentSlide < slides.length - 1) {
                  // Auto-advance would go here, but let's keep it manual for now
                }
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-8 right-6 z-50">
        <Link to="/library" className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white">
          <X size={24} />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="absolute inset-0"
          >
            {slides[currentSlide].content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Layers */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-40" onClick={prevSlide} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-40" onClick={nextSlide} />
      </div>

      {/* Slide Navigation Hints */}
      <div className="p-8 flex justify-between items-center text-white/40 pointer-events-none">
        <div className="flex items-center gap-2">
          <ChevronLeft size={16} /> Précédent
        </div>
        <div className="flex items-center gap-2">
          Suivant <ChevronRight size={16} />
        </div>
      </div>
    </div>
  );
}
