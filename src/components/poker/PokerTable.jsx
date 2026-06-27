import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { LogOut, Play, Users, Trophy, Maximize, Minimize, X, Check, TrendingUp } from 'lucide-react';
import PlayingCard from './PlayingCard';

// Composant pour l'effet "Machine à sous / Casino"
function AnimatedCounter({ value, className, duration = 1.2 }) {
  const nodeRef = useRef(null);
  
  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      // Remove any non-numeric characters before parsing
      const cleanText = node.textContent.replace(/[^0-9-]/g, '');
      const start = parseInt(cleanText) || 0;
      if (start === value) return;
      
      const controls = animate(start, value, {
        duration: duration,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = Math.round(v).toString();
        }
      });
      return () => controls.stop();
    }
  }, [value, duration]);

  return <span ref={nodeRef} className={className}>{value}</span>;
}

export default function PokerTable({ roomId, onLeave }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [isPortrait, setIsPortrait] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('poker:join', { roomId, user: { id: user.id, username: user.username, avatar: user.avatar || user.google_avatar || null } });

    const handleState = (state) => {
      console.log("Poker state:", state);
      setGameState(state);
      if (state.currentMaxBet !== undefined) {
        setBetAmount(state.currentMaxBet + state.minRaise);
      }
    };

    socket.on('poker:state', handleState);

    return () => {
      socket.off('poker:state', handleState);
      socket.emit('poker:leave', { roomId });
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Calculate optimal scale for the table
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const portrait = clientHeight > clientWidth;
        setIsPortrait(portrait);
        
        // If portrait, the virtual table is a 900x900 circle + 100px padding = 1000x1000
        // If landscape, it's a 900x450 oval + 100px padding = 1000x550
        const targetWidth = 1000; 
        const targetHeight = portrait ? 1000 : 550;
        
        const scaleX = clientWidth / targetWidth;
        const scaleY = clientHeight / targetHeight;
        
        let newScale = Math.min(scaleX, scaleY, 1.1);
        
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [gameState]); // Recalculate when game state loads just in case

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) {
          try {
            await screen.orientation.lock('landscape');
          } catch(e) {
            console.log("Orientation lock not supported:", e);
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
          }
        }
      }
    } catch(err) {
      console.error(err);
    }
  };

  if (!gameState) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Connexion à la table...</div>;
  }

  const me = gameState.players.find(p => p.id === user.id);
  const isMyTurn = gameState.status !== 'WAITING' && gameState.players[gameState.turnIndex]?.id === user.id;

  const handleAction = (action) => {
    socket.emit('poker:action', { roomId, action, amount: betAmount });
  };
  
  const handleStart = () => {
    socket.emit('poker:start', { roomId });
  };

  const amountToCall = me ? gameState.currentMaxBet - me.currentBet : 0;

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-[#0F172A] relative flex flex-col font-sans text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 w-full p-4 flex justify-between items-center z-50 pointer-events-none">
        <button onClick={onLeave} className="pointer-events-auto flex items-center gap-1 sm:gap-2 bg-slate-800/50 hover:bg-slate-700 backdrop-blur px-3 sm:px-4 py-2 rounded-xl transition text-xs sm:text-base">
          <LogOut size={16} /> <span className="hidden sm:inline">Quitter</span>
        </button>
        <div className="bg-slate-800/50 backdrop-blur px-4 sm:px-6 py-2 rounded-xl border border-slate-700/50 font-mono font-bold tracking-widest text-emerald-400 text-xs sm:text-base">
          SALON: {roomId}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 backdrop-blur px-4 py-2 rounded-xl border border-slate-700/50 text-slate-300 text-xs sm:text-base">
            <Users size={16} /> {gameState.players.length} / 9
          </div>
          <button onClick={toggleFullscreen} className="flex items-center justify-center w-10 h-10 bg-slate-800/50 hover:bg-slate-700 backdrop-blur rounded-xl transition border border-slate-700/50">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* Main Table Area (Scalable Container) */}
      <main ref={containerRef} className="flex-1 flex items-center justify-center relative w-full overflow-hidden mt-10">
        
        {/* The Scaled Wrapper */}
        <div 
          className="relative origin-center transition-all duration-500"
          style={{ transform: `scale(${scale})`, width: 900, height: isPortrait ? 900 : 450 }}
        >
          {/* The Poker Table Oval/Circle */}
          <div 
            className="absolute inset-0 border-[12px] border-slate-800/80 bg-emerald-900/40 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-500"
            style={{ borderRadius: isPortrait ? '450px' : '225px' }}
          >
            
            {/* Pot & Community Cards */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
              {gameState.pot > 0 && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  key={gameState.pot} // Re-animate slightly on pot change
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mb-6 bg-slate-900/90 backdrop-blur-xl px-8 py-3 rounded-full border border-emerald-500/50 flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] border-2 border-emerald-300 animate-pulse" />
                  <AnimatedCounter value={gameState.pot} className="font-bold text-2xl sm:text-3xl text-emerald-400 font-mono tracking-wider" />
                </motion.div>
              )}
              
              <div className="flex gap-2 h-28 items-center">
                <AnimatePresence mode="popLayout">
                  {gameState.communityCards.map((card, i) => (
                    <motion.div
                      key={`${card}-${i}`}
                      initial={{ opacity: 0, y: -20, scale: 0.8, rotateY: 90 }}
                      animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                      transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <PlayingCard card={card} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Center Info text if waiting */}
            {gameState.status === 'WAITING' && (
              <div className="absolute text-center flex flex-col items-center z-10">
                <p className="text-slate-400 mb-4 font-medium uppercase tracking-widest text-sm px-4">En attente de joueurs</p>
                {gameState.players.length >= 2 ? (
                  <button onClick={handleStart} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition text-base pointer-events-auto">
                    <Play size={18} /> Lancer la partie
                  </button>
                ) : (
                  <p className="text-slate-500 text-sm text-center">(Il faut au moins 2 joueurs)</p>
                )}
              </div>
            )}
          </div>

          {/* Player Seats - Fixed logic on a bounding box */}
          {gameState.players.map((p, i) => {
            const isMe = p.id === user.id;
            const total = Math.max(gameState.players.length, 2);
            const angle = (i / total) * Math.PI * 2 + Math.PI/2;
            
            // Map angle to a 900x450 ellipse OR 900x900 circle
            const rx = 450;
            const ry = isPortrait ? 450 : 225;
            const x = 450 + Math.cos(angle) * rx;
            const y = (isPortrait ? 450 : 225) + Math.sin(angle) * ry;

            return (
              <div 
                key={p.id}
                className="absolute flex flex-col items-center z-20 transition-all duration-500"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Player Cards */}
                {p.cards && p.cards.length > 0 && !p.folded && (
                  <div className="flex gap-[-20px] mb-2 scale-75 origin-bottom">
                    <PlayingCard card={p.cards[0]} className="-rotate-6 translate-x-2" />
                    <PlayingCard card={p.cards[1]} className="rotate-6 -translate-x-2" />
                  </div>
                )}
                
                {/* Player Info Box */}
                <div className={`
                  relative bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-2xl border flex items-center gap-3 min-w-[140px] shadow-xl
                  ${isMe ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700/50'}
                  ${gameState.players[gameState.turnIndex]?.id === p.id && gameState.status !== 'WAITING' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0F172A]' : ''}
                  ${p.folded ? 'opacity-50 grayscale' : ''}
                `}>
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.username} className="w-10 h-10 rounded-full bg-slate-700 object-cover border border-slate-600" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400 text-sm">
                      {p.username.substring(0,2).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="font-bold text-sm truncate max-w-[80px]">{p.username}</div>
                    <div className="text-emerald-400 text-xs font-mono">{p.chips}</div>
                  </div>
                  
                  {/* Dealer Button */}
                  {gameState.dealerIndex === i && (
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-white text-slate-900 rounded-full flex items-center justify-center font-bold text-xs shadow-lg">D</div>
                  )}
                </div>
                
                {/* Current Bet */}
                {p.currentBet > 0 && (
                  <div className="mt-2 bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-slate-300 border border-slate-700 whitespace-nowrap">
                    Bet: {p.currentBet}
                  </div>
                )}
                
                {/* Action status */}
                {p.folded && <div className="mt-2 text-red-400 text-xs font-bold bg-red-900/40 px-2 py-1 rounded">FOLD</div>}
                {p.isAllIn && <div className="mt-2 text-orange-400 text-xs font-bold bg-orange-900/40 px-2 py-1 rounded">ALL-IN</div>}
              </div>
            );
          })}
        </div>
      </main>

      {/* Control Panel (Bottom) */}
      <footer className="shrink-0 bg-slate-800/90 backdrop-blur-lg border-t border-slate-700 p-3 sm:p-4 flex flex-col items-center justify-center gap-3 sm:gap-6 z-50 w-full transition-all duration-300">
        {me ? (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 sm:gap-4">
            
            {/* Top Row: Chips Info */}
            <div className="flex items-center justify-center sm:justify-start w-full">
              <div className="flex flex-col items-center sm:items-start bg-slate-900/50 sm:bg-transparent px-8 py-2 sm:p-0 rounded-3xl sm:rounded-none border border-slate-700/50 sm:border-none shadow-inner sm:shadow-none">
                <span className="text-slate-400 text-[10px] sm:text-sm font-bold uppercase tracking-wider">Mes Jetons</span>
                <AnimatedCounter value={me.chips} className="text-3xl sm:text-4xl font-bold text-emerald-400 font-mono leading-none mt-1 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]" />
              </div>
            </div>
            
            {/* Betting Controls Slider (Only when my turn) */}
            <AnimatePresence>
              {isMyTurn && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-3 w-full bg-slate-900/50 p-4 rounded-2xl border border-slate-700 overflow-hidden"
                >
                  <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest font-bold">Ajuster la relance</span>
                    <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500" />
                      <AnimatedCounter value={betAmount} duration={0.15} className="font-mono text-emerald-400 font-bold text-sm sm:text-base" />
                    </div>
                  </div>
                  
                  <input 
                    type="range" 
                    min={gameState.currentMaxBet + gameState.minRaise}
                    max={me.chips}
                    value={betAmount}
                    onChange={(e) => setBetAmount(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  
                  <div className="flex gap-2 justify-between w-full">
                    <button onClick={() => setBetAmount(gameState.currentMaxBet + gameState.minRaise)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] sm:text-xs font-bold py-2 rounded-lg transition">Min</button>
                    <button onClick={() => setBetAmount(Math.max(gameState.currentMaxBet + gameState.minRaise, Math.min(me.chips, Math.floor(gameState.pot / 2))))} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] sm:text-xs font-bold py-2 rounded-lg transition">½ Pot</button>
                    <button onClick={() => setBetAmount(Math.max(gameState.currentMaxBet + gameState.minRaise, Math.min(me.chips, gameState.pot)))} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] sm:text-xs font-bold py-2 rounded-lg transition">Pot</button>
                    <button onClick={() => setBetAmount(me.chips)} className="flex-1 bg-red-900/50 hover:bg-red-900/80 text-red-300 border border-red-900 text-[10px] sm:text-xs font-bold py-2 rounded-lg transition">ALL-IN</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Buttons */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 w-full h-12 sm:h-14">
              <button 
                onClick={() => handleAction('fold')}
                disabled={!isMyTurn}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold px-4 sm:px-8 rounded-2xl transition text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg flex-1 h-full"
              >
                <X size={20} className="text-red-400 sm:text-white" /> <span className="hidden sm:inline">Coucher</span>
              </button>
              
              <button 
                onClick={() => handleAction('call')}
                disabled={!isMyTurn}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 sm:px-8 rounded-2xl transition flex flex-col items-center justify-center leading-none flex-[1.5] h-full shadow-lg relative"
              >
                <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <Check size={20} /> 
                  <span>{amountToCall === 0 ? 'Check' : 'Suivre'}</span>
                </div>
                {amountToCall > 0 && <span className="absolute bottom-1.5 text-[9px] sm:text-[11px] font-mono opacity-80">{amountToCall}</span>}
              </button>
              
              <button 
                onClick={() => handleAction('raise')}
                disabled={!isMyTurn || betAmount < (gameState.currentMaxBet + gameState.minRaise) || betAmount > me.chips}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 sm:px-8 rounded-2xl transition flex flex-col items-center justify-center leading-none flex-[1.5] h-full shadow-lg relative"
              >
                <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                  <TrendingUp size={20} className="text-emerald-200 sm:text-white" /> 
                  <span>Relancer</span>
                </div>
                <span className="absolute bottom-1.5 text-[9px] sm:text-[11px] font-mono opacity-80">
                  <AnimatedCounter value={betAmount} duration={0.15} />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 py-4">Mode Spectateur</div>
        )}
      </footer>

      {/* Showdown Modal */}
      <AnimatePresence>
        {gameState.status === 'SHOWDOWN' && gameState.history && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Fin de la manche</h2>
              
              {gameState.history.type === 'fold' ? (
                <p className="text-slate-300 text-base sm:text-lg mb-6">Victoire par abandon. Pot remporté : <span className="text-emerald-400 font-bold">{gameState.history.amount}</span></p>
              ) : (
                <div className="mb-6 text-slate-300">
                  <p className="text-base sm:text-lg mb-4">Gagnant(s) au Showdown (Pot: <span className="text-emerald-400 font-bold">{gameState.history.amount}</span>)</p>
                  {gameState.history.winners.map(w => {
                    const winnerPlayer = gameState.players.find(p => p.id === w.id);
                    return (
                      <div key={w.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-2">
                        <div className="font-bold text-white mb-1">{winnerPlayer?.username}</div>
                        <div className="text-xs sm:text-sm text-emerald-400 font-mono mb-2">{w.handName}</div>
                        <div className="flex gap-1 justify-center scale-75">
                          {w.cards.map(c => <PlayingCard key={c} card={c} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              
              <div className="text-xs sm:text-sm text-slate-500 animate-pulse mt-4 sm:mt-8">Prochaine partie dans quelques secondes...</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
