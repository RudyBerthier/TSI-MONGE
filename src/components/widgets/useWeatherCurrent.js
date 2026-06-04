import { useState, useEffect } from 'react';

const LAT = 45.5646;
const LON = 5.9178;

export function useWeatherCurrent() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const cached = localStorage.getItem('tsi_weather_cache');
        if (cached) {
            try {
                const { data: d, ts } = JSON.parse(cached);
                if (Date.now() - ts < 5 * 60 * 1000) {
                    setData(d);
                    return;
                }
            } catch { }
        }

        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Europe/Paris`)
            .then(r => r.json())
            .then(d => {
                setData(d);
                localStorage.setItem('tsi_weather_cache', JSON.stringify({ data: d, ts: Date.now() }));
            })
            .catch(() => {
                if (cached) try { setData(JSON.parse(cached).data); } catch { }
            });
    }, []);

    return data;
}
