import React from 'react';

const suitMap = {
  h: { icon: '♥️', color: 'text-red-500' },
  d: { icon: '♦️', color: 'text-red-500' },
  c: { icon: '♣️', color: 'text-slate-900' },
  s: { icon: '♠️', color: 'text-slate-900' }
};

export default function PlayingCard({ card, className = '' }) {
  // If card is not provided or hidden, render card back
  if (!card) {
    return (
      <div className={`w-[80px] h-[112px] bg-indigo-900 rounded-xl border-4 border-white shadow-xl flex items-center justify-center relative overflow-hidden ${className}`}>
        {/* Card back pattern */}
        <div className="absolute inset-1 border border-indigo-400 rounded-lg opacity-50"></div>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 flex items-center justify-center opacity-50">
          <div className="w-4 h-4 bg-indigo-400 rounded-full rotate-45"></div>
        </div>
      </div>
    );
  }

  // Parse card string (e.g., 'As', 'Td')
  const value = card.charAt(0);
  const suit = card.charAt(1);
  const { icon, color } = suitMap[suit.toLowerCase()] || suitMap['s'];

  // Convert 'T' to '10' for display
  const displayValue = value === 'T' ? '10' : value;

  return (
    <div className={`w-[80px] h-[112px] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-2 border-slate-200 flex flex-col relative select-none ${className}`}>
      {/* Top left */}
      <div className={`absolute top-2 left-2 flex flex-col items-center leading-none ${color}`}>
        <span className="font-bold text-lg font-mono">{displayValue}</span>
        <span className="text-sm">{icon}</span>
      </div>
      
      {/* Center huge suit */}
      <div className={`absolute inset-0 flex items-center justify-center opacity-20 text-5xl pointer-events-none ${color}`}>
        {icon}
      </div>
      
      {/* Bottom right */}
      <div className={`absolute bottom-2 right-2 flex flex-col items-center leading-none rotate-180 ${color}`}>
        <span className="font-bold text-lg font-mono">{displayValue}</span>
        <span className="text-sm">{icon}</span>
      </div>
    </div>
  );
}
