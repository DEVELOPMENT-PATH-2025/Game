/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Shield, Zap, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';

// --- LEVEL DATA ---
const LEVELS = [
  {
    id: 1,
    name: "System Probe",
    enemies: [
      { id: 'e1', type: 'normal', content: 'ERROR_404', speed: 1.2 },
      { id: 'e2', type: 'normal', content: 'MALWARE_v1', speed: 0.8 },
      { id: 'e3', type: 'normal', content: 'TEMP_LOG_99', speed: 1.5 },
    ]
  },
  {
    id: 2,
    name: "Data Breach",
    enemies: [
      { id: 'e4', type: 'normal', content: 'root_access_attempt', speed: 1.4 },
      { id: 'e5', type: 'armored', content: '99_VIRUS_01', speed: 0.6 }, // Needs /\d/g then /VIRUS/
      { id: 'e6', type: 'normal', content: 'exploit_kit_2026', speed: 1.1 },
    ]
  },
  {
    id: 3,
    name: "Core Infiltration",
    enemies: [
      { id: 'e7', type: 'armored', content: 'SECURE_123_DATA_456', speed: 0.5 },
      { id: 'e8', type: 'normal', content: 'worm.exe', speed: 2.0 },
      { id: 'e9', type: 'armored', content: '!!!_MALWARE_!!!', speed: 0.4 }, // Needs /!/g then /MALWARE/
    ]
  }
];

interface Enemy {
  id: string;
  type: 'normal' | 'armored';
  content: string;
  speed: number;
  x: number;
  y: number;
  isHit?: boolean;
}

export default function App() {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [health, setHealth] = useState(100);
  const [inputValue, setInputValue] = useState('');
  const [isInvalidRegex, setIsInvalidRegex] = useState(false);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'won' | 'lost'>('start');
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState({ hits: 0, shots: 0 });
  const [debugMatch, setDebugMatch] = useState<string | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize level
  const startLevel = useCallback((levelIdx: number) => {
    if (levelIdx >= LEVELS.length) {
      setGameState('won');
      const finalAccuracy = accuracy.shots > 0 ? (accuracy.hits / accuracy.shots) * 100 : 100;
      console.log(JSON.stringify({
        "Result": "System Cleaned",
        "Accuracy": finalAccuracy.toFixed(2),
        "BossID": "MALWARE_CORE"
      }, null, 2));
      return;
    }

    const level = LEVELS[levelIdx];
    const newEnemies = level.enemies.map((e, idx) => ({
      ...e,
      x: 10 + Math.random() * 80, // 10% to 90% width
      y: -50 - (idx * 150), // Staggered start
    }));
    setEnemies(newEnemies);
    setGameState('playing');
  }, [accuracy]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const update = () => {
      setEnemies(prev => {
        const next = prev.map(e => ({ ...e, y: e.y + e.speed }));
        
        // Check for firewall breach
        const breached = next.filter(e => e.y > 85); // 85% height is firewall
        if (breached.length > 0) {
          setHealth(h => Math.max(0, h - (breached.length * 10)));
          return next.filter(e => e.y <= 85);
        }
        
        return next;
      });

      gameLoopRef.current = requestAnimationFrame(update);
    };

    gameLoopRef.current = requestAnimationFrame(update);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState]);

  // Check health
  useEffect(() => {
    if (health <= 0 && gameState === 'playing') {
      setGameState('lost');
    }
  }, [health, gameState]);

  // Check level completion
  useEffect(() => {
    if (gameState === 'playing' && enemies.length === 0) {
      setCurrentLevel(l => l + 1);
      startLevel(currentLevel + 1);
    }
  }, [enemies, gameState, currentLevel, startLevel]);

  // Regex Parsing Logic
  const parseRegex = (input: string): RegExp | null => {
    try {
      // Basic validation: must look like /pattern/flags
      const match = input.match(/^\/(.*)\/([gimyus]*)$/);
      if (match) {
        return new RegExp(match[1], match[2]);
      }
      // Fallback: try to treat as raw pattern if it doesn't have slashes
      if (!input.startsWith('/')) {
        return new RegExp(input, 'g');
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Live Debug Preview
  useEffect(() => {
    if (!inputValue) {
      setDebugMatch(null);
      setIsInvalidRegex(false);
      return;
    }

    const regex = parseRegex(inputValue);
    if (!regex) {
      setIsInvalidRegex(true);
      setDebugMatch(null);
    } else {
      setIsInvalidRegex(false);
      const testString = "Sample_123_Data_ERROR";
      const matches = testString.match(regex);
      setDebugMatch(matches ? `Matches: [${matches.join(', ')}]` : "No match in sample");
    }
  }, [inputValue]);

  const handleFire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    const regex = parseRegex(inputValue);
    if (!regex) {
      setIsInvalidRegex(true);
      return;
    }

    setAccuracy(prev => ({ ...prev, shots: prev.shots + 1 }));

    let hitAny = false;
    setEnemies(prev => {
      const next = prev.map(enemy => {
        const matches = enemy.content.match(regex);
        if (matches) {
          hitAny = true;
          
          if (enemy.type === 'normal') {
            // Normal enemies must match the WHOLE string to be destroyed
            // Or we can be more lenient for "educational" purposes?
            // User said: "If the Regex matches the entire string, delete the enemy"
            if (matches[0] === enemy.content) {
              return null; // Destroy
            }
          } else {
            // Armored enemies: strip matched parts
            const newContent = enemy.content.replace(regex, '');
            if (newContent === '') return null; // Fully stripped
            return { ...enemy, content: newContent, isHit: true };
          }
        }
        return { ...enemy, isHit: false };
      }).filter((e): e is Enemy => e !== null);
      
      return next;
    });

    if (hitAny) {
      setAccuracy(prev => ({ ...prev, hits: prev.hits + 1 }));
      setScore(s => s + 100);
      // Play sound effect (simulated)
    }

    setInputValue('');
  };

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] flex flex-col overflow-hidden select-none" ref={containerRef}>
      {/* Header / HUD */}
      <div className="p-4 flex justify-between items-center border-b border-[#003b00] bg-[#050505] z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xl font-bold crt-glow">
            <Terminal className="w-6 h-6" />
            <span>REGEX_SNIPER v1.0</span>
          </div>
          <div className="text-xs opacity-50">AGENT: {process.env.USER_EMAIL || 'GUEST'}</div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase opacity-50">System Integrity</span>
            <div className="w-48 h-2 bg-[#1a1a1a] border border-[#003b00] overflow-hidden">
              <motion.div 
                className="h-full bg-[#00ff41]" 
                initial={{ width: '100%' }}
                animate={{ width: `${health}%` }}
                style={{ backgroundColor: health < 30 ? '#ff3131' : '#00ff41' }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase opacity-50">Score</div>
            <div className="text-xl font-bold">{score.toString().padStart(6, '0')}</div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative flex-1 overflow-hidden">
        {gameState === 'start' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-6xl font-black mb-8 crt-glow text-center"
            >
              THE REGEX SNIPER
            </motion.h1>
            <p className="max-w-md text-center mb-8 opacity-70 leading-relaxed">
              MALFORMED DATA IS BREACHING THE CORE. <br/>
              USE PATTERN-MATCHING AMMUNITION TO PURGE THE SYSTEM.
            </p>
            <button 
              onClick={() => startLevel(0)}
              className="px-8 py-4 border-2 border-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all font-bold text-xl group flex items-center gap-3"
            >
              <Zap className="w-6 h-6 group-hover:fill-current" />
              INITIALIZE CLEANSE
            </button>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/20 backdrop-blur-md">
            <AlertTriangle className="w-24 h-24 text-[#ff3131] mb-4 animate-pulse" />
            <h2 className="text-5xl font-black text-[#ff3131] mb-4">SYSTEM COMPROMISED</h2>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 border border-[#ff3131] text-[#ff3131] hover:bg-[#ff3131] hover:text-black transition-all"
            >
              REBOOT SYSTEM
            </button>
          </div>
        )}

        {gameState === 'won' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-green-900/20 backdrop-blur-md">
            <CheckCircle2 className="w-24 h-24 text-[#00ff41] mb-4" />
            <h2 className="text-5xl font-black text-[#00ff41] mb-4">SYSTEM CLEANSED</h2>
            <div className="text-center mb-8">
              <p>Accuracy: {((accuracy.hits / (accuracy.shots || 1)) * 100).toFixed(1)}%</p>
              <p>Final Score: {score}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-all"
            >
              NEW MISSION
            </button>
          </div>
        )}

        {/* Enemies */}
        <AnimatePresence>
          {enemies.map((enemy) => (
            <motion.div
              key={enemy.id}
              className={`absolute p-2 border border-[#003b00] bg-[#050505]/80 backdrop-blur-sm flex items-center gap-2 min-w-[120px] ${enemy.isHit ? 'enemy-hit border-[#00ff41]' : ''}`}
              style={{ 
                left: `${enemy.x}%`, 
                top: `${enemy.y}%`,
                transform: 'translateX(-50%)'
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
            >
              {enemy.type === 'armored' ? (
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              )}
              <span className="font-mono text-sm whitespace-nowrap tracking-wider">
                {enemy.content}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Firewall */}
        <div className="absolute bottom-[15%] left-0 right-0 h-1 bg-[#ff3131]/30 firewall-pulse z-10">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-[#ff3131] uppercase tracking-[0.5em]">
            Firewall Integrity Zone
          </div>
        </div>

        {/* Debug Panel */}
        <div className="absolute top-4 right-4 w-64 p-3 border border-[#003b00] bg-black/60 backdrop-blur-md text-[10px] font-mono z-40">
          <div className="flex items-center gap-2 mb-2 border-b border-[#003b00] pb-1">
            <Target className="w-3 h-3" />
            <span>DEBUG_PREVIEW</span>
          </div>
          <div className="opacity-50 mb-1">Source: Sample_123_Data_ERROR</div>
          <div className={`${isInvalidRegex ? 'text-[#ff3131]' : 'text-[#00ff41]'}`}>
            {debugMatch || "Awaiting pattern..."}
          </div>
          {isInvalidRegex && <div className="text-[#ff3131] mt-1">ERROR: Invalid Syntax</div>}
        </div>
      </div>

      {/* Footer / Input */}
      <div className="p-6 bg-[#050505] border-t border-[#003b00] z-50">
        <form onSubmit={handleFire} className="max-w-3xl mx-auto relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#003b00] font-bold">
            {">"}
          </div>
          <input
            type="text"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter Regex Pattern (e.g. /[a-z]/g or /\\d/)"
            className={`w-full bg-black border-2 p-4 pl-10 font-mono text-xl outline-none transition-colors ${
              isInvalidRegex ? 'border-[#ff3131] text-[#ff3131]' : 'border-[#003b00] focus:border-[#00ff41] text-[#00ff41]'
            }`}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
            <span className="text-[10px] opacity-30 hidden md:block">PRESS ENTER TO FIRE</span>
            <button 
              type="submit"
              className="p-2 hover:bg-[#00ff41] hover:text-black transition-colors rounded"
            >
              <Zap className="w-5 h-5" />
            </button>
          </div>
        </form>
        
        <div className="mt-4 flex justify-center gap-8 text-[10px] opacity-40 uppercase tracking-widest">
          <span>Level: {currentLevel + 1} / {LEVELS.length}</span>
          <span>Enemies: {enemies.length}</span>
          <span>Hits: {accuracy.hits}</span>
        </div>
      </div>
    </div>
  );
}
