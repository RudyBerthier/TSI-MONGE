import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

const LAT = 45.5646;
const LON = 5.9178;

/* ═══════════════════════════════════════════════════════════════
   Custom SVG Weather Icons
   ═══════════════════════════════════════════════════════════════ */

const SunIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="14" fill="#FBBF24" />
        <circle cx="32" cy="32" r="14" fill="url(#sunGlow)" opacity="0.4" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
            <line key={a} x1="32" y1="8" x2="32" y2="14" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"
                transform={`rotate(${a} 32 32)`} />
        ))}
        <defs><radialGradient id="sunGlow"><stop offset="0%" stopColor="#FDE68A" /><stop offset="100%" stopColor="#FBBF24" /></radialGradient></defs>
    </svg>
);

const PartlySunIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="28" cy="22" r="10" fill="#FBBF24" />
        {[0, 60, 120, 180, 240, 300].map(a => (
            <line key={a} x1="28" y1="6" x2="28" y2="10" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"
                transform={`rotate(${a} 28 22)`} />
        ))}
        <ellipse cx="34" cy="38" rx="18" ry="10" fill="#94A3B8" opacity="0.9" />
        <ellipse cx="26" cy="34" rx="10" ry="8" fill="#CBD5E1" />
        <ellipse cx="40" cy="35" rx="9" ry="7" fill="#B0BEC5" />
    </svg>
);

const CloudIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="36" rx="20" ry="12" fill="#94A3B8" />
        <ellipse cx="24" cy="30" rx="12" ry="10" fill="#CBD5E1" />
        <ellipse cx="40" cy="32" rx="11" ry="9" fill="#B0BEC5" />
        <ellipse cx="32" cy="28" rx="8" ry="7" fill="#E2E8F0" />
    </svg>
);

const RainIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="26" rx="18" ry="10" fill="#94A3B8" />
        <ellipse cx="24" cy="22" rx="10" ry="8" fill="#CBD5E1" />
        <ellipse cx="38" cy="23" rx="9" ry="7" fill="#B0BEC5" />
        {[[22, 42], [28, 46], [34, 42], [40, 48]].map(([x, y], i) => (
            <line key={i} x1={x} y1={y - 6} x2={x - 2} y2={y} stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" opacity={0.7 + i * 0.08} />
        ))}
    </svg>
);

const HeavyRainIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="22" rx="18" ry="10" fill="#64748B" />
        <ellipse cx="24" cy="18" rx="10" ry="8" fill="#94A3B8" />
        <ellipse cx="38" cy="19" rx="9" ry="7" fill="#78909C" />
        {[[20, 40], [26, 44], [32, 40], [38, 46], [44, 42]].map(([x, y], i) => (
            <line key={i} x1={x} y1={y - 8} x2={x - 3} y2={y} stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" opacity={0.8} />
        ))}
    </svg>
);

const DrizzleIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="26" rx="18" ry="10" fill="#94A3B8" />
        <ellipse cx="24" cy="22" rx="10" ry="8" fill="#CBD5E1" />
        <ellipse cx="38" cy="23" rx="9" ry="7" fill="#B0BEC5" />
        {[[26, 40], [34, 44], [42, 40]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.5" fill="#93C5FD" />
        ))}
        {[[22, 46], [30, 48], [38, 46]].map(([x, y], i) => (
            <circle key={i + 3} cx={x} cy={y} r="1.5" fill="#93C5FD" opacity="0.6" />
        ))}
    </svg>
);

const SnowIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="24" rx="18" ry="10" fill="#CBD5E1" />
        <ellipse cx="24" cy="20" rx="10" ry="8" fill="#E2E8F0" />
        <ellipse cx="38" cy="21" rx="9" ry="7" fill="#D1D5DB" />
        {[[24, 40], [32, 44], [40, 40], [28, 50], [36, 48]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x},${y})`}>
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="-3" y1="0" x2="3" y2="0" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="-2" y1="-2" x2="2" y2="2" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
                <line x1="2" y1="-2" x2="-2" y2="2" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
            </g>
        ))}
    </svg>
);

const ThunderIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="20" rx="18" ry="10" fill="#64748B" />
        <ellipse cx="24" cy="16" rx="10" ry="8" fill="#475569" />
        <ellipse cx="38" cy="17" rx="9" ry="7" fill="#4B5563" />
        <polygon points="34,28 28,40 33,40 29,54 42,36 36,36 40,28" fill="#FBBF24" />
        <polygon points="34,28 28,40 33,40 29,54 42,36 36,36 40,28" fill="url(#boltGlow)" opacity="0.5" />
        <defs><linearGradient id="boltGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FDE68A" /><stop offset="100%" stopColor="#F59E0B" /></linearGradient></defs>
    </svg>
);

const FogIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {[20, 28, 36, 44].map((y, i) => (
            <line key={i} x1={12 + i * 2} y1={y} x2={52 - i * 2} y2={y} stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" opacity={0.4 + i * 0.15} />
        ))}
    </svg>
);

const WindyIcon = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <path d="M12 24 C20 24, 28 18, 36 18 C44 18, 44 28, 36 28" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M8 34 C18 34, 24 28, 34 28 C42 28, 48 28, 48 34 C48 40, 42 40, 38 36" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M16 44 C24 44, 30 38, 40 38 C46 38, 46 46, 40 46" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
);

const WMO = {
    0: { label: 'Ciel dégagé', Icon: SunIcon, color: '#FBBF24' },
    1: { label: 'Peu nuageux', Icon: PartlySunIcon, color: '#FCD34D' },
    2: { label: 'Partiellement nuageux', Icon: PartlySunIcon, color: '#9CA3AF' },
    3: { label: 'Couvert', Icon: CloudIcon, color: '#6B7280' },
    45: { label: 'Brouillard', Icon: FogIcon, color: '#9CA3AF' },
    48: { label: 'Brouillard givrant', Icon: FogIcon, color: '#93C5FD' },
    51: { label: 'Bruine légère', Icon: DrizzleIcon, color: '#60A5FA' },
    53: { label: 'Bruine', Icon: DrizzleIcon, color: '#3B82F6' },
    55: { label: 'Bruine forte', Icon: DrizzleIcon, color: '#2563EB' },
    61: { label: 'Pluie légère', Icon: RainIcon, color: '#60A5FA' },
    63: { label: 'Pluie', Icon: RainIcon, color: '#3B82F6' },
    65: { label: 'Pluie forte', Icon: HeavyRainIcon, color: '#1D4ED8' },
    66: { label: 'Pluie verglaçante', Icon: RainIcon, color: '#93C5FD' },
    67: { label: 'Pluie verglaçante forte', Icon: HeavyRainIcon, color: '#60A5FA' },
    71: { label: 'Neige légère', Icon: SnowIcon, color: '#BFDBFE' },
    73: { label: 'Neige', Icon: SnowIcon, color: '#93C5FD' },
    75: { label: 'Neige forte', Icon: SnowIcon, color: '#60A5FA' },
    77: { label: 'Grains de neige', Icon: SnowIcon, color: '#DBEAFE' },
    80: { label: 'Averses', Icon: RainIcon, color: '#60A5FA' },
    81: { label: 'Averses', Icon: RainIcon, color: '#3B82F6' },
    82: { label: 'Averses violentes', Icon: HeavyRainIcon, color: '#1D4ED8' },
    85: { label: 'Averses de neige', Icon: SnowIcon, color: '#93C5FD' },
    86: { label: 'Averses de neige forte', Icon: SnowIcon, color: '#60A5FA' },
    95: { label: 'Orage', Icon: ThunderIcon, color: '#A78BFA' },
    96: { label: 'Orage grêle', Icon: ThunderIcon, color: '#8B5CF6' },
    99: { label: 'Orage forte grêle', Icon: ThunderIcon, color: '#7C3AED' },
};

const getW = (code) => WMO[code] || { label: 'Inconnu', Icon: CloudIcon, color: '#9CA3AF' };

const uvLevel = (uv) => {
    if (uv <= 2) return { label: 'Faible', color: '#22C55E', desc: 'Risque minimal. Pas de protection nécessaire.' };
    if (uv <= 5) return { label: 'Modéré', color: '#FBBF24', desc: 'Protection recommandée : lunettes, chapeau.' };
    if (uv <= 7) return { label: 'Élevé', color: '#F97316', desc: 'Protection nécessaire. Éviter le soleil entre 12h-16h.' };
    if (uv <= 10) return { label: 'Très élevé', color: '#EF4444', desc: 'Rester à l\'ombre. Crème solaire indispensable.' };
    return { label: 'Extrême', color: '#7C3AED', desc: 'Danger ! Éviter toute exposition.' };
};

const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const windDir = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round((deg || 0) / 45) % 8];

/* ═══ SVG Temperature Curve ═══ */
function TempCurve({ data, height = 110 }) {
    const [hoverIdx, setHoverIdx] = React.useState(null);
    const containerRef = React.useRef(null);
    const [width, setWidth] = React.useState(0);
    
    React.useLayoutEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => {
            setWidth(entries[0].contentRect.width);
        });
        obs.observe(containerRef.current);
        setWidth(containerRef.current.clientWidth);
        return () => obs.disconnect();
    }, []);
    
    if (!data || data.length < 2) return null;
    
    // Draw empty container while measuring
    if (width === 0) return <div ref={containerRef} style={{ width: '100%', height: height + 50 }} />;

    const temps = data.map(d => d.temp);
    const minT = Math.min(...temps) - 1;
    const maxT = Math.max(...temps) + 1;
    const range = maxT - minT || 1;
    const padX = 15, padY = 30; // internal scale padding
    const graphW = width - padX * 2;
    const graphH = height - padY * 2;

    const points = data.map((d, i) => ({
        x: padX + (i / (data.length - 1)) * graphW,
        y: padY + graphH - ((d.temp - minT) / range) * graphH,
        temp: d.temp,
        hour: d.hour,
        precip: d.precip,
        code: d.code
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 3;
        const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) / 3;
        path += ` C ${cp1x} ${points[i].y}, ${cp2x} ${points[i + 1].y}, ${points[i + 1].x} ${points[i + 1].y}`;
    }
    const fillPath = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    const handlePointerMove = (clientX, target) => {
        const rect = target.getBoundingClientRect();
        const x = clientX - rect.left;
        
        const colWidth = graphW / (points.length - 1 || 1);
        let closest = -1;
        let minD = Infinity;
        points.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < minD && d < colWidth * 1.5) { // generous target
                minD = d;
                closest = i;
            }
        });
        if (closest !== -1) setHoverIdx(closest);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: height + 50, touchAction: 'pan-y' }}
            onMouseLeave={() => setHoverIdx(null)}
            onTouchEnd={() => setHoverIdx(null)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget)}
            onTouchStart={(e) => handlePointerMove(e.touches[0].clientX, e.currentTarget)}
            onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.currentTarget)}
        >
            {/* The SVG Layer */}
            <svg
                width={width} height={height} viewBox={`0 0 ${width} ${height}`}
                style={{ overflow: 'visible', userSelect: 'none', position: 'absolute', top: 0, left: 0 }}
            >
                <defs>
                    <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                <path d={fillPath} fill="url(#curveFill)" />
                <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {points.map((p, i) => {
                    const isHovered = hoverIdx === i;
                    return (
                        <g key={i}>
                            {!isHovered && <circle cx={p.x} cy={p.y} r="2.5" fill="var(--accent)" style={{ transition: 'all 0.2s' }} />}
                            
                            {isHovered && (
                                <g>
                                    <line x1={p.x} y1={p.y} x2={p.x} y2={height + 40} stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                                    <circle cx={p.x} cy={p.y} r="6" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" filter="url(#glow)" />
                                    <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="16" fontWeight="bold" fill="var(--text)" style={{ pointerEvents: 'none' }}>
                                        {p.temp}°
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
            
            {/* HTML overlays for weather icons and hours, using absolute positioning */}
            <div style={{ position: 'absolute', top: height - 10, left: 0, width: '100%', height: '50px', pointerEvents: 'none' }}>
                {data.map((h, i) => {
                    const hW = getW(h.code);
                    const HIcon = hW.Icon;
                    const isHovered = hoverIdx === i;
                    
                    // On mobile we might only fit max 6 labels comfortably.
                    const showIcon = i % 4 === 0 || i === data.length - 1; 

                    return (
                        <div 
                            key={i} 
                            style={{ 
                                position: 'absolute', 
                                left: `${(points[i].x / width) * 100}%`, 
                                transform: `translateX(-50%) scale(${isHovered ? 1.15 : 1})`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                opacity: (showIcon || isHovered) ? 1 : 0,
                                transition: 'all 0.2s ease-out',
                                zIndex: isHovered ? 10 : 1
                            }}
                        >
                            {h.precip > 0 && isHovered && (
                                <span className="text-[10px] font-bold mb-0.5" style={{ color: '#60A5FA' }}>{h.precip}%</span>
                            )}
                            <HIcon size={isHovered ? 26 : 22} />
                            <span 
                                style={{ 
                                    fontSize: isHovered ? '0.75rem' : '0.65rem', 
                                    fontWeight: isHovered ? 'bold' : '600',
                                    color: (isHovered || showIcon) ? 'var(--text)' : 'var(--text-muted)',
                                    marginTop: '2px' 
                                }}
                            >
                                {isHovered ? `${h.temp}°` : h.hour}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ═══ Glass Card styled with theme ═══ */
const Card = ({ children, className = '', label, icon: LabelIcon, ...props }) => (
    <div
        className={`rounded-2xl p-4 ${className}`}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
        {...props}
    >
        {label && (
            <div className="flex items-center gap-1.5 mb-3">
                {LabelIcon && <LabelIcon size={12} style={{ color: 'var(--text-muted)' }} />}
                <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
        )}
        {children}
    </div>
);

/* ═══ UV Gauge ═══ */
function UVGauge({ value, max = 11 }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div className="mt-2">
            <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 3, width: `${pct}%`,
                    background: 'linear-gradient(90deg, #22C55E, #FBBF24, #F97316, #EF4444, #7C3AED)',
                }} />
            </div>
        </div>
    );
}

/* ═══ Sun Arc ═══ */
function SunArc({ sunrise, sunset, now }) {
    if (!sunrise || !sunset) return null;
    const riseMs = new Date(sunrise).getTime();
    const setMs = new Date(sunset).getTime();
    const pct = Math.max(0, Math.min(1, (now.getTime() - riseMs) / (setMs - riseMs)));
    const isDay = pct > 0 && pct < 1;
    const w = 200, h = 100, cx = w / 2, cy = h - 10, r = 85;
    const sunAngle = Math.PI + Math.PI * pct;
    const sunX = cx + r * Math.cos(sunAngle);
    const sunY = cy + r * Math.sin(sunAngle);

    return (
        <div className="flex flex-col items-center">
            <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ height: 'auto', maxWidth: 200 }}>
                <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
                {isDay && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`} fill="none" stroke="#FBBF24" strokeWidth="2" />}
                <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="var(--border)" strokeWidth="1" />
                {isDay && <circle cx={sunX} cy={sunY} r="6" fill="#FBBF24" style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }} />}
            </svg>
            <div className="flex justify-between w-full px-2 mt-1">
                <div className="text-center">
                    <div className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>Lever</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{fmt(sunrise)}</div>
                </div>
                <div className="text-center">
                    <div className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>Coucher</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{fmt(sunset)}</div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export function Meteo() {
    const navigate = useNavigate();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cached = localStorage.getItem('tsi_weather_full_cache');
        if (cached) {
            try {
                const { data, ts } = JSON.parse(cached);
                if (Date.now() - ts < 10 * 60 * 1000) { setWeather(data); setLoading(false); return; }
            } catch { }
        }
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation_probability,uv_index,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max,precipitation_sum,wind_speed_10m_max,precipitation_probability_max&timezone=Europe/Paris&forecast_days=7`)
            .then(r => r.json())
            .then(data => {
                setWeather(data);
                localStorage.setItem('tsi_weather_full_cache', JSON.stringify({ data, ts: Date.now() }));
            })
            .catch(() => { if (cached) try { setWeather(JSON.parse(cached).data); } catch { } })
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const currentHour = now.getHours();

    const hourlyData = useMemo(() => {
        if (!weather?.hourly) return [];
        const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(currentHour).padStart(2, '0')}:00`;
        const startIdx = weather.hourly.time.indexOf(nowStr);
        if (startIdx < 0) return [];
        const items = [];
        for (let i = 0; i < 24 && startIdx + i < weather.hourly.time.length; i++) {
            const idx = startIdx + i;
            items.push({
                hour: i === 0 ? 'Mtn' : weather.hourly.time[idx].split('T')[1].substring(0, 5),
                temp: Math.round(weather.hourly.temperature_2m[idx]),
                code: weather.hourly.weather_code[idx],
                precip: weather.hourly.precipitation_probability?.[idx] || 0,
            });
        }
        return items;
    }, [weather, currentHour]);

    if (loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="animate-pulse text-lg font-medium" style={{ color: 'var(--text-muted)' }}>Chargement météo...</div>
            </div>
        );
    }

    if (!weather?.current) return null;

    const cur = weather.current;
    const daily = weather.daily;
    const hourly = weather.hourly;
    const info = getW(cur.weather_code);
    const CurIcon = info.Icon;

    const uvMax = daily?.uv_index_max?.[0] || 0;
    const uvInfo = uvLevel(uvMax);

    const nowHourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(currentHour).padStart(2, '0')}:00`;
    const visIdx = hourly?.time?.indexOf(nowHourStr);
    const visibility = visIdx >= 0 && hourly?.visibility ? (hourly.visibility[visIdx] / 1000).toFixed(1) : null;

    return (
        <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>
            <div style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }} />

            <div className="max-w-lg mx-auto px-5">
                <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={16} /> Retour
                </button>
            </div>

            {/* ═══ Hero ═══ */}
            <div className="text-center px-5 mb-8">
                <div className="flex items-center justify-center gap-1.5 mb-3" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={13} />
                    <span className="text-sm font-medium tracking-wide">Chambéry</span>
                </div>
                <div className="flex justify-center mb-2">
                    <CurIcon size={72} />
                </div>
                <div className="text-8xl font-extralight tracking-tighter leading-none" style={{ color: 'var(--text)', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {Math.round(cur.temperature_2m)}°
                </div>
                <p className="text-lg font-semibold mt-2" style={{ color: info.color }}>{info.label}</p>
                {daily && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        H:{Math.round(daily.temperature_2m_max[0])}°  L:{Math.round(daily.temperature_2m_min[0])}°
                    </p>
                )}
            </div>

            {/* ═══ Hourly Forecast ═══ */}
            <div className="max-w-lg mx-auto px-5 mb-6 mt-2 relative z-10 block">
                <Card label="Prévisions horaires" className="pt-5 overflow-visible">
                    <TempCurve data={hourlyData} height={110} />
                </Card>
            </div>

            {/* ═══ 7-Day Forecast ═══ */}
            <div className="max-w-lg mx-auto px-5 mb-4">
                <Card label="Prévisions 7 jours">
                    {daily?.time?.map((date, i) => {
                        const dInfo = getW(daily.weather_code[i]);
                        const DIcon = dInfo.Icon;
                        const isToday = i === 0;
                        const dayName = isToday ? 'Auj.' : new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
                        const globalMin = Math.min(...daily.temperature_2m_min);
                        const globalMax = Math.max(...daily.temperature_2m_max);
                        const range = globalMax - globalMin || 1;
                        const barLeft = ((daily.temperature_2m_min[i] - globalMin) / range) * 100;
                        const barRight = 100 - ((daily.temperature_2m_max[i] - globalMin) / range) * 100;

                        return (
                            <div key={date} className="flex items-center gap-3 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                                <span className="w-10 text-sm font-medium capitalize" style={{ color: isToday ? 'var(--text)' : 'var(--text-muted)' }}>{dayName}</span>
                                <div className="w-8 flex justify-center"><DIcon size={24} /></div>
                                <span className="w-8 text-right text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{Math.round(daily.temperature_2m_min[i])}°</span>
                                <div className="flex-1 h-1.5 rounded-full relative mx-1" style={{ background: 'var(--surface-2)' }}>
                                    <div className="absolute h-full rounded-full" style={{
                                        left: `${barLeft}%`, right: `${barRight}%`,
                                        background: 'linear-gradient(90deg, #60A5FA, #FBBF24, #F97316)',
                                    }} />
                                </div>
                                <span className="w-8 text-sm font-bold" style={{ color: 'var(--text)' }}>{Math.round(daily.temperature_2m_max[i])}°</span>
                            </div>
                        );
                    })}
                </Card>
            </div>

            {/* ═══ Detail Grid ═══ */}
            <div className="max-w-lg mx-auto px-5">
                <div className="grid grid-cols-2 gap-3">

                    {/* UV */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <SunIcon size={14} />
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Indice UV</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{uvMax}</div>
                        <div className="text-sm font-semibold" style={{ color: uvInfo.color }}>{uvInfo.label}</div>
                        <UVGauge value={uvMax} />
                        <p className="text-[0.6rem] mt-2" style={{ color: 'var(--text-muted)' }}>{uvInfo.desc}</p>
                    </Card>

                    {/* Sunrise/Sunset */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-1">
                            <SunIcon size={14} />
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Soleil</span>
                        </div>
                        <SunArc sunrise={daily?.sunrise?.[0]} sunset={daily?.sunset?.[0]} now={now} />
                    </Card>

                    {/* Wind */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <WindyIcon size={16} />
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Vent</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{Math.round(cur.wind_speed_10m)} <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>km/h</span></div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Direction {windDir(cur.wind_direction_10m)}</div>
                        {daily?.wind_speed_10m_max && (
                            <div className="text-xs mt-2 pt-2" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                Rafales: {Math.round(daily.wind_speed_10m_max[0])} km/h
                            </div>
                        )}
                    </Card>

                    {/* Precipitation */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <RainIcon size={16} />
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Précipitations</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{daily?.precipitation_sum?.[0]?.toFixed(1) || '0'} <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>mm</span></div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Probabilité: {daily?.precipitation_probability_max?.[0] || 0}%</div>
                    </Card>

                    {/* Feels Like */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="10" y="2" width="4" height="16" rx="2" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
                                <circle cx="12" cy="19" r="3" fill="#EF4444" />
                                <rect x="11" y="10" width="2" height="8" rx="1" fill="#EF4444" />
                            </svg>
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Ressenti</span>
                        </div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{Math.round(cur.apparent_temperature)}°</div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            {cur.apparent_temperature < cur.temperature_2m ? 'Le vent rend l\'air plus froid.'
                                : cur.apparent_temperature > cur.temperature_2m ? 'L\'humidité rend l\'air plus chaud.'
                                    : 'Similaire à la température réelle.'}
                        </p>
                    </Card>

                    {/* Humidity */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3 C12 3 5 12 5 16 C5 19.9 8.1 23 12 23 C15.9 23 19 19.9 19 16 C19 12 12 3 12 3Z" fill="#60A5FA" opacity="0.3" stroke="#3B82F6" strokeWidth="1.5" />
                            </svg>
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Humidité</span>
                        </div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{cur.relative_humidity_2m}%</div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            {cur.relative_humidity_2m > 70 ? 'L\'air est très humide.' : cur.relative_humidity_2m < 30 ? 'L\'air est sec.' : 'Niveau confortable.'}
                        </p>
                    </Card>

                    {/* Visibility */}
                    {visibility && (
                        <Card>
                            <div className="flex items-center gap-1.5 mb-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
                                    <circle cx="12" cy="12" r="3" stroke="var(--text-muted)" strokeWidth="1.5" fill="var(--text-muted)" opacity="0.3" />
                                </svg>
                                <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Visibilité</span>
                            </div>
                            <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{visibility} <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>km</span></div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                {parseFloat(visibility) > 10 ? 'Excellente visibilité.' : parseFloat(visibility) > 5 ? 'Bonne visibilité.' : 'Visibilité réduite.'}
                            </p>
                        </Card>
                    )}

                    {/* Pressure */}
                    <Card>
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="var(--text-muted)" strokeWidth="1.5" fill="none" />
                                <line x1="12" y1="12" x2="12" y2="6" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
                                <line x1="12" y1="12" x2="16" y2="14" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                                <circle cx="12" cy="12" r="1.5" fill="var(--text-muted)" />
                            </svg>
                            <span className="text-[0.6rem] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Pression</span>
                        </div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{Math.round(cur.surface_pressure)}</div>
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>hPa</div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            {cur.surface_pressure > 1020 ? 'Haute pression — temps stable.' : cur.surface_pressure < 1000 ? 'Basse pression — temps instable.' : 'Pression normale.'}
                        </p>
                    </Card>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-5 mt-8 text-center">
                <p className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>Données Open-Meteo · Mise à jour toutes les 10 min</p>
            </div>
        </div>
    );
}
