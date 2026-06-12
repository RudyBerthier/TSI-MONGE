import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Clock, MousePointer2, Settings, ArrowLeft, ExternalLink, Award, PenTool, Coffee, Calculator, BookOpen, Shirt, Flame, FileText, Wifi, UserCheck, Smartphone, PartyPopper, EyeOff, Ghost, Mail, Key, ServerOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Link } from 'react-router-dom';

const UPGRADES = [
  // Clic (PPC)
  { id: 'stylo', name: 'Stylo Bic mâchouillé', description: '+1 clic par clic', baseCost: 50, type: 'click', value: 1, icon: <PenTool size={22} className="text-indigo-500" /> },
  { id: 'cafe', name: 'Café de la machine', description: '+5 clics par clic', baseCost: 500, type: 'click', value: 5, icon: <Coffee size={22} className="text-amber-600" /> },
  { id: 'calculatrice', name: 'Calculatrice Casio', description: '+25 clics par clic', baseCost: 5000, type: 'click', value: 25, icon: <Calculator size={22} className="text-gray-500" /> },
  { id: 'livre_maths', name: 'Livre de Maths de 15kg', description: '+100 clics par clic', baseCost: 50000, type: 'click', value: 100, icon: <BookOpen size={22} className="text-blue-500" /> },
  { id: 'blouse', name: 'Blouse blanche tachée', description: '+500 clics par clic', baseCost: 250000, type: 'click', value: 500, icon: <Shirt size={22} className="text-slate-400" /> },
  { id: 'soudure_parfaite', name: 'Soudure à l\'étain parfaite', description: '+10 000 clics par clic', baseCost: 2500000, type: 'click', value: 10000, icon: <Flame size={22} className="text-orange-500" /> },
  { id: 'copion_trousse', name: 'Pompe dans la trousse', description: '+50 000 clics par clic', baseCost: 10000000, type: 'click', value: 50000, icon: <FileText size={22} className="text-yellow-500" /> },
  { id: 'hack_wifi', name: 'Hack du Wi-Fi du lycée', description: '+250 000 clics par clic', baseCost: 50000000, type: 'click', value: 250000, icon: <Wifi size={22} className="text-teal-500" /> },

  // Passif (PPS)
  { id: 'delegue', name: 'Délégué fayot', description: '+1 clic/sec automatique', baseCost: 100, type: 'passive', value: 1, icon: <UserCheck size={22} className="text-orange-500" /> },
  { id: 'numworks', name: 'Numworks', description: '+10 clics/sec', baseCost: 1000, type: 'passive', value: 10, icon: <Smartphone size={22} className="text-yellow-500" /> },
  { id: 'prof_absent', name: 'Prof absent', description: '+100 clics/sec', baseCost: 10000, type: 'passive', value: 100, icon: <PartyPopper size={22} className="text-fuchsia-500" /> },
  { id: 'sujet_fuite', name: 'Sujet de DS fuité sur Discord', description: '+1 500 clics/sec', baseCost: 100000, type: 'passive', value: 1500, icon: <EyeOff size={22} className="text-red-500" /> },
  { id: 'major_promo', name: 'Aspirer l\'âme de d\'Akram', description: '+8 000 clics/sec', baseCost: 500000, type: 'passive', value: 8000, icon: <Ghost size={22} className="text-slate-500 dark:text-slate-300" /> },
  { id: 'corrige_erreur', name: 'Le prof envoie le corrigé par erreur', description: '+40 000 clics/sec', baseCost: 2500000, type: 'passive', value: 40000, icon: <Mail size={22} className="text-sky-500" /> },
  { id: 'cles_lycee', name: 'Rab à la cantine', description: '+250 000 clics/sec', baseCost: 15000000, type: 'passive', value: 250000, icon: <Key size={22} className="text-yellow-600" /> },
  { id: 'parcoursup', name: 'Crida pas là', description: '+1 000 000 clics/sec', baseCost: 100000000, type: 'passive', value: 1000000, icon: <ServerOff size={22} className="text-rose-600" /> },
  { id: 'x_ens', name: 'Intégration directe à l\'X', description: '+10 000 000 clics/sec', baseCost: 1000000000, type: 'passive', value: 10000000, icon: <GraduationCap size={22} className="text-purple-600" /> },
];

export default function MongeClicker() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);

  // State
  const [globalScore, setGlobalScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [pps, setPps] = useState(0);
  const [ownedUpgrades, setOwnedUpgrades] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalClicks, setTotalClicks] = useState(0);

  // Floating numbers
  const [clicks, setClicks] = useState([]);

  // Sync accumulators
  const earnedPointsRef = useRef(0);
  const lastSyncRef = useRef(Date.now());

  // Fetch initial state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/clicker/state', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGlobalScore(parseInt(data.global));
          if (data.user) {
            setPoints(parseInt(data.user.points) || 0);
            setTotalClicks(parseInt(data.user.total_clicks) || 0);
            setClickPower(data.user.click_power || 1);
            setPps(data.user.passive_pps || 0);
            setOwnedUpgrades(data.user.upgrades || []);
          }
        }

        const lbRes = await fetch('/api/clicker/leaderboard', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (lbRes.ok) {
          const lbData = await lbRes.json();
          setLeaderboard(lbData);
        }

      } catch (err) {
        console.error('Failed to fetch clicker state', err);
      } finally {
        setLoading(false);
      }
    };
    fetchState();
  }, []);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('clicker:global_update', (newScore) => {
      setGlobalScore(newScore);
    });

    return () => {
      socket.off('clicker:global_update');
    };
  }, [socket]);

  // Sync loop (every 3 seconds)
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      if (earnedPointsRef.current > 0) {
        const toSync = earnedPointsRef.current;
        earnedPointsRef.current = 0; // Reset accumulator

        try {
          const res = await fetch('/api/clicker/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ earnedPoints: toSync })
          });
          if (!res.ok) {
            // Rollback accumulator if failed
            earnedPointsRef.current += toSync;
          } else {
            // Fetch leaderboard occasionally
            fetch('/api/clicker/leaderboard', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).then(r => r.json()).then(d => setLeaderboard(d)).catch(() => { });
          }
        } catch (err) {
          earnedPointsRef.current += toSync;
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const updateOptimisticLeaderboard = (addedClicks) => {
    setLeaderboard(prev => {
      if (!user) return prev;
      const newLb = [...prev];
      const myIndex = newLb.findIndex(lb => lb.user_id === user.id);
      if (myIndex !== -1) {
        newLb[myIndex] = { ...newLb[myIndex], total_clicks: parseInt(newLb[myIndex].total_clicks) + addedClicks };
      }
      return newLb.sort((a, b) => b.total_clicks - a.total_clicks);
    });
  };

  // Passive income loop (every 1 second)
  useEffect(() => {
    if (pps <= 0 || loading) return;
    const interval = setInterval(() => {
      setPoints(p => p + pps);
      setTotalClicks(t => t + pps);
      setGlobalScore(g => g + pps); // Optimistic UI for global score
      updateOptimisticLeaderboard(pps); // Optimistic UI for leaderboard
      earnedPointsRef.current += pps;
    }, 1000);
    return () => clearInterval(interval);
  }, [pps, loading, user]);

  const handleMainClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add floating number
    const id = Date.now() + Math.random();
    setClicks(prev => [...prev, { id, x, y, value: clickPower }]);

    // Update points
    setPoints(p => p + clickPower);
    setTotalClicks(t => t + clickPower);
    setGlobalScore(g => g + clickPower); // Optimistic UI for global score
    updateOptimisticLeaderboard(clickPower); // Optimistic UI for leaderboard
    earnedPointsRef.current += clickPower;

    // Remove after animation
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== id));
    }, 1000);
  };

  const buyUpgrade = async (upgrade) => {
    const cost = getCost(upgrade);
    if (points < cost) return;

    // Optimistic UI update
    setPoints(p => p - cost);
    setOwnedUpgrades(prev => [...prev, upgrade.id]);
    if (upgrade.type === 'click') setClickPower(p => p + upgrade.value);
    if (upgrade.type === 'passive') setPps(p => p + upgrade.value);

    try {
      const res = await fetch('/api/clicker/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          upgradeId: upgrade.id,
          cost: cost,
          clickPowerBonus: upgrade.type === 'click' ? upgrade.value : 0,
          passivePpsBonus: upgrade.type === 'passive' ? upgrade.value : 0
        })
      });
      if (!res.ok) throw new Error('Achat refusé');
    } catch (err) {
      console.error(err);
      // Revert optimistic update silently
      fetch('/api/clicker/state', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            setPoints(parseInt(data.user.points) || 0);
            setClickPower(data.user.click_power || 1);
            setPps(data.user.passive_pps || 0);
            setOwnedUpgrades(data.user.upgrades || []);
          }
        })
        .catch(() => { });
    }
  };

  const getOwnedCount = (upgradeId) => {
    return ownedUpgrades.filter(id => id === upgradeId).length;
  };

  const getCost = (upgrade) => {
    const count = getOwnedCount(upgrade.id);
    return Math.floor(upgrade.baseCost * Math.pow(1.15, count));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="h-[calc(100vh-80px)] max-w-7xl mx-auto pt-4 pb-4 px-4 flex flex-col">

      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Monge <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Clicker</span>
          </h1>
        </div>

        {/* Global Score Compact Badge */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl py-2 px-5 shadow-lg border border-white/10 flex flex-col items-end">
          <p className="text-indigo-300 font-bold uppercase tracking-wider text-[10px] mb-0.5">Total Lycée</p>
          <div className="text-xl font-black text-white font-mono flex items-center gap-2">
            <Trophy className="text-yellow-400" size={18} />
            {globalScore.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        {/* Main Click Area */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-0">
          <div className="w-full h-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col items-center shrink-0">

            <div className="text-center mb-2 shrink-0">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-xs mb-1">Tes MongeCoins</p>
              <h2 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{points.toLocaleString()}</h2>
              <div className="flex gap-3 justify-center mt-3 text-xs font-semibold">
                <span className="flex items-center gap-1 bg-indigo-50 dark:bg-slate-700/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                  <MousePointer2 size={14} /> {clickPower} PPC
                </span>
                <span className="flex items-center gap-1 bg-orange-50 dark:bg-slate-700/50 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full">
                  <Zap size={14} /> {pps} PPS
                </span>
              </div>
            </div>

            {/* Click Button Area - Flexible height to prevent overflow */}
            <div className="flex-1 flex items-center justify-center w-full relative min-h-0">

              <div
                className="relative select-none cursor-pointer group flex items-center justify-center"
                style={{ width: 'min(100%, 300px)', aspectRatio: '1/1' }}
                onClick={handleMainClick}
              >

                <motion.div
                  whileHover={{ scale: 1.08, rotate: 5 }}
                  whileTap={{ scale: 0.92, rotate: -2 }}
                  animate={{ y: [0, -15, 0] }}
                  transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
                  className="relative z-10 w-full h-full drop-shadow-[0_0_40px_rgba(34,211,238,0.6)] flex items-center justify-center"
                >
                  <img
                    src="/monge_cookie.png"
                    alt="Le Cookie Ultime de la Prépa"
                    className="w-[120%] h-[120%] object-contain pointer-events-none"
                    style={{ filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.5))' }}
                  />
                </motion.div>

                <AnimatePresence>
                  {clicks.map(c => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 1, y: c.y - 20, x: c.x }}
                      animate={{ opacity: 0, y: c.y - 100 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1 }}
                      className="absolute text-2xl font-black text-indigo-600 dark:text-indigo-400 drop-shadow-md pointer-events-none select-none z-50"
                    >
                      +{c.value}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>

        {/* Upgrades Shop */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-0">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50 h-full flex flex-col min-h-0">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text)' }}>
              <Settings className="text-gray-400" /> Boutique
            </h3>

            <div className="flex flex-col flex-1 min-h-0 gap-6">

              {/* Section PPC */}
              <div className="flex flex-col flex-1 min-h-0">
                <h4 className="text-sm font-bold text-indigo-500 mb-2 uppercase tracking-wider shrink-0 flex justify-between items-center">
                  <span>Clic (PPC)</span>
                  <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 px-2 py-0.5 rounded-full text-xs">{clickPower} PPC</span>
                </h4>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                  {UPGRADES.filter(u => u.type === 'click').map(u => {
                    const cost = getCost(u);
                    const count = getOwnedCount(u.id);
                    const canAfford = points >= cost;
                    return (
                      <button
                        key={u.id}
                        onClick={() => buyUpgrade(u)}
                        disabled={!canAfford}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${canAfford
                          ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 hover:scale-[1.02] cursor-pointer'
                          : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl bg-white dark:bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            {u.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--text)' }}>{u.name}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{u.description}</p>
                            <p className={`text-xs font-bold mt-1 ${canAfford ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                              {cost.toLocaleString()} pts
                            </p>
                          </div>
                        </div>
                        <div className="text-xl font-black text-gray-200 dark:text-gray-700 ml-1 shrink-0">
                          {count}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section PPS */}
              <div className="flex flex-col flex-1 min-h-0">
                <h4 className="text-sm font-bold text-orange-500 mb-2 uppercase tracking-wider shrink-0 flex justify-between items-center">
                  <span>Passif (PPS)</span>
                  <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 px-2 py-0.5 rounded-full text-xs">{pps} PPS</span>
                </h4>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                  {UPGRADES.filter(u => u.type === 'passive').map(u => {
                    const cost = getCost(u);
                    const count = getOwnedCount(u.id);
                    const canAfford = points >= cost;
                    return (
                      <button
                        key={u.id}
                        onClick={() => buyUpgrade(u)}
                        disabled={!canAfford}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${canAfford
                          ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-800/50 hover:scale-[1.02] cursor-pointer'
                          : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl bg-white dark:bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                            {u.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--text)' }}>{u.name}</h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{u.description}</p>
                            <p className={`text-xs font-bold mt-1 ${canAfford ? 'text-orange-600 dark:text-orange-400' : 'text-red-500'}`}>
                              {cost.toLocaleString()} pts
                            </p>
                          </div>
                        </div>
                        <div className="text-xl font-black text-gray-200 dark:text-gray-700 ml-1 shrink-0">
                          {count}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50 h-full flex flex-col min-h-0">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text)' }}>
              <Award className="text-yellow-500" /> Top Tryharders
            </h3>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
              {leaderboard.map((lb, index) => (
                <div key={lb.user_id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      }`}>
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <img
                        src={lb.users?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${lb.users?.username}`}
                        alt={lb.users?.username}
                        className="w-8 h-8 rounded-full bg-indigo-100 object-cover"
                      />
                      <span className="text-sm font-semibold truncate max-w-[100px]" style={{ color: 'var(--text)' }}>
                        {lb.users?.username || 'Inconnu'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500">
                    {parseInt(lb.total_clicks).toLocaleString()}
                  </span>
                </div>
              ))}

              {leaderboard.length === 0 && (
                <p className="text-sm text-center text-gray-500">Aucun joueur pour le moment.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
