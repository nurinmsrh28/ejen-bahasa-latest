import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  ChevronDown,
  Compass,
  FileText,
  FolderOpen,
  FolderSearch,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AppScreen, AuthUser, GameState } from '../game/types';
import { getAgentRank, getEarnedBadgeIds } from '../game/rules';
import { AcademyEmblem } from './DetectiveArt';

interface GameHudProps {
  state: GameState;
  authUser: AuthUser | null;
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  onOpenEvidenceDrawer: () => void;
  onOpenDecisionDrawer: () => void;
  onToggleSound: () => void;
  onLogout: () => void;
}

export function GameHud({
  state,
  authUser,
  currentScreen,
  onNavigate,
  onOpenEvidenceDrawer,
  onOpenDecisionDrawer,
  onToggleSound,
  onLogout,
}: GameHudProps) {
  const rank = getAgentRank(state.xp, state.finalReportSaved);
  const badgeCount = getEarnedBadgeIds(state).length;
  const displayName = state.profile?.name || authUser?.profile?.name || authUser?.username || 'Ejen Bahasa';
  const subInfo = state.profile?.className || authUser?.organization || 'Sekolah Seri Bestari';
  const isHq = currentScreen === 'hq';

  // Animated XP count-up when viewing HQ dashboard
  const [displayedXp, setDisplayedXp] = useState(state.xp);
  const [failMenuOpen, setFailMenuOpen] = useState(false);
  const failMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isHq) {
      setDisplayedXp(state.xp);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || state.xp === 0) {
      setDisplayedXp(state.xp);
      return;
    }

    let rafId = 0;
    const duration = 680;
    const startVal = 0;
    const targetVal = state.xp;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedXp(Math.round(startVal + (targetVal - startVal) * eased));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [isHq, state.xp]);

  useEffect(() => {
    if (!failMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (failMenuRef.current && !failMenuRef.current.contains(e.target as Node)) {
        setFailMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFailMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [failMenuOpen]);

  if (isHq) {
    return (
      <header className="no-print sticky top-0 z-30 bg-gradient-to-b from-[#071e17] to-[#0b2a21] text-[#f4ebd0] border-b-2 border-[#c9a24b]/75 shadow-[0_12px_30px_rgba(3,12,9,0.68)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          {/* Left: Shield Crest + Agent Name & Rank */}
          <button
            type="button"
            onClick={() => onNavigate('hq')}
            aria-label="Pusat Operasi Akademi Ejen Bahasa"
            className="flex items-center gap-2.5 text-left min-w-0 min-h-[44px] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b] rounded-lg pr-1 shrink-0 max-w-[240px] sm:max-w-[280px]"
          >
            <AcademyEmblem className="w-10 h-10 shrink-0 drop-shadow-[0_2px_8px_rgba(231,185,79,0.42)]" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-[15px] truncate text-[#f4ebd0] leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] sm:text-xs text-[#E7B94F] font-medium truncate">
                {subInfo} · {rank}
              </p>
            </div>
          </button>

          {/* Center: Live XP & Badge Counter */}
          <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-xl bg-[#061812]/90 border border-[#8a6a2f]/65 shadow-inner shrink-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#E7B94F] font-mono-tabular font-bold uppercase tracking-wider text-xs">
                XP
              </span>
              <span
                data-testid="hud-xp-value"
                className="font-mono-tabular font-extrabold text-base text-[#f4ebd0]"
              >
                {displayedXp}
              </span>
            </div>
            <span aria-hidden="true" className="text-[#8a6a2f]/70">
              ·
            </span>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#E7B94F]" />
              <span
                data-testid="hud-badge-value"
                className="font-mono-tabular font-bold text-sm text-[#f4ebd0] whitespace-nowrap"
              >
                {badgeCount}/5 Lencana
              </span>
            </div>
          </div>

          {/* Right: Direct Navigation (Pusat Operasi, Fail Bukti, Kad Keputusan, Sound, Log Keluar) */}
          <nav
            aria-label="Navigasi Utama Ejen"
            className="flex items-center gap-1.5 sm:gap-2 shrink-0"
          >
            <button
              type="button"
              onClick={() => onNavigate('hq')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-[#164432] border border-[#E7B94F]/85 text-xs font-bold text-[#E7B94F] shadow-[0_0_12px_rgba(231,185,79,0.2)] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F]"
            >
              <Compass className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span>Pusat Operasi</span>
            </button>

            <button
              type="button"
              onClick={onOpenEvidenceDrawer}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-[#113527] hover:bg-[#194b38] border border-[#8a6a2f]/75 hover:border-[#E7B94F] text-xs font-semibold text-[#f4ebd0] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
            >
              <FolderSearch className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span>Fail Bukti</span>
            </button>

            <button
              type="button"
              onClick={onOpenDecisionDrawer}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-[#113527] hover:bg-[#194b38] border border-[#8a6a2f]/75 hover:border-[#E7B94F] text-xs font-semibold text-[#f4ebd0] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
            >
              <FileText className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span>Kad Keputusan</span>
            </button>

            {/* Mobile compact XP + Fail dropdown (< sm) */}
            <div className="flex sm:hidden items-center gap-1.5 mr-0.5 text-xs font-mono-tabular text-[#E7B94F] font-bold">
              <span>{displayedXp} XP</span>
              <span aria-hidden="true">·</span>
              <span>{badgeCount}/5</span>
            </div>

            <div className="relative sm:hidden" ref={failMenuRef}>
              <button
                type="button"
                onClick={() => setFailMenuOpen((prev) => !prev)}
                aria-expanded={failMenuOpen}
                aria-haspopup="menu"
                aria-label="Menu Fail dan Pusat Operasi"
                className="inline-flex items-center gap-1 px-2.5 min-h-[40px] rounded-xl bg-[#113527] hover:bg-[#194b38] border border-[#8a6a2f]/75 text-xs font-semibold text-[#f4ebd0] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#E7B94F]" />
                <span>Menu</span>
                <ChevronDown
                  className={`w-3 h-3 text-[#E7B94F] transition-transform ${
                    failMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {failMenuOpen && (
                <div
                  role="menu"
                  aria-label="Menu Fail Ejen"
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0b2a21] border border-[#8a6a2f] shadow-[0_18px_40px_rgba(0,0,0,0.7)] p-1.5 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setFailMenuOpen(false);
                      onNavigate('hq');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-sm font-semibold text-[#E7B94F] hover:bg-[#15402f]"
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    <span>Pusat Operasi</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setFailMenuOpen(false);
                      onOpenEvidenceDrawer();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-sm font-semibold text-[#f4ebd0] hover:bg-[#15402f]"
                  >
                    <FolderSearch className="w-4 h-4 text-[#E7B94F] shrink-0" />
                    <span>Fail Bukti</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setFailMenuOpen(false);
                      onOpenDecisionDrawer();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 min-h-[44px] rounded-lg text-left text-sm font-semibold text-[#f4ebd0] hover:bg-[#15402f]"
                  >
                    <FileText className="w-4 h-4 text-[#E7B94F] shrink-0" />
                    <span>Kad Keputusan</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={state.soundEnabled ? 'Bisukan bunyi' : 'Aktifkan bunyi'}
              title={state.soundEnabled ? 'Bisukan bunyi' : 'Aktifkan bunyi'}
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl bg-[#113527] hover:bg-[#194b38] border border-[#8a6a2f]/75 hover:border-[#E7B94F] text-[#f4ebd0] shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
            >
              {state.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#E7B94F]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#a8b7a6]" />
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Log keluar daripada akaun ejen"
              className="inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl bg-[#1f2923] hover:bg-[#4c221b] border border-[#8a6a2f]/70 hover:border-[#E7B94F]/80 text-xs font-semibold text-[#f4ebd0] whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span className="hidden md:inline">Log Keluar</span>
            </button>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="no-print md:sticky md:top-0 z-30 bg-[#315C4C] text-[#F8F5EC] border-b-2 border-[#E7B94F]/75 shadow-[0_6px_20px_rgba(49,92,76,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Agent Identity & Rank */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('hq')}
            aria-label="Kembali ke Pusat Operasi Ejen"
            className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F] rounded-lg"
          >
            <AcademyEmblem className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <p className="font-display font-bold text-sm sm:text-base truncate text-[#F8F5EC]">
                {displayName}
              </p>
              <p className="text-xs text-[#E7B94F] font-medium truncate">
                {subInfo} · {rank}
              </p>
            </div>
          </button>
        </div>

        {/* Live XP & Badges Readout */}
        <div className="flex items-center gap-5 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[#E7B94F] font-semibold uppercase tracking-wider text-xs">
              XP
            </span>
            <span className="font-mono-tabular font-bold text-base text-[#F8F5EC]">
              {state.xp}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#E7B94F]" />
            <span className="font-mono-tabular font-semibold text-[#F8F5EC]">
              {badgeCount}/5 Lencana
            </span>
          </div>
        </div>

        {/* Navigation, Dossier Shortcuts & Logout */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('hq')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#244639] hover:bg-[#3D6E5C] border border-[#E7B94F]/55 text-xs font-semibold text-[#F8F5EC] whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-[#E7B94F]" />
            Pusat Operasi
          </button>
          <button
            type="button"
            onClick={onOpenEvidenceDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#244639] hover:bg-[#3D6E5C] border border-[#E7B94F]/55 text-xs font-semibold text-[#F8F5EC] whitespace-nowrap shrink-0"
          >
            <FolderSearch className="w-3.5 h-3.5 text-[#E7B94F]" />
            Fail Bukti
          </button>
          <button
            type="button"
            onClick={onOpenDecisionDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#244639] hover:bg-[#3D6E5C] border border-[#E7B94F]/55 text-xs font-semibold text-[#F8F5EC] whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-[#E7B94F]" />
            Kad Keputusan
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={state.soundEnabled ? 'Bisukan bunyi' : 'Aktifkan bunyi'}
            className="p-2 rounded-lg bg-[#244639] hover:bg-[#3D6E5C] border border-[#E7B94F]/55 text-[#F8F5EC]"
          >
            {state.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#E7B94F]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#A9C5AD]" />
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log keluar daripada akaun ejen"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#244639] hover:bg-[#492920] border border-[#E7B94F]/45 text-xs font-semibold text-[#F8F5EC] whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-[#E7B94F]" />
            Log Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
