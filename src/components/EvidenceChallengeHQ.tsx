import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Award,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  FileCheck2,
  FileSearch,
  FileText,
  HelpCircle,
  Library,
  MessageCircle,
  Radar,
  Scale,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trees,
  Utensils,
  XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import kantinPhotoUrl from '../assets/images/kantin_ceria_realistik_1794831646132.jpg';
import kelasPhotoUrl from '../assets/images/kelas_harmoni_realistik_1794831926269.jpg';
import perpustakaanPhotoUrl from '../assets/images/perpustakaan_ilmu_realistik_1794832156528.jpg';
import tamanPhotoUrl from '../assets/images/taman_rekreasi_realistik_1794832375203.jpg';
import { gameAudio } from '../game/audio';
import { LOCATION_MAP, LOGIC_CHALLENGES } from '../game/data';
import {
  areLogicChallengesComplete,
  getAgentRank,
  getEarnedBadgeIds,
} from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';

type CaseSlotId = 'logic_kantin' | 'logic_kelas' | 'logic_taman' | 'ref_perpustakaan';

interface CaseDescriptor {
  slotId: CaseSlotId;
  caseCode: string;
  locId: LocationId;
  challengeId: string | null;
  icon: React.ComponentType<{ className?: string }>;
  photoUrl: string;
}

const CASE_SLOTS: CaseDescriptor[] = [
  {
    slotId: 'logic_kantin',
    caseCode: 'CASE 01',
    locId: 'kantin',
    challengeId: 'logic_kantin',
    icon: Utensils,
    photoUrl: kantinPhotoUrl,
  },
  {
    slotId: 'logic_kelas',
    caseCode: 'CASE 02',
    locId: 'kelas',
    challengeId: 'logic_kelas',
    icon: BookOpenCheck,
    photoUrl: kelasPhotoUrl,
  },
  {
    slotId: 'ref_perpustakaan',
    caseCode: 'CASE 03',
    locId: 'perpustakaan',
    challengeId: null,
    icon: Library,
    photoUrl: perpustakaanPhotoUrl,
  },
  {
    slotId: 'logic_taman',
    caseCode: 'CASE 04',
    locId: 'taman',
    challengeId: 'logic_taman',
    icon: Trees,
    photoUrl: tamanPhotoUrl,
  },
];

const AMBIENT_PARTICLES = [
  { id: 0, left: '7%', top: '16%', dur: '7.4s', delay: '0s' },
  { id: 1, left: '92%', top: '24%', dur: '6.6s', delay: '0.9s' },
  { id: 2, left: '28%', top: '76%', dur: '8.1s', delay: '0.4s' },
  { id: 3, left: '74%', top: '68%', dur: '7.0s', delay: '1.5s' },
  { id: 4, left: '51%', top: '28%', dur: '8.6s', delay: '1.1s' },
];

interface EvidenceChallengeHQProps {
  state: GameState;
  pendingSelections: Record<string, 'A' | 'B' | undefined>;
  confirmedChallenges: Record<string, boolean>;
  labSoundEnabled: boolean;
  onPickOption: (challengeId: string, optId: 'A' | 'B') => void;
  onConfirmOption: (challengeId: string) => void;
  onContinueToNotebook: () => void;
}

export function EvidenceChallengeHQ({
  state,
  pendingSelections,
  confirmedChallenges,
  labSoundEnabled,
  onPickOption,
  onConfirmOption,
  onContinueToNotebook,
}: EvidenceChallengeHQProps) {
  const [activeSlotId, setActiveSlotId] = useState<CaseSlotId>('logic_kantin');
  const [mobileCasesOpen, setMobileCasesOpen] = useState(false);
  const [mobileMentorOpen, setMobileMentorOpen] = useState(true);
  const [showMentorHint, setShowMentorHint] = useState<Record<string, boolean>>({});
  const [scanningChallengeId, setScanningChallengeId] = useState<string | null>(null);
  const [scanLabel, setScanLabel] = useState('MENGANALISIS KERELEVANAN BUKTI...');
  const [imageErrorMap, setImageErrorMap] = useState<Partial<Record<LocationId, boolean>>>({});

  const scanMidRef = useRef<number | null>(null);
  const scanEndRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanMidRef.current !== null) window.clearTimeout(scanMidRef.current);
      if (scanEndRef.current !== null) window.clearTimeout(scanEndRef.current);
    };
  }, []);

  const solvedCount = LOGIC_CHALLENGES.filter((ch) => {
    const ans = state.logicChallengeAnswers[ch.id];
    return Boolean(
      confirmedChallenges[ch.id] && ch.options.find((o) => o.id === ans)?.isRelevant
    );
  }).length;

  const allChallengesSolved =
    areLogicChallengesComplete(state) && solvedCount === LOGIC_CHALLENGES.length;

  const earnedBadges = getEarnedBadgeIds(state);
  const agentRank = getAgentRank(state.xp, state.finalReportSaved);

  const activeSlot =
    CASE_SLOTS.find((slot) => slot.slotId === activeSlotId) ?? CASE_SLOTS[0];
  const activeLoc = LOCATION_MAP[activeSlot.locId];
  const activeChallenge = activeSlot.challengeId
    ? LOGIC_CHALLENGES.find((ch) => ch.id === activeSlot.challengeId) ?? null
    : null;

  const pendingId = activeChallenge ? pendingSelections[activeChallenge.id] : undefined;
  const isConfirmed = Boolean(
    activeChallenge &&
      confirmedChallenges[activeChallenge.id] &&
      state.logicChallengeAnswers[activeChallenge.id]
  );
  const confirmedOpt =
    activeChallenge && isConfirmed
      ? activeChallenge.options.find(
          (o) => o.id === state.logicChallengeAnswers[activeChallenge.id]
        )
      : undefined;
  const isCaseSolved = Boolean(confirmedOpt?.isRelevant);
  const isScanningHere = Boolean(
    activeChallenge && scanningChallengeId === activeChallenge.id
  );
  const hintOpen = Boolean(showMentorHint[activeSlot.slotId]);

  const handleSelectSlot = (slotId: CaseSlotId) => {
    if (labSoundEnabled) {
      gameAudio.playClick();
    }
    setActiveSlotId(slotId);
    setMobileCasesOpen(false);
  };

  const handleTriggerScanner = (challengeId: string) => {
    if (!pendingSelections[challengeId] || scanningChallengeId) return;

    if (scanMidRef.current !== null) window.clearTimeout(scanMidRef.current);
    if (scanEndRef.current !== null) window.clearTimeout(scanEndRef.current);

    if (labSoundEnabled) {
      gameAudio.playClick();
    }
    setScanLabel('MENGANALISIS KERELEVANAN BUKTI...');
    setScanningChallengeId(challengeId);

    scanMidRef.current = window.setTimeout(() => {
      setScanLabel('MEMADANKAN PERNYATAAN DENGAN BUKTI...');
    }, 480);

    scanEndRef.current = window.setTimeout(() => {
      setScanningChallengeId(null);
      onConfirmOption(challengeId);
    }, 980);
  };

  // Mentor expression & dialogue state
  const mentorState: 'guidance' | 'scanning' | 'success' | 'encourage' = (() => {
    if (isScanningHere) return 'scanning';
    if (confirmedOpt?.isRelevant) return 'success';
    if (confirmedOpt && !confirmedOpt.isRelevant) return 'encourage';
    return 'guidance';
  })();

  const mentorMessage = (() => {
    if (!activeChallenge) {
      return `Fail ${activeLoc.name} ialah fail rujukan lapangan anda daripada Fasa 1 & 2. Jika anda memilih lokasi ini pada Fasa 2, tulis alasan anda di Buku Nota Bahagian B di bawah.`;
    }
    if (isScanningHere) {
      return 'Pengimbas Makmal Bukti sedang menyemak sama ada dokumen pilihan anda benar-benar menyokong pernyataan pendapat ini...';
    }
    if (isConfirmed && confirmedOpt) {
      return confirmedOpt.explanation;
    }
    if (pendingId) {
      return `Anda telah memilih Dokumen Bukti ${pendingId}. Klik "SAHKAN & IMBAS BUKTI" untuk menguji kerelevanannya dengan makmal forensik HQ.`;
    }
    return `Teliti pernyataan pendapat bagi ${activeLoc.name}. Bandingkan Dokumen Bukti A dan B — manakah yang menerangkan sebab atau kesan langsung?`;
  })();

  const mentorHeaderLabel = (() => {
    if (mentorState === 'scanning') return 'Sedang Mengimbas Bukti...';
    if (mentorState === 'success') return 'Maklum Balas Profesor Nurin (Tepat)';
    if (mentorState === 'encourage') return 'Maklum Balas Profesor Nurin (Cuba Semula)';
    return 'Bimbingan Profesor Nurin';
  })();

  return (
    <section
      aria-labelledby="part-a-heading"
      className="hq-secret-chamber relative overflow-hidden rounded-2xl border-2 border-[#D6AA4B]/80 p-4 sm:p-6 lg:p-7 space-y-5 text-[#F1E5C7]"
    >
      {/* Subtle Ambient Floating Golden Particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {AMBIENT_PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#D6AA4B]/45 float-mote"
            style={
              {
                left: p.left,
                top: p.top,
                '--mote-dur': p.dur,
                '--mote-delay': p.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 7. GAME-LIKE PROGRESSION HUD BAR */}
      <div className="relative rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/50 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="relative w-12 h-12 rounded-xl bg-[#123D30] border-2 border-[#D6AA4B] flex items-center justify-center shrink-0">
              <Radar className="w-6 h-6 text-[#D6AA4B] hq-radar-ring" />
            </div>
            <div className="space-y-0.5">
              <p className="font-mono-tabular text-[11px] font-bold tracking-widest text-[#D6AA4B]">
                THE SECRET DETECTIVE HEADQUARTERS · BAHAGIAN A
              </p>
              <h2
                id="part-a-heading"
                className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-[#F1E5C7] hq-title-glow"
              >
                UJIAN MAKMAL BUKTI (PROFESOR NURIN)
              </h2>
            </div>
          </div>

          {/* Connected Real Player HUD Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="rounded-lg bg-[#123D30]/80 border border-[#D6AA4B]/30 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Identiti Ejen</p>
              <p className="text-xs sm:text-sm font-bold text-[#F1E5C7] truncate">
                {state.profile?.name || 'Ejen Bestari'}
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/80 border border-[#D6AA4B]/30 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">XP &amp; Pangkat</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#D6AA4B]">
                {state.xp} XP · {agentRank}
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/80 border border-[#D6AA4B]/30 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Kemajuan Kes</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {solvedCount}/{LOGIC_CHALLENGES.length} SOLVED
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/80 border border-[#D6AA4B]/30 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Lencana · Bukti</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {earnedBadges.length}/5 · {state.selectedEvidenceIds.length} Kes
              </p>
            </div>
          </div>
        </div>

        {/* Compact Progress Meter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#D6AA4B]/20">
          <span className="font-mono-tabular text-xs font-bold text-[#D6AA4B]">
            CASE PROGRESS: {solvedCount}/{LOGIC_CHALLENGES.length} SOLVED
          </span>
          <div className="flex-1 min-w-[160px] max-w-md h-2 rounded-full bg-[#123D30] border border-[#D6AA4B]/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D6AA4B] to-[#A9C5AD] transition-all duration-300"
              style={{
                width: `${Math.round((solvedCount / LOGIC_CHALLENGES.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 9. MASTER DETECTIVE ACHIEVEMENT SEQUENCE (ONLY WHEN ALL REAL CASES SOLVED) */}
      <AnimatePresence>
        {allChallengesSolved && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="relative rounded-xl hq-brass-plaque p-4 sm:p-5 text-[#092B22] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#092B22] text-[#D6AA4B] flex items-center justify-center shrink-0 shadow-lg room-stamp-slam">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <p className="font-mono-tabular text-xs font-extrabold tracking-widest uppercase">
                  MASTER DETECTIVE UNLOCKED!
                </p>
                <p className="font-display text-base sm:text-lg font-bold">
                  TAHNIAH! ANDA TELAH BERJAYA MENGANALISIS SEMUA BUKTI DENGAN TEPAT.
                </p>
                <p className="text-xs font-semibold text-[#123D30]">
                  {LOGIC_CHALLENGES.length}/{LOGIC_CHALLENGES.length} Ujian Makmal Bukti Selesai ·
                  Ganjaran +120 XP Makmal Bukti Aktif
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onContinueToNotebook}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] text-[#F1E5C7] font-bold text-xs sm:text-sm shadow-md transition-colors whitespace-nowrap shrink-0"
            >
              Teruskan ke Bahagian B
              <ArrowDown className="w-4 h-4 text-[#D6AA4B]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. THREE-PANEL DETECTIVE HQ INTERFACE */}
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: CASE SELECTOR */}
        <aside
          aria-label="Pemilih Fail Kes"
          className="md:col-span-4 xl:col-span-3 rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/45 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#D6AA4B]" />
              <h3 className="font-display text-base font-bold text-[#F1E5C7]">
                Pemilih Fail Kes
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setMobileCasesOpen((prev) => !prev)}
              aria-expanded={mobileCasesOpen}
              className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-[#D6AA4B] px-2.5 py-1 rounded bg-[#123D30]"
            >
              {mobileCasesOpen ? 'Tutup' : 'Pilih Kes'}
              {mobileCasesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <nav
            aria-label="Senarai Kes Penyiasatan"
            className={`${mobileCasesOpen ? 'block' : 'hidden'} md:block space-y-2.5`}
          >
            {CASE_SLOTS.map((slot) => {
              const slotLoc = LOCATION_MAP[slot.locId];
              const SlotIcon = slot.icon;
              const isSelectedSlot = activeSlotId === slot.slotId;
              const slotChallenge = slot.challengeId
                ? LOGIC_CHALLENGES.find((c) => c.id === slot.challengeId)
                : null;
              const slotAns = slot.challengeId
                ? state.logicChallengeAnswers[slot.challengeId]
                : undefined;
              const slotConfirmed = Boolean(
                slot.challengeId && confirmedChallenges[slot.challengeId] && slotAns
              );
              const slotSolved = Boolean(
                slotConfirmed &&
                  slotChallenge?.options.find((o) => o.id === slotAns)?.isRelevant
              );
              const slotRetry = Boolean(slotConfirmed && !slotSolved);
              const slotPending = Boolean(
                slot.challengeId && !slotConfirmed && pendingSelections[slot.challengeId]
              );

              const statusText = !slotChallenge
                ? 'Arkib Lapangan'
                : slotSolved
                  ? 'Disahkan Tepat'
                  : slotRetry
                    ? 'Cuba Semula'
                    : slotPending
                      ? 'Sedia Diimbas'
                      : 'Menunggu Analisis';

              return (
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => handleSelectSlot(slot.slotId)}
                  aria-current={isSelectedSlot ? 'true' : undefined}
                  className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6AA4B] ${
                    isSelectedSlot
                      ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_20px_rgba(214,170,75,0.22)]'
                      : 'bg-[#092B22]/85 border-[#D6AA4B]/25 text-[#A9C5AD] hover:border-[#D6AA4B]/70 hover:text-[#F1E5C7]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isSelectedSlot
                        ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                        : slotSolved
                          ? 'bg-[#1a5240] text-[#D6AA4B] border-[#D6AA4B]/50'
                          : 'bg-[#071D17] text-[#D6AA4B] border-[#D6AA4B]/30'
                    }`}
                  >
                    <SlotIcon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-mono-tabular text-[11px] font-bold text-[#D6AA4B]">
                        {slot.caseCode}
                      </span>
                      {slotSolved ? (
                        <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0" />
                      ) : slotRetry ? (
                        <AlertCircle className="w-4 h-4 text-[#E07A5F] shrink-0" />
                      ) : isSelectedSlot ? (
                        <ArrowRight className="w-3.5 h-3.5 text-[#D6AA4B] shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs sm:text-sm font-bold truncate text-[#F1E5C7]">
                      {slotLoc.name}
                    </p>
                    <p className="text-[11px] text-[#A9C5AD] mt-0.5">{statusText}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* CENTRE PANEL: MAIN EVIDENCE INVESTIGATION TERMINAL */}
        <article
          key={activeSlot.slotId}
          aria-label={`Terminal Siasatan ${activeLoc.name}`}
          className="md:col-span-8 xl:col-span-6 relative overflow-hidden rounded-xl bg-[#0A1914] border-2 border-[#D6AA4B]/75 p-4 sm:p-6 space-y-5 shadow-2xl lab-report-reveal"
        >
          {/* 5. CINEMATIC EVIDENCE SCANNER OVERLAY */}
          {isScanningHere && (
            <div
              aria-live="polite"
              className="absolute inset-0 z-30 bg-[#04120E]/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-[#F1E5C7]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[#D6AA4B]/50 to-transparent border-b-2 border-[#D6AA4B] lab-scanner-beam pointer-events-none"
              />
              <div className="relative z-10 flex flex-col items-center gap-4 max-w-sm">
                <div className="w-16 h-16 rounded-full bg-[#123D30] border-2 border-[#D6AA4B] flex items-center justify-center shadow-[0_0_28px_rgba(214,170,75,0.45)]">
                  <ScanSearch className="w-8 h-8 text-[#D6AA4B]" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono-tabular text-xs sm:text-sm font-bold tracking-widest text-[#D6AA4B]">
                    {scanLabel}
                  </p>
                  <p className="text-xs text-[#A9C5AD]">
                    Menyemak hubung kait antara pernyataan pendapat dengan dokumen bukti
                  </p>
                </div>
                <div className="w-52 h-1.5 rounded-full bg-[#123D30] overflow-hidden border border-[#D6AA4B]/35">
                  <div className="h-full w-3/4 rounded-full bg-[#D6AA4B] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* TERMINAL CASE HEADER WITH LOCATION SCENE */}
          <div className="relative overflow-hidden rounded-xl border border-[#D6AA4B]/50 bg-[#123D30]">
            <div className="relative h-32 sm:h-36 w-full bg-gradient-to-br from-[#123D30] to-[#092B22]">
              {!imageErrorMap[activeSlot.locId] ? (
                <img
                  src={activeSlot.photoUrl}
                  alt={`Pemandangan lokasi ${activeLoc.name}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImageErrorMap((prev) => ({ ...prev, [activeSlot.locId]: true }))
                  }
                  className="w-full h-full object-cover opacity-70"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#D6AA4B]/50">
                  <activeSlot.icon className="w-14 h-14" />
                </div>
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0A1914] via-[#0A1914]/65 to-transparent"
              />

              {/* Verification Status Marker */}
              {isCaseSolved && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-md bg-[#092B22]/90 border-2 border-[#D6AA4B] text-[#D6AA4B] font-mono-tabular text-[11px] font-extrabold tracking-widest shadow-lg room-stamp-slam flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VERIFIED</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#D6AA4B]">
                    {activeSlot.caseCode} · {activeLoc.name.toUpperCase()}
                  </p>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-[#F1E5C7]">
                    {activeChallenge
                      ? activeChallenge.contextTitle
                      : `Arkib Bukti Lapangan · ${activeLoc.name}`}
                  </h3>
                </div>
                {activeChallenge && (
                  <span className="font-mono-tabular text-xs font-bold text-[#A9C5AD]">
                    {solvedCount}/{LOGIC_CHALLENGES.length} Selesai
                  </span>
                )}
              </div>
            </div>
          </div>

          {!activeChallenge ? (
            /* PERPUSTAKAAN ILMU FIELD DOSSIER REFERENCE (PRESERVING REAL DATA WITHOUT FAKE A/B QUIZ) */
            <div className="space-y-4">
              <div className="rounded-xl bg-[#F1E5C7] text-[#092B22] p-4 sm:p-5 border border-[#D6AA4B] space-y-2">
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#5C4128]">
                  Arkib Bukti &amp; Pendapat Fasa 2
                </p>
                <p className="text-sm font-bold">
                  {state.opinions.perpustakaan.opinionText.trim()
                    ? `“${state.opinions.perpustakaan.opinionText}”`
                    : 'Tiada pernyataan pendapat Fasa 2 direkodkan bagi Perpustakaan Ilmu.'}
                </p>
              </div>

              <div className="rounded-xl bg-[#092B22] border border-[#D6AA4B]/35 p-4 space-y-2.5 text-xs sm:text-sm">
                <p className="font-bold text-[#D6AA4B]">
                  Petunjuk Lapangan Ditemui ({state.investigations.perpustakaan.discoveredClueIds.length}/
                  {activeLoc.clues.length})
                </p>
                <ul className="space-y-1.5 text-[#E8DFC9]">
                  {activeLoc.clues.map((clue) => (
                    <li key={clue.id}>
                      <strong className="text-[#F1E5C7]">{clue.label}:</strong>{' '}
                      {clue.issueSummary}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#A9C5AD] pt-2 border-t border-[#D6AA4B]/20">
                  Lokasi ini tidak mempunyai ujian pilihan A/B dalam Makmal Bukti. Teruskan memilih{' '}
                  <strong>CASE 01, CASE 02 atau CASE 04</strong> untuk menguji kesesuaian bukti,
                  atau tulis alasan anda sendiri pada Bahagian B di bawah.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* ORIGINAL OPINION STATEMENT IN PARCHMENT TERMINAL BRIEF */}
              <div className="rounded-xl bg-[#F1E5C7] text-[#092B22] p-4 sm:p-5 border-2 border-[#D6AA4B] shadow-md space-y-1.5">
                <p className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#5C4128]">
                  PERNYATAAN PENDAPAT ASAL:
                </p>
                <p className="font-display text-base sm:text-lg font-bold leading-snug text-[#092B22]">
                  “{activeChallenge.opinion}”
                </p>
              </div>

              {/* 4. VISUAL DEDUCTION CONNECTION SYSTEM: OPINION -> EVIDENCE -> JUSTIFICATION */}
              <div className="rounded-xl bg-[#092B22] border border-[#D6AA4B]/40 p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono-tabular font-bold text-[#D6AA4B] inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    SISTEM SAMBUNGAN DEDUKSI
                  </span>
                  <span className="text-[#A9C5AD]">
                    {isConfirmed && confirmedOpt
                      ? confirmedOpt.isRelevant
                        ? 'Relevan · Menyokong Pendapat'
                        : 'Tidak Relevan · Fakta Umum Sahaja'
                      : pendingId
                        ? `Menyambung Dokumen Bukti ${pendingId}`
                        : 'Pilih Dokumen Bukti A atau B'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center items-center">
                  <div className="rounded-lg bg-[#123D30] border border-[#D6AA4B]/50 px-2.5 py-2">
                    <p className="font-mono-tabular text-[10px] font-bold text-[#D6AA4B]">01</p>
                    <p className="text-[11px] sm:text-xs font-bold text-[#F1E5C7]">PENDAPAT</p>
                  </div>
                  <div
                    className={`rounded-lg px-2.5 py-2 border transition-colors ${
                      pendingId
                        ? 'bg-[#1a5240] border-[#D6AA4B] text-[#F1E5C7]'
                        : 'bg-[#071D17] border-[#D6AA4B]/25 text-[#A9C5AD]'
                    }`}
                  >
                    <p className="font-mono-tabular text-[10px] font-bold text-[#D6AA4B]">02</p>
                    <p className="text-[11px] sm:text-xs font-bold">
                      BUKTI {pendingId ? `(${pendingId})` : ''}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg px-2.5 py-2 border transition-colors ${
                      isCaseSolved
                        ? 'hq-brass-plaque border-[#F1E5C7] text-[#092B22]'
                        : 'bg-[#071D17] border-[#D6AA4B]/25 text-[#A9C5AD]'
                    }`}
                  >
                    <p
                      className={`font-mono-tabular text-[10px] font-bold ${
                        isCaseSolved ? 'text-[#092B22]' : 'text-[#D6AA4B]'
                      }`}
                    >
                      03
                    </p>
                    <p className="text-[11px] sm:text-xs font-bold">JUSTIFIKASI</p>
                  </div>
                </div>

                {/* Dynamic Animated Golden Branch Connecting to Option A or Option B */}
                <svg
                  viewBox="0 0 240 28"
                  className="w-full h-7"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M120 2 L120 13 L60 13 L60 27"
                    stroke="#D6AA4B"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M120 2 L120 13 L180 13 L180 27"
                    stroke="#D6AA4B"
                    strokeOpacity="0.18"
                    strokeWidth="2"
                    fill="none"
                  />
                  {pendingId === 'A' && (
                    <motion.path
                      d="M120 2 L120 13 L60 13 L60 27"
                      stroke={
                        isConfirmed && confirmedOpt && !confirmedOpt.isRelevant
                          ? '#C2593F'
                          : '#D6AA4B'
                      }
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      fill="none"
                      className="lab-gold-line-flow"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25 }}
                    />
                  )}
                  {pendingId === 'B' && (
                    <motion.path
                      d="M120 2 L120 13 L180 13 L180 27"
                      stroke={
                        isConfirmed && confirmedOpt && !confirmedOpt.isRelevant
                          ? '#C2593F'
                          : '#D6AA4B'
                      }
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      fill="none"
                      className="lab-gold-line-flow"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.25 }}
                    />
                  )}
                </svg>
              </div>

              {/* 3. PHYSICAL EVIDENCE DOCUMENT CARDS (OPTION A & OPTION B) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeChallenge.options.map((opt) => {
                  const isPicked = pendingId === opt.id;
                  const showRight = isConfirmed && isPicked && opt.isRelevant;
                  const showWrong = isConfirmed && isPicked && !opt.isRelevant;
                  const DocIcon = opt.id === 'A' ? FileText : FileSearch;

                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      onClick={() => onPickOption(activeChallenge.id, opt.id)}
                      aria-pressed={isPicked}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.985 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className={`hq-ivory-paper relative text-left rounded-xl p-4 sm:p-5 border-2 text-[#092B22] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D6AA4B] ${
                        showRight
                          ? 'border-[#D6AA4B] ring-2 ring-[#D6AA4B] shadow-[0_14px_30px_rgba(214,170,75,0.28)] -translate-y-1'
                          : showWrong
                            ? 'border-[#C2593F] ring-2 ring-[#C2593F]/50 shadow-lg'
                            : isPicked
                              ? 'border-[#D6AA4B] ring-2 ring-[#D6AA4B]/70 shadow-[0_12px_26px_rgba(214,170,75,0.22)] -translate-y-1'
                              : 'border-[#795A40]/50 hover:border-[#D6AA4B]'
                      }`}
                    >
                      {/* Document Stamp / Header */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#5C4128]/20">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                              isPicked
                                ? 'bg-[#092B22] text-[#D6AA4B] border-[#D6AA4B]'
                                : 'bg-[#E8DFC9] text-[#123D30] border-[#5C4128]/30'
                            }`}
                          >
                            {showRight ? (
                              <FileCheck2 className="w-4 h-4" />
                            ) : (
                              <DocIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-mono-tabular text-[11px] font-extrabold tracking-wider text-[#5C4128]">
                              DOKUMEN BUKTI · KOD {opt.id}
                            </p>
                            <p className="text-[11px] font-bold text-[#123D30]">
                              Pilihan {opt.id}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                            showRight
                              ? 'bg-[#123D30] border-[#D6AA4B] text-[#D6AA4B]'
                              : showWrong
                                ? 'bg-[#C2593F] border-[#8C331D] text-white'
                                : isPicked
                                  ? 'bg-[#D6AA4B] border-[#092B22]/40 text-[#092B22]'
                                  : 'bg-white/75 border-[#5C4128]/35'
                          }`}
                        >
                          {isPicked && <Check className="w-4 h-4 stroke-[3]" />}
                        </span>
                      </div>

                      <p className="text-sm font-medium leading-relaxed text-[#092B22]">
                        {opt.text}
                      </p>

                      {isPicked && (
                        <div className="mt-3 pt-2 border-t border-[#5C4128]/15 flex items-center justify-between text-[11px] font-mono-tabular font-bold">
                          <span
                            className={
                              showWrong
                                ? 'text-[#8C331D]'
                                : showRight
                                  ? 'text-[#123D30]'
                                  : 'text-[#5C4128]'
                            }
                          >
                            {showRight
                              ? 'BUKTI DISAHKAN'
                              : showWrong
                                ? 'KURANG RELEVAN'
                                : 'DIPILIH UNTUK IMBASAN'}
                          </span>
                          <Scale className="w-3.5 h-3.5 text-[#5C4128]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* VERIFY & TRIGGER EVIDENCE SCANNER BUTTON */}
              {pendingId && !isConfirmed && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-[#A9C5AD]">
                    Anda boleh menukar Dokumen A atau B sebelum menjalankan imbasan HQ.
                  </p>
                  <button
                    type="button"
                    disabled={isScanningHere}
                    onClick={() => handleTriggerScanner(activeChallenge.id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl hq-brass-plaque hover:brightness-105 disabled:opacity-60 text-[#092B22] font-bold text-xs sm:text-sm shadow-lg transition-all whitespace-nowrap shrink-0"
                  >
                    <ScanSearch className="w-4 h-4" />
                    Sahkan Pilihan {pendingId} · Imbas Bukti
                  </button>
                </div>
              )}

              {/* INLINE RESULT BANNER (FOR TABLET/MOBILE + REINFORCEMENT AFTER SCAN) */}
              <AnimatePresence mode="wait">
                {isConfirmed && confirmedOpt && (
                  <motion.div
                    key={`${activeChallenge.id}-${confirmedOpt.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`rounded-xl p-4 text-xs sm:text-sm flex items-start gap-3 border-2 ${
                      confirmedOpt.isRelevant
                        ? 'bg-[#123D30] text-[#F1E5C7] border-[#D6AA4B]'
                        : 'bg-[#3D1A16] text-[#FCE5DF] border-[#C2593F]'
                    }`}
                  >
                    {confirmedOpt.isRelevant ? (
                      <ShieldCheck className="w-5 h-5 text-[#D6AA4B] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#F2A18D] shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-[#D6AA4B]">{mentorHeaderLabel}</p>
                      <p className="leading-relaxed">{confirmedOpt.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </article>

        {/* RIGHT PANEL: PROFESSOR NURIN (DETECTIVE MENTOR CHARACTER) */}
        <aside
          aria-label="Mentor Penyiasatan Profesor Nurin"
          className="md:col-span-12 xl:col-span-3 rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/45 p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#D6AA4B]" />
              <h3 className="font-display text-base font-bold text-[#F1E5C7]">
                Profesor Nurin
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setMobileMentorOpen((prev) => !prev)}
              aria-expanded={mobileMentorOpen}
              className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-[#D6AA4B] px-2.5 py-1 rounded bg-[#123D30]"
            >
              {mobileMentorOpen ? 'Tutup' : 'Buka'}
              {mobileMentorOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className={`${mobileMentorOpen ? 'space-y-4' : 'hidden md:block space-y-4'}`}>
            {/* Illustrated Portrait with Detective Aura & Speaking Indicator */}
            <div className="flex flex-row xl:flex-col items-center gap-3.5 xl:text-center">
              <div
                className={`p-1 rounded-full bg-gradient-to-br ${
                  mentorState === 'encourage'
                    ? 'from-[#C2593F] to-[#D6AA4B]'
                    : 'from-[#D6AA4B] to-[#5C4128]'
                } shrink-0 ${
                  mentorState === 'scanning' || mentorState === 'success' || hintOpen
                    ? 'lab-mentor-speak'
                    : ''
                }`}
              >
                <ProfesorCitraPortrait realistic className="w-16 h-16 xl:w-20 xl:h-20" />
              </div>

              <div className="space-y-0.5">
                <p className="font-display text-base font-bold text-[#F1E5C7]">
                  Profesor Nurin
                </p>
                <p className="font-mono-tabular text-[11px] font-semibold text-[#D6AA4B]">
                  {mentorState === 'success'
                    ? 'Status: Reaksi Positif'
                    : mentorState === 'encourage'
                      ? 'Status: Memberi Penjelasan'
                      : mentorState === 'scanning'
                        ? 'Status: Mengimbas Bukti'
                        : 'Ketua Makmal Forensik HQ'}
                </p>
              </div>
            </div>

            {/* Animated Dialogue Bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeSlot.slotId}-${mentorState}-${pendingId ?? 'none'}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-xl p-3.5 border text-xs sm:text-sm leading-relaxed ${
                  mentorState === 'encourage'
                    ? 'bg-[#3D1A16] border-[#C2593F] text-[#FCE5DF]'
                    : 'bg-[#123D30] border-[#D6AA4B]/55 text-[#F1E5C7]'
                }`}
              >
                <p className="font-bold text-[11px] text-[#D6AA4B] mb-1">
                  {mentorHeaderLabel}
                </p>
                <p>“{mentorMessage}”</p>
              </motion.div>
            </AnimatePresence>

            {/* Contextual Hint Toggle */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (labSoundEnabled) gameAudio.playHint();
                  setShowMentorHint((prev) => ({
                    ...prev,
                    [activeSlot.slotId]: !hintOpen,
                  }));
                }}
                aria-expanded={hintOpen}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] text-[#D6AA4B] border border-[#D6AA4B]/60 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <HelpCircle className="w-4 h-4" />
                {hintOpen ? 'Tutup Petunjuk Mentor' : 'Minta Petunjuk Profesor'}
              </button>

              {hintOpen && (
                <div className="rounded-xl bg-[#092B22] border border-[#D6AA4B]/40 p-3.5 text-xs text-[#E8DFC9] space-y-2 lab-report-reveal">
                  <p className="font-bold text-[#D6AA4B]">Petunjuk Analisis Bukti:</p>
                  <p className="leading-relaxed">
                    Alasan yang relevan menerangkan <strong>sebab</strong> atau{' '}
                    <strong>manfaat langsung</strong> apabila cadangan dalam pernyataan pendapat itu
                    dilaksanakan — bukan sekadar menyebut ciri fizikal atau fakta umum.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
