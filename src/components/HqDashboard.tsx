import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  ChevronDown,
  Download,
  FileCode2,
  FileText,
  FolderSearch,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import hqOfficeBgImg from '../assets/images/hq_office_bg_1794976530813.jpg';
import profNurinArtImg from '../assets/images/prof_nurin_detective_1794976531008.jpg';
import { BADGES, LOCATIONS } from '../game/data';
import {
  getAgentRank,
  getCompletedLocationsCount,
  getEarnedBadgeIds,
  getOverallProgressPercent,
  getUnlockedPhaseLevel,
  isPhase1Complete,
  isPhase2Complete,
  isPhase3Complete,
  isPhase4Complete,
} from '../game/rules';
import type { AppScreen, AuthUser, GameState, LocationId } from '../game/types';
import { AgentIdCard } from './AgentIdCard';
import { BadgeIconSvg } from './DetectiveArt';
import { MissionStatusSection } from './MissionStatusSection';
import { PetaOperasiSection } from './PetaOperasiSection';

interface HqDashboardProps {
  state: GameState;
  authUser: AuthUser;
  onNavigatePhase: (screen: AppScreen, locationId?: LocationId) => void;
  onOpenEvidenceDrawer: () => void;
  onOpenDecisionDrawer: () => void;
  onExportJson: () => void;
  onResetGame: () => void;
  onLogout: () => void;
}

const CELEBRATION_SNAPSHOT_PREFIX = 'ejen_hq_celebration_snapshot_v1:';
const HOLD_RESET_DURATION_MS = 3000;

interface RankProgressInfo {
  currentRank: string;
  nextRank: string | null;
  percent: number;
  label: string;
}

function getRankXpProgress(xp: number, finalReportSaved: boolean): RankProgressInfo {
  const currentRank = getAgentRank(xp, finalReportSaved);
  if (finalReportSaved || xp >= 1000) {
    return {
      currentRank,
      nextRank: null,
      percent: 100,
      label: `${xp} XP · Pangkat Tertinggi Tercapai`,
    };
  }
  if (xp < 250) {
    return {
      currentRank,
      nextRank: 'Ejen Penyiasat',
      percent: Math.min(100, Math.round((xp / 250) * 100)),
      label: `${xp} / 250 XP menuju Ejen Penyiasat`,
    };
  }
  if (xp < 600) {
    return {
      currentRank,
      nextRank: 'Ejen Pakar',
      percent: Math.min(100, Math.round(((xp - 250) / 350) * 100)),
      label: `${xp} / 600 XP menuju Ejen Pakar`,
    };
  }
  return {
    currentRank,
    nextRank: 'Arkitek Sekolah Impian',
    percent: Math.min(100, Math.round(((xp - 600) / 400) * 100)),
    label: `${xp} / 1000 XP menuju Arkitek Sekolah Impian`,
  };
}

const AMBIENT_DUST_MOTES = [
  { id: 0, left: '6%', top: '16%', size: 4, dur: '7.5s', delay: '0s' },
  { id: 1, left: '18%', top: '62%', size: 3, dur: '8.4s', delay: '1.2s' },
  { id: 2, left: '34%', top: '28%', size: 5, dur: '6.9s', delay: '0.6s' },
  { id: 3, left: '52%', top: '12%', size: 3, dur: '8.2s', delay: '1.8s' },
  { id: 4, left: '72%', top: '34%', size: 4, dur: '7.1s', delay: '0.9s' },
  { id: 5, left: '88%', top: '22%', size: 3, dur: '9.0s', delay: '2.1s' },
  { id: 6, left: '92%', top: '66%', size: 4, dur: '7.8s', delay: '0.3s' },
  { id: 7, left: '42%', top: '84%', size: 3, dur: '8.7s', delay: '1.5s' },
];

const SPARKLE_PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const dist = 75 + ((i * 29) % 115);
  return {
    id: i,
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist - 35)}px`,
    delay: `${(i % 5) * 0.06}s`,
    dur: `${1.15 + (i % 4) * 0.18}s`,
    size: i % 3 === 0 ? 10 : 7,
  };
});

export function HqDashboard({
  state,
  authUser,
  onNavigatePhase,
  onOpenEvidenceDrawer,
  onOpenDecisionDrawer,
  onExportJson,
  onResetGame,
}: HqDashboardProps) {
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const [selectedLocId, setSelectedLocId] = useState<LocationId>(() => {
    const nextOpen = LOCATIONS.find((l) => !state.investigations[l.id].completed);
    return nextOpen ? nextOpen.id : LOCATIONS[0].id;
  });

  const [showSparkles, setShowSparkles] = useState(false);
  const [newlyEarnedIds, setNewlyEarnedIds] = useState<string[]>([]);
  const [phaseBannerMsg, setPhaseBannerMsg] = useState<string | null>(null);

  const [holdProgress, setHoldProgress] = useState(0);
  const [isHoldingReset, setIsHoldingReset] = useState(false);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number>(0);

  const completedCount = getCompletedLocationsCount(state);
  const unlockedLevel = getUnlockedPhaseLevel(state);
  const progressPercent = getOverallProgressPercent(state);
  const earnedBadges = getEarnedBadgeIds(state);
  const rank = getAgentRank(state.xp, state.finalReportSaved);
  const rankProgress = getRankXpProgress(state.xp, state.finalReportSaved);

  const [animatedGaugePct, setAnimatedGaugePct] = useState(0);

  const activeProfile = state.profile || authUser.profile;
  const displayName = activeProfile?.name || authUser.username;
  const agentRef = activeProfile?.agentId || authUser.referenceNo;

  const nurinInstruction = useMemo(() => {
    if (unlockedLevel === 1) {
      return `Pilih mana-mana daripada 4 lokasi di Peta Operasi untuk memulakan penyiasatan (${completedCount}/4 selesai).`;
    }
    if (unlockedLevel === 2) {
      return 'Keempat-empat lokasi telah selesai disiasat! Buka Makmal Analisis Kes untuk memilih bukti terbaik.';
    }
    if (unlockedLevel === 3) {
      return 'Ayat pendapat anda sangat baik! Uji kekuatan alasan dalam Buktikan Teori Ejen.';
    }
    if (unlockedLevel === 4) {
      return 'Semua bukti dan hujah lengkap. Masuk ke Studio Arkitek untuk merancang Pelan Sekolah Impian!';
    }
    return 'Pelan Sekolah Impian telah dibina. Lengkapkan Laporan Sekolah Impian sebagai produk akhir!';
  }, [unlockedLevel, completedCount]);

  const [typedInstruction, setTypedInstruction] = useState(nurinInstruction);

  // Smooth circular gauge sweep animation on load/update
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setAnimatedGaugePct(progressPercent);
      return;
    }
    const timer = window.setTimeout(() => {
      setAnimatedGaugePct(progressPercent);
    }, 90);
    return () => window.clearTimeout(timer);
  }, [progressPercent]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setTypedInstruction(nurinInstruction);
      return;
    }

    setTypedInstruction('');
    let idx = 0;
    const timer = window.setInterval(() => {
      idx += 1;
      setTypedInstruction(nurinInstruction.slice(0, idx));
      if (idx >= nurinInstruction.length) {
        window.clearInterval(timer);
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [nurinInstruction]);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 10;
      const ny = (e.clientY / window.innerHeight - 0.5) * 8;
      setParallaxOffset({ x: -nx, y: -ny });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const completedPhasesCount = [
      isPhase1Complete(state),
      isPhase2Complete(state),
      isPhase3Complete(state),
      isPhase4Complete(state),
      state.finalReportSaved,
    ].filter(Boolean).length;

    const snapshotKey = `${CELEBRATION_SNAPSHOT_PREFIX}${authUser.username}`;
    try {
      const rawPrev = window.sessionStorage.getItem(snapshotKey);
      if (rawPrev) {
        const prev = JSON.parse(rawPrev) as {
          badges: string[];
          phases: number;
        };
        const freshBadges = earnedBadges.filter((id) => !prev.badges.includes(id));
        const gainedPhase = completedPhasesCount > prev.phases;

        if (freshBadges.length > 0 || gainedPhase) {
          setNewlyEarnedIds(freshBadges);
          setPhaseBannerMsg(
            freshBadges.length > 0
              ? 'Tahniah, Ejen! Lencana baharu telah dibuka di dalam koleksi anda.'
              : 'Misi selesai! Peringkat penyiasatan seterusnya kini dibuka.'
          );

          const prefersReduced =
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!prefersReduced) {
            setShowSparkles(true);
          }

          window.sessionStorage.setItem(
            snapshotKey,
            JSON.stringify({ badges: earnedBadges, phases: completedPhasesCount })
          );

          const hideTimer = window.setTimeout(() => {
            setShowSparkles(false);
            setPhaseBannerMsg(null);
          }, 3600);
          return () => window.clearTimeout(hideTimer);
        }
      }
      window.sessionStorage.setItem(
        snapshotKey,
        JSON.stringify({ badges: earnedBadges, phases: completedPhasesCount })
      );
    } catch {
      // Ignore sessionStorage errors
    }
  }, [authUser.username, earnedBadges, state]);

  useEffect(() => {
    if (!idModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIdModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [idModalOpen]);

  useEffect(() => {
    return () => {
      if (holdRafRef.current !== null) {
        window.cancelAnimationFrame(holdRafRef.current);
      }
    };
  }, []);

  const handleToggleVoiceBrief = () => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(nurinInstruction);
    const voices = synth.getVoices();
    const malayVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('ms')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('id'));
    if (malayVoice) utterance.voice = malayVoice;
    utterance.lang = malayVoice?.lang || 'ms-MY';
    utterance.rate = 0.96;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synth.speak(utterance);
  };

  const handleContinueAdventure = () => {
    if (unlockedLevel === 1) {
      const nextLoc = LOCATIONS.find((l) => !state.investigations[l.id].completed) || LOCATIONS[0];
      onNavigatePhase('phase1', nextLoc.id);
    } else if (unlockedLevel === 2) {
      onNavigatePhase('phase2');
    } else if (unlockedLevel === 3) {
      onNavigatePhase('phase3');
    } else if (unlockedLevel === 4) {
      onNavigatePhase('phase4');
    } else {
      onNavigatePhase('phase5');
    }
  };

  const cancelHoldReset = () => {
    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    setIsHoldingReset(false);
    setHoldProgress(0);
  };

  const startHoldReset = () => {
    if (isHoldingReset) return;
    setIsHoldingReset(true);
    holdStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - holdStartRef.current;
      const pct = Math.min(100, (elapsed / HOLD_RESET_DURATION_MS) * 100);
      setHoldProgress(pct);
      if (elapsed >= HOLD_RESET_DURATION_MS) {
        holdRafRef.current = null;
        setIsHoldingReset(false);
        setHoldProgress(0);
        setTeacherOpen(false);
        onResetGame();
        return;
      }
      holdRafRef.current = window.requestAnimationFrame(tick);
    };

    holdRafRef.current = window.requestAnimationFrame(tick);
  };

  const phases = [
    {
      level: 1,
      screen: 'phase1' as AppScreen,
      shortTag: 'FASA 1',
      title: 'Operasi Jejak Bukti',
      desc: 'Siasat 4 lokasi di Sekolah Seri Bestari dan kumpulkan bukti persekitaran.',
      status: isPhase1Complete(state)
        ? 'Selesai (4/4 Lokasi)'
        : `${completedCount}/4 Lokasi Selesai`,
      unlocked: true,
      done: isPhase1Complete(state),
    },
    {
      level: 2,
      screen: 'phase2' as AppScreen,
      shortTag: 'FASA 2',
      title: 'Makmal Analisis Kes',
      desc: 'Pilih 2–3 bukti utama di papan penyiasatan dan bina ayat pendapat anda.',
      status: isPhase2Complete(state)
        ? 'Selesai'
        : isPhase1Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 1',
      unlocked: isPhase1Complete(state),
      done: isPhase2Complete(state),
    },
    {
      level: 3,
      screen: 'phase3' as AppScreen,
      shortTag: 'FASA 3',
      title: 'Buktikan Teori Ejen',
      desc: 'Kuasai cabaran alasan relevan dan tuliskan hujah sokongan bagi pendapat anda.',
      status: isPhase3Complete(state)
        ? 'Selesai'
        : isPhase2Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 2',
      unlocked: isPhase2Complete(state),
      done: isPhase3Complete(state),
    },
    {
      level: 4,
      screen: 'phase4' as AppScreen,
      shortTag: 'CABARAN AKHIR',
      title: 'Studio Arkitek',
      desc: 'Reka Pelan Sekolah Impian dengan School Builder dan pautkan justifikasi bukti.',
      status: isPhase4Complete(state)
        ? 'Selesai'
        : isPhase3Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Fasa 3',
      unlocked: isPhase3Complete(state),
      done: isPhase4Complete(state),
    },
    {
      level: 5,
      screen: 'phase5' as AppScreen,
      shortTag: 'PRODUK AKHIR',
      title: 'Laporan Sekolah Impian',
      desc: 'Tulis laporan pendapat 3–5 ayat, pratonton dan cetak hasil rasmi.',
      status: state.finalReportSaved
        ? 'Selesai · Laporan Disimpan'
        : isPhase4Complete(state)
        ? 'Terbuka'
        : 'Terkunci · Selesaikan Studio Arkitek',
      unlocked: isPhase4Complete(state),
      done: state.finalReportSaved,
    },
  ];

  const activeNextPhase = phases.find((p) => p.level === unlockedLevel) || phases[0];

  // Circular gauge SVG geometry
  const gaugeRadius = 54;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeDashOffset = gaugeCircumference * (1 - animatedGaugePct / 100);

  // Circular countdown geometry for 3s hold-to-reset button
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - holdProgress / 100);
  const remainingHoldSeconds = Math.max(
    1,
    Math.ceil(((100 - holdProgress) / 100) * (HOLD_RESET_DURATION_MS / 1000))
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-x-clip">
      {/* 1. CINEMATIC DETECTIVE HEADQUARTERS BACKGROUND */}
      <div
        aria-hidden="true"
        className="no-print fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#061812]"
      >
        {!bgFailed ? (
          <div
            className="w-full h-full will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(${parallaxOffset.x}px, ${parallaxOffset.y}px, 0) scale(1.06)`,
            }}
          >
            <img
              src={hqOfficeBgImg}
              alt=""
              onError={() => setBgFailed(true)}
              className="w-full h-full object-cover object-center brightness-[0.42] contrast-[1.08]"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#061812] via-[#123829] to-[#1a1510]" />
        )}

        {/* Atmospheric Dark Emerald & Warm Desk Lamp Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 50% 18%, rgba(21, 64, 47, 0.42) 0%, rgba(7, 26, 20, 0.84) 62%, rgba(5, 18, 14, 0.96) 100%)',
          }}
        />

        {/* Ambient Floating Golden Dust Motes */}
        {AMBIENT_DUST_MOTES.map((m) => (
          <span
            key={m.id}
            className="float-mote absolute rounded-full bg-[#E7B94F]/60 shadow-[0_0_8px_rgba(231,185,79,0.55)]"
            style={
              {
                left: m.left,
                top: m.top,
                width: `${m.size}px`,
                height: `${m.size}px`,
                '--mote-dur': m.dur,
                '--mote-delay': m.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Subtle Gold Sparkles (only triggered on genuine phase/badge completion) */}
      {showSparkles && (
        <div
          aria-hidden="true"
          className="no-print pointer-events-none fixed inset-x-0 top-28 z-50 flex justify-center"
        >
          <div className="relative w-1 h-1">
            {SPARKLE_PARTICLES.map((p) => (
              <span
                key={p.id}
                className="hq-sparkle-piece absolute block rounded-full bg-[#E7B94F] shadow-[0_0_8px_rgba(231,185,79,0.85)]"
                style={
                  {
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    '--tx': p.tx,
                    '--ty': p.ty,
                    '--delay': p.delay,
                    '--dur': p.dur,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Headquarters Layout Container (CSS Focus Selector Target) */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-[calc(3.5rem+env(safe-area-inset-bottom))] space-y-7 text-[#f4ebd0]">
        {/* Genuine Mission Completion Notification Banner */}
        {phaseBannerMsg && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-[#15402f] border-2 border-[#E7B94F] px-5 py-3.5 shadow-lg flex items-center gap-3 text-base font-semibold text-[#f4ebd0]"
          >
            <Sparkles className="w-5 h-5 text-[#E7B94F] shrink-0" />
            <span>{phaseBannerMsg}</span>
          </div>
        )}

        {/* 2, 3, 4. TOP COMMAND STAGE: LEFT PROFESOR NURIN · CENTRE BRIEFING · RIGHT PROGRESS */}
        <section
          aria-label="Ibu Pejabat Siasatan Ejen"
          className="hq-stage-1 hq-leather-folio relative rounded-2xl border-2 border-[#c9a24b]/80 overflow-hidden"
        >
          {/* Decorative Antique Gold Inner Frame Line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 rounded-xl border border-[#c9a24b]/25 z-20"
          />

          {/* Top Classification Strip */}
          <div className="relative z-10 bg-[#061913]/92 px-5 sm:px-7 py-2.5 border-b border-[#c9a24b]/45 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E7B94F]">
                <ShieldCheck className="w-4 h-4 text-[#E7B94F]" />
                {authUser.accessStatus}
              </span>
              <span aria-hidden="true" className="text-[#8a6a2f]">
                ·
              </span>
              <span className="text-[#f4ebd0] font-semibold">{authUser.organization}</span>
              <span aria-hidden="true" className="text-[#8a6a2f]">
                ·
              </span>
              <span className="text-[#a8b7a6]">
                NO. RUJUKAN: <strong className="text-[#f4ebd0]">{agentRef}</strong>
              </span>
            </div>

            <span className="text-[#E7B94F] font-semibold tracking-wider uppercase">
              FAIL KES: OP-SB-2026
            </span>
          </div>

          <div className="relative z-10 p-5 sm:p-6 lg:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT SECTION (4 cols): LARGE ILLUSTRATED PROFESOR NURIN WITH MAGNIFYING GLASS */}
            <div className="lg:col-span-4 relative flex flex-col justify-between rounded-2xl overflow-hidden border-2 border-[#c9a24b]/80 bg-[#071f17] shadow-[0_20px_44px_rgba(0,0,0,0.65)] min-h-[380px] lg:min-h-[430px]">
              {!portraitFailed ? (
                <img
                  src={profNurinArtImg}
                  alt="Ilustrasi Profesor Nurin memegang kanta pembesar di Ibu Pejabat Ejen Bahasa"
                  referrerPolicy="no-referrer"
                  onError={() => setPortraitFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover object-top scale-[1.02]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#15402f] to-[#081d15] text-[#E7B94F] px-6 text-center">
                  <span className="font-display text-5xl font-bold">PN</span>
                  <span className="text-base text-[#f4ebd0] mt-2 font-semibold">
                    Profesor Nurin
                  </span>
                </div>
              )}

              {/* Subtle Golden Desk Lamp Vignette Overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061812] via-[#061812]/25 to-transparent"
              />

              {/* Top Character Tag */}
              <div className="relative z-10 p-3.5 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-[#061812]/85 border border-[#c9a24b]/65 font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#E7B94F]">
                  MENTOR UTAMA HQ
                </span>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={handleToggleVoiceBrief}
                    className="inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-xl bg-[#0b2a21]/90 hover:bg-[#164432] border border-[#c9a24b]/75 text-xs font-bold text-[#f4ebd0] transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F]"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-[#E7B94F]" />
                        <span>Henti</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-[#E7B94F]" />
                        <span>Suara</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Engraved Brass Nameplate at Bottom of Portrait */}
              <div className="relative z-10 p-4 pt-10 flex flex-col items-center text-center gap-1.5">
                <div className="hq-brass-plaque px-4 py-1.5 rounded-lg border border-[#fff2c6]/60 shadow-lg">
                  <p className="font-mono-tabular text-xs font-extrabold tracking-widest uppercase text-[#202923]">
                    PROFESOR NURIN · PEMBIMBING HQ
                  </p>
                </div>
                <p className="text-xs text-[#d6e0d4] font-medium">
                  Ketua Operasi Akademi Ejen Rahsia
                </p>
              </div>
            </div>

            {/* CENTRE TOP (5 cols): WELCOME, PARCHMENT BRIEFING & SAMBUNG PENGEMBARAAN CTA */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4 py-1">
              <div className="space-y-2">
                <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.16em] text-[#E7B94F]">
                  {activeProfile?.codenameBadge || 'Anggota Penyiasat'} · {displayName}
                  {activeProfile?.className ? ` · Kelas ${activeProfile.className}` : ''}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl xl:text-[2.25rem] font-bold text-[#f4ebd0] leading-[1.12] hq-title-glow">
                  SELAMAT KEMBALI, EJEN!
                </h1>
                <p className="text-base sm:text-lg text-[#d7e2d5] font-medium">
                  Misi Sekolah Seri Bestari menanti anda.
                </p>
              </div>

              {/* Parchment-style Briefing Document: "ARAHAN PROFESOR NURIN" */}
              <div className="hq-parchment-pinned relative rounded-xl border-2 border-[#8a6a2f]/80 p-4 sm:p-5 text-[#202923]">
                <div className="flex items-center justify-between gap-2 border-b border-[#8a6a2f]/35 pb-2 mb-2.5">
                  <span className="font-mono-tabular text-xs font-extrabold uppercase tracking-wider text-[#6e501d]">
                    ARAHAN PROFESOR NURIN
                  </span>
                  <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-widest text-[#8c331d] border border-[#8c331d]/60 bg-[#f8ece6] px-2 py-0.5 rounded-sm">
                    SULIT · HQ
                  </span>
                </div>
                <p className="text-sm sm:text-base font-medium text-[#1f2923] leading-relaxed min-h-[4.2rem]">
                  {typedInstruction}
                  {typedInstruction.length < nurinInstruction.length && (
                    <span
                      aria-hidden="true"
                      className="inline-block w-2 h-4 ml-1 bg-[#8a6a2f] align-middle animate-pulse"
                    />
                  )}
                </p>
              </div>

              {/* Prominent Golden CTA + Compact Profile Links */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleContinueAdventure}
                  className="relative overflow-hidden w-full hq-brass-plaque inline-flex items-center justify-center gap-3 px-6 min-h-[54px] rounded-xl text-[#202923] font-display font-extrabold text-base sm:text-lg border-2 border-[#fff0c2]/70 shadow-[0_14px_30px_rgba(201,162,75,0.38)] transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4ebd0]"
                >
                  <span
                    aria-hidden="true"
                    className="hq-cta-sheen pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  />
                  <span className="relative z-10">SAMBUNG PENGEMBARAAN</span>
                  <ArrowRight className="relative z-10 w-5 h-5" />
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigatePhase('profile')}
                    className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-3.5 min-h-[42px] rounded-xl bg-[#0e3225] hover:bg-[#174836] border border-[#8a6a2f]/75 text-xs sm:text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap"
                  >
                    <UserCog className="w-4 h-4 text-[#E7B94F]" />
                    <span>
                      {activeProfile?.agentId ? 'Kemaskini Identiti' : 'Daftar Identiti Ejen'}
                    </span>
                  </button>

                  {activeProfile?.agentId && (
                    <button
                      type="button"
                      onClick={() => setIdModalOpen(true)}
                      className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-3.5 min-h-[42px] rounded-xl bg-[#0e3225] hover:bg-[#174836] border border-[#8a6a2f]/75 text-xs sm:text-sm font-semibold text-[#f4ebd0] transition-colors whitespace-nowrap"
                    >
                      <BadgeCheck className="w-4 h-4 text-[#E7B94F]" />
                      <span>Kad Identiti Digital</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SECTION (3 cols): COMPACT DARK EMERALD & GOLD OPERATION PROGRESS PANEL */}
            <aside
              aria-label="Kemajuan Operasi Ejen"
              className="lg:col-span-3 rounded-2xl bg-gradient-to-b from-[#0a291f] to-[#061812] border-2 border-[#c9a24b]/75 p-5 flex flex-col justify-between gap-4 shadow-[inset_0_1px_0_rgba(255,244,204,0.12),0_16px_34px_rgba(0,0,0,0.55)]"
            >
              <div className="text-center space-y-1 border-b border-[#8a6a2f]/40 pb-3">
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-[0.18em] text-[#E7B94F]">
                  STATUS OPERASI
                </p>
                <h2 className="font-display text-lg font-bold text-[#f4ebd0]">
                  REKOD KEMAJUAN
                </h2>
              </div>

              {/* Animated Circular Progress Gauge */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="relative w-32 h-32 flex items-center justify-center hq-gauge-glow">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                    <defs>
                      <linearGradient id="hqGaugeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF0B8" />
                        <stop offset="50%" stopColor="#E7B94F" />
                        <stop offset="100%" stopColor="#B48836" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="64"
                      cy="64"
                      r={gaugeRadius}
                      fill="rgba(7, 25, 19, 0.85)"
                      stroke="rgba(138, 106, 47, 0.34)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={gaugeRadius - 9}
                      fill="none"
                      stroke="rgba(231, 185, 79, 0.22)"
                      strokeWidth="1"
                      strokeDasharray="3 4"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={gaugeRadius}
                      fill="none"
                      stroke="url(#hqGaugeGold)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeDashOffset}
                      style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                    <circle cx="118" cy="64" r="3" fill="#FFF0B8" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-mono-tabular text-3xl font-extrabold text-[#f4ebd0] leading-none">
                      {progressPercent}%
                    </span>
                    <span className="font-mono-tabular text-[10px] font-bold uppercase tracking-wider text-[#E7B94F] mt-1">
                      SELESAI
                    </span>
                  </div>
                </div>
              </div>

              {/* XP, Badge Count & Detective Rank Readouts */}
              <div className="space-y-2.5 text-sm">
                <div className="rounded-xl bg-[#0e2f23]/85 border border-[#8a6a2f]/45 px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#a8b7a6]">
                    Markah XP
                  </span>
                  <span className="font-mono-tabular font-extrabold text-base text-[#E7B94F]">
                    {state.xp} XP
                  </span>
                </div>

                <div className="rounded-xl bg-[#0e2f23]/85 border border-[#8a6a2f]/45 px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-mono-tabular uppercase tracking-wider text-[#a8b7a6]">
                    Lencana
                  </span>
                  <span className="font-mono-tabular font-extrabold text-base text-[#f4ebd0]">
                    {earnedBadges.length} / {BADGES.length}
                  </span>
                </div>

                <div className="rounded-xl bg-[#0e2f23]/85 border border-[#8a6a2f]/45 px-3.5 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#a8b7a6]">
                      Pangkat
                    </span>
                    <span className="font-display text-xs font-bold text-[#E7B94F] text-right truncate">
                      {rank}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#061812] border border-[#8a6a2f]/35 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8a6a2f] via-[#E7B94F] to-[#fff0b8] transition-all duration-500"
                      style={{ width: `${rankProgress.percent}%` }}
                    />
                  </div>
                  <p className="font-mono-tabular text-[10px] text-[#a8b7a6] truncate">
                    {rankProgress.label}
                  </p>
                </div>
              </div>

              {/* Quick Dossier Drawers */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={onOpenEvidenceDrawer}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 min-h-[40px] rounded-xl bg-[#133b2c] hover:bg-[#1a503c] border border-[#8a6a2f]/70 text-xs font-semibold text-[#f4ebd0] transition-colors"
                >
                  <FolderSearch className="w-3.5 h-3.5 text-[#E7B94F] shrink-0" />
                  <span>Fail Bukti</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenDecisionDrawer}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 min-h-[40px] rounded-xl bg-[#133b2c] hover:bg-[#1a503c] border border-[#8a6a2f]/70 text-xs font-semibold text-[#f4ebd0] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#E7B94F] shrink-0" />
                  <span>Keputusan</span>
                </button>
              </div>
            </aside>
          </div>
        </section>

        {/* 5 & 6. CENTRE LARGE ILLUSTRATED SCHOOL MAP + RIGHT PINNED "MISI SETERUSNYA" DOSSIER */}
        <PetaOperasiSection
          state={state}
          completedCount={completedCount}
          selectedLocId={selectedLocId}
          onSelectLocId={setSelectedLocId}
          onNavigatePhase={onNavigatePhase}
          nextMission={{
            level: activeNextPhase.level,
            screen: activeNextPhase.screen,
            shortTag: activeNextPhase.shortTag,
            title: activeNextPhase.title,
            desc: activeNextPhase.desc,
            status: activeNextPhase.status,
          }}
        />

        {/* 7. BOTTOM – DETECTIVE ACHIEVEMENTS (HORIZONTAL METALLIC MEDAL SHOWCASE) */}
        <section
          aria-label="Lencana Ejen"
          className="hq-stage-3 hq-velvet-tray relative rounded-2xl border-2 border-[#c9a24b]/75 p-5 sm:p-7 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8a6a2f]/45 pb-4">
            <div>
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.2em] text-[#E7B94F]">
                GALERI PINGAT KEHORMATAN AKADEMI
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0]">
                LENCANA DETEKTIF EJEN
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#071c15] border border-[#c9a24b]/65 font-mono-tabular text-sm sm:text-base font-bold text-[#E7B94F]">
              <Award className="w-5 h-5" />
              {earnedBadges.length} / {BADGES.length} Diperoleh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {BADGES.map((badge) => {
              const earned = earnedBadges.includes(badge.id);
              const isNew = newlyEarnedIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`relative overflow-hidden rounded-2xl p-4 border-2 flex flex-col items-center text-center gap-3 transition-transform duration-200 hover:-translate-y-1 ${
                    earned
                      ? 'bg-gradient-to-b from-[#174634] to-[#0c291e] border-[#E7B94F] shadow-[0_14px_30px_rgba(0,0,0,0.55),0_0_20px_rgba(231,185,79,0.16)]'
                      : 'bg-gradient-to-b from-[#0b1f18] to-[#06130f] border-[#8a6a2f]/35'
                  } ${isNew ? 'hq-badge-pop' : ''}`}
                >
                  {earned && (
                    <div
                      aria-hidden="true"
                      className="hq-medal-glint pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#fff5cf]/25 to-transparent"
                    />
                  )}

                  {isNew && (
                    <span className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#E7B94F]">
                      <Sparkles className="w-3.5 h-3.5" />
                      BAHARU
                    </span>
                  )}

                  {/* Laurel-Framed Metallic Medal */}
                  <div className="relative">
                    <div
                      className={`rounded-full p-1.5 ${
                        earned
                          ? 'bg-[#092119] ring-2 ring-[#E7B94F]/75 shadow-[0_8px_22px_rgba(231,185,79,0.28)]'
                          : 'bg-[#101c18] ring-1 ring-[#8a6a2f]/45 opacity-85'
                      }`}
                    >
                      <BadgeIconSvg badgeId={badge.id} earned={earned} className="w-16 h-16" />
                    </div>
                    {!earned && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#17231e] border border-[#8a6a2f]/80 flex items-center justify-center text-[#c9a24b] shadow"
                      >
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  {/* Brass Nameplate + Requirement */}
                  <div className="space-y-1.5 w-full flex-1 flex flex-col justify-between">
                    <div
                      className={`px-2.5 py-1 rounded-lg ${
                        earned
                          ? 'hq-brass-plaque text-[#202923] border border-[#fff0c2]/45'
                          : 'bg-[#14221d] text-[#c4cfc7] border border-[#8a6a2f]/35'
                      }`}
                    >
                      <p className="font-display text-sm font-bold leading-tight">{badge.name}</p>
                    </div>
                    <p
                      className={`text-xs sm:text-[13px] leading-snug ${
                        earned ? 'text-[#f4ebd0]' : 'text-[#9aa9a0]'
                      }`}
                    >
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FIVE-PHASE OPERATION PROGRESSION TIMELINE (Preserves Full 5-Phase Navigation) */}
        <MissionStatusSection
          phases={phases}
          unlockedLevel={unlockedLevel}
          xp={state.xp}
          soundEnabled={state.soundEnabled}
          onNavigatePhase={onNavigatePhase}
        />

        {/* TEACHER AND DATA MANAGEMENT – COLLAPSIBLE RUANG GURU WITH 3S HOLD-TO-RESET */}
        <section
          aria-label="Ruang Guru dan Pengurusan Data"
          className="hq-stage-4 rounded-2xl bg-[#18211c]/95 border border-[#8a6a2f]/60 shadow-[0_16px_38px_rgba(2,10,8,0.55)] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setTeacherOpen((prev) => !prev)}
            aria-expanded={teacherOpen}
            className="w-full px-5 sm:px-6 py-4 min-h-[56px] flex items-center justify-between gap-4 text-left hover:bg-[#15402f]/45 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24b]"
          >
            <div>
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#E7B94F]">
                FAIL REKOD & ARKIB KES
              </p>
              <h2 className="font-display text-xl font-bold text-[#f4ebd0]">
                RUANG GURU
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#E7B94F] shrink-0">
              <span>{teacherOpen ? 'Tutup' : 'Buka'}</span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${teacherOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {teacherOpen && (
            <div className="px-5 sm:px-6 pb-6 pt-3 border-t border-[#8a6a2f]/35 space-y-5 bg-[#0b2a21]/85">
              <p className="text-base text-[#f4ebd0] leading-relaxed">
                Kemajuan murid disimpan secara automatik dalam storan setempat pelayar. Gunakan
                kawalan di bawah untuk mengeksport rekod, memuat turun fail kendiri, atau
                menetapkan semula operasi.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <button
                  type="button"
                  onClick={onExportJson}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] border border-[#8a6a2f]/75 text-[#f4ebd0] text-sm font-semibold transition-colors"
                >
                  <Download className="w-4 h-4 text-[#E7B94F]" />
                  <span>Eksport Rekod Murid (JSON)</span>
                </button>

                <a
                  href="/EJEN_BAHASA.html"
                  download="EJEN_BAHASA.html"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 min-h-[48px] rounded-xl bg-[#15402f] hover:bg-[#1b4e3a] text-[#f4ebd0] border border-[#8a6a2f]/75 text-sm font-semibold transition-colors"
                >
                  <FileCode2 className="w-4 h-4 text-[#E7B94F]" />
                  <span>Muat Turun Fail Kendiri (EJEN_BAHASA.html)</span>
                </a>

                <div className="space-y-2">
                  <button
                    type="button"
                    onPointerDown={startHoldReset}
                    onPointerUp={cancelHoldReset}
                    onPointerLeave={cancelHoldReset}
                    onPointerCancel={cancelHoldReset}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                        e.preventDefault();
                        startHoldReset();
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        cancelHoldReset();
                      }
                    }}
                    aria-label="Tekan dan tahan selama 3 saat untuk menetapkan semula operasi"
                    className="w-full inline-flex items-center justify-center gap-3 px-4 min-h-[52px] rounded-xl bg-[#49231d] hover:bg-[#5c2b23] text-[#f4ebd0] border border-[#c9a24b]/60 text-sm font-bold select-none transition-colors"
                  >
                    <span className="relative inline-flex items-center justify-center w-9 h-9 shrink-0">
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                        <circle
                          cx="18"
                          cy="18"
                          r={ringRadius}
                          fill="none"
                          stroke="rgba(244, 235, 208, 0.2)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r={ringRadius}
                          fill="none"
                          stroke="#E7B94F"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringDashOffset}
                        />
                      </svg>
                      {isHoldingReset ? (
                        <span className="absolute font-mono-tabular text-xs font-extrabold text-[#f4ebd0]">
                          {remainingHoldSeconds}
                        </span>
                      ) : (
                        <RotateCcw className="absolute w-3.5 h-3.5 text-[#E7B94F]" />
                      )}
                    </span>

                    <span>
                      {isHoldingReset
                        ? `Menetapkan semula (${remainingHoldSeconds}s)...`
                        : 'Tetapkan Semula Operasi (Tahan 3s)'}
                    </span>
                  </button>
                  <p className="text-xs text-[#a8b7a6] leading-snug">
                    Tekan dan tahan butang selama 3 saat untuk memadam semua bukti dan memulakan
                    operasi semula. Lepaskan butang lebih awal untuk membatalkan.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* DIGITAL AGENT IDENTITY CARD MODAL */}
        {idModalOpen && activeProfile && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kad Identiti Rasmi Ejen"
            className="fixed inset-0 z-50 bg-[#051510]/82 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-4xl space-y-3">
              <div className="no-print flex justify-end">
                <button
                  type="button"
                  onClick={() => setIdModalOpen(false)}
                  aria-label="Tutup Kad Identiti"
                  className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-[#0b2a21] border border-[#8a6a2f] text-sm font-semibold text-[#f4ebd0] shadow-lg hover:bg-[#15402f]"
                >
                  <X className="w-4 h-4 text-[#E7B94F]" />
                  <span>Tutup</span>
                </button>
              </div>
              <AgentIdCard profile={activeProfile} rankLabel={rank} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
