/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Lightbulb,
  Gauge,
  Palette,
  Car,
  RotateCw,
  Sparkles,
  Zap,
  Check,
  Radio,
  Flame,
} from 'lucide-react';
import { LicenseDiscData } from '../types';

interface AnimatedVehicleModelProps {
  disc: LicenseDiscData;
  className?: string;
  compact?: boolean;
}

export type BodyStyle = 'hatchback' | 'bakkie' | 'sedan' | 'suv' | 'coupe';

// Comprehensive color database with rich metallic highlights and shadow tones
export interface VehicleColorProfile {
  name: string;
  primary: string;
  accent: string;
  highlight: string;
  shadow: string;
  textContrast: 'light' | 'dark';
}

export const COLOR_PROFILES: Record<string, VehicleColorProfile> = {
  WHITE: {
    name: 'Glacier White',
    primary: '#F8FAFC',
    accent: '#E2E8F0',
    highlight: '#FFFFFF',
    shadow: '#94A3B8',
    textContrast: 'dark',
  },
  SILVER: {
    name: 'Reflex Silver Metallic',
    primary: '#CBD5E1',
    accent: '#94A3B8',
    highlight: '#F1F5F9',
    shadow: '#64748B',
    textContrast: 'dark',
  },
  GREY: {
    name: 'Nardo Grey',
    primary: '#64748B',
    accent: '#475569',
    highlight: '#94A3B8',
    shadow: '#334155',
    textContrast: 'light',
  },
  GRAY: {
    name: 'Gunmetal Grey',
    primary: '#64748B',
    accent: '#475569',
    highlight: '#94A3B8',
    shadow: '#334155',
    textContrast: 'light',
  },
  BLACK: {
    name: 'Mythos Black Pearl',
    primary: '#1E293B',
    accent: '#0F172A',
    highlight: '#475569',
    shadow: '#020617',
    textContrast: 'light',
  },
  BLUE: {
    name: 'Misano Blue Metallic',
    primary: '#2563EB',
    accent: '#1D4ED8',
    highlight: '#60A5FA',
    shadow: '#1E3A8A',
    textContrast: 'light',
  },
  RED: {
    name: 'Tornado Red',
    primary: '#DC2626',
    accent: '#B91C1C',
    highlight: '#F87171',
    shadow: '#7F1D1D',
    textContrast: 'light',
  },
  ORANGE: {
    name: 'Cyber Orange',
    primary: '#EA580C',
    accent: '#C2410C',
    highlight: '#FB923C',
    shadow: '#7C2D12',
    textContrast: 'light',
  },
  YELLOW: {
    name: 'Vegas Yellow',
    primary: '#EAB308',
    accent: '#CA8A04',
    highlight: '#FDE047',
    shadow: '#713F12',
    textContrast: 'dark',
  },
  GOLD: {
    name: 'Champagne Gold',
    primary: '#D97706',
    accent: '#B45309',
    highlight: '#FCD34D',
    shadow: '#78350F',
    textContrast: 'light',
  },
  GREEN: {
    name: 'British Racing Green',
    primary: '#16A34A',
    accent: '#15803D',
    highlight: '#4ADE80',
    shadow: '#14532D',
    textContrast: 'light',
  },
  BROWN: {
    name: 'Havanna Brown',
    primary: '#92400E',
    accent: '#78350F',
    highlight: '#D97706',
    shadow: '#451A03',
    textContrast: 'light',
  },
};

export function resolveColorProfile(colorName?: string): VehicleColorProfile {
  if (!colorName) return COLOR_PROFILES.WHITE;
  const upper = colorName.toUpperCase().trim();
  for (const [key, profile] of Object.entries(COLOR_PROFILES)) {
    if (upper.includes(key)) {
      return profile;
    }
  }
  // Fallback profile
  return {
    name: colorName.toUpperCase(),
    primary: '#64748B',
    accent: '#475569',
    highlight: '#94A3B8',
    shadow: '#334155',
    textContrast: 'light',
  };
}

export function detectBodyStyle(disc: LicenseDiscData): BodyStyle {
  const combined = `${disc.make} ${disc.seriesName} ${disc.vehicleCategory || ''}`.toUpperCase();

  if (
    combined.includes('RANGER') ||
    combined.includes('HILUX') ||
    combined.includes('D-MAX') ||
    combined.includes('AMAROK') ||
    combined.includes('NAVARA') ||
    combined.includes('DOUBLE CAB') ||
    combined.includes('BAKKIE') ||
    combined.includes('PICKUP') ||
    combined.includes('PICK-UP') ||
    combined.includes('SINGLE CAB')
  ) {
    return 'bakkie';
  }

  if (
    combined.includes('POLO') ||
    combined.includes('SWIFT') ||
    combined.includes('GOLF') ||
    combined.includes('YARIS') ||
    combined.includes('I20') ||
    combined.includes('HATCH') ||
    combined.includes('CLIO') ||
    combined.includes('FIESTA') ||
    combined.includes('CORSA') ||
    combined.includes('STARLET')
  ) {
    return 'hatchback';
  }

  if (
    combined.includes('FORTUNER') ||
    combined.includes('RAV4') ||
    combined.includes('TIGUAN') ||
    combined.includes('EVEREST') ||
    combined.includes('SUV') ||
    combined.includes('CROSSOVER') ||
    combined.includes('PRADO') ||
    combined.includes('TUCSON') ||
    combined.includes('SPORTAGE') ||
    combined.includes('HAVAL') ||
    combined.includes('CHERY')
  ) {
    return 'suv';
  }

  if (
    combined.includes('MUSTANG') ||
    combined.includes('COUPE') ||
    combined.includes('SUPRA') ||
    combined.includes('M4') ||
    combined.includes('911') ||
    combined.includes('SPORTS')
  ) {
    return 'coupe';
  }

  return 'sedan';
}

export const AnimatedVehicleModel: React.FC<AnimatedVehicleModelProps> = ({
  disc,
  className = '',
  compact = false,
}) => {
  const initialStyle = detectBodyStyle(disc);
  const detectedColorProfile = resolveColorProfile(disc.colour);

  const [bodyStyle, setBodyStyle] = useState<BodyStyle>(initialStyle);
  const [activeColor, setActiveColor] = useState<VehicleColorProfile>(detectedColorProfile);
  const [isDriving, setIsDriving] = useState<boolean>(true);
  const [speedLevel, setSpeedLevel] = useState<'cruising' | 'fast' | 'idle'>('cruising');
  const [headlights, setHeadlights] = useState<boolean>(true);
  const [hazardLights, setHazardLights] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isRevving, setIsRevving] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // Sync when disc changes
  useEffect(() => {
    setBodyStyle(detectBodyStyle(disc));
    setActiveColor(resolveColorProfile(disc.colour));
  }, [disc]);

  // Web Audio Synthesizer for Realistic Engine Rumble
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!soundEnabled) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        oscRef.current = null;
        gainRef.current = null;
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = speedLevel === 'fast' ? 75 : speedLevel === 'cruising' ? 55 : 38;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      // Lowpass filter to muffle harsh buzzing into deep engine rumble
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
    } catch {
      // Audio autoplay restrictions
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [soundEnabled, speedLevel]);

  // Throttle Rev effect
  const handleRevEngine = () => {
    setIsRevving(true);
    if (audioCtxRef.current && oscRef.current && gainRef.current) {
      const now = audioCtxRef.current.currentTime;
      oscRef.current.frequency.cancelScheduledValues(now);
      oscRef.current.frequency.setValueAtTime(oscRef.current.frequency.value, now);
      oscRef.current.frequency.exponentialRampToValueAtTime(160, now + 0.35);
      oscRef.current.frequency.exponentialRampToValueAtTime(
        speedLevel === 'fast' ? 75 : speedLevel === 'cruising' ? 55 : 38,
        now + 1.2
      );

      gainRef.current.gain.cancelScheduledValues(now);
      gainRef.current.gain.setValueAtTime(0.04, now);
      gainRef.current.gain.linearRampToValueAtTime(0.09, now + 0.3);
      gainRef.current.gain.linearRampToValueAtTime(0.04, now + 1.2);
    }

    setTimeout(() => {
      setIsRevving(false);
    }, 1200);
  };

  const wheelDuration = !isDriving || speedLevel === 'idle' ? 0 : speedLevel === 'fast' ? 0.45 : 0.85;
  const roadDuration = !isDriving || speedLevel === 'idle' ? 0 : speedLevel === 'fast' ? 0.6 : 1.2;

  return (
    <div className={`rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl ${className}`}>
      {/* HEADER: MAKE, MODEL & COLOR METADATA */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Car className="w-3 h-3" />
              Live 2D Automotive Visualizer
            </span>
            {disc.year && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                {disc.year}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>
              {disc.make} {disc.seriesName}
            </span>
          </h3>
        </div>

        {/* Color Pill Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
            <div
              className="w-4 h-4 rounded-full border border-white/30 shadow-sm shrink-0"
              style={{
                backgroundColor: activeColor.primary,
                boxShadow: `0 0 10px ${activeColor.primary}66`,
              }}
            />
            <div className="text-left">
              <div className="text-[9px] uppercase font-bold text-slate-400 leading-tight">
                Factory Paint
              </div>
              <div className="text-xs font-black text-white tracking-wide leading-tight">
                {activeColor.name}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowColorPicker((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            title="Switch colour palette"
          >
            <Palette className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* EXPANDABLE COLOR PALETTE PICKER */}
      <AnimatePresence>
        {showColorPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-800 bg-slate-950 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Select Finish / Compare Colours:
              </span>
              <button
                onClick={() => setActiveColor(detectedColorProfile)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Reset to Scanned ({disc.colour || 'WHITE'})
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(COLOR_PROFILES).map(([key, col]) => {
                const isSelected = activeColor.primary === col.primary;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveColor(col)}
                    className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 transition text-xs font-bold ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-lg'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40"
                      style={{ backgroundColor: col.primary }}
                    />
                    <span>{col.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE STAGE / CANVAS */}
      <div className="relative w-full h-64 sm:h-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-end items-center overflow-hidden select-none">
        {/* Ambient Grid Backdrop */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 32px 32px, 32px 32px',
          }}
        />

        {/* Speed Wind Lines when driving */}
        {isDriving && speedLevel !== 'idle' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
            <motion.div
              animate={{ x: [400, -600] }}
              transition={{ repeat: Infinity, duration: speedLevel === 'fast' ? 0.7 : 1.4, ease: 'linear' }}
              className="absolute top-12 left-0 w-24 h-[1px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
            />
            <motion.div
              animate={{ x: [500, -700] }}
              transition={{ repeat: Infinity, duration: speedLevel === 'fast' ? 0.9 : 1.7, ease: 'linear', delay: 0.3 }}
              className="absolute top-20 left-0 w-36 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            />
            <motion.div
              animate={{ x: [600, -800] }}
              transition={{ repeat: Infinity, duration: speedLevel === 'fast' ? 0.8 : 1.5, ease: 'linear', delay: 0.6 }}
              className="absolute top-8 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"
            />
          </div>
        )}

        {/* Headlight Lighting Cone Projection */}
        {headlights && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.75, 0.88, 0.75] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute right-0 bottom-16 w-1/2 h-44 pointer-events-none z-10"
            style={{
              background: 'radial-gradient(circle at 10% 70%, rgba(254, 240, 138, 0.45) 0%, rgba(250, 204, 21, 0.15) 35%, transparent 70%)',
              clipPath: 'polygon(0% 65%, 100% 15%, 100% 95%, 0% 85%)',
            }}
          />
        )}

        {/* VEHICLE MAIN BODY WITH SUSPENSION ANIMATION */}
        <motion.div
          animate={
            isDriving && speedLevel !== 'idle'
              ? {
                  y: isRevving ? [-4, 2, -4] : [-1.5, 1.5, -1.5],
                  rotate: isRevving ? [-0.8, 0.8, -0.8] : [0, 0, 0],
                }
              : { y: [0, -1, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: isRevving ? 0.2 : speedLevel === 'fast' ? 0.25 : 0.45,
            ease: 'easeInOut',
          }}
          className="relative z-20 w-full max-w-[480px] px-4"
        >
          {/* VEHICLE SVG GRAPHIC BY BODY STYLE */}
          <svg
            viewBox="0 0 520 220"
            className="w-full h-auto drop-shadow-2xl"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Metallic Paint Linear Gradient */}
              <linearGradient id={`paint-grad-${activeColor.name}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={activeColor.highlight} />
                <stop offset="25%" stopColor={activeColor.primary} />
                <stop offset="75%" stopColor={activeColor.accent} />
                <stop offset="100%" stopColor={activeColor.shadow} />
              </linearGradient>

              {/* Glass Reflection Gradient */}
              <linearGradient id="glass-reflection" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
                <stop offset="40%" stopColor="#0F172A" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
              </linearGradient>

              {/* Alloy Wheel Gradient */}
              <linearGradient id="rim-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="50%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Headlight Flare */}
              <radialGradient id="headlight-bulb" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FEF9C3" />
                <stop offset="60%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* VEHICLE SHADOW ON GROUND */}
            <ellipse cx="260" cy="188" rx="220" ry="12" fill="#020617" fillOpacity="0.8" />

            {/* BODY STYLE SPECIFIC SVG SILHOUETTES */}
            {bodyStyle === 'bakkie' && (
              <g id="bakkie-group">
                {/* Sports Bar / Roll Bar */}
                <path
                  d="M175 60 L188 60 L235 125 L215 125 Z"
                  fill="#0F172A"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <path
                  d="M185 60 L195 60 L245 125 L235 125 Z"
                  fill="#1E293B"
                />
                {/* Main Body Shell (Double Cab Pick-up) */}
                <path
                  d="M40 135 L65 130 L160 130 L180 80 L300 75 L365 125 L475 130 C490 132 495 145 490 155 L475 168 C470 172 455 174 440 174 L400 174 C390 148 350 148 340 174 L200 174 C190 148 150 148 140 174 L60 174 C45 174 35 165 35 150 Z"
                  fill={`url(#paint-grad-${activeColor.name})`}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Loading Bed Rear Cargo Wall */}
                <rect x="55" y="125" width="115" height="40" rx="3" fill="#0F172A" fillOpacity="0.8" />
                {/* Cabin Windows */}
                <path
                  d="M190 85 L285 82 L345 125 L190 125 Z"
                  fill="url(#glass-reflection)"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Window Pillar (B-Pillar) */}
                <rect x="250" y="82" width="10" height="43" fill="#0F172A" />
                {/* Door shut lines & handles */}
                <line x1="255" y1="125" x2="255" y2="168" stroke="#0F172A" strokeWidth="2" />
                <rect x="235" y="133" width="14" height="4" rx="2" fill="#0F172A" />
                <rect x="300" y="133" width="14" height="4" rx="2" fill="#0F172A" />
                {/* Side running board step */}
                <rect x="180" y="172" width="180" height="5" rx="2" fill="#334155" stroke="#0F172A" />
              </g>
            )}

            {bodyStyle === 'hatchback' && (
              <g id="hatchback-group">
                {/* Rear Spoiler */}
                <path d="M75 75 L115 72 L115 78 L80 82 Z" fill="#0F172A" />
                {/* Main Body Shell (Hatchback) */}
                <path
                  d="M60 135 L85 82 L150 72 L320 72 L385 125 L475 132 C490 135 495 148 490 158 L475 168 C465 174 450 174 435 174 L395 174 C385 148 345 148 335 174 L205 174 C195 148 155 148 145 174 L65 174 C45 174 38 162 40 148 Z"
                  fill={`url(#paint-grad-${activeColor.name})`}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Glasshouse windows */}
                <path
                  d="M100 85 L305 80 L365 125 L105 125 Z"
                  fill="url(#glass-reflection)"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* B-Pillar & C-Pillar */}
                <rect x="220" y="80" width="9" height="45" fill="#0F172A" />
                <path d="M125 85 L145 84 L140 125 L115 125 Z" fill="#0F172A" />
                {/* Door lines & handles */}
                <line x1="225" y1="125" x2="225" y2="168" stroke="#0F172A" strokeWidth="2" />
                <rect x="200" y="133" width="14" height="4" rx="2" fill="#0F172A" />
                <rect x="275" y="133" width="14" height="4" rx="2" fill="#0F172A" />
              </g>
            )}

            {bodyStyle === 'sedan' && (
              <g id="sedan-group">
                {/* Main Body Shell (Sedan 3-Box Shape) */}
                <path
                  d="M45 138 L95 130 L160 82 L330 80 L395 128 L478 132 C492 135 496 148 492 158 L478 168 C468 174 452 174 438 174 L398 174 C388 148 348 148 338 174 L205 174 C195 148 155 148 145 174 L65 174 C45 174 38 160 42 145 Z"
                  fill={`url(#paint-grad-${activeColor.name})`}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Glasshouse windows */}
                <path
                  d="M165 88 L320 85 L375 128 L145 128 Z"
                  fill="url(#glass-reflection)"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Pillars */}
                <rect x="245" y="85" width="9" height="43" fill="#0F172A" />
                {/* Door lines & handles */}
                <line x1="250" y1="128" x2="250" y2="168" stroke="#0F172A" strokeWidth="2" />
                <rect x="225" y="135" width="14" height="4" rx="2" fill="#0F172A" />
                <rect x="300" y="135" width="14" height="4" rx="2" fill="#0F172A" />
              </g>
            )}

            {bodyStyle === 'suv' && (
              <g id="suv-group">
                {/* Roof Rails */}
                <path d="M120 62 L320 62 L320 66 L120 66 Z" fill="#64748B" />
                <rect x="140" y="66" width="6" height="6" fill="#334155" />
                <rect x="300" y="66" width="6" height="6" fill="#334155" />
                {/* Main Body Shell (SUV / Crossover) */}
                <path
                  d="M50 135 L85 75 L335 72 L395 126 L478 132 C492 135 496 148 492 158 L475 168 C465 174 450 174 435 174 L395 174 C385 142 340 142 330 174 L205 174 C195 142 150 142 140 174 L65 174 C45 174 38 162 40 148 Z"
                  fill={`url(#paint-grad-${activeColor.name})`}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Heavy Cladding Wheel Arches */}
                <path d="M135 174 C145 138 200 138 210 174" stroke="#0F172A" strokeWidth="6" />
                <path d="M325 174 C335 138 390 138 400 174" stroke="#0F172A" strokeWidth="6" />
                {/* Glasshouse */}
                <path
                  d="M100 82 L325 78 L375 126 L95 126 Z"
                  fill="url(#glass-reflection)"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                <rect x="230" y="78" width="9" height="48" fill="#0F172A" />
                <path d="M135 82 L150 82 L145 126 L125 126 Z" fill="#0F172A" />
                {/* Door lines & handles */}
                <line x1="235" y1="126" x2="235" y2="168" stroke="#0F172A" strokeWidth="2" />
                <rect x="210" y="133" width="14" height="4" rx="2" fill="#0F172A" />
                <rect x="285" y="133" width="14" height="4" rx="2" fill="#0F172A" />
              </g>
            )}

            {bodyStyle === 'coupe' && (
              <g id="coupe-group">
                {/* Low Fastback Sports Body */}
                <path
                  d="M45 140 L115 125 L210 80 L320 80 L405 128 L482 135 C495 138 498 152 492 162 L478 168 C468 174 450 174 435 174 L395 174 C385 145 345 145 335 174 L205 174 C195 145 155 145 145 174 L65 174 C45 174 38 160 40 148 Z"
                  fill={`url(#paint-grad-${activeColor.name})`}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                {/* Aggressive Front Splitter */}
                <path d="M475 168 L495 168 L492 173 L470 173 Z" fill="#0F172A" />
                {/* Sleek Frameless Window */}
                <path
                  d="M195 86 L310 85 L380 128 L160 128 Z"
                  fill="url(#glass-reflection)"
                  stroke="#0F172A"
                  strokeWidth="2"
                />
                <rect x="240" y="134" width="15" height="4" rx="2" fill="#0F172A" />
              </g>
            )}

            {/* COMMON AUTOMOTIVE DETAILS */}
            {/* Front Headlight Unit */}
            <g id="headlight-unit">
              <path
                d="M460 133 L485 136 L480 152 L455 148 Z"
                fill={headlights ? '#FEF08A' : '#E2E8F0'}
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              {headlights && (
                <circle cx="472" cy="142" r="5" fill="url(#headlight-bulb)" />
              )}
              {/* Daytime Running Light (DRL) LED Strip */}
              <path
                d="M462 134 L484 137"
                stroke={headlights ? '#FFFFFF' : '#94A3B8'}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>

            {/* Rear Taillight Unit */}
            <g id="taillight-unit">
              <path
                d="M40 138 L60 136 L62 152 L42 152 Z"
                fill="#DC2626"
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <line x1="43" y1="145" x2="59" y2="145" stroke="#FCA5A5" strokeWidth="2" />
            </g>

            {/* Front & Rear Turn Indicators (Hazard Blinkers) */}
            {hazardLights && (
              <g id="hazards">
                <circle cx="482" cy="148" r="4" fill="#F59E0B" className="animate-ping" />
                <circle cx="482" cy="148" r="3" fill="#FBBF24" />
                <circle cx="42" cy="148" r="4" fill="#F59E0B" className="animate-ping" />
                <circle cx="42" cy="148" r="3" fill="#FBBF24" />
              </g>
            )}

            {/* Exhaust Pipe & Smoke Puffs */}
            <g id="exhaust">
              <rect x="34" y="165" width="12" height="6" rx="2" fill="#334155" stroke="#0F172A" />
              {isDriving && (
                <motion.circle
                  animate={{
                    cx: [30, 5],
                    cy: [168, 162],
                    r: [2, 7],
                    opacity: [0.6, 0],
                  }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'easeOut' }}
                  fill="#94A3B8"
                />
              )}
            </g>

            {/* FRONT WHEEL ASSEMBLY (ANIMATED ROTATION) */}
            <g transform="translate(365, 174)">
              {/* Outer Tire */}
              <circle cx="0" cy="0" r="28" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
              <circle cx="0" cy="0" r="26" fill="#1E293B" />
              {/* Brake Disc & Caliper (Static behind spinning spokes) */}
              <circle cx="0" cy="0" r="18" fill="#64748B" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
              <rect x="10" y="-12" width="6" height="14" rx="2" fill="#DC2626" />
              {/* Spinning Alloy Rim */}
              <motion.g
                animate={
                  isDriving && speedLevel !== 'idle'
                    ? { rotate: 360 }
                    : { rotate: 0 }
                }
                transition={{
                  repeat: Infinity,
                  duration: wheelDuration,
                  ease: 'linear',
                }}
              >
                <circle cx="0" cy="0" r="17" fill="url(#rim-gradient)" stroke="#0F172A" strokeWidth="1" />
                {/* 5-Spoke Sport Design */}
                <line x1="0" y1="-16" x2="0" y2="16" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="-15" y1="-5" x2="15" y2="5" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="-9" y1="13" x2="9" y2="-13" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                {/* Center Hub */}
                <circle cx="0" cy="0" r="5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1" />
              </motion.g>
            </g>

            {/* REAR WHEEL ASSEMBLY (ANIMATED ROTATION) */}
            <g transform="translate(175, 174)">
              {/* Outer Tire */}
              <circle cx="0" cy="0" r="28" fill="#0F172A" stroke="#1E293B" strokeWidth="2" />
              <circle cx="0" cy="0" r="26" fill="#1E293B" />
              {/* Brake Disc */}
              <circle cx="0" cy="0" r="18" fill="#64748B" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
              <rect x="10" y="-12" width="6" height="14" rx="2" fill="#DC2626" />
              {/* Spinning Alloy Rim */}
              <motion.g
                animate={
                  isDriving && speedLevel !== 'idle'
                    ? { rotate: 360 }
                    : { rotate: 0 }
                }
                transition={{
                  repeat: Infinity,
                  duration: wheelDuration,
                  ease: 'linear',
                }}
              >
                <circle cx="0" cy="0" r="17" fill="url(#rim-gradient)" stroke="#0F172A" strokeWidth="1" />
                <line x1="0" y1="-16" x2="0" y2="16" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="-15" y1="-5" x2="15" y2="5" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <line x1="-9" y1="13" x2="9" y2="-13" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
                <circle cx="0" cy="0" r="5" fill="#F8FAFC" stroke="#0F172A" strokeWidth="1" />
              </motion.g>
            </g>
          </svg>
        </motion.div>

        {/* ANIMATED ROAD SURFACE & STRIPES */}
        <div className="relative w-full h-8 bg-slate-950 border-t border-slate-800 flex items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 opacity-70" />
          {/* Moving Dashed Lines */}
          <motion.div
            animate={
              isDriving && speedLevel !== 'idle'
                ? { x: [0, -160] }
                : { x: 0 }
            }
            transition={{
              repeat: Infinity,
              duration: roadDuration,
              ease: 'linear',
            }}
            className="flex gap-8 w-[200%] shrink-0 pl-4 z-10"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="w-10 h-1 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
              />
            ))}
          </motion.div>
        </div>
      </div>

      {/* CONTROLS BAR: DRIVE, HEADLIGHTS, SOUND, BODY STYLE SELECTOR */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Driving Dynamics & Throttle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => {
              if (!isDriving) {
                setIsDriving(true);
                setSpeedLevel('cruising');
              } else if (speedLevel === 'cruising') {
                setSpeedLevel('fast');
              } else if (speedLevel === 'fast') {
                setIsDriving(false);
                setSpeedLevel('idle');
              } else {
                setIsDriving(true);
                setSpeedLevel('cruising');
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isDriving && speedLevel !== 'idle'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>
              {!isDriving || speedLevel === 'idle'
                ? 'Parked (0 km/h)'
                : speedLevel === 'fast'
                ? 'Speed: 120 km/h'
                : 'Cruise: 80 km/h'}
            </span>
          </button>

          {/* Rev Engine Button */}
          <button
            onClick={handleRevEngine}
            disabled={isRevving}
            className={`px-2.5 py-1.5 rounded-xl border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              isRevving
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/40 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 text-orange-400'
            }`}
            title="Throttle Rev Engine"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>{isRevving ? 'REV!' : 'Rev Engine'}</span>
          </button>

          {/* Audio Engine Rumble Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`p-2 rounded-xl border transition active:scale-95 ${
              soundEnabled
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Engine Audio On' : 'Engine Audio Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Headlights Toggle */}
          <button
            onClick={() => setHeadlights((prev) => !prev)}
            className={`p-2 rounded-xl border transition active:scale-95 ${
              headlights
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.3)]'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={headlights ? 'Headlights: ON' : 'Headlights: OFF'}
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>

          {/* Hazards Toggle */}
          <button
            onClick={() => setHazardLights((prev) => !prev)}
            className={`p-2 rounded-xl border transition active:scale-95 ${
              hazardLights
                ? 'bg-amber-600 border-amber-500 text-white animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Hazard Warning Blinkers"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Style Quick Selector */}
        {!compact && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden sm:inline">
              Body:
            </span>
            {(['bakkie', 'hatchback', 'sedan', 'suv', 'coupe'] as BodyStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setBodyStyle(style)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                  bodyStyle === style
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
