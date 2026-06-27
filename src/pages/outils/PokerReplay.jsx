import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PlayingCard from '../../components/poker/PlayingCard';

export default function PokerReplay() {
  const { handId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [handData, setHandData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Replay State
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Derived state at current step
  const [tableState, setTableState] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/poker/hand/${handId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setHandData(data);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [handId, token]);

  // Compute table state up to stepIndex
  useEffect(() => {
    if (!handData) return;
    
    // Initialize state
    const state = {
      players: handData.players.map(p => ({
        ...p,
        chips: p.initialChips,
        currentBet: 0,
        folded: false,
        visibleCards: p.cards // In replay, we can see everyone's cards
      })),
      communityCards: [],
      pot: 0,
      phase: 'WAITING',
      lastAction: null
    };

    // Apply actions up to stepIndex
    for (let i = 0; i <= stepIndex; i++) {
      const action = handData.timeline[i];
      if (!action) continue;

      if (action.type === 'PHASE') {
        state.phase = action.phase;
        state.pot = action.pot || state.pot;
        // Reset bets
        state.players.forEach(p => p.currentBet = 0);
        
        // Reconstruct community cards up to this phase by looking ahead or just using history logic
        // Actually, the simplest way is to collect cards from PHASE events
      } else if (action.type === 'ACTION' || action.type === 'BLIND') {
        const p = state.players.find(p => p.id === action.player_id);
        if (p) {
          if (action.action === 'fold') {
            p.folded = true;
          } else if (action.amount > 0) {
            p.chips -= action.amount;
            p.currentBet += action.amount;
            state.pot += action.amount;
          }
        }
        state.lastAction = action;
      } else if (action.type === 'SHOWDOWN') {
        state.phase = 'SHOWDOWN';
        state.pot = action.pot;
      }
    }
    
    // Compute community cards precisely based on current phase
    const phases = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    let community = [];
    if (phases.indexOf(state.phase) >= 1) { // FLOP
       community.push(...handData.community_cards.slice(0, 3));
    }
    if (phases.indexOf(state.phase) >= 2) { // TURN
       community.push(handData.community_cards[3]);
    }
    if (phases.indexOf(state.phase) >= 3) { // RIVER or SHOWDOWN
       community.push(handData.community_cards[4]);
    }
    state.communityCards = community.filter(Boolean);

    setTableState(state);
  }, [handData, stepIndex]);

  // Autoplay logic
  useEffect(() => {
    let timer;
    if (isPlaying && handData) {
      if (stepIndex < handData.timeline.length - 1) {
        timer = setTimeout(() => {
          setStepIndex(prev => prev + 1);
        }, 1500); // 1.5s per move
      } else {
        setIsPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, handData]);

  if (loading || !tableState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- Rendering UI ---
  const { timeline } = handData;
  const currentAction = timeline[stepIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row overflow-hidden fixed inset-0">
      
      {/* Left: Table Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 p-2 sm:px-4 sm:py-2 rounded-xl backdrop-blur transition"
        >
          <ChevronLeft size={20} /> <span className="hidden sm:inline">Retour</span>
        </button>
        
        {/* Replay Table UI */}
        <div className="relative w-full max-w-4xl aspect-[2/1] bg-emerald-900/20 border-8 border-slate-800 rounded-[200px] flex items-center justify-center shadow-2xl backdrop-blur-sm">
          
          {/* Community Cards */}
          <div className="flex gap-2 p-4 bg-black/20 rounded-2xl">
            {tableState.communityCards.map((card, i) => (
              <PlayingCard key={i} cardStr={card} />
            ))}
            {tableState.communityCards.length === 0 && (
              <div className="text-emerald-500/50 font-mono text-sm tracking-widest">EN ATTENTE...</div>
            )}
          </div>

          {/* Pot */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
             <div className="text-emerald-400 font-bold font-mono text-xl sm:text-2xl drop-shadow-md">
               {tableState.pot}
             </div>
             <div className="text-xs text-emerald-500/80 font-bold tracking-widest">POT</div>
          </div>
          
          {/* Players */}
          {tableState.players.map((p, i) => {
            const isLocal = p.id === user.id;
            // Simple positioning for max 9 players around oval
            const angle = (i / Math.max(tableState.players.length, 2)) * Math.PI * 2 + Math.PI/2;
            const rx = 40; // % from center
            const ry = 40;
            const x = 50 + Math.cos(angle) * rx;
            const y = 50 + Math.sin(angle) * ry;
            
            const isActing = currentAction?.player_id === p.id;
            
            return (
              <div 
                key={p.id} 
                className="absolute flex flex-col items-center transition-all duration-500"
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* Cards */}
                {p.visibleCards && p.visibleCards.length > 0 && !p.folded && (
                  <div className="flex mb-2 scale-90 sm:scale-100 origin-bottom">
                    <div className="-rotate-6 translate-x-2"><PlayingCard cardStr={p.visibleCards[0]} /></div>
                    <div className="rotate-6 -translate-x-2"><PlayingCard cardStr={p.visibleCards[1]} /></div>
                  </div>
                )}
                
                {/* Player Box */}
                <div className={`
                  relative bg-slate-800/90 backdrop-blur px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border flex items-center gap-2 sm:gap-3 min-w-[130px] sm:min-w-[150px] shadow-xl
                  ${isActing ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-700/50'}
                  ${p.folded ? 'opacity-40 grayscale' : ''}
                `}>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400 text-sm sm:text-base">
                    {p.avatar ? <img src={p.avatar} alt="A" className="w-full h-full rounded-full object-cover" /> : p.username.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm sm:text-base truncate max-w-[70px] sm:max-w-[90px]">{p.username}</div>
                    <div className="text-emerald-400 text-xs sm:text-sm font-mono">{p.chips}</div>
                  </div>
                </div>
                
                {/* Current Bet Bubble */}
                {p.currentBet > 0 && !p.folded && (
                  <div className="mt-2 bg-emerald-900/80 text-emerald-400 border border-emerald-500/50 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg">
                    Mise: {p.currentBet}
                  </div>
                )}
                
                {p.folded && (
                  <div className="mt-2 bg-red-900/80 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    COUCHÉ
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Right: Timeline UI */}
      <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 bg-slate-950 sticky top-0 z-10 flex flex-col gap-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Play className="text-emerald-500" /> Replay
          </h2>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={() => { setIsPlaying(false); setStepIndex(0); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            >
              <SkipBack size={20} />
            </button>
            <button 
              onClick={() => { setIsPlaying(false); setStepIndex(Math.max(0, stepIndex - 1)); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            >
              <ChevronLeft size={24} />
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center transition shadow-lg shadow-emerald-900/50"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            
            <button 
              onClick={() => { setIsPlaying(false); setStepIndex(Math.min(timeline.length - 1, stepIndex + 1)); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            >
              <ChevronLeft size={24} className="rotate-180" />
            </button>
            <button 
              onClick={() => { setIsPlaying(false); setStepIndex(timeline.length - 1); }}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>
        
        {/* Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {timeline.map((act, idx) => {
            const isCurrent = idx === stepIndex;
            const isPast = idx < stepIndex;
            
            let icon = <ArrowRight size={14} />;
            let text = "";
            let username = act.player_id ? handData.players.find(p => p.id === act.player_id)?.username : '';
            
            if (act.type === 'PHASE') {
               text = `Phase: ${act.phase}`;
            } else if (act.type === 'SHOWDOWN') {
               text = `SHOWDOWN - Fin de manche`;
            } else if (act.type === 'BLIND') {
               text = `${username} pose la blind (${act.amount})`;
            } else if (act.action === 'fold') {
               text = `${username} se couche`;
            } else if (act.action === 'check') {
               text = `${username} check`;
            } else if (act.action === 'call') {
               text = `${username} suit (${act.amount})`;
            } else if (act.action === 'raise') {
               text = `${username} relance à ${act.raiseTo}`;
            } else if (act.action === 'bet') {
               text = `${username} mise ${act.amount}`;
            }
            
            return (
              <button
                key={idx}
                onClick={() => { setIsPlaying(false); setStepIndex(idx); }}
                className={`
                  w-full text-left p-3 rounded-xl transition flex items-start gap-3
                  ${isCurrent ? 'bg-emerald-900/40 border border-emerald-500/50 shadow-md text-emerald-50' : 'hover:bg-slate-800 border border-transparent'}
                  ${isPast && !isCurrent ? 'opacity-50' : ''}
                `}
              >
                <div className={`mt-1 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{text}</div>
                  <div className="text-xs font-mono text-slate-500 mt-1">Étape {idx + 1}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
