import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessClient({ roomId }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // Local chess instance for move validation
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  
  const [status, setStatus] = useState('playing'); // 'playing', 'won', 'draw'
  const [currentPlayerId, setCurrentPlayerId] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [playersMap, setPlayersMap] = useState({});
  const [isCheck, setIsCheck] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (state) => {
      setStatus(state.status);
      setCurrentPlayerId(state.currentPlayerId);
      setWinnerId(state.winnerId);
      setPlayersMap(state.players);
      setIsCheck(state.isCheck);
      setLastMove(state.lastMove);
      
      // Update local board state
      setFen(state.fen);
      const newGame = new Chess(state.fen);
      setGame(newGame);
    };

    socket.on('game:update', handleUpdate);

    return () => {
      socket.off('game:update', handleUpdate);
    };
  }, [socket]);

  // Determine local player perspective
  const myKey = Object.keys(playersMap).find(k => playersMap[k].socketId === socket?.id);
  const myData = playersMap[myKey];
  const boardOrientation = myData?.color === 'w' ? 'white' : 'black';
  const isMyTurn = currentPlayerId === myKey;

  const getOpponent = () => {
    const oppId = Object.keys(playersMap).find(id => id !== myKey);
    return playersMap[oppId];
  };

  const opponent = getOpponent();

  const onDrop = useCallback((sourceSquare, targetSquare, piece) => {
    if (status !== 'playing' || !isMyTurn) return false;

    try {
      // Create a copy to test the move
      const gameCopy = new Chess(fen);
      
      // Determine promotion (if moving pawn to last rank)
      const isPawnPromotion = 
        (piece[1] === 'P' && sourceSquare[1] === '7' && targetSquare[1] === '8') ||
        (piece[1] === 'P' && sourceSquare[1] === '2' && targetSquare[1] === '1');

      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPawnPromotion ? 'q' : undefined // auto-queen for simplicity
      });

      if (move === null) {
        return false; // Invalid move
      }

      // Optimistic update
      setGame(gameCopy);
      setFen(gameCopy.fen());

      // Emit to server
      socket.emit('game:action', { 
        type: 'play_turn', 
        payload: { 
          sourceSquare, 
          targetSquare, 
          promotion: isPawnPromotion ? 'q' : undefined 
        } 
      });

      return true;
    } catch (e) {
      return false; // Invalid move error
    }
  }, [fen, isMyTurn, status, socket]);

  const handleResign = () => {
    if (window.confirm('Voulez-vous vraiment abandonner ?')) {
      socket.emit('game:action', { type: 'resign' });
    }
  };

  const getStatusMessage = () => {
    if (status === 'playing') {
      if (isCheck) return isMyTurn ? '⚠️ Échec ! À vous.' : "L'adversaire est en échec !";
      return isMyTurn ? 'À vous de jouer !' : `Au tour de ${opponent?.username || "l'adversaire"}...`;
    } else if (status === 'draw') {
      return '👔 Égalité !';
    } else if (status === 'won') {
      return winnerId === myKey ? '👑 Victoire !' : '☠️ Défaite...';
    }
    return '';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4 animate-in fade-in duration-500 relative z-10 pt-16">
      <div className={`mb-6 px-6 py-2 rounded-full font-bold text-center transition-colors shadow-sm ${
        status === 'won' && winnerId === myKey ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
        status === 'won' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
        status === 'draw' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' :
        isMyTurn ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' :
        'bg-white/5 text-gray-400 border border-white/10'
      }`}>
        {getStatusMessage()}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start w-full justify-center">
        {/* Board Container */}
        <div className="w-full max-w-[400px] aspect-square bg-neutral-900 rounded-lg shadow-2xl overflow-hidden ring-4 ring-neutral-800">
          <Chessboard
            id="BasicBoard"
            position={fen}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            customDarkSquareStyle={{ backgroundColor: '#2d3748' }} // Tailwind slate-800 equivalent
            customLightSquareStyle={{ backgroundColor: '#cbd5e1' }} // Tailwind slate-300 equivalent
            customDropSquareStyle={{ boxShadow: 'inset 0 0 1px 4px rgba(99,102,241,0.5)' }}
            animationDuration={200}
            // Highlight last move
            customSquareStyles={lastMove ? {
              [lastMove.from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
              [lastMove.to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
            } : {}}
          />
        </div>

        {/* Players Sidebar */}
        <div className="flex flex-col gap-4 w-full md:w-64">
          {/* Opponent Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
            {opponent?.avatar ? (
              <img src={opponent.avatar} alt="Opponent" className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-700" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center font-bold text-lg">
                {opponent?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-gray-200">{opponent?.username || 'Recherche...'}</span>
              <span className="text-xs text-gray-500">{opponent?.color === 'w' ? 'Blancs' : opponent?.color === 'b' ? 'Noirs' : ''}</span>
            </div>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* Local Player Card */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 flex items-center gap-4 shadow-lg">
            {user?.avatar ? (
              <img src={user.avatar} alt="You" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg">
                {user?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-white">{user?.username} (Vous)</span>
              <span className="text-xs text-gray-400">{myData?.color === 'w' ? 'Blancs' : myData?.color === 'b' ? 'Noirs' : ''}</span>
            </div>
          </div>

          {/* Controls */}
          {status === 'playing' && (
            <div className="mt-4 flex flex-col gap-2">
              <button 
                onClick={handleResign}
                className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg transition-colors text-sm font-semibold"
              >
                🏳️ Abandonner
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
