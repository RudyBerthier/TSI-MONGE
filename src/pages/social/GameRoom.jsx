import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import TicTacToeClient from '../../components/games/TicTacToeClient';
import Connect4Client from '../../components/games/Connect4Client';
import RPSClient from '../../components/games/RPSClient';
import SnakeClient from '../../components/games/SnakeClient';
import ChessClient from '../../components/games/ChessClient';
import LeaderboardWidget from '../../components/games/LeaderboardWidget';
import { Loader2, ArrowLeft, Gamepad2, Users, Search, X, Grid3x3, Circle, FileText, Scissors, Hexagon, LayoutGrid, ArrowDown, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameRoom() {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null); // 'idle', 'searching', 'playing'
  const [selectedGame, setSelectedGame] = useState(null);
  const [roomData, setRoomData] = useState(null); // { roomId, players, gameType }
  const [opponentLeft, setOpponentLeft] = useState(false);
  
  // Direct Invite State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteGameType, setInviteGameType] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedUserId, setInvitedUserId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:match_found', (data) => {
      setRoomData(data);
      setGameState('playing');
      setOpponentLeft(false);
      setInviteModalOpen(false); // Close invite modal if we get pulled into a match
    });

    socket.on('game:opponent_left', (data) => {
      setOpponentLeft(true);
      // We keep them in the room so they can see the "Opponent Left" message
    });

    socket.on('users:online', (users) => {
      // Filter out ourselves
      if (user) {
        setOnlineUsers(users.filter(u => u.id !== user.id));
      } else {
        setOnlineUsers(users);
      }
    });
    socket.on('game:invite_rejected', ({ targetName }) => {
      alert(`${targetName} a décliné l'invitation.`);
      setInvitedUserId(null);
    });

    socket.on('game:invite_expired', ({ targetName }) => {
      alert(`L'invitation a expiré.`);
      setInvitedUserId(null);
    });

    return () => {
      socket.off('game:match_found');
      socket.off('game:opponent_left');
      socket.off('users:online');
      socket.off('game:invite_rejected');
      socket.off('game:invite_expired');
    };
  }, [socket, user?.id]);

  // Clean up if user navigates away
  useEffect(() => {
    return () => {
      if (socket) {
        socket.emit('game:leave');
        socket.emit('game:cancel_match');
      }
    };
  }, [socket]);

  const handleStartSearch = (gameType) => {
    if (!socket || !connected) return;
    setSelectedGame(gameType);
    setGameState('searching');
    setOpponentLeft(false);
    socket.emit('game:find_match', { gameType });
  };

  const handleCancelSearch = () => {
    if (!socket) return;
    socket.emit('game:cancel_match');
    setGameState('idle');
    setSelectedGame(null);
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('game:leave');
    }
    setGameState('idle');
    setRoomData(null);
    setSelectedGame(null);
    setOpponentLeft(false);
  };

  const handleOpenInviteModal = (gameType) => {
    setInviteGameType(gameType);
    setInviteModalOpen(true);
    setInvitedUserId(null);
  };

  const handleSendInvite = (targetId) => {
    if (!socket) return;
    socket.emit('game:invite', { targetId, gameType: inviteGameType });
    setInvitedUserId(targetId);
  };

  const filteredUsers = onlineUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  // ------------------------------------------------------------------
  // UI Renders
  // ------------------------------------------------------------------

  if ((gameState === 'idle' || !gameState) && selectedGame !== 'snake') {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 p-6 md:p-12 mb-16 md:mb-0">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <Gamepad2 className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Arcade TSI 🕹️</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-10 text-center max-w-md">
            Défie tes potes de TSI en temps réel pendant les heures de creux !
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full relative z-10">
            {/* Tic-Tac-Toe Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 flex flex-col items-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-24 flex items-center justify-center mb-2 w-full">
                <svg viewBox="0 0 100 100" className="w-16 h-16">
                  {/* Grid - Centered. 3x3 of 20x20 squares. Total size 60x60. Centered at 50,50 */}
                  <path d="M 40 20 L 40 80 M 60 20 L 60 80 M 20 40 L 80 40 M 20 60 L 80 60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-gray-300 dark:text-gray-600" />
                  
                  {/* Pieces */}
                  {/* Top-Left Cell X: Center is (30, 30). */}
                  <path d="M 24 24 L 36 36 M 36 24 L 24 36" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-blue-500 group-hover:scale-110 transition-transform origin-top-left" />
                  
                  {/* Bottom-Right Cell O: Center is (70, 70). */}
                  <circle cx="70" cy="70" r="6" stroke="currentColor" strokeWidth="5" fill="none" className="text-blue-500 group-hover:scale-110 transition-transform origin-bottom-right" />
                  
                  {/* Center Cell X: Center is (50, 50). */}
                  <path d="M 44 44 L 56 56 M 56 44 L 44 56" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Morpion</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-10">Le classique indémodable. Aligne 3 symboles.</p>
              <div className="flex flex-col gap-2 w-full mt-auto">
                <button onClick={() => handleStartSearch('tictactoe')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors active:scale-95">
                  Matchmaking Aléatoire
                </button>
                <button onClick={() => handleOpenInviteModal('tictactoe')} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Users size={18} /> Défier un ami
                </button>
              </div>
            </div>
            
            {/* Rock Paper Scissors Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 flex flex-col items-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-24 flex items-center justify-center mb-2 w-full">
                <svg viewBox="0 0 100 100" className="w-20 h-20">
                  {/* Rock (Left Hand - Fist) */}
                  <g className="text-gray-400 dark:text-gray-500 transition-transform group-hover:-translate-y-1 group-hover:-rotate-6">
                    <path d="M 18 55 Q 18 45 23 45 L 33 45 Q 38 45 38 55 L 38 70 Q 38 80 28 80 Q 18 80 18 70 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <line x1="23" y1="45" x2="23" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="28" y1="45" x2="28" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="33" y1="45" x2="33" y2="60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 10 60 Q 5 60 5 65 Q 5 70 15 75 L 30 75" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  </g>
                  
                  {/* Paper (Center Hand - Flat) */}
                  <g className="text-gray-400 dark:text-gray-500 transition-transform group-hover:-translate-y-2 origin-center">
                    <path d="M 45 60 L 45 80 Q 55 90 65 80 L 65 60" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 45 60 L 45 35 Q 45 30 47.5 30 Q 50 30 50 35 L 50 55" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 50 55 L 50 25 Q 50 20 52.5 20 Q 55 20 55 25 L 55 55" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 55 55 L 55 30 Q 55 25 57.5 25 Q 60 25 60 30 L 60 55" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 60 55 L 60 40 Q 60 35 62.5 35 Q 65 35 65 40 L 65 60" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 45 65 L 40 55 Q 35 50 40 45 Q 45 40 50 50" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </g>

                  {/* Scissors (Right Hand - V shape) */}
                  <g className="text-green-500 transition-transform group-hover:-translate-y-1 group-hover:rotate-6">
                    <path d="M 72 65 L 72 80 Q 82 90 92 80 L 92 65 Q 92 55 82 55 L 72 55 Z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <line x1="77" y1="55" x2="77" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="82" y1="55" x2="82" y2="70" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 72 55 L 62 30 Q 60 25 65 20 Q 68 25 77 55" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 82 55 L 80 25 Q 81 20 86 20 Q 90 25 87 55" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M 72 70 L 64 65 Q 60 60 65 55 Q 70 50 82 60" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-center">Pierre Papier Ciseaux</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-10">Fais ton choix et affronte ton adversaire.</p>
              <div className="flex flex-col gap-2 w-full mt-auto">
                <button onClick={() => handleStartSearch('rps')} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors active:scale-95">
                  Matchmaking Aléatoire
                </button>
                <button onClick={() => handleOpenInviteModal('rps')} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Users size={18} /> Défier un ami
                </button>
              </div>
            </div>
            
            {/* Puissance 4 Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 flex flex-col items-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-24 flex items-center justify-center w-full mb-2 relative">
                <svg viewBox="0 0 100 100" className="w-16 h-16">
                  {/* Board */}
                  <path d="M 15 30 L 15 90 L 85 90 L 85 30" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600" />
                  <line x1="15" y1="30" x2="85" y2="30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-gray-300 dark:text-gray-600" />
                  
                  {/* Slots */}
                  <circle cx="30" cy="45" r="7" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-300 dark:text-gray-600" />
                  <circle cx="50" cy="45" r="7" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-300 dark:text-gray-600" />
                  <circle cx="70" cy="45" r="7" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-300 dark:text-gray-600" />

                  <circle cx="30" cy="70" r="7" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-300 dark:text-gray-600" />
                  <circle cx="50" cy="70" r="7" fill="currentColor" className="text-yellow-500" />
                  <circle cx="70" cy="70" r="7" fill="currentColor" className="text-yellow-500" />

                  {/* Dropping Token */}
                  <circle cx="50" cy="15" r="7" fill="currentColor" className="text-yellow-500 transition-all duration-700 ease-bounce group-hover:translate-y-[26px]" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Puissance 4</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-10">Fais tomber tes jetons pour en aligner 4.</p>
              <div className="flex flex-col gap-2 w-full mt-auto">
                <button onClick={() => handleStartSearch('connect4')} className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl transition-colors active:scale-95">
                  Matchmaking Aléatoire
                </button>
                <button onClick={() => handleOpenInviteModal('connect4')} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Users size={18} /> Défier un ami
                </button>
              </div>
            </div>

            {/* Snake Card (Solo) */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 flex flex-col items-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-24 flex items-center justify-center w-full mb-2 relative">
                <svg viewBox="0 0 100 100" className="w-16 h-16">
                  {/* Grid background */}
                  <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-gray-200 dark:text-gray-800" />
                  {/* Apple */}
                  <circle cx="70" cy="30" r="5" fill="currentColor" className="text-red-500 group-hover:scale-110 transition-transform origin-center delay-75" />
                  {/* Snake Body */}
                  <path d="M 20 80 L 20 60 L 50 60 L 50 30 L 60 30" stroke="currentColor" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter" fill="none" className="text-green-500 transition-all duration-500 group-hover:stroke-green-400" />
                  {/* Snake Head Eye */}
                  <circle cx="58" cy="28" r="1.5" fill="white" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Snake</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-10">Le grand classique rétro en solo. Survis le plus longtemps.</p>
              <div className="flex flex-col gap-2 w-full mt-auto">
                <button onClick={() => setSelectedGame('snake')} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Play size={18} fill="currentColor" /> Jouer en Solo
                </button>
              </div>
            </div>

            {/* Chess Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-gray-200 dark:border-neutral-800 flex flex-col items-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="h-24 flex items-center justify-center w-full mb-2 relative">
                <svg viewBox="0 0 100 100" className="w-16 h-16">
                  {/* Board Base */}
                  <rect x="15" y="75" width="70" height="10" rx="2" fill="currentColor" className="text-gray-300 dark:text-gray-700" />
                  <rect x="25" y="65" width="50" height="10" fill="currentColor" className="text-gray-300 dark:text-gray-700" />
                  {/* Knight piece shape */}
                  <path d="M 35 65 L 65 65 L 60 45 Q 65 35 60 25 Q 50 15 40 25 Q 35 30 30 45 Z" fill="currentColor" className="text-indigo-500 group-hover:-translate-y-2 transition-transform duration-300" />
                  {/* Horse mane & eye details */}
                  <circle cx="45" cy="30" r="2" fill="white" className="group-hover:-translate-y-2 transition-transform duration-300" />
                  <path d="M 35 35 L 30 45" stroke="white" strokeWidth="2" className="group-hover:-translate-y-2 transition-transform duration-300" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Échecs</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-10">Partie en temps réel.</p>
              <div className="flex flex-col gap-2 w-full mt-auto">
                <button onClick={() => handleStartSearch('chess')} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors active:scale-95">
                  Matchmaking Aléatoire
                </button>
                <button onClick={() => handleOpenInviteModal('chess')} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                  <Users size={18} /> Défier un ami
                </button>
              </div>
            </div>

          </div>

          <LeaderboardWidget />

        </div>

        {/* Invite Modal */}
        <AnimatePresence>
          {inviteModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setInviteModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-neutral-800">
                  <h3 className="font-bold text-lg">Défier un ami</h3>
                  <button onClick={() => setInviteModalOpen(false)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full text-gray-500 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="p-4 border-b border-gray-100 dark:border-neutral-800 relative bg-gray-50/50 dark:bg-neutral-900/50">
                  <div className="absolute inset-y-0 left-7 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher quelqu'un en ligne..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 dark:border-neutral-700 dark:bg-neutral-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                      <Users size={48} className="mb-4 opacity-50" />
                      <p>Aucun utilisateur en ligne trouvé.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {filteredUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-neutral-700" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-neutral-900 rounded-full"></div>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{u.username}</span>
                          </div>
                          <button
                            onClick={() => handleSendInvite(u.id)}
                            disabled={invitedUserId === u.id}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                              invitedUserId === u.id 
                                ? 'bg-gray-100 text-gray-500 dark:bg-neutral-800 cursor-not-allowed'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
                            }`}
                          >
                            {invitedUserId === u.id ? 'Attente...' : 'Défier'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (gameState === 'searching') {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
        <h2 className="text-2xl font-bold mb-2">Recherche d'un adversaire...</h2>
        <p className="text-gray-500 mb-8 max-w-sm text-center">
          On cherche quelqu'un prêt à jouer au {selectedGame === 'tictactoe' ? 'Morpion' : selectedGame === 'connect4' ? 'Puissance 4' : selectedGame === 'chess' ? 'Échecs' : 'Pierre Papier Ciseaux'} contre toi.
        </p>
        <button
          onClick={handleCancelSearch}
          className="px-6 py-2.5 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-xl transition-colors"
        >
          Annuler la recherche
        </button>
      </div>
    );
  }

  if (gameState === 'playing' || selectedGame === 'snake') {
    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col">
        <button
          onClick={handleLeaveRoom}
          className="absolute top-6 left-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        {selectedGame === 'tictactoe' && <TicTacToeClient roomId={roomData?.roomId} players={roomData?.players} />}
        {selectedGame === 'connect4' && <Connect4Client roomId={roomData?.roomId} players={roomData?.players} />}
        {selectedGame === 'rps' && <RPSClient roomId={roomData?.roomId} players={roomData?.players} />}
        {selectedGame === 'chess' && <ChessClient roomId={roomData?.roomId} />}
        {selectedGame === 'snake' && <SnakeClient onExit={handleLeaveRoom} />}

        <AnimatePresence>
          {opponentLeft && selectedGame !== 'snake' && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="fixed bottom-10 inset-x-0 flex justify-center z-50 pointer-events-none"
            >
              <div className="bg-red-500/90 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-500/20 backdrop-blur-md pointer-events-auto flex items-center gap-4">
                Ton adversaire a quitté la partie
                <button onClick={handleLeaveRoom} className="underline text-sm">Retour</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
