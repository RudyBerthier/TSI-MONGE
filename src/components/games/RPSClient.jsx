import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Hand, HandMetal, Scissors } from 'lucide-react'; // Simulating rock, paper, scissors icons

export default function RPSClient({ disabled }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [status, setStatus] = useState('choosing'); // 'choosing', 'reveal', 'match_won'
  const [winnerId, setWinnerId] = useState(null);
  const [scores, setScores] = useState({ [user?.id]: 0 });
  const [roundCount, setRoundCount] = useState(1);
  const [maxScore, setMaxScore] = useState(3);
  const [playersMap, setPlayersMap] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on('game:update', (state) => {
      setStatus(state.status);
      setWinnerId(state.winnerId);
      setScores(state.scores || {});
      setRoundCount(state.roundCount);
      setMaxScore(state.maxScore);
      setPlayersMap(state.players);
    });

    return () => {
      socket.off('game:update');
    };
  }, [socket]);

  const handleChoice = (choice) => {
    if (disabled || status !== 'choosing') return;
    
    const myCurrentChoice = playersMap[myKey]?.choice;
    if (myCurrentChoice && myCurrentChoice !== 'locked') return; // already picked

    socket.emit('game:action', { type: 'play_turn', payload: { choice } });
  };

  const myKey = Object.keys(playersMap).find(k => playersMap[k].socketId === socket?.id);
  const myState = playersMap[myKey] || {};
  const opponentId = Object.keys(playersMap).find(id => id !== myKey);
  const opponentState = playersMap[opponentId] || {};

  const myScore = scores[myKey] || 0;
  const oppScore = scores[opponentId] || 0;

  const renderChoiceIcon = (choice, size = 48) => {
    switch (choice) {
      case 'rock': return <Hand size={size} className="text-gray-600 dark:text-gray-300 transform -rotate-45" />;
      case 'paper': return <Hand size={size} className="text-blue-500" />;
      case 'scissors': return <Scissors size={size} className="text-red-500 transform -rotate-90" />;
      case 'locked': return <div className="w-12 h-12 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 animate-spin-slow"></div>;
      default: return <div className="w-12 h-12 rounded-full border-4 border-dotted border-gray-200 dark:border-gray-800"></div>;
    }
  };

  const translateChoice = (choice) => {
    switch (choice) {
      case 'rock': return 'Pierre';
      case 'paper': return 'Papier';
      case 'scissors': return 'Ciseaux';
      case 'locked': return 'Prêt';
      default: return 'En attente...';
    }
  };

  const getStatusMessage = () => {
    if (disabled) return "Partie terminée (Déconnexion)";
    if (status === 'match_won') {
      return winnerId === myKey ? '🎉 VICTOIRE ! 🎉' : 'DEFAITE ! 😢';
    }
    if (status === 'reveal') {
      if (winnerId === 'draw') return 'Égalité pour cette manche !';
      return winnerId === myKey ? 'Tu as gagné la manche !' : 'Manche perdue !';
    }
    
    // Choosing phase
    if (myState.choice) {
      return opponentState.choice === 'locked' ? 'Suspense...' : 'En attente de l\'adversaire...';
    }
    return `Manche ${roundCount} - Fais ton choix !`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* Score Header */}
      <div className="flex justify-between items-center w-full mb-6 px-4 py-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 font-medium">Toi</span>
          <span className="text-2xl font-black text-blue-600">{myScore}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Premier à {maxScore}</span>
          <span className="text-sm font-medium bg-gray-100 dark:bg-neutral-800 px-3 py-1 rounded-full mt-1">Round {roundCount}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">{opponentState.username || 'Adv.'}</span>
          <span className="text-2xl font-black text-red-600">{oppScore}</span>
        </div>
      </div>

      <div className={`text-lg font-bold mb-8 px-6 py-2 rounded-full text-center transition-all ${
        status === 'match_won' && winnerId === myKey ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
        status === 'match_won' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
        status === 'reveal' && winnerId === myKey ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' :
        status === 'reveal' && winnerId !== 'draw' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800' :
        status === 'reveal' ? 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300' :
        !myState.choice && !disabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 animate-pulse' :
        'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'
      }`}>
        {getStatusMessage()}
      </div>

      {/* Arena vs Mode */}
      <div className="flex justify-between items-center w-full mb-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-white dark:bg-neutral-800 shadow-md border-4 border-blue-100 dark:border-blue-900/30 flex items-center justify-center transition-all duration-500">
            {renderChoiceIcon(myState.choice, 40)}
          </div>
          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
            {translateChoice(myState.choice)}
          </span>
        </div>

        <div className="text-3xl font-black italic text-gray-300 dark:text-neutral-700 px-4">VS</div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-white dark:bg-neutral-800 shadow-md border-4 border-red-100 dark:border-red-900/30 flex items-center justify-center transition-all duration-500">
            {renderChoiceIcon(opponentState.choice, 40)}
          </div>
          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
            {translateChoice(opponentState.choice)}
          </span>
        </div>
      </div>

      {/* Controls to pick */}
      {status === 'choosing' && !myState.choice && !disabled && (
        <div className="flex gap-4 w-full justify-center animate-fade-in-up">
          <button onClick={() => handleChoice('rock')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all text-gray-600 dark:text-gray-300">
            <Hand size={32} className="transform -rotate-45" />
            <span className="text-xs font-bold">Pierre</span>
          </button>
          <button onClick={() => handleChoice('paper')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all text-blue-500">
            <Hand size={32} />
            <span className="text-xs font-bold">Papier</span>
          </button>
          <button onClick={() => handleChoice('scissors')} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all text-red-500">
            <Scissors size={32} className="transform -rotate-90" />
            <span className="text-xs font-bold">Ciseaux</span>
          </button>
        </div>
      )}
    </div>
  );
}
