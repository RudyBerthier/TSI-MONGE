import React, { useState, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LogIn, Plus, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PokerTable from '../../components/poker/PokerTable';

export default function Poker() {
  const { socket } = useSocket();
  const { user } = useAuth();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  
  const [inputRoomId, setInputRoomId] = useState('');
  
  const handleJoin = (e) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      setSearchParams({ room: inputRoomId.trim().toUpperCase() });
    }
  };
  
  if (roomId) {
    return <PokerTable roomId={roomId} onLeave={() => setSearchParams({})} />;
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-slate-900 flex flex-col pt-16 items-center justify-center relative overflow-hidden w-full">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md p-6">
        <Link to="/outils" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> Retour aux outils
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/60 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tsi-display tracking-tight">
              TSI <span className="text-emerald-400">Poker</span>
            </h1>
            <p className="text-slate-400 text-sm">Texas Hold'em Multijoueur</p>
          </div>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Nom du salon (ex: MONGE)"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 px-4 py-4 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors uppercase font-bold text-center text-lg"
              maxLength={12}
            />
            <button 
              type="submit"
              disabled={!inputRoomId.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold py-4 px-6 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20"
            >
              Jouer
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
