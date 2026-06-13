import React from 'react';
import { useWeatherCurrent } from './widgets/useWeatherCurrent';
import { motion } from 'framer-motion';

export function WeatherParticles() {
  const weather = useWeatherCurrent();
  if (!weather?.current) return null;

  const code = weather.current.weather_code;
  
  // Pluie: 51-55 (bruine), 61-65 (pluie), 80-82 (averses), 95-99 (orages)
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
  // Neige: 71-77 (neige), 85-86 (averses de neige)
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(code);

  if (!isRaining && !isSnowing) return null;

  const particlesCount = isRaining ? 50 : 40;
  const particles = Array.from({ length: particlesCount });

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
      {particles.map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const duration = isRaining ? 0.5 + Math.random() * 0.5 : 3 + Math.random() * 5;
        const delay = Math.random() * -5;
        
        if (isRaining) {
          return (
            <motion.div
              key={`rain-${i}`}
              initial={{ y: -20, x: left, opacity: 0 }}
              animate={{ 
                y: '100vh',
                opacity: [0, 0.5, 0.5, 0]
              }}
              transition={{
                duration,
                repeat: Infinity,
                delay,
                ease: "linear"
              }}
              className="absolute top-0 w-px h-8 bg-gradient-to-b from-transparent to-blue-400/50"
              style={{ left }}
            />
          );
        } else if (isSnowing) {
          const size = Math.random() * 4 + 2;
          return (
            <motion.div
              key={`snow-${i}`}
              initial={{ y: -20, x: left, opacity: 0 }}
              animate={{ 
                y: '100vh',
                x: `calc(${left} + ${Math.random() * 40 - 20}px)`,
                opacity: [0, 0.8, 0.8, 0]
              }}
              transition={{
                duration,
                repeat: Infinity,
                delay,
                ease: "linear"
              }}
              className="absolute top-0 bg-white rounded-full blur-[1px]"
              style={{ left, width: size, height: size }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
