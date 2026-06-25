import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Clock, MousePointer2, Settings, ArrowLeft, ExternalLink, Award, PenTool, Coffee, Calculator, BookOpen, Shirt, Flame, FileText, Wifi, UserCheck, Smartphone, PartyPopper, EyeOff, Ghost, Mail, Key, ServerOff, GraduationCap, Check, Info, X, Palette } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Link } from 'react-router-dom';
import { UserAvatar } from '../../components/UserAvatar';

const UPGRADES = [
  // Clic (PPC)
  { id: 'stylo', name: 'Stylo Bic mâchouillé', description: '+1 clic par clic', baseCost: 50, type: 'click', value: 1, icon: <PenTool size={22} className="text-indigo-500" /> },
  { id: 'cafe', name: 'Café de la machine', description: '+5 clics par clic', baseCost: 500, type: 'click', value: 5, icon: <Coffee size={22} className="text-amber-600" /> },
  { id: 'calculatrice', name: 'Calculatrice Casio', description: '+25 clics par clic', baseCost: 5000, type: 'click', value: 25, icon: <Calculator size={22} className="text-gray-500" /> },
  { id: 'livre_maths', name: 'Livre de Maths de 15kg', description: '+100 clics par clic', baseCost: 50000, type: 'click', value: 100, icon: <BookOpen size={22} className="text-blue-500" /> },
  { id: 'blouse', name: 'Blouse blanche tachée', description: '+500 clics par clic', baseCost: 250000, type: 'click', value: 500, icon: <Shirt size={22} className="text-[var(--text-muted)]" /> },
  { id: 'soudure_parfaite', name: 'Soudure à l\'étain parfaite', description: '+10 000 clics par clic', baseCost: 2500000, type: 'click', value: 10000, icon: <Flame size={22} className="text-orange-500" /> },
  { id: 'copion_trousse', name: 'Pompe dans la trousse', description: '+50 000 clics par clic', baseCost: 10000000, type: 'click', value: 50000, icon: <FileText size={22} className="text-yellow-500" /> },
  { id: 'hack_wifi', name: 'Hack du Wi-Fi du lycée', description: '+250 000 clics par clic', baseCost: 50000000, type: 'click', value: 250000, icon: <Wifi size={22} className="text-teal-500" /> },

  // Passif (PPS)
  { id: 'delegue', name: 'Délégué fayot', description: '+1 clic/sec automatique', baseCost: 100, type: 'passive', value: 1, icon: <UserCheck size={22} className="text-orange-500" /> },
  { id: 'numworks', name: 'Numworks', description: '+10 clics/sec', baseCost: 1000, type: 'passive', value: 10, icon: <Smartphone size={22} className="text-yellow-500" /> },
  { id: 'prof_absent', name: 'Prof absent', description: '+100 clics/sec', baseCost: 10000, type: 'passive', value: 100, icon: <PartyPopper size={22} className="text-fuchsia-500" /> },
  { id: 'sujet_fuite', name: 'Sujet de DS fuité sur Discord', description: '+1 500 clics/sec', baseCost: 100000, type: 'passive', value: 1500, icon: <EyeOff size={22} className="text-red-500" /> },
  { id: 'major_promo', name: 'Aspirer l\'âme d\'Akram', description: '+8 000 clics/sec', baseCost: 500000, type: 'passive', value: 8000, icon: <Ghost size={22} className="text-slate-500 dark:text-slate-300" /> },
  { id: 'corrige_erreur', name: 'Le prof envoie le corrigé par erreur', description: '+40 000 clics/sec', baseCost: 2500000, type: 'passive', value: 40000, icon: <Mail size={22} className="text-sky-500" /> },
  { id: 'cles_lycee', name: 'Rab à la cantine', description: '+250 000 clics/sec', baseCost: 15000000, type: 'passive', value: 250000, icon: <Key size={22} className="text-yellow-600" /> },
  { id: 'parcoursup', name: 'Crida pas là', description: '+1 000 000 clics/sec', baseCost: 100000000, type: 'passive', value: 1000000, icon: <ServerOff size={22} className="text-rose-600" /> },
  { id: 'x_ens', name: 'Intégration directe à l\'X', description: '+10 000 000 clics/sec', baseCost: 1000000000, type: 'passive', value: 10000000, icon: <GraduationCap size={22} className="text-purple-600" /> },

  // Rebirth / Late Game
  { id: 'ia_quantique', name: 'IA Quantique au CDI', description: '+5 000 000 clics par clic', baseCost: 1000000000, type: 'click', value: 5000000, icon: <Settings size={22} className="text-blue-400" /> },
  { id: 'ferme_minage_cdi', name: 'Ferme de Minage au sous-sol', description: '+25 000 000 clics/sec', baseCost: 5000000000, type: 'passive', value: 25000000, icon: <Settings size={22} className="text-emerald-500" /> },
  { id: 'controle_mental', name: 'Contrôle mental des 1ères années', description: '+100 000 000 clics par clic', baseCost: 50000000000, type: 'click', value: 100000000, icon: <EyeOff size={22} className="text-purple-500" /> },
  { id: 'cerveau_merieux', name: 'Cloner le cerveau de M. Deveaux', description: '+1 000 000 000 clics/sec', baseCost: 250000000000, type: 'passive', value: 1000000000, icon: <Settings size={22} className="text-pink-500" /> },
  { id: 'fusion_monge', name: 'Fusion avec Gaspard Monge', description: '+5 000 000 000 clics par clic', baseCost: 500000000000, type: 'click', value: 5000000000, icon: <Flame size={22} className="text-red-600" /> },
  { id: 'dieu_prepa', name: 'Dieu de la Prépa', description: '+25 000 000 000 clics/sec', baseCost: 5000000000000, type: 'passive', value: 25000000000, icon: <Trophy size={22} className="text-yellow-400" /> },
];

const formatNumber = (num) => {
  if (!num) return '0';
  if (num < 1000000) return num.toLocaleString('fr-FR');
  
  const suffixes = [
    { value: 1e33, symbol: ' Dc' },  // Decillion
    { value: 1e30, symbol: ' No' },  // Nonillion
    { value: 1e27, symbol: ' Oc' },  // Octillion
    { value: 1e24, symbol: ' Sp' },  // Septillion
    { value: 1e21, symbol: ' Sx' },  // Sextillion
    { value: 1e18, symbol: ' Qi' },  // Quintillion
    { value: 1e15, symbol: ' Qa' },  // Quadrillion
    { value: 1e12, symbol: ' T' },   // Trillion
    { value: 1e9, symbol: ' Md' },   // Milliard
    { value: 1e6, symbol: ' M' },    // Million
  ];

  for (let i = 0; i < suffixes.length; i++) {
    if (num >= suffixes[i].value) {
      const formatted = (num / suffixes[i].value).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
      return formatted + suffixes[i].symbol;
    }
  }
  return num.toLocaleString('fr-FR');
};

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
  const [rebirths, setRebirths] = useState(0);
  const [activeTab, setActiveTab] = useState('clicker'); // 'clicker', 'shop', 'leaderboard'
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [showNumberInfo, setShowNumberInfo] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieInputUrl, setCookieInputUrl] = useState('');
  const [customCookie, setCustomCookie] = useState(() => localStorage.getItem('monge_custom_cookie') || '/monge_cookie.png');
  const [sessionId] = useState(() => Date.now() + Math.random());

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image valide.");
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/clicker/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.url) {
        setCustomCookie(data.url);
        localStorage.setItem('monge_custom_cookie', data.url);
        setShowCookieModal(false);
        setCookieInputUrl('');
        
        // Save to DB
        await fetch('/api/clicker/skin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ url: data.url })
        });
      } else {
        alert(data.error || "Erreur lors de l'upload sur le serveur");
      }
    } catch(err) {
      alert("Erreur de connexion lors de l'upload");
    }
  };

  // Prevent multiple tabs using BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('monge_clicker_session');
    
    // Announce we claimed the session
    channel.postMessage({ type: 'claim_session', id: sessionId });

    const handleMessage = (event) => {
      if (event.data.type === 'claim_session') {
        if (event.data.id !== sessionId) {
          // Another tab claimed it! Block this one.
          setSessionBlocked(true);
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [sessionId]);

  const claimSessionHere = () => {
    const channel = new BroadcastChannel('monge_clicker_session');
    channel.postMessage({ type: 'claim_session', id: sessionId });
    channel.close();
    setSessionBlocked(false);
  };

  // Floating numbers
  const [clicks, setClicks] = useState([]);

  // Sync accumulators
  const earnedPointsRef = useRef(0);
  const clickTimestampsRef = useRef([]);
  const [overheating, setOverheating] = useState(false);

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
            setRebirths(parseInt(data.user.rebirths) || 0);
            if (data.user.custom_cookie_url) {
              setCustomCookie(data.user.custom_cookie_url);
              localStorage.setItem('monge_custom_cookie', data.user.custom_cookie_url);
            } else {
              setCustomCookie('/monge_cookie.png');
              localStorage.removeItem('monge_custom_cookie');
            }
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
    if (pps <= 0 || loading || sessionBlocked) return;
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
    // 1. Block programmatic/simulated clicks
    if (!e.isTrusted) return;

    const now = Date.now();

    // 2. Limit CPS (Clicks Per Second) to prevent auto-clickers
    // Keep only timestamps from the last 1000ms
    clickTimestampsRef.current = clickTimestampsRef.current.filter(t => now - t < 1000);
    
    if (clickTimestampsRef.current.length >= 15) { // Max 15 CPS
      if (!overheating) {
        setOverheating(true);
        // Cool down period of 2 seconds
        setTimeout(() => setOverheating(false), 2000);
      }
      return; // Ignore the click
    }

    if (overheating) return; // Still cooling down
    clickTimestampsRef.current.push(now);

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
    if (getOwnedCount(upgrade.id) >= 100) return;
    const cost = getCost(upgrade);
    if (points < cost) return;

    // Optimistic UI
    setPoints(prev => prev - cost);
    setOwnedUpgrades(prev => [...prev, upgrade.id]);

    // Le multiplicateur est géré par le backend pour la persistance,
    // mais le frontend passe les valeurs de base pour que le backend les multiplie !
    if (upgrade.type === 'click') {
      setClickPower(prev => prev + (upgrade.value * (1 + rebirths)));
    } else {
      setPps(prev => prev + (upgrade.value * (1 + rebirths)));
    }

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

      if (!res.ok) {
        // Simple rollback if error (reload state)
        const stateRes = await fetch('/api/clicker/state', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await stateRes.json();
        setPoints(parseInt(data.user.points) || 0);
        setClickPower(data.user.click_power || 1);
        setPps(data.user.passive_pps || 0);
        setOwnedUpgrades(data.user.upgrades || []);
      }
    } catch (err) {
      console.error('Failed to buy upgrade', err);
    }
  };

  const handleRebirth = async () => {
    const rebirthCost = 1000000000000 * Math.pow(10, rebirths);
    if (points < rebirthCost) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir faire un Rebirth ? Vous allez perdre tous vos MongeCoins et améliorations actuelles, mais votre force de frappe de base et vos futurs gains seront multipliés par ${rebirths + 2} !`)) return;

    // Optimistically reset to prevent intervals from adding massive points to earnedPointsRef
    setPoints(0);
    setPps(0);
    setOwnedUpgrades([]);
    earnedPointsRef.current = 0;

    try {
      const res = await fetch('/api/clicker/rebirth', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPoints(0);
        setClickPower(data.user.click_power);
        setPps(0);
        setOwnedUpgrades([]);
        setRebirths(data.user.rebirths);
        earnedPointsRef.current = 0; // Double ensure
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderUpgrades = (type) => {
    const list = UPGRADES.filter(u => u.type === type);
    const firstUnownedIndex = list.findIndex(u => getOwnedCount(u.id) === 0);
    const rebirthMultiplier = 1 + rebirths;

    return list.map((u, index) => {
      const count = getOwnedCount(u.id);
      const isOwned = count > 0;
      const isFirstUnowned = index === firstUnownedIndex;
      const isMax = count >= 100;

      // Masquer totalement les upgrades futurs
      if (!isOwned && !isFirstUnowned && firstUnownedIndex !== -1 && index > firstUnownedIndex) {
        return null;
      }

      const cost = getCost(u);
      const canAfford = points >= cost;
      const isMystery = isFirstUnowned && !canAfford;
      const actualValue = u.value * rebirthMultiplier;
      const isClick = type === 'click';

      const borderBgColor = canAfford && !isMystery && !isMax
        ? (isClick ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 hover:scale-[1.02] cursor-pointer' : 'border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-800/50 hover:scale-[1.02] cursor-pointer')
        : isMax 
          ? 'border-gray-200 dark:border-[var(--border)] bg-green-50 dark:bg-green-900/10 opacity-80 cursor-not-allowed'
          : 'border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--surface-2)]/50 opacity-60 cursor-not-allowed';

      const textColor = isMax 
        ? 'text-green-600 dark:text-green-500'
        : canAfford && !isMystery
          ? (isClick ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400')
          : 'text-red-500';

      return (
        <button
          key={u.id}
          onClick={() => !isMystery && !isMax && buyUpgrade(u)}
          disabled={!canAfford || isMystery || isMax}
          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${borderBgColor}`}
        >
          <div className="flex items-center gap-3">
            <div className={`text-2xl bg-white dark:bg-slate-700 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 font-bold ${isMax ? 'text-green-500' : 'text-gray-400'}`}>
              {isMystery ? '?' : (isMax ? <Check size={20} /> : u.icon)}
            </div>
            <div>
              <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--text)' }}>
                {isMystery ? '???' : u.name}
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-[var(--text-muted)] leading-tight mt-0.5">
                {isMystery ? 'Revenez quand vous serez plus riche !' : isMax ? 'Niveau maximum atteint' : `+${formatNumber(actualValue)} ${isClick ? 'par clic' : 'clics/sec'}`}
              </p>
              <p className={`text-xs font-bold mt-1 ${textColor}`}>
                {isMax ? 'MAX' : `${formatNumber(cost)} pts`}
              </p>
            </div>
          </div>
          <div className={`text-xl font-black ml-1 shrink-0 ${isMax ? 'text-green-500' : 'text-gray-200 dark:text-gray-700'}`}>
            {count > 0 ? (isMax ? 'MAX' : count) : ''}
          </div>
        </button>
      );
    });
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

  if (sessionBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-70px)] p-6 text-center bg-gray-50/50 dark:bg-[#121212] backdrop-blur-sm z-50">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md border border-red-100 dark:border-red-900/30">
          <ServerOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Session suspendue</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Le MongeClicker est ouvert dans un autre onglet. Pour éviter la triche ou les conflits de sauvegarde, une seule session peut être active à la fois !
          </p>
          <button 
            onClick={claimSessionHere}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md active:scale-95"
          >
            Reprendre la partie ici
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-70px)] lg:h-[calc(100vh-80px)] max-w-7xl mx-auto pt-2 pb-2 px-3 lg:pt-4 lg:pb-4 lg:px-4 flex flex-col overflow-hidden">

      {/* Compact Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/outils" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            Monge <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Clicker</span>
          </h1>
        </div>

        {/* Global Score Compact Badge */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl py-2 px-4 shadow-lg border border-white/10 flex flex-col items-center md:items-end self-center md:self-auto w-full md:w-auto">
          <p className="text-indigo-300 font-bold uppercase tracking-wider text-[10px] mb-0.5">Total Lycée</p>
          <div className="text-lg lg:text-xl font-black text-[var(--text)] font-mono flex items-center gap-2">
            <Trophy className="text-yellow-400" size={16} />
            {formatNumber(globalScore)}
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex lg:hidden bg-white dark:bg-[var(--surface-2)] p-1 rounded-2xl mb-4 shrink-0 shadow-sm border border-gray-100 dark:border-[var(--border)]/50">
        <button
          onClick={() => setActiveTab('clicker')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'clicker' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 dark:text-[var(--text-muted)]'}`}
        >
          <MousePointer2 className="w-4 h-4 mx-auto mb-1" />
          Clicker
        </button>
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'shop' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500 dark:text-[var(--text-muted)]'}`}
        >
          <Settings className="w-4 h-4 mx-auto mb-1" />
          Boutique
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'leaderboard' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-500 dark:text-[var(--text-muted)]'}`}
        >
          <Award className="w-4 h-4 mx-auto mb-1" />
          Top
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden w-full">

        {/* Main Click Area */}
        <div className={`lg:col-span-5 flex-col h-full min-h-0 w-full ${activeTab === 'clicker' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="w-full h-full bg-white dark:bg-[var(--surface-2)] rounded-3xl p-4 lg:p-6 shadow-sm border border-gray-100 dark:border-[var(--border)]/50 flex flex-col items-center min-h-0">

            <div className="text-center mb-2 shrink-0">
              <p className="text-gray-500 font-semibold uppercase tracking-wider text-xs mb-1 flex items-center justify-center gap-1">
                Tes MongeCoins
                <button onClick={() => setShowNumberInfo(true)} className="text-gray-400 hover:text-indigo-500 transition-colors" title="Informations sur les grands nombres">
                  <Info size={14} />
                </button>
                <button onClick={() => {
                  setCookieInputUrl(customCookie === '/monge_cookie.png' ? '' : customCookie);
                  setShowCookieModal(true);
                }} className="text-gray-400 hover:text-pink-500 transition-colors" title="Changer l'apparence du cookie">
                  <Palette size={14} />
                </button>
              </p>
              <h2 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{formatNumber(points)}</h2>
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
                className={`relative select-none cursor-pointer group flex items-center justify-center transition-all ${overheating ? 'grayscale brightness-50' : ''}`}
                style={{ width: 'min(100%, 300px)', aspectRatio: '1/1' }}
                onClick={handleMainClick}
              >

                <motion.div
                  whileHover={!overheating ? { scale: 1.08, rotate: 5 } : {}}
                  whileTap={!overheating ? { scale: 0.92, rotate: -2 } : {}}
                  animate={overheating ? { x: [-5, 5, -5, 5, 0], transition: { repeat: Infinity, duration: 0.2 } } : { y: [0, -15, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
                  className={`relative z-10 w-full h-full flex items-center justify-center ${overheating ? 'drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]'}`}
                >
                  <img
                    src={customCookie}
                    alt="Le Cookie Ultime de la Prépa"
                    className="w-[120%] h-[120%] object-contain pointer-events-none"
                    style={{ filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.5))' }}
                    onError={(e) => { e.target.src = '/monge_cookie.png'; }}
                  />
                  {overheating && (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-50 transform rotate-12 bg-black/40 rounded-full">
                      SURCHAUFFE !
                    </div>
                  )}
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
                      +{formatNumber(c.value)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>

        {/* Upgrades Shop */}
        <div className={`lg:col-span-4 flex-col h-full min-h-0 w-full ${activeTab === 'shop' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="w-full bg-white dark:bg-[var(--surface-2)] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[var(--border)]/50 h-full flex flex-col min-h-0">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text)' }}>
              <Settings className="text-[var(--text-muted)]" /> Boutique
            </h3>

            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 gap-6">

              {/* Section PPC */}
              <div className="flex flex-col shrink-0">
                <h4 className="text-sm font-bold text-indigo-500 mb-2 uppercase tracking-wider shrink-0 flex justify-between items-center">
                  <span>Clic (PPC)</span>
                  <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 px-2 py-0.5 rounded-full text-xs">{formatNumber(clickPower)} PPC</span>
                </h4>
                <div className="space-y-3 shrink-0">
                  {renderUpgrades('click')}
                </div>
              </div>

              {/* Section PPS */}
              <div className="flex flex-col shrink-0">
                <h4 className="text-sm font-bold text-orange-500 mb-2 uppercase tracking-wider shrink-0 flex justify-between items-center">
                  <span>Passif (PPS)</span>
                  <span className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 px-2 py-0.5 rounded-full text-xs">{formatNumber(pps)} PPS</span>
                </h4>
                <div className="space-y-3 shrink-0">
                  {renderUpgrades('passive')}
                </div>
              </div>

              {/* Rebirth Section */}
              <div className="pt-4 border-t dark:border-[var(--border)] shrink-0 mt-2">
                {points >= 1000000000000 * Math.pow(10, rebirths) ? (
                  <motion.button
                    animate={{
                      scale: [1, 1.02, 1],
                      boxShadow: ["0px 0px 0px rgba(239,68,68,0)", "0px 0px 25px rgba(249,115,22,0.8)", "0px 0px 0px rgba(239,68,68,0)"]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    onClick={handleRebirth}
                    className="w-full flex flex-col items-center justify-center gap-1 p-4 rounded-2xl font-black bg-gradient-to-r from-red-600 to-orange-500 text-white cursor-pointer border border-red-400"
                  >
                    <div className="flex items-center gap-2 text-lg">
                      <Flame size={24} className="animate-pulse" />
                      FAIRE UN REBIRTH !
                      <Flame size={24} className="animate-pulse" />
                    </div>
                    <span className="text-xs font-medium opacity-90 font-normal">
                      Multipliez vos futurs gains par {rebirths + 2} !
                    </span>
                  </motion.button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl font-bold transition-all bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed"
                  >
                    <Flame size={20} />
                    Rebirth ({formatNumber(1000000000000 * Math.pow(10, rebirths))} pts)
                  </button>
                )}
                <p className="text-center text-[10px] text-gray-500 mt-2 font-semibold uppercase tracking-widest pb-4">Niveau actuel : {rebirths}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className={`lg:col-span-3 flex-col h-full min-h-0 w-full ${activeTab === 'leaderboard' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="w-full bg-white dark:bg-[var(--surface-2)] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-[var(--border)]/50 h-full flex flex-col min-h-0">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 shrink-0" style={{ color: 'var(--text)' }}>
              <Award className="text-yellow-500" /> Top Tryharders
            </h3>

            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
              {leaderboard.map((lb, index) => (
                <div key={lb.user_id} className="flex items-center justify-between group py-1">
                  
                  {/* Gauche : Rang + Avatar + Nom */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                    <span className={`w-7 h-7 shrink-0 flex-none rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 dark:bg-slate-700 text-gray-500'
                      }`}>
                      {index + 1}
                    </span>
                    <UserAvatar user={lb.users} size={28} />
                    <span className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: 'var(--text)' }}>
                      {lb.users?.username || 'Inconnu'}
                    </span>
                  </div>

                  {/* Droite : Rebirth + Score alignés */}
                  <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 ml-1 sm:ml-2">
                    <div className="w-8 sm:w-10 flex justify-end shrink-0">
                      {parseInt(lb.rebirths) > 0 && (
                        <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
                          <Flame size={10} /> {lb.rebirths}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-16 sm:w-20 text-right truncate shrink-0" title={formatNumber(parseInt(lb.total_clicks))}>
                      {formatNumber(parseInt(lb.total_clicks))}
                    </span>
                  </div>

                </div>
              ))}

              {leaderboard.length === 0 && (
                <p className="text-sm text-center text-gray-500">Aucun joueur pour le moment.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Number Info Modal */}
      <AnimatePresence>
        {showNumberInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                  <Info className="text-indigo-500" size={20} />
                  Format des Nombres
                </h3>
                <button onClick={() => setShowNumberInfo(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">M</span><span>Million (10⁶)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Md</span><span>Milliard (10⁹)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">T</span><span>Trillion (10¹²)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Qa</span><span>Quadrillion (10¹⁵)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Qi</span><span>Quintillion (10¹⁸)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Sx</span><span>Sextillion (10²¹)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Sp</span><span>Septillion (10²⁴)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">Oc</span><span>Octillion (10²⁷)</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                  <span className="font-bold">No</span><span>Nonillion (10³⁰)</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="font-bold">Dc</span><span>Decillion (10³³)</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Custom Cookie Modal */}
      <AnimatePresence>
        {showCookieModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-gray-100 dark:border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                  <Palette className="text-pink-500" size={20} />
                  Skin Personnalisé
                </h3>
                <button onClick={() => setShowCookieModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Importe une image depuis ton appareil ou colle une URL !
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 dark:file:bg-slate-700 dark:file:text-pink-300 dark:hover:file:bg-slate-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></span>
                    <span>OU URL CLASSIQUE</span>
                    <span className="flex-1 h-px bg-gray-200 dark:bg-slate-700"></span>
                  </div>
                  <input
                    type="text"
                    value={cookieInputUrl}
                    onChange={(e) => setCookieInputUrl(e.target.value)}
                    placeholder="https://..."
                    className="tsi-input w-full"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button 
                    onClick={async () => {
                      setCustomCookie('/monge_cookie.png');
                      localStorage.removeItem('monge_custom_cookie');
                      setShowCookieModal(false);
                      try {
                        await fetch('/api/clicker/skin', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: JSON.stringify({ url: null })
                        });
                      } catch(e) {}
                    }}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Réinitialiser
                  </button>
                  <button 
                    onClick={async () => {
                      if (cookieInputUrl.trim()) {
                        const newUrl = cookieInputUrl.trim();
                        setCustomCookie(newUrl);
                        localStorage.setItem('monge_custom_cookie', newUrl);
                        setShowCookieModal(false);
                        try {
                          await fetch('/api/clicker/skin', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ url: newUrl })
                          });
                        } catch(e) {}
                      } else {
                        setShowCookieModal(false);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
