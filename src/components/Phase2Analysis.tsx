import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LOCATION_MAP } from '../game/data';
import { validateEvidenceSelection } from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';
import { DetectiveDeductionLab } from './DetectiveDeductionLab';
import { SecretEvidenceRoom } from './SecretEvidenceRoom';

interface Phase2AnalysisProps {
  state: GameState;
  onSaveAnalysis: (
    selectedIds: LocationId[],
    opinionsByLoc: Record<LocationId, string>
  ) => void;
  onBackToHq: () => void;
  onProceedToPhase3: () => void;
}

function MagnifierCaseIllustration() {
  return (
    <svg
      viewBox="0 0 88 76"
      className="w-16 h-14 sm:w-20 sm:h-16 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Investigation Case File Folder */}
      <path
        d="M8 18C8 14.6863 10.6863 12 14 12H31L37 19H70C73.3137 19 76 21.6863 76 25V60C76 63.3137 73.3137 66 70 66H14C10.6863 66 8 63.3137 8 60V18Z"
        fill="#E8DFC9"
        stroke="#795A40"
        strokeWidth="2.5"
      />
      <rect x="14" y="24" width="56" height="36" rx="4" fill="#F8F5EC" stroke="#315C4C" strokeWidth="1.8" />
      <line x1="21" y1="34" x2="46" y2="34" stroke="#315C4C" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="21" y1="42" x2="41" y2="42" stroke="#A9C5AD" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="21" y1="50" x2="36" y2="50" stroke="#A9C5AD" strokeWidth="2.4" strokeLinecap="round" />
      {/* Gold Seal on Folder */}
      <circle cx="24" cy="18" r="3" fill="#E7B94F" />
      {/* Magnifying Glass */}
      <circle cx="56" cy="40" r="14.5" fill="#A9C5AD" fillOpacity="0.35" stroke="#315C4C" strokeWidth="3.5" />
      <circle cx="56" cy="40" r="10.5" stroke="#E7B94F" strokeWidth="2" />
      <path d="M50 35C52 33 55 32.5 58 33" stroke="#F8F5EC" strokeWidth="2" strokeLinecap="round" />
      <line
        x1="66.5"
        y1="50.5"
        x2="78"
        y2="62"
        stroke="#795A40"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <line
        x1="66.5"
        y1="50.5"
        x2="78"
        y2="62"
        stroke="#E7B94F"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Phase2Analysis({
  state,
  onSaveAnalysis,
  onBackToHq,
  onProceedToPhase3,
}: Phase2AnalysisProps) {
  const [selectedIds, setSelectedIds] = useState<LocationId[]>(state.selectedEvidenceIds);
  const [draftOpinions, setDraftOpinions] = useState<Record<LocationId, string>>({
    kantin: state.opinions.kantin.opinionText,
    kelas: state.opinions.kelas.opinionText,
    perpustakaan: state.opinions.perpustakaan.opinionText,
    taman: state.opinions.taman.opinionText,
  });

  // Track edit vs saved view per location card so students can save, view Profesor Nurin feedback, and re-edit
  const [editingLocs, setEditingLocs] = useState<Record<LocationId, boolean>>(() => ({
    kantin: (state.opinions.kantin.opinionText || '').trim().length < 10,
    kelas: (state.opinions.kelas.opinionText || '').trim().length < 10,
    perpustakaan: (state.opinions.perpustakaan.opinionText || '').trim().length < 10,
    taman: (state.opinions.taman.opinionText || '').trim().length < 10,
  }));

  const [openHints, setOpenHints] = useState<Record<LocationId, boolean>>({
    kantin: true,
    kelas: true,
    perpustakaan: true,
    taman: true,
  });

  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const textareaRefs = useRef<Partial<Record<LocationId, HTMLTextAreaElement | null>>>({});

  const toggleEvidence = (locId: LocationId) => {
    setError('');
    setSavedNotice(null);
    setSelectedIds((prev) => {
      if (prev.includes(locId)) {
        return prev.filter((id) => id !== locId);
      }
      if (prev.length >= 3) {
        setError('Anda hanya boleh memilih maksimum 3 bukti lokasi untuk analisis mendalam.');
        return prev;
      }
      return [...prev, locId];
    });
  };

  const insertStarter = (locId: LocationId, insertText: string) => {
    setError('');
    setSavedNotice(null);
    setEditingLocs((prev) => ({ ...prev, [locId]: true }));

    setDraftOpinions((prev) => {
      const current = prev[locId] || '';
      if (current.trim().length === 0) {
        return { ...prev, [locId]: insertText };
      }
      const needsSpace = !/\s$/.test(current);
      return { ...prev, [locId]: `${current}${needsSpace ? ' ' : ''}${insertText}` };
    });

    window.requestAnimationFrame(() => {
      const el = textareaRefs.current[locId];
      if (el) {
        el.focus();
      }
    });
  };

  const handleClearOpinion = (locId: LocationId) => {
    setError('');
    setSavedNotice(null);
    setEditingLocs((prev) => ({ ...prev, [locId]: true }));
    setDraftOpinions((prev) => ({ ...prev, [locId]: '' }));
    window.requestAnimationFrame(() => {
      textareaRefs.current[locId]?.focus();
    });
  };

  const handleClearAllOpinions = () => {
    setError('');
    setSavedNotice(null);
    setEditingLocs({
      kantin: true,
      kelas: true,
      perpustakaan: true,
      taman: true,
    });
    const cleared: Record<LocationId, string> = {
      kantin: '',
      kelas: '',
      perpustakaan: '',
      taman: '',
    };
    setDraftOpinions(cleared);
    onSaveAnalysis(selectedIds, cleared);
  };

  const handleSaveSingleOpinion = (locId: LocationId): boolean => {
    const selCheck = validateEvidenceSelection(selectedIds);
    if (!selCheck.valid) {
      setError(
        selCheck.error ||
          'Pilih sekurang-kurangnya 2 bukti lokasi di Papan Bukti Penyiasatan dahulu.'
      );
      return false;
    }

    const text = (draftOpinions[locId] || '').trim();
    if (text.length < 10) {
      setError(
        `Sila tulis ayat pendapat untuk "${LOCATION_MAP[locId].name}" dengan lebih lengkap (sekurang-kurangnya 10 aksara).`
      );
      return false;
    }

    setError('');
    setEditingLocs((prev) => ({ ...prev, [locId]: false }));
    onSaveAnalysis(selectedIds, draftOpinions);
    setSavedNotice(`Jawapan pendapat bagi ${LOCATION_MAP[locId].name} telah disimpan!`);
    return true;
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const selCheck = validateEvidenceSelection(selectedIds);
    if (!selCheck.valid) {
      setError(selCheck.error || 'Pilih 2 hingga 3 bukti lokasi.');
      return;
    }

    for (const locId of selectedIds) {
      if ((draftOpinions[locId] || '').trim().length < 10) {
        setEditingLocs((prev) => ({ ...prev, [locId]: true }));
        setError(
          `Sila tulis ayat pendapat anda untuk bukti "${LOCATION_MAP[locId].name}" dengan lebih lengkap.`
        );
        return;
      }
    }

    setError('');
    setEditingLocs((prev) => {
      const updated = { ...prev };
      for (const id of selectedIds) {
        updated[id] = false;
      }
      return updated;
    });
    onSaveAnalysis(selectedIds, draftOpinions);
    setSavedNotice('Semua ayat pendapat telah disimpan ke dalam Kad Keputusan Ejen!');
  };

  const canProceed =
    selectedIds.length >= 2 &&
    selectedIds.length <= 3 &&
    selectedIds.every((id) => (state.opinions[id]?.opinionText || '').trim().length >= 10);

  const selectedCount = selectedIds.length;
  const progressRatio = Math.min(1, selectedCount / 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7 text-[#1F362D]">
      {/* 1. HEADER FASA 2 */}
      <header className="hq-leather-folio rounded-2xl p-5 sm:p-6 border-2 border-[#c9a24b]/75 shadow-xl text-[#f4ebd0]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onBackToHq}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c9a24b] hover:text-[#f4ebd0] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F] rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Pusat Operasi
            </button>

            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-[#15402f] border border-[#c9a24b]/70 shadow-inner">
                <MagnifierCaseIllustration />
              </div>
              <div className="space-y-1">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#f4ebd0] tracking-tight">
                  Fasa 2: Makmal Analisis Kes
                </h1>
                <p className="text-sm sm:text-base font-medium text-[#A9C5AD]">
                  Misi Menganalisis Bukti – Teliti, Pilih dan Buktikan!
                </p>
              </div>
            </div>
          </div>

          {/* Live Evidence Selection Counter & Progress Bar */}
          <div className="bg-[#081f18] text-[#F8F5EC] rounded-xl px-4 py-3.5 border-2 border-[#E7B94F] shadow-sm min-w-[260px] space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono-tabular text-sm font-bold tracking-wide text-[#F2CE74]">
                BUKTI DIPILIH: {selectedCount}/3
              </span>
              <span className="text-xs font-medium text-[#E8DFC9]">
                Min 2 · Maks 3
              </span>
            </div>

            <div
              className="relative h-3 w-full rounded-full bg-[#244639] border border-[#E7B94F]/35 overflow-hidden"
              role="progressbar"
              aria-valuenow={selectedCount}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-label="Kemajuan pemilihan bukti penyiasatan"
            >
              <motion.div
                className="h-full w-full rounded-full bg-gradient-to-r from-[#E7B94F] to-[#A9C5AD]"
                style={{ transformOrigin: 'left' }}
                initial={false}
                animate={{ scaleX: progressRatio }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Minimum 2 marker line at 66.6% */}
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-[66.66%] w-0.5 bg-[#F8F5EC]/60"
              />
            </div>

            <p className="text-[11px] text-[#A9C5AD] font-medium">
              {selectedCount === 0 && 'Belum ada fail kes dipilih.'}
              {selectedCount === 1 && 'Pilih sekurang-kurangnya 1 lagi bukti kes.'}
              {selectedCount === 2 && 'Syarat minimum (2 bukti) dipenuhi. Boleh tambah 1 lagi.'}
              {selectedCount === 3 && 'Pilihan maksimum (3/3) telah lengkap.'}
            </p>
          </div>
        </div>
      </header>

      {/* 2. PANEL PROFESOR NURIN */}
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

        {/* Game Character Dialogue Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-1 bg-[#F8F5EC] rounded-2xl p-5 sm:p-6 border-2 border-[#E7B94F] shadow-md flex flex-col justify-center"
        >
          {/* Speech Bubble Tail for Desktop */}
          <div
            aria-hidden="true"
            className="hidden sm:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rotate-45 bg-[#F8F5EC] border-l-2 border-b-2 border-[#E7B94F]"
          />

          <div className="flex items-center gap-2 text-xs font-bold text-[#795A40] mb-1.5">
            <MessageCircle className="w-4 h-4 text-[#315C4C]" />
            <span>Taklimat Meja Penyiasatan</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#315C4C]">Profesor Nurin</span>
          </div>

          <p className="text-sm sm:text-base text-[#1F362D] leading-relaxed font-medium">
            “Ejen! Anda telah mengumpulkan pelbagai bukti. Sekarang, teliti setiap bukti dan pilih
            yang paling penting untuk membantu anda membina pendapat yang bernas!”
          </p>
        </motion.div>
      </motion.section>

      {/* 3 & 4. THE SECRET EVIDENCE ROOM (INVESTIGATION WALL, CASE FILES, MAGNIFIER & COLLECTION) */}
      <SecretEvidenceRoom
        state={state}
        selectedIds={selectedIds}
        error={error}
        onToggleEvidence={toggleEvidence}
        onClearError={() => setError('')}
      />

      {/* 5. DETECTIVE DEDUCTION LAB (PANEL BINA PENDAPAT EJEN) */}
      <DetectiveDeductionLab
        state={state}
        selectedIds={selectedIds}
        draftOpinions={draftOpinions}
        editingLocs={editingLocs}
        openHints={openHints}
        textareaRefs={textareaRefs}
        error={error}
        savedNotice={savedNotice}
        canProceed={canProceed}
        onToggleEvidence={toggleEvidence}
        onDraftChange={(locId, value) => {
          setDraftOpinions((prev) => ({ ...prev, [locId]: value }));
          setSavedNotice(null);
          if (error) setError('');
        }}
        onSetEditingLoc={(locId, editing) => {
          setEditingLocs((prev) => ({ ...prev, [locId]: editing }));
          if (editing) {
            setSavedNotice(null);
          }
        }}
        onToggleHint={(locId) =>
          setOpenHints((prev) => ({ ...prev, [locId]: !prev[locId] }))
        }
        onInsertStarter={insertStarter}
        onClearOpinion={handleClearOpinion}
        onClearAllOpinions={handleClearAllOpinions}
        onSaveSingleOpinion={handleSaveSingleOpinion}
        onSaveAll={handleSaveAll}
        onProceedToPhase3={onProceedToPhase3}
      />
    </div>
  );
}
