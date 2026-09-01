import React from "react";

export const VoiceWaveVisualizer = ({ active }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
        <div
          key={bar}
          className={`w-1.5 bg-teal-500 rounded-full transition-all duration-300 ${
            active ? "animate-wave" : "h-3 opacity-40"
          }`}
          style={{
            height: active ? `${Math.floor(Math.random() * 30) + 12}px` : "12px",
            animationDelay: `${bar * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};
