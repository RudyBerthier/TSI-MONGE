import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

export default function Connect4Client({ disabled }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // Board is 6 rows x 7 cols
  const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [status, setStatus] = useState('playing'); // 'playing', 'won', 'draw'
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [winningPieces, setWinningPieces] = useState(null); // Array of {r, c}
  const [playersMap, setPlayersMap] = useState({});

  useEffect(() => {
    if (!socket) return;

    socket.on('game:update', (state) => {
      setBoard(state.board);
      setStatus(state.status);
      setCurrentPlayerId(state.currentPlayerId);
      setWinnerId(state.winnerId);
      setWinningPieces(state.winningPieces);
      setPlayersMap(state.players);
    });

    return () => {
      socket.off('game:update');
    };
  }, [socket]);

  const handleColumnClick = (col) => {
    if (disabled || status !== 'playing' || currentPlayerId !== myKey) return;
    
    // Check if column is full
    if (board[0][col] !== null) return;

    socket.emit('game:action', { type: 'play_turn', payload: { col } });
  };

  const myKey = Object.keys(playersMap).find(k => playersMap[k].socketId === socket?.id);
  const myColor = playersMap[myKey]?.color || ''; // 'R' or 'Y'
  const isMyTurn = currentPlayerId === myKey;

  const getStatusMessage = () => {
    if (disabled) return "Partie terminée (Déconnexion)";
    if (status === 'playing') {
      return isMyTurn ? 'À toi de jouer !' : `Au tour de ${playersMap[currentPlayerId]?.username || "l'adversaire"}...`;
    } else if (status === 'draw') {
      return 'Égalité ! Fin de partie.';
    } else if (status === 'won') {
      return winnerId === myKey ? '🎉 Tu as gagné ! 🎉' : 'Tu as perdu ! 😢';
    }
    return '';
  };

  const getPieceColorClass = (cell, r, c) => {
    const isWinningCell = winningPieces?.some(p => p.r === r && p.c === c);
    
    let base = "w-full h-full rounded-full transition-all duration-300 shadow-inner ";
    
    if (cell === 'R') {
      base += "bg-red-500 shadow-red-900/50 ";
    } else if (cell === 'Y') {
      base += "bg-yellow-400 shadow-yellow-800/50 ";
    } else {
      base += "bg-white dark:bg-neutral-900 shadow-black/20 ";
    }

    if (isWinningCell) {
      base += " ring-4 ring-green-400 animate-pulse";
    }

    return base;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      <div className={`text-lg font-bold mb-6 px-6 py-2 rounded-full text-center w-full ${
        status === 'won' && winnerId === myKey ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' :
        status === 'won' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' :
        status === 'draw' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
        isMyTurn && !disabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm animate-pulse' :
        'text-gray-500'
      }`}>
        {getStatusMessage()}
        {status === 'playing' && (
          <div className="text-xs font-medium opacity-80 mt-1">
            Tu joues les {myColor === 'R' ? 'Rouges 🔴' : 'Jaunes 🟡'}
          </div>
        )}
      </div>

      {/* Connect 4 Board - 7 columns, 6 rows */}
      <div className="bg-blue-600 dark:bg-blue-800 p-3 rounded-xl shadow-xl w-full">
        {/* We map columns first to make entire columns clickable for better UX */}
        <div className="flex justify-between w-full h-64 sm:h-80 gap-1.5">
          {Array(7).fill(null).map((_, colIndex) => (
            <div 
              key={`col-${colIndex}`} 
              className={`flex flex-col justify-end gap-1.5 flex-1 relative ${isMyTurn && status === 'playing' && !disabled && board[0][colIndex] === null ? 'cursor-pointer hover:bg-blue-500/30 rounded-full transition-colors' : ''}`}
              onClick={() => handleColumnClick(colIndex)}
            >
              {board.map((row, rowIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} className="w-full aspect-square p-0.5">
                  <div className={getPieceColorClass(board[rowIndex][colIndex], rowIndex, colIndex)} />
                </div>
              ))}
              
              {/* Hover indicator for active player */}
              {isMyTurn && status === 'playing' && !disabled && board[0][colIndex] === null && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full opacity-0 hover:opacity-50 pointer-events-none hidden sm:block" 
                     style={{ backgroundColor: myColor === 'R' ? '#ef4444' : '#facc15' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
