import React from 'react';
import { Lightbulb, Cog, Rocket, Zap, Globe, Cpu, Atom, Telescope } from 'lucide-react';

const SpaceBackground = () => {
  const inventions = [
    { Icon: Lightbulb, size: 40 },
    { Icon: Cog, size: 35 },
    { Icon: Rocket, size: 45 },
    { Icon: Zap, size: 38 },
    { Icon: Globe, size: 42 },
    { Icon: Cpu, size: 36 },
    { Icon: Atom, size: 44 },
    { Icon: Telescope, size: 40 }
  ];

  return (
    <>
      {/* Space Background */}
      <div className="space-background">
        {/* Floating Inventions */}
        {inventions.slice(0, 5).map((invention, index) => (
          <div key={index} className="floating-invention">
            <invention.Icon 
              size={invention.size} 
              className="text-primary opacity-60" 
              strokeWidth={1.5}
            />
          </div>
        ))}
        
        {/* Shooting Stars */}
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
      </div>
    </>
  );
};

export default SpaceBackground;