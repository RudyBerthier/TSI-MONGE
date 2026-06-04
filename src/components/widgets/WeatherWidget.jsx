import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Wind, Droplets, Thermometer, Eye, CloudFog } from 'lucide-react';

// Chambéry coordinates (Lycée Monge)
const LAT = 45.5646;
const LON = 5.9178;

const WMO_CODES = {
    0: { label: 'Ciel dégagé', icon: Sun, color: '#FBBF24' },
    1: { label: 'Peu nuageux', icon: Sun, color: '#FCD34D' },
    2: { label: 'Partiellement nuageux', icon: Cloud, color: '#9CA3AF' },
    3: { label: 'Couvert', icon: Cloud, color: '#6B7280' },
    45: { label: 'Brouillard', icon: CloudFog, color: '#9CA3AF' },
    48: { label: 'Brouillard givrant', icon: CloudFog, color: '#93C5FD' },
    51: { label: 'Bruine légère', icon: CloudDrizzle, color: '#60A5FA' },
    53: { label: 'Bruine', icon: CloudDrizzle, color: '#3B82F6' },
    55: { label: 'Bruine forte', icon: CloudDrizzle, color: '#2563EB' },
    61: { label: 'Pluie légère', icon: CloudRain, color: '#60A5FA' },
    63: { label: 'Pluie', icon: CloudRain, color: '#3B82F6' },
    65: { label: 'Pluie forte', icon: CloudRain, color: '#1D4ED8' },
    66: { label: 'Pluie verglaçante', icon: CloudRain, color: '#93C5FD' },
    67: { label: 'Pluie verglaçante forte', icon: CloudRain, color: '#60A5FA' },
    71: { label: 'Neige légère', icon: CloudSnow, color: '#BFDBFE' },
    73: { label: 'Neige', icon: CloudSnow, color: '#93C5FD' },
    75: { label: 'Neige forte', icon: CloudSnow, color: '#60A5FA' },
    77: { label: 'Grains de neige', icon: CloudSnow, color: '#DBEAFE' },
    80: { label: 'Averses légères', icon: CloudRain, color: '#60A5FA' },
    81: { label: 'Averses', icon: CloudRain, color: '#3B82F6' },
    82: { label: 'Averses violentes', icon: CloudRain, color: '#1D4ED8' },
    85: { label: 'Averses de neige', icon: CloudSnow, color: '#93C5FD' },
    86: { label: 'Averses de neige forte', icon: CloudSnow, color: '#60A5FA' },
    95: { label: 'Orage', icon: CloudLightning, color: '#A78BFA' },
    96: { label: 'Orage grêle', icon: CloudLightning, color: '#8B5CF6' },
    99: { label: 'Orage forte grêle', icon: CloudLightning, color: '#7C3AED' },
};

function getWeatherInfo(code) {
    return WMO_CODES[code] || { label: 'Inconnu', icon: Cloud, color: '#9CA3AF' };
}

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check cache first (5 min TTL)
        const cached = localStorage.getItem('tsi_weather_cache');
        if (cached) {
            try {
                const { data, ts } = JSON.parse(cached);
                if (Date.now() - ts < 5 * 60 * 1000) {
                    setWeather(data);
                    setLoading(false);
                    return;
                }
            } catch { }
        }

        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&timezone=Europe/Paris&forecast_days=3`)
            .then(r => r.json())
            .then(data => {
                setWeather(data);
                localStorage.setItem('tsi_weather_cache', JSON.stringify({ data, ts: Date.now() }));
            })
            .catch(() => {
                // Use cached data even if stale
                if (cached) {
                    try { setWeather(JSON.parse(cached).data); } catch { }
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="tsi-card animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl" style={{ background: 'var(--surface-2)' }} />
                    <div className="flex-1">
                        <div className="h-4 w-24 rounded mb-2" style={{ background: 'var(--surface-2)' }} />
                        <div className="h-3 w-16 rounded" style={{ background: 'var(--surface-2)' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (!weather?.current) return null;

    const current = weather.current;
    const info = getWeatherInfo(current.weather_code);
    const WeatherIcon = info.icon;
    const daily = weather.daily;

    // Find current hour index for hourly forecast
    const now = new Date();
    const currentHourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
    const hourlyStartIdx = weather.hourly?.time?.indexOf(currentHourStr) ?? -1;

    return (
        <div className="tsi-card overflow-hidden relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <Cloud size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Météo · Chambéry
                    </span>
                </div>
            </div>

            {/* Current weather */}
            <div className="flex items-center gap-4 mt-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${info.color}18` }}>
                    <WeatherIcon size={30} style={{ color: info.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>
                            {Math.round(current.temperature_2m)}°
                        </span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                            Ressenti {Math.round(current.apparent_temperature)}°
                        </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5" style={{ color: info.color }}>
                        {info.label}
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-4 py-3 px-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <div className="flex-1 flex items-center justify-center gap-1.5">
                    <Wind size={13} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                        {Math.round(current.wind_speed_10m)} km/h
                    </span>
                </div>
                <div className="w-px" style={{ background: 'var(--border)' }} />
                <div className="flex-1 flex items-center justify-center gap-1.5">
                    <Droplets size={13} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                        {current.relative_humidity_2m}%
                    </span>
                </div>
                {daily && (
                    <>
                        <div className="w-px" style={{ background: 'var(--border)' }} />
                        <div className="flex-1 flex items-center justify-center gap-1.5">
                            <Thermometer size={13} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                                {Math.round(daily.temperature_2m_min[0])}° / {Math.round(daily.temperature_2m_max[0])}°
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Hourly forecast (next 6 hours) */}
            {hourlyStartIdx >= 0 && (
                <div className="flex gap-1 mt-3 overflow-x-auto hide-scrollbar scrollbar-hide pb-1">
                    {Array.from({ length: 6 }, (_, i) => {
                        const idx = hourlyStartIdx + i + 1;
                        if (idx >= weather.hourly.time.length) return null;
                        const time = weather.hourly.time[idx];
                        const hour = time.split('T')[1].substring(0, 5);
                        const temp = Math.round(weather.hourly.temperature_2m[idx]);
                        const hInfo = getWeatherInfo(weather.hourly.weather_code[idx]);
                        const HIcon = hInfo.icon;
                        return (
                            <div key={idx} className="flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl shrink-0 min-w-[3.2rem]" style={{ background: i === 0 ? 'rgba(var(--accent-rgb), 0.06)' : 'transparent' }}>
                                <span className="text-[0.6rem] font-semibold" style={{ color: 'var(--text-muted)' }}>{hour}</span>
                                <HIcon size={16} style={{ color: hInfo.color }} />
                                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{temp}°</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 3-day forecast */}
            {daily && daily.time.length > 1 && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                    {daily.time.slice(1, 3).map((date, i) => {
                        const dInfo = getWeatherInfo(daily.weather_code[i + 1]);
                        const DIcon = dInfo.icon;
                        const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' });
                        return (
                            <div key={date} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 flex-1">
                                    <DIcon size={16} style={{ color: dInfo.color }} />
                                    <span className="text-xs font-medium capitalize" style={{ color: 'var(--text)' }}>{dayName}</span>
                                </div>
                                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {Math.round(daily.temperature_2m_min[i + 1])}° / {Math.round(daily.temperature_2m_max[i + 1])}°
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full opacity-10 pointer-events-none" style={{ background: info.color }} />
        </div>
    );
}
