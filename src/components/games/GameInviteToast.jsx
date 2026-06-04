import React, { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameInviteToast() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:invited', (data) => {
      // data: { inviterId, inviterName, gameType }
      setInvite(data);
      
      // Auto-dismiss after 15 seconds
      setTimeout(() => {
        setInvite(current => {
          if (current?.inviterId === data.inviterId) return null;
          return current;
        });
      }, 15000);
    });

    socket.on('game:invite_expired', () => {
       setInvite(null);
    });

    return () => {
      socket.off('game:invited');
      socket.off('game:invite_expired');
    };
  }, [socket]);

  const handleAccept = () => {
    if (!invite || !socket) return;
    socket.emit('game:accept_invite', { inviterId: invite.inviterId });
    setInvite(null);
    navigate('/social/games'); // Redirect to Arcade
  };

  const handleReject = () => {
    if (!invite || !socket) return;
    socket.emit('game:reject_invite', { inviterId: invite.inviterId });
    setInvite(null);
  };

  const getGameName = (type) => {
    if (type === 'tictactoe') return 'Morpion';
    if (type === 'connect4') return 'Puissance 4';
    if (type === 'rps') return 'Pierre Papier Ciseaux';
    return type;
  };

  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed top-20 right-4 z-50 w-80 bg-white dark:bg-neutral-900 border-2 border-blue-500 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-1">
              <Gamepad2 className="text-blue-600 dark:text-blue-400 w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">Nouveau Défi Arcade !</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{invite.inviterName}</span> t'a défié au <span className="font-bold">{getGameName(invite.gameType)}</span>.
              </p>
            </div>
            <button 
              onClick={() => setInvite(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-neutral-800 dark:hover:bg-red-900/30 dark:text-gray-300 dark:hover:text-red-400 transition-colors text-sm font-semibold"
            >
              <X size={16} /> Refuser
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 text-sm font-semibold"
            >
              <Check size={16} /> Accepter
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
