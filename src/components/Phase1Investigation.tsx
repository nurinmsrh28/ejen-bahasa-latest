import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  Lightbulb,
  MapPin,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { LOCATIONS, LOCATION_MAP } from '../game/data';
import { gameAudio } from '../game/audio';
import { isPhase1Complete, validateLocationSave } from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';
import { InteractiveLocationScene } from './LocationScenes';
import { Phase1Campus3D, type CampusCameraMode } from './Phase1Campus3D';

interface Phase1InvestigationProps {
  state: GameState;
  activeLocationId: LocationId;
  onSelectLocation: (locId: LocationId) => void;
  onDiscoverClue: (locId: LocationId, clueId: string) => void;
  onRequestHint: (locId: LocationId, nextLevel: 1 | 2 | 3) => void;
  onSaveLocation: (locId: LocationId, notes: string, initialProposal: string) => void;
  onBackToHq: () => void;
  onProceedToPhase2: () => void;
}

const LOCATION_CODES: Record<LocationId, string> = {
  kantin: '01',
  kelas: '02',
  perpustakaan: '03',
  taman: '04',
};

export function Phase1Investigation({
  state,
  activeLocationId,
  onSelectLocation,
  onDiscoverClue,
  onRequestHint,
  onSaveLocation,
  onBackToHq,
  onProceedToPhase2,
}: Phase1InvestigationProps) {
  const loc = LOCATION_MAP[activeLocationId];
  const inv = state.investigations[activeLocationId];

  const [activeClueId, setActiveClueId] = useState<string | null>(null);
  const [notes, setNotes] = useState(inv.notes);
  const [proposal, setProposal] = useState(inv.initialProposal);
  const [error, setError] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  // 3D Camera & Detective HUD states
  const [cameraMode, setCameraMode] = useState<CampusCameraMode>('overview');
  const [resetSignal, setResetSignal] = useState(0);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [toastClueId, setToastClueId] = useState<string | null>(null);

  const dossierSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setNotes(inv.notes);
    setProposal(inv.initialProposal);
    setActiveClueId(inv.discoveredClueIds[inv.discoveredClueIds.length - 1] || null);
    setError('');
    setSavedNotice(false);
    setToastClueId(null);
  }, [activeLocationId, inv.notes, inv.initialProposal]);

  const handleClueClick = (clueId: string, targetLocationId: LocationId = activeLocationId) => {
    setActiveClueId(clueId);
    setToastClueId(clueId);
    setError('');
    onDiscoverClue(targetLocationId, clueId);
  };

  const handle3DSelectLocation = (locId: LocationId, enterFocus = true) => {
    if (locId !== activeLocationId) {
      onSelectLocation(locId);
    } else if (state.soundEnabled) {
      gameAudio.playClick();
    }
    if (enterFocus) {
      setCameraMode('focus');
    }
  };

  const handleReturnOverview = () => {
    if (state.soundEnabled) gameAudio.playClick();
    setCameraMode('overview');
    setResetSignal((n) => n + 1);
  };

  const handleResetCamera = () => {
    if (state.soundEnabled) gameAudio.playClick();
    setResetSignal((n) => n + 1);
  };

  const handleHintClick = () => {
    const nextLevel = Math.min(3, inv.hintLevelUsed + 1) as 1 | 2 | 3;
    onRequestHint(activeLocationId, nextLevel);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateLocationSave(state, activeLocationId, notes, proposal);
    if (!check.valid) {
      if (state.soundEnabled) gameAudio.playError();
      setError(check.error || 'Sila lengkapkan maklumat lokasi.');
      return;
    }
    setError('');
    onSaveLocation(activeLocationId, notes.trim(), proposal.trim());
    setSavedNotice(true);
  };

  const scrollToDossier = () => {
    if (state.soundEnabled) gameAudio.playClick();
    dossierSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeClue = loc.clues.find((c) => c.id === activeClueId);
  const toastClue = loc.clues.find((c) => c.id === toastClueId);
  const all4Done = isPhase1Complete(state);

  const completedLocationsCount = LOCATIONS.filter(
    (item) => state.investigations[item.id].completed
  ).length;
  const totalCluesDiscovered = LOCATIONS.reduce(
    (sum, item) => sum + state.investigations[item.id].discoveredClueIds.length,
    0
  );
  const totalCluesCount = LOCATIONS.reduce((sum, item) => sum + item.clues.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-[#1F362D]">
      {/* =====================================================================
          HERO 3D EXPLORATION VIEWPORT — SEKOLAH SERI BESTARI
         ===================================================================== */}
      <section
        aria-label="Dunia Eksplorasi 3D Sekolah Seri Bestari"
        className="relative w-full h-[540px] sm:h-[610px] lg:h-[650px] rounded-2xl overflow-hidden border-2 border-[#8a6a2f]/80 shadow-2xl bg-[#c2e6f7]"
      >
        {/* 3D World Canvas + Floating Projected Location Markers */}
        <Phase1Campus3D
          state={state}
          activeLocationId={activeLocationId}
          cameraMode={cameraMode}
          activeClueId={activeClueId}
          resetSignal={resetSignal}
          onSelectLocation={handle3DSelectLocation}
          onSelectClue={(locId, clueId) => handleClueClick(clueId, locId)}
          onReturnOverview={handleReturnOverview}
        />

        {/* Compact Top Detective HUD Strip (zero backdrop-blur over WebGL canvas) */}
        <div className="pointer-events-none absolute top-0 inset-x-0 z-20 p-2.5 sm:p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-[#0b2a21]/92 border border-[#c9a24b]/60 shadow-lg text-[#f4ebd0]">
            <button
              type="button"
              onClick={onBackToHq}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15402f] hover:bg-[#1e5740] border border-[#c9a24b]/40 text-xs font-bold text-[#f4ebd0] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#E7B94F]" />
              <span className="hidden sm:inline">Pusat Operasi</span>
              <span className="sm:hidden">HQ</span>
            </button>

            <div className="pr-1">
              <p className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#E7B94F]">
                Fasa 1 · Operasi Jejak Bukti
              </p>
              <h1 className="font-display text-sm sm:text-base font-bold leading-tight text-[#f4ebd0]">
                {cameraMode === 'overview'
                  ? 'Peta Kampus 3D · Sekolah Seri Bestari'
                  : `Zon Fokus: ${loc.name}`}
              </h1>
            </div>
          </div>

          {/* Top Right Progress Stats & Camera Reset */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-[#0b2a21]/92 border border-[#c9a24b]/60 shadow-lg text-[#f4ebd0] flex items-center gap-3 text-xs font-mono-tabular">
              <div>
                <span className="text-[#A9C5AD] hidden sm:inline">Lokasi: </span>
                <strong className="text-[#E7B94F]">{completedLocationsCount}/4</strong>
              </div>
              <span className="h-3.5 w-px bg-[#c9a24b]/40" aria-hidden="true" />
              <div>
                <span className="text-[#A9C5AD] hidden sm:inline">Bukti: </span>
                <strong className="text-[#f4ebd0]">
                  {totalCluesDiscovered}/{totalCluesCount}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetCamera}
              title="Tetapkan semula sudut kamera"
              aria-label="Tetapkan semula sudut kamera"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-[#0b2a21]/92 hover:bg-[#15402f] border border-[#c9a24b]/60 text-[#E7B94F] shadow-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Evidence Discovery Dossier Notification (solid panel, zero backdrop-blur) */}
        {toastClue && (
          <div
            role="status"
            className="p1-toast-enter absolute top-20 left-3 sm:left-4 z-20 max-w-sm rounded-xl bg-[#0b2a21]/95 border-2 border-[#E7B94F] text-[#f4ebd0] p-3.5 shadow-2xl space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#E7B94F] text-[#0b2a21] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[10px] font-mono-tabular font-bold uppercase tracking-wider text-[#E7B94F]">
                    Bukti Ditemui · {loc.name} ({inv.discoveredClueIds.length}/{loc.clues.length})
                  </p>
                  <p className="text-sm font-bold text-[#f4ebd0] leading-snug">{toastClue.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToastClueId(null)}
                aria-label="Tutup notifikasi bukti"
                className="p-1 rounded-md text-[#A9C5AD] hover:text-[#f4ebd0] hover:bg-[#15402f]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#d7e8dc] leading-relaxed">{toastClue.issueSummary}</p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] italic text-[#E7B94F] line-clamp-2">
                “{toastClue.profesorReaction}”
              </p>
              <button
                type="button"
                onClick={scrollToDossier}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#E7B94F] hover:bg-[#F2CE74] text-[#0b2a21] text-[11px] font-bold transition-colors"
              >
                Tulis Laporan
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Bottom Mission Control Dock (inspired by reference screenshot) */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 z-20 p-2.5 sm:p-3.5 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) gameAudio.playClick();
              setDockExpanded((prev) => !prev);
            }}
            className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[#0b2a21]/92 hover:bg-[#15402f] border border-b-0 border-[#c9a24b]/60 text-[11px] font-bold text-[#f4ebd0] shadow"
          >
            {dockExpanded ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#E7B94F]" />
                <span>Sembunyi Kawalan Misi</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#E7B94F]" />
                <span>Buka Kawalan Misi (4 Lokasi)</span>
              </>
            )}
          </button>

          {dockExpanded && (
            <div className="pointer-events-auto w-full max-w-6xl rounded-xl bg-[#0b2a21]/94 border-2 border-[#c9a24b]/75 p-2.5 sm:p-3 shadow-2xl space-y-2.5">
              {/* 4 Tactile Sector Cards */}
              <div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2"
                role="tablist"
                aria-label="Pilih lokasi penyiasatan"
              >
                {LOCATIONS.map((item) => {
                  const itemInv = state.investigations[item.id];
                  const done = itemInv.completed;
                  const active = item.id === activeLocationId;
                  const found = itemInv.discoveredClueIds.length;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handle3DSelectLocation(item.id, true)}
                      className={`min-h-[48px] px-3 py-2 rounded-lg border-2 text-left transition-colors flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[#E7B94F] border-[#fff1c2] text-[#0b2a21] shadow-md'
                          : done
                          ? 'bg-[#15402f] border-[#52c98e]/70 text-[#f4ebd0] hover:bg-[#1b523c]'
                          : 'bg-[#123326] border-[#c9a24b]/40 text-[#f4ebd0] hover:border-[#E7B94F] hover:bg-[#174231]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-[10px] font-mono-tabular font-bold uppercase tracking-wider ${
                            active ? 'text-[#2e2409]' : 'text-[#E7B94F]'
                          }`}
                        >
                          Misi {LOCATION_CODES[item.id]}
                        </p>
                        <p className="text-xs sm:text-sm font-bold truncate">{item.name}</p>
                      </div>

                      <div className="shrink-0 flex flex-col items-end">
                        {done ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              active
                                ? 'bg-[#0b2a21] text-[#52c98e]'
                                : 'bg-[#52c98e]/20 text-[#52c98e]'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            SELESAI
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-mono-tabular font-bold ${
                              active ? 'text-[#0b2a21]' : 'text-[#d7e8dc]'
                            }`}
                          >
                            {found}/{item.clues.length} bukti
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Camera Mode & Quick Dossier Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#c9a24b]/25">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleReturnOverview}
                    className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      cameraMode === 'overview'
                        ? 'bg-[#E7B94F] text-[#0b2a21] border-[#fff1c2]'
                        : 'bg-[#15402f] text-[#f4ebd0] border-[#c9a24b]/40 hover:border-[#E7B94F]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Peta Kampus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (state.soundEnabled) gameAudio.playClick();
                      setCameraMode('focus');
                      setResetSignal((n) => n + 1);
                    }}
                    className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      cameraMode === 'focus'
                        ? 'bg-[#E7B94F] text-[#0b2a21] border-[#fff1c2]'
                        : 'bg-[#15402f] text-[#f4ebd0] border-[#c9a24b]/40 hover:border-[#E7B94F]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Fokus: {loc.shortName}</span>
                  </button>

                  <span className="hidden md:inline-block text-[11px] text-[#A9C5AD] pl-2">
                    Seret untuk pusing 3D · Klik bangunan atau objek berkilau untuk kumpul bukti
                  </span>
                </div>

                <button
                  type="button"
                  onClick={scrollToDossier}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f4ebd0] hover:bg-white text-[#0b2a21] text-xs font-bold border border-[#E7B94F] shadow-sm transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#795A40]" />
                  <span>Gambar Sebenar & Laporan Ejen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          DETECTIVE INVESTIGATION WORKBENCH (PHOTO EVIDENCE + PROFESOR NURIN + REPORT)
         ===================================================================== */}
      <div
        ref={dossierSectionRef}
        id="phase1-dossier-deck"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-4"
      >
        {/* Left: Original Location Photograph Hotspots + Profesor Nurin Field Mentor */}
        <div className="lg:col-span-7 space-y-5">
          <div className="hq-ivory-paper rounded-2xl p-4 sm:p-5 border-2 border-[#8a6a2f]/45 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#315C4C]/15 pb-3">
              <div>
                <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#795A40]">
                  {loc.zoneLabel} · Kod Misi {LOCATION_CODES[activeLocationId]}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1F362D]">
                  Lokasi Siasatan: {loc.name}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#0b2a21] bg-[#E7B94F]/85 px-3 py-1.5 rounded-lg border border-[#8a6a2f]/40">
                <Camera className="w-3.5 h-3.5" />
                Petunjuk Ditemui: {inv.discoveredClueIds.length} / {loc.clues.length}
              </span>
            </div>

            <p className="text-sm text-[#2E483E] leading-relaxed">{loc.briefing}</p>

            {/* Original Location Photo with Exact Hotspot Detection Preserved */}
            <InteractiveLocationScene
              locationId={activeLocationId}
              discoveredClueIds={inv.discoveredClueIds}
              hintLevelUsed={inv.hintLevelUsed}
              activeClueId={activeClueId}
              onSelectClue={(clueId) => handleClueClick(clueId, activeLocationId)}
            />

            <p className="text-xs text-[#4A6358] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#795A40] shrink-0" />
              Klik penanda objek dalam dunia 3D di atas atau ikon kanta pembesar pada gambar sebenar
              ini untuk mengumpul bukti.
            </p>
          </div>

          {/* Profesor Nurin 3-Tier Guidance Panel (Original Photo Preserved) */}
          <div className="hq-leather-folio rounded-2xl p-5 border-2 border-[#c9a24b]/60 shadow-xl space-y-3.5 text-[#f4ebd0]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProfesorCitraPortrait realistic className="w-14 h-14 shrink-0" />
                <div>
                  <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#E7B94F]">
                    Bimbingan Profesor Nurin
                  </p>
                  <p className="text-xs text-[#A9C5AD]">
                    Tahap bantuan digunakan: {inv.hintLevelUsed} / 3
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleHintClick}
                disabled={inv.hintLevelUsed >= 3}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E7B94F] hover:bg-[#F2CE74] disabled:opacity-50 text-[#0b2a21] text-xs font-bold transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                <Lightbulb className="w-4 h-4" />
                {inv.hintLevelUsed === 0 && 'Minta Petunjuk Tahap 1'}
                {inv.hintLevelUsed === 1 && 'Minta Petunjuk Tahap 2'}
                {inv.hintLevelUsed === 2 && 'Aktifkan Sorotan Visual (Tahap 3)'}
                {inv.hintLevelUsed >= 3 && 'Semua Bantuan Aktif'}
              </button>
            </div>

            {activeClue ? (
              <div className="bg-[#f4ebd0] rounded-xl p-4 border-2 border-[#c9a24b] space-y-1.5 text-[#1F362D]">
                <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#315C4C]">
                  Bukti Ditemui: {activeClue.label}
                </p>
                <p className="text-sm font-semibold text-[#1F362D]">{activeClue.issueSummary}</p>
                <p className="text-xs text-[#4A6358] italic">
                  Profesor Nurin: “{activeClue.profesorReaction}”
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#f4ebd0]/95 bg-[#15402f]/70 rounded-xl p-3.5 border border-[#c9a24b]/30">
                “Teliti persekitaran 3D dan foto sebenar {loc.name} dengan cermat, Ejen. Klik
                kawasan yang menunjukkan masalah untuk merekodkan bukti.”
              </p>
            )}

            {inv.hintLevelUsed > 0 && (
              <div className="space-y-2 pt-1">
                {loc.hints.slice(0, inv.hintLevelUsed).map((hintText, index) => (
                  <p
                    key={index}
                    className="text-xs text-[#1F362D] bg-[#f4ebd0] rounded-lg px-3.5 py-2.5 border border-[#E7B94F] font-medium"
                  >
                    {hintText}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Discovered Clues Checklist + Fail Laporan Penyiasatan */}
        <div className="lg:col-span-5 space-y-5">
          <div className="hq-ivory-paper rounded-2xl p-5 border-2 border-[#8a6a2f]/45 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#315C4C]/15 pb-2.5">
              <h3 className="font-display text-lg font-bold text-[#1F362D]">
                Fail Laporan Penyiasatan
              </h3>
              <span className="text-[11px] font-mono-tabular font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0b2a21] text-[#E7B94F]">
                {loc.shortName}
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#795A40]">
                Senarai Semak Bukti Lokasi ({inv.discoveredClueIds.length}/{loc.clues.length})
              </p>
              <ul className="space-y-2">
                {loc.clues.map((clue) => {
                  const found = inv.discoveredClueIds.includes(clue.id);
                  const isActive = activeClueId === clue.id;
                  return (
                    <li key={clue.id}>
                      <button
                        type="button"
                        disabled={!found}
                        onClick={() => found && setActiveClueId(clue.id)}
                        className={`w-full text-left rounded-xl p-3 border text-sm transition-colors ${
                          found
                            ? isActive
                              ? 'bg-[#A9C5AD]/65 border-[#315C4C] text-[#1F362D] shadow-sm'
                              : 'bg-[#A9C5AD]/35 border-[#315C4C]/35 text-[#1F362D] hover:bg-[#A9C5AD]/55'
                            : 'bg-[#E8DFC9]/65 border-[#315C4C]/15 text-[#4A6358] cursor-default'
                        }`}
                      >
                        <span className="font-semibold flex items-center justify-between gap-2">
                          <span>{found ? clue.label : 'Petunjuk Belum Ditemui'}</span>
                          <span
                            className={`text-xs font-mono-tabular ${
                              found ? 'text-[#244639] font-bold' : 'text-[#6A7B73]'
                            }`}
                          >
                            {found ? 'Ditemui' : 'Terkunci'}
                          </span>
                        </span>
                        {found && (
                          <span className="block text-xs text-[#2E483E] mt-1">
                            {clue.issueSummary}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-3 border-t border-[#315C4C]/20">
              <div>
                <label
                  htmlFor="notes-textarea"
                  className="block text-sm font-bold text-[#1F362D] mb-1.5"
                >
                  Catatan Pemerhatian Ejen
                </label>
                <textarea
                  id="notes-textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSavedNotice(false);
                    if (error) setError('');
                  }}
                  placeholder={`Catatkan masalah yang anda perhatikan di ${loc.name}...`}
                  className="w-full rounded-xl p-3 bg-white border-2 border-[#315C4C]/30 focus:border-[#0b2a21] focus:outline-none text-base sm:text-sm text-[#1F362D] placeholder-[#7B8B83]"
                />
              </div>

              <div>
                <label
                  htmlFor="proposal-textarea"
                  className="block text-sm font-bold text-[#1F362D] mb-1.5"
                >
                  Cadangan Penyelesaian Awal
                </label>
                <textarea
                  id="proposal-textarea"
                  rows={3}
                  value={proposal}
                  onChange={(e) => {
                    setProposal(e.target.value);
                    setSavedNotice(false);
                    if (error) setError('');
                  }}
                  placeholder={`Cadangkan langkah awal untuk menambah baik ${loc.name}...`}
                  className="w-full rounded-xl p-3 bg-white border-2 border-[#315C4C]/30 focus:border-[#0b2a21] focus:outline-none text-base sm:text-sm text-[#1F362D] placeholder-[#7B8B83]"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-[#FBECE8] border border-[#C2593F] text-xs font-semibold text-[#8C331D]"
                >
                  {error}
                </div>
              )}

              {savedNotice && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-[#A9C5AD]/55 border border-[#315C4C]/45 text-xs font-bold text-[#1F362D]"
                >
                  Bukti bagi {loc.name} telah disimpan ke Fail Bukti Ejen!
                </div>
              )}

              <button
                type="submit"
                className="min-h-[48px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0b2a21] hover:bg-[#15402f] border-2 border-[#E7B94F] text-[#f4ebd0] font-bold text-sm shadow-md transition-colors"
              >
                <Save className="w-4 h-4 text-[#E7B94F]" />
                Simpan Bukti Lokasi
              </button>
            </form>
          </div>

          {all4Done && (
            <div className="bg-[#0b2a21] text-[#f4ebd0] rounded-2xl p-5 border-2 border-[#E7B94F] space-y-3 shadow-xl">
              <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#E7B94F]">
                Fasa 1 Lengkap (4/4 Lokasi)
              </p>
              <p className="text-sm leading-relaxed text-[#f4ebd0]">
                Syabas, Ejen! Kesemua 4 lokasi telah disiasat. Makmal Analisis Kes kini dibuka.
              </p>
              <button
                type="button"
                onClick={onProceedToPhase2}
                className="min-h-[48px] w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E7B94F] hover:bg-[#F2CE74] text-[#0b2a21] font-bold text-sm transition-colors"
              >
                Teruskan ke Fasa 2: Makmal Analisis Kes
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
