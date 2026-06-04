import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Loader2, Frown, Users } from 'lucide-react';

const LeaderboardWidget = () => {
  const [activeTab, setActiveTab] = useState('tictactoe');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'tictactoe', label: 'Morpion' },
    { id: 'rps', label: 'P-P-C' },
    { id: 'connect4', label: 'Puissance 4' },
    { id: 'snake', label: 'Snake' }
  ];

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/games/leaderboard/${activeTab}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Erreur de chargement');
        const data = await res.json();
        setLeaderboard(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab]);

  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <Crown size={20} className="text-yellow-500" />;
      case 1: return <Medal size={20} className="text-gray-400" />;
      case 2: return <Medal size={20} className="text-amber-700" />;
      default: return <span className="font-bold text-gray-500 w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-gray-200 dark:border-neutral-800 shadow-sm w-full mt-12 mb-8 relative overflow-hidden group">
      
      {/* Background decoration */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-2xl">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Panthéon</h2>
            <p className="text-sm text-gray-500">Les meilleurs joueurs de TSI-MONGE</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-gray-100 dark:bg-neutral-800 p-1.5 rounded-xl border border-gray-200 dark:border-neutral-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Calcul des scores...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
            <Frown size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-red-500 mx-auto text-center">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-center">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Aucun joueur classé pour ce jeu.</p>
            <p className="text-sm opacity-75">Soyez le premier à participer !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((player, idx) => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border transition-all ${
                  idx === 0 
                    ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/50' 
                    : idx === 1 
                      ? 'border-gray-200 bg-gray-50 dark:bg-neutral-800/50 dark:border-neutral-700' 
                      : idx === 2 
                        ? 'border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30' 
                        : 'border-transparent hover:bg-gray-50 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(idx)}
                  </div>
                  
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.username} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
                      {player.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    <span className="font-bold block">{player.username}</span>
                    {activeTab !== 'snake' && (
                      <span className="text-xs text-gray-500">
                        {player.wins}V - {player.losses}D - {player.draws}N
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xl font-black ${
                    idx === 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-900 dark:text-white'
                  }`}>
                    {activeTab === 'snake' ? player.high_score?.toLocaleString() : player.elo_score}
                  </span>
                  <span className="text-xs text-gray-500 block -mt-1 uppercase tracking-wide">
                    {activeTab === 'snake' ? 'Points' : 'Elo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardWidget;
