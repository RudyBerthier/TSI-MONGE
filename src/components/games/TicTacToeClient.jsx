import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

export default function TicTacToeClient({ disabled }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [board, setBoard] = useState(Array(9).fill(null));
  const [status, setStatus] = useState('playing'); // 'playing', 'won', 'draw'
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [playersMap, setPlayersMap] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on('game:update', (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentPlayerId(state.currentPlayerId);
      setWinnerId(state.winnerId);
      setWinningLine(state.winningLine);
      setPlayersMap(state.players);
    });

    return () => {
      socket.off('game:update');
    };
  }, [socket]);

  const handleCellClick = (index) => {
    if (disabled || status !== 'playing' || currentPlayerId !== myKey || board[index] !== null) return;
    
    // Optimistic UI update could go here, but with sockets it's fast enough
    socket.emit('game:action', { type: 'play_turn', payload: { index } });
  };

  const myKey = Object.keys(playersMap).find(k => playersMap[k].socketId === socket?.id);
  const mySymbol = playersMap[myKey]?.symbol || '';
  const isMyTurn = currentPlayerId === myKey;

  const getStatusMessage = () => {
    if (disabled) return "Partie terminée (Déconnexion)";
    if (status === 'playing') {
      return isMyTurn ? 'À toi de jouer !' : `Au tour de ${playersMap[currentPlayerId]?.username || 'l\'adversaire'}...`;
    } else if (status === 'draw') {
      return 'Égalité ! Aucun gagnant.';
    } else if (status === 'won') {
      return winnerId === myKey ? '🎉 Tu as gagné ! 🎉' : 'Tu as perdu ! 😢';
    }
    return '';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      <div className={`text-xl font-bold mb-8 px-6 py-2 rounded-full ${
        status === 'won' && winnerId === myKey ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' :
        status === 'won' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' :
        status === 'draw' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
        isMyTurn && !disabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm animate-pulse' :
        'text-gray-500'
      }`}>
        {getStatusMessage()}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full aspect-square bg-gray-200 dark:bg-neutral-800 p-3 rounded-2xl shadow-inner">
        {board.map((cell, index) => {
          const isWinningCell = winningLine?.includes(index);
          return (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={disabled || status !== 'playing' || cell !== null || !isMyTurn}
              className={`
                flex items-center justify-center text-5xl font-black rounded-xl transition-all duration-200
                bg-white dark:bg-neutral-900 shadow-sm
                ${cell === null && isMyTurn && !disabled && status === 'playing' ? 'hover:bg-blue-50 dark:hover:bg-neutral-700 cursor-pointer active:scale-95' : 'cursor-default'}
                ${isWinningCell ? 'bg-green-100 dark:bg-green-900/40 border-2 border-green-400 animate-bounce shadow-lg shadow-green-500/20' : ''}
              `}
            >
              <span className={`
                ${cell === 'X' ? 'text-blue-500' : 'text-red-500'}
                ${cell === null && isMyTurn && !disabled && status === 'playing' ? 'hover:content-["' + mySymbol + '"] hover:opacity-20' : ''}
              `}>
                {cell}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
