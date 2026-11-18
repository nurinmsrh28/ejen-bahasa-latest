import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  FlaskConical,
  MessageCircle,
  RotateCcw,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import { gameAudio } from '../game/audio';
import { LOCATION_MAP, LOGIC_CHALLENGES } from '../game/data';
import { areLogicChallengesComplete, isPhase3Complete } from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';
import { EvidenceChallengeHQ } from './EvidenceChallengeHQ';
import { ReasoningChamberHQ } from './ReasoningChamberHQ';

interface Phase3LogicLabProps {
  state: GameState;
  onSelectLogicOption: (challengeId: string, optionId: 'A' | 'B') => void;
  onSaveReasons: (reasons: Record<LocationId, string>) => void;
  onBackToHq: () => void;
  onProceedToPhase4: () => void;
}

type CaseProgressStatus =
  | 'Belum bermula'
  | 'Sedang dianalisis'
  | 'Jawapan telah disimpan'
  | 'Selesai';

const PROGRESS_CASE_ITEMS: {
  challengeId: string;
  locId: LocationId;
  label: string;
}[] = [
  { challengeId: 'logic_kantin', locId: 'kantin', label: 'Kes 1: Kantin Ceria' },
  { challengeId: 'logic_kelas', locId: 'kelas', label: 'Kes 2: Kelas Harmoni' },
  { challengeId: 'logic_taman', locId: 'taman', label: 'Kes 3: Taman Rekreasi' },
];

function SecretFileOpeningArt({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="relative w-44 h-36 mx-auto flex items-center justify-center">
      <svg
        viewBox="0 0 180 140"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Folder Back */}
        <path
          d="M22 36C22 30.4772 26.4772 26 32 26H68L78 36H148C153.523 36 158 40.4772 158 46V114C158 119.523 153.523 124 148 124H32C26.4772 124 22 119.523 22 114V36Z"
          fill="#795A40"
          stroke="#5C422D"
          strokeWidth="2.5"
        />

        {/* Emerging Secret Document Sheet */}
        <motion.g
          initial={{ y: 18, opacity: 0.5 }}
          animate={{ y: isOpen ? -14 : 8, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <rect
            x="38"
            y="24"
            width="104"
            height="76"
            rx="6"
            fill="#F8F5EC"
            stroke="#E7B94F"
            strokeWidth="2.2"
          />
          <line x1="50" y1="40" x2="108" y2="40" stroke="#315C4C" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="52" x2="128" y2="52" stroke="#A9C5AD" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="62" x2="118" y2="62" stroke="#A9C5AD" strokeWidth="3" strokeLinecap="round" />
          <rect x="50" y="72" width="44" height="14" rx="3" fill="#E7B94F" fillOpacity="0.28" stroke="#E7B94F" strokeWidth="1.5" />
          <text
            x="72"
            y="82"
            textAnchor="middle"
            fill="#795A40"
            fontSize="7.5"
            fontWeight="bold"
            fontFamily="monospace"
          >
            SULIT
          </text>
        </motion.g>

        {/* Folder Front Flap */}
        <path
          d="M22 58C22 53.5817 25.5817 50 30 50H150C154.418 50 158 53.5817 158 58V114C158 119.523 153.523 124 148 124H32C26.4772 124 22 119.523 22 114V58Z"
          fill="#E8DFC9"
          stroke="#795A40"
          strokeWidth="2.5"
        />
        {/* Academy Gold Seal */}
        <circle cx="90" cy="88" r="14" fill="#315C4C" stroke="#E7B94F" strokeWidth="2.5" />
        <path d="M84 88L88 92L97 83" stroke="#E7B94F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Moving Magnifying Glass Scanner */}
      <motion.div
        aria-hidden="true"
        className="absolute pointer-events-none"
        animate={{
          x: [-24, 24, -10, -24],
          y: [-8, 6, -12, -8],
          rotate: [-6, 8, -4, -6],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="w-12 h-12 rounded-full bg-[#A9C5AD]/35 border-[3px] border-[#E7B94F] shadow-lg flex items-center justify-center backdrop-blur-[1px]">
          <Search className="w-5 h-5 text-[#315C4C]" />
        </div>
      </motion.div>
    </div>
  );
}

export function Phase3LogicLab({
  state,
  onSelectLogicOption,
  onSaveReasons,
  onBackToHq,
  onProceedToPhase4,
}: Phase3LogicLabProps) {
  const [missionStarted, setMissionStarted] = useState<boolean>(false);
  const [fileOpened, setFileOpened] = useState<boolean>(false);
  const [labSoundEnabled, setLabSoundEnabled] = useState<boolean>(state.soundEnabled);

  // Pending selections allow students to switch between A & B before confirming
  const [pendingSelections, setPendingSelections] = useState<Record<string, 'A' | 'B' | undefined>>(() => ({
    ...state.logicChallengeAnswers,
  }));

  // Track which challenges have been confirmed (reveals feedback only AFTER confirming)
  const [confirmedChallenges, setConfirmedChallenges] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const ch of LOGIC_CHALLENGES) {
      if (state.logicChallengeAnswers[ch.id]) {
        initial[ch.id] = true;
      }
    }
    return initial;
  });

  const [draftReasons, setDraftReasons] = useState<Record<LocationId, string>>({
    kantin: state.opinions.kantin.reasonText,
    kelas: state.opinions.kelas.reasonText,
    perpustakaan: state.opinions.perpustakaan.reasonText,
    taman: state.opinions.taman.reasonText,
  });

  const [typingLoc, setTypingLoc] = useState<LocationId | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFileOpened(true), 220);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setLabSoundEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleToggleLabSound = () => {
    const next = !labSoundEnabled;
    setLabSoundEnabled(next);
    gameAudio.setEnabled(next);
    if (next) {
      gameAudio.playClick();
    }
  };

  const handleStartMission = () => {
    if (labSoundEnabled) {
      gameAudio.playHint();
    }
    setMissionStarted(true);
  };

  const handlePickOption = (challengeId: string, optId: 'A' | 'B') => {
    if (labSoundEnabled) {
      gameAudio.playClick();
    }
    setError('');
    setPendingSelections((prev) => ({ ...prev, [challengeId]: optId }));
    // Switching option resets confirmation until student clicks "Sahkan Pilihan"
    setConfirmedChallenges((prev) => ({ ...prev, [challengeId]: false }));
  };

  const handleConfirmOption = (challengeId: string) => {
    const chosenId = pendingSelections[challengeId];
    if (!chosenId) return;
    setError('');
    setConfirmedChallenges((prev) => ({ ...prev, [challengeId]: true }));
    onSelectLogicOption(challengeId, chosenId);
  };

  const handleReasonChange = (locId: LocationId, value: string) => {
    setDraftReasons((prev) => ({ ...prev, [locId]: value }));
    setSavedNotice(false);
    if (error) setError('');

    setTypingLoc(locId);
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      setTypingLoc((curr) => (curr === locId ? null : curr));
    }, 650);
  };

  const challengesPassed = areLogicChallengesComplete(state);
  const phase3Done = isPhase3Complete(state);

  const handleClearReason = (locId: LocationId) => {
    setDraftReasons((prev) => ({ ...prev, [locId]: '' }));
    setSavedNotice(false);
    if (error) setError('');
  };

  const handleSaveSingleReason = (locId: LocationId): boolean => {
    if ((draftReasons[locId] || '').trim().length < 10) {
      setError(
        `Sila tulis alasan yang relevan bagi menyokong pendapat anda untuk ${LOCATION_MAP[locId].name} (sekurang-kurangnya 10 aksara).`
      );
      return false;
    }

    setError('');
    onSaveReasons(draftReasons);

    const allSelectedValid =
      state.selectedEvidenceIds.length >= 2 &&
      state.selectedEvidenceIds.every((id) => (draftReasons[id] || '').trim().length >= 10);

    if (challengesPassed && allSelectedValid) {
      setSavedNotice(true);
      setCelebrationVisible(true);
    }

    return true;
  };

  const handleSubmitReasons = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengesPassed) {
      setError(
        'Sila sahkan jawapan relevan bagi kesemua 3 kes dalam Bahagian A (Ujian Makmal Bukti) dahulu.'
      );
      return;
    }

    for (const locId of state.selectedEvidenceIds) {
      if ((draftReasons[locId] || '').trim().length < 10) {
        setError(
          `Sila tulis alasan yang relevan bagi menyokong pendapat anda untuk ${LOCATION_MAP[locId].name} (sekurang-kurangnya 10 aksara).`
        );
        return;
      }
    }

    setError('');
    onSaveReasons(draftReasons);
    setSavedNotice(true);
    setCelebrationVisible(true);
  };

  // Compute progress status for KEMAJUAN PENYIASATAN panel
  const getCaseProgressStatus = (
    challengeId: string,
    locId: LocationId
  ): CaseProgressStatus => {
    const ch = LOGIC_CHALLENGES.find((c) => c.id === challengeId);
    const savedAns = state.logicChallengeAnswers[challengeId];
    const pendingAns = pendingSelections[challengeId];
    const isPartAConfirmed = Boolean(confirmedChallenges[challengeId] && savedAns);
    const isPartACorrect = Boolean(
      isPartAConfirmed && ch?.options.find((o) => o.id === savedAns)?.isRelevant
    );

    const isSelectedInPhase2 = state.selectedEvidenceIds.includes(locId);
    const savedReason = (state.opinions[locId]?.reasonText || '').trim();
    const draftReason = (draftReasons[locId] || '').trim();

    if (isSelectedInPhase2) {
      if (isPartACorrect && savedReason.length >= 10) {
        return 'Selesai';
      }
      if (savedReason.length >= 10) {
        return 'Jawapan telah disimpan';
      }
      if (isPartACorrect || isPartAConfirmed || Boolean(pendingAns) || draftReason.length > 0) {
        return 'Sedang dianalisis';
      }
      return 'Belum bermula';
    }

    // If this location wasn't selected in Phase 2, its completion tracks Part A + overall Phase 3 reasons
    const allSelectedReasonsSaved =
      state.selectedEvidenceIds.length >= 2 &&
      state.selectedEvidenceIds.every(
        (id) => (state.opinions[id]?.reasonText || '').trim().length >= 10
      );

    if (isPartACorrect && allSelectedReasonsSaved) {
      return 'Selesai';
    }
    if (isPartACorrect) {
      return 'Jawapan telah disimpan';
    }
    if (isPartAConfirmed || Boolean(pendingAns)) {
      return 'Sedang dianalisis';
    }
    return 'Belum bermula';
  };

  const progressStatuses = PROGRESS_CASE_ITEMS.map((item) => ({
    ...item,
    status: getCaseProgressStatus(item.challengeId, item.locId),
  }));

  const completedCaseCount = progressStatuses.filter((p) => p.status === 'Selesai').length;
  const savedOrDoneScore = progressStatuses.reduce((acc, p) => {
    if (p.status === 'Selesai') return acc + 1;
    if (p.status === 'Jawapan telah disimpan') return acc + 0.7;
    if (p.status === 'Sedang dianalisis') return acc + 0.35;
    return acc;
  }, 0);
  const progressRatio = Math.min(1, savedOrDoneScore / PROGRESS_CASE_ITEMS.length);

  // 1. ANIMASI PEMBUKAAN MISI
  if (!missionStarted) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-[#1F362D]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <button
            type="button"
            onClick={onBackToHq}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#795A40] hover:text-[#315C4C] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Pusat Operasi
          </button>

          <button
            type="button"
            onClick={handleToggleLabSound}
            aria-label={labSoundEnabled ? 'Matikan bunyi makmal' : 'Hidupkan bunyi makmal'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F5EC] border border-[#315C4C]/25 text-xs font-semibold text-[#315C4C] hover:bg-[#E8DFC9] transition-colors"
          >
            {labSoundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-[#315C4C]" />
                Bunyi Aktif
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#795A40]" />
                Bunyi Dimatikan
              </>
            )}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#315C4C] text-[#F8F5EC] rounded-3xl p-7 sm:p-10 border-4 border-[#E7B94F] shadow-2xl text-center space-y-6 relative overflow-hidden"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#244639] border border-[#E7B94F]/60 text-xs font-mono-tabular font-bold text-[#F2CE74]">
            <FlaskConical className="w-4 h-4" />
            <span>FORENSIC LAB · MAKMAL ANALISIS BUKTI</span>
          </div>

          <SecretFileOpeningArt isOpen={fileOpened} />

          <div className="space-y-3 max-w-2xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="font-display text-3xl sm:text-4xl font-bold text-[#F2CE74] tracking-tight"
            >
              FASA 3 – BUKTIKAN TEORI EJEN
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38 }}
              className="text-base sm:text-lg text-[#E8DFC9] font-medium"
            >
              “Teliti bukti, analisis pendapat dan buktikan alasan anda!”
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.55 }}
            className="pt-2 flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={handleStartMission}
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#E7B94F] hover:bg-[#F2CE74] text-[#1F362D] font-bold text-base shadow-xl border-2 border-[#F8F5EC]/60 transition-transform active:scale-95"
            >
              <Search className="w-5 h-5" />
              MULA PENYIASATAN
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-[#A9C5AD]">
              Fail kes Profesor Nurin sedia untuk diimbas dan dianalisis.
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 text-[#1F362D]">
      {/* Lab Header */}
      <header className="bg-[#F8F5EC] rounded-2xl p-5 sm:p-6 border-2 border-[#E7B94F]/75 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onBackToHq}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A40] hover:text-[#315C4C] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Pusat Operasi
              </button>
              <button
                type="button"
                onClick={() => setMissionStarted(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#315C4C] hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Lihat Animasi Misi
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-11 h-11 rounded-xl bg-[#315C4C] text-[#E7B94F] border border-[#E7B94F] flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono-tabular text-[11px] font-bold text-[#795A40]">
                  FORENSIC LAB · MAKMAL ANALISIS BUKTI
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#315C4C]">
                  FASA 3 – BUKTIKAN TEORI EJEN
                </h1>
              </div>
            </div>
            <p className="text-sm text-[#4A6358]">
              Teliti bukti, analisis pendapat dan buktikan alasan anda!
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleLabSound}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EFE8D6] hover:bg-[#E8DFC9] border border-[#795A40]/25 text-xs font-bold text-[#315C4C] transition-colors shrink-0"
          >
            {labSoundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-[#315C4C]" />
                Bunyi Aktif
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-[#795A40]" />
                Bunyi Dimatikan
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. PROFESOR NURIN SEBAGAI PEMBIMBING */}
      <motion.section
        aria-label="Arahan Profesor Nurin"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5"
      >
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="p-1 rounded-full bg-gradient-to-br from-[#E7B94F] to-[#795A40] shadow-md">
            <ProfesorCitraPortrait realistic className="w-20 h-20 sm:w-24 sm:h-24" />
          </div>
          <span className="mt-1.5 text-xs font-bold text-[#315C4C]">Profesor Nurin</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-1 bg-[#F8F5EC] rounded-2xl p-5 sm:p-6 border-2 border-[#E7B94F] shadow-md flex flex-col justify-center"
        >
          <div
            aria-hidden="true"
            className="hidden sm:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-[#F8F5EC] border-l-2 border-b-2 border-[#E7B94F]"
          />
          <div className="flex items-center gap-2 text-xs font-bold text-[#795A40] mb-1.5">
            <MessageCircle className="w-4 h-4 text-[#315C4C]" />
            <span>Pembimbing Makmal Bukti</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#315C4C]">Profesor Nurin</span>
          </div>
          <p className="text-sm sm:text-base text-[#1F362D] leading-relaxed font-medium">
            “Selamat datang ke Makmal Bukti, Ejen! Tiga kes sedang menanti anda. Teliti setiap
            pernyataan dan fikirkan alasan yang paling relevan untuk menyokong pendapat tersebut.”
          </p>
        </motion.div>
      </motion.section>

      {/* 6. PANEL KEMAJUAN MISI: KEMAJUAN PENYIASATAN */}
      <section
        aria-labelledby="mission-progress-heading"
        className="bg-[#315C4C] text-[#F8F5EC] rounded-2xl p-5 sm:p-6 border-2 border-[#E7B94F] shadow-lg space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#E7B94F]" />
            <h2 id="mission-progress-heading" className="font-display text-lg sm:text-xl font-bold">
              KEMAJUAN PENYIASATAN
            </h2>
          </div>
          <span className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F2CE74]">
            {completedCaseCount}/3 Kes Selesai
          </span>
        </div>

        <div
          className="h-3 w-full rounded-full bg-[#244639] border border-[#E7B94F]/40 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progressRatio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Bar kemajuan penyiasatan Fasa 3"
        >
          <motion.div
            className="h-full w-full rounded-full bg-gradient-to-r from-[#E7B94F] to-[#A9C5AD]"
            style={{ transformOrigin: 'left' }}
            initial={false}
            animate={{ scaleX: progressRatio }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {progressStatuses.map((item) => {
            const badgeStyle =
              item.status === 'Selesai'
                ? 'bg-[#D6EAD9] text-[#1F362D] border-[#A9C5AD]'
                : item.status === 'Jawapan telah disimpan'
                  ? 'bg-[#FFF8E6] text-[#5C422D] border-[#E7B94F]'
                  : item.status === 'Sedang dianalisis'
                    ? 'bg-[#E8DFC9] text-[#1F362D] border-[#E7B94F]/60'
                    : 'bg-[#244639] text-[#E8DFC9] border-[#F8F5EC]/20';
            return (
              <div
                key={item.challengeId}
                className="rounded-xl bg-[#244639]/80 border border-[#E7B94F]/35 p-3.5 flex items-center justify-between gap-2"
              >
                <span className="text-xs sm:text-sm font-semibold text-[#F8F5EC]">
                  {item.label}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 ${badgeStyle}`}
                >
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3 & 4. BAHAGIAN A – UJIAN MAKMAL BUKTI (SECRET DETECTIVE HQ) */}
      <EvidenceChallengeHQ
        state={state}
        pendingSelections={pendingSelections}
        confirmedChallenges={confirmedChallenges}
        labSoundEnabled={labSoundEnabled}
        onPickOption={handlePickOption}
        onConfirmOption={handleConfirmOption}
        onContinueToNotebook={() => {
          document
            .getElementById('part-b-notebook')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* 5. BAHAGIAN B – THE DETECTIVE'S REASONING CHAMBER */}
      <ReasoningChamberHQ
        state={state}
        draftReasons={draftReasons}
        typingLoc={typingLoc}
        labSoundEnabled={labSoundEnabled}
        challengesPassed={challengesPassed}
        phase3Done={phase3Done}
        savedNotice={savedNotice}
        celebrationVisible={celebrationVisible}
        error={error}
        onReasonChange={handleReasonChange}
        onClearReason={handleClearReason}
        onSaveSingleReason={handleSaveSingleReason}
        onSubmitReasons={handleSubmitReasons}
        onProceedToPhase4={onProceedToPhase4}
      />
    </div>
  );
}
