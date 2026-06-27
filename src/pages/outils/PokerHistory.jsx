import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, History, Play, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function PokerHistory() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/poker/my-history`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error("API Error or Invalid Data:", data);
        setHistory([]);
      }
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-8 pt-20">
      <div className="max-w-4xl w-full mx-auto">
        
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/outils/poker')}
            className="p-3 bg-slate-900 hover:bg-slate-800 rounded-xl transition"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <History className="text-emerald-500" />
              Mon Historique de Poker
            </h1>
            <p className="text-slate-400 font-mono mt-1">Vos dernières parties jouées</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">Aucune partie trouvée pour ce salon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {history.map((hand, idx) => (
              <div key={hand.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-emerald-500/50 transition">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-slate-800 text-slate-300 text-xs font-mono px-2 py-1 rounded-md">
                      Salon: {hand.room_id}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {new Date(hand.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30">
                        <span className="text-emerald-400 font-bold text-xs">POT</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">{hand.pot}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users size={16} />
                      <span className="text-sm">{hand.players.length} joueurs</span>
                    </div>
                    
                    {hand.winners && (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-sm">🏆 Vainqueur(s) :</span>
                        <span className="font-bold text-sm">
                          {hand.winners.type === 'fold' 
                            ? (hand.players.find(p => p.id === hand.winners.winner)?.username || 'Inconnu') + ' (Abandon)'
                            : hand.winners.winners.map(w => w.id === hand.players.find(p => p.id === w.id)?.id ? hand.players.find(p => p.id === w.id)?.username : 'Joueur').join(', ') + ' (' + hand.winners.winners[0].handName + ')'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate(`/outils/poker/replay/${hand.id}`)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition whitespace-nowrap"
                >
                  <Play size={18} />
                  Revoir la partie
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
