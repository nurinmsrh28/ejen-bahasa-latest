import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  FileSearch,
  HelpCircle,
  Library,
  MessageCircle,
  PenTool,
  Pencil,
  PlusCircle,
  RotateCcw,
  Save,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trees,
  Utensils,
} from 'lucide-react';
import kantinPhotoUrl from '../assets/images/kantin_ceria_realistik_1794831646132.jpg';
import kelasPhotoUrl from '../assets/images/kelas_harmoni_realistik_1794831926269.jpg';
import perpustakaanPhotoUrl from '../assets/images/perpustakaan_ilmu_realistik_1794832156528.jpg';
import tamanPhotoUrl from '../assets/images/taman_rekreasi_realistik_1794832375203.jpg';
import { gameAudio } from '../game/audio';
import { LOCATIONS, LOCATION_MAP } from '../game/data';
import {
  countWords,
  getAgentRank,
  getEarnedBadgeIds,
  getOverallProgressPercent,
  validateEvidenceSelection,
} from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';

export const CASE_FILE_META: Record<
  LocationId,
  {
    orderCode: string;
    caseNumber: string;
    icon: React.ComponentType<{ className?: string }>;
    photoUrl: string;
    stimulatingQuestion: string;
    briefGuide: string;
    domainKeywords: string[];
  }
> = {
  kantin: {
    orderCode: '01',
    caseNumber: 'FAIL KES #01',
    icon: Utensils,
    photoUrl: kantinPhotoUrl,
    stimulatingQuestion:
      'Apakah isu paling ketara daripada bukti di Kantin Ceria, dan bagaimanakah keadaan ini dapat diperbaiki demi keselesaan murid?',
    briefGuide:
      'Fikirkan perkara yang anda perhatikan dalam catatan siasatan anda, kemudian nyatakan satu pendapat anda sendiri tentang tindakan yang wajar diambil.',
    domainKeywords: ['kantin', 'makan', 'sampah', 'meja', 'lantai', 'tong', 'sisa', 'bersih', 'bungkusan'],
  },
  kelas: {
    orderCode: '02',
    caseNumber: 'FAIL KES #02',
    icon: BookOpenCheck,
    photoUrl: kelasPhotoUrl,
    stimulatingQuestion:
      'Mengapakah situasi yang anda kesan di Kelas Harmoni perlu diberi perhatian, dan apakah perubahan yang dapat membantu pembelajaran murid?',
    briefGuide:
      'Hubungkan pemerhatian anda tentang ruang kelas dengan satu cadangan pendapat yang lahir daripada pemikiran anda sendiri.',
    domainKeywords: ['kelas', 'meja', 'kerusi', 'sudut', 'bahan', 'buku', 'belajar', 'susun', 'kemas', 'laluan'],
  },
  perpustakaan: {
    orderCode: '03',
    caseNumber: 'FAIL KES #03',
    icon: Library,
    photoUrl: perpustakaanPhotoUrl,
    stimulatingQuestion:
      'Apakah halangan yang menjejaskan keselesaan murid di Perpustakaan Ilmu, dan apakah pendapat anda untuk menggalakkan budaya membaca?',
    briefGuide:
      'Renungkan bukti yang telah anda temui di perpustakaan dan bina satu ayat pendapat yang jelas menggunakan kata-kata anda sendiri.',
    domainKeywords: ['perpustakaan', 'buku', 'baca', 'rak', 'kerusi', 'meja', 'sudut', 'selesa', 'kategori'],
  },
  taman: {
    orderCode: '04',
    caseNumber: 'FAIL KES #04',
    icon: Trees,
    photoUrl: tamanPhotoUrl,
    stimulatingQuestion:
      'Apakah kekurangan yang anda temui di Taman Rekreasi, dan bagaimanakah kawasan ini boleh dimanfaatkan oleh warga sekolah?',
    briefGuide:
      'Gunakan catatan pemerhatian anda sebagai asas untuk menyatakan pendapat anda tentang penjagaan dan kemudahan di taman sekolah.',
    domainKeywords: ['taman', 'pokok', 'bunga', 'tumbuhan', 'bangku', 'duduk', 'laman', 'hijau', 'rehat'],
  },
};

export const INTERACTIVE_STARTERS: { label: string; insertText: string }[] = [
  {
    label: 'Pada pendapat saya...',
    insertText: 'Pada pendapat saya, ',
  },
  {
    label: 'Saya berpendapat bahawa...',
    insertText: 'Saya berpendapat bahawa ',
  },
  {
    label: 'Bagi mengatasi masalah ini...',
    insertText: 'Bagi mengatasi masalah ini, ',
  },
];

const OPINION_MARKERS = [
  'pendapat',
  'berpendapat',
  'mengatasi',
  'perlu',
  'wajar',
  'patut',
  'sepatutnya',
  'harus',
  'supaya',
  'agar',
  'kerana',
  'bagi',
  'untuk',
  'cadang',
];

export interface GeneralFeedbackResult {
  completeness: { met: boolean; message: string };
  evidenceLink: { met: boolean; message: string };
  clarity: { met: boolean; message: string };
}

export function evaluateOpinionFeedback(
  text: string,
  locId: LocationId,
  studentNotes: string,
  studentProposal: string
): GeneralFeedbackResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const words = countWords(trimmed);
  const endsWithPunctuation = /[.!?]$/.test(trimmed);

  // 1. Kelengkapan ayat
  const completenessMet = words >= 7 && endsWithPunctuation;
  const completenessMsg = completenessMet
    ? `Ayat anda lengkap (${words} perkataan) dan diakhiri dengan tanda baca yang betul.`
    : words < 7
      ? `Ayat masih agak ringkas (${words} perkataan). Cuba kembangkan lagi supaya idea anda lebih lengkap.`
      : 'Struktur ayat sudah baik, tetapi pastikan ayat diakhiri dengan tanda noktah (.) supaya lebih lengkap.';

  // 2. Perkaitan dengan bukti (berdasarkan lokasi dan kata kunci catatan murid sendiri)
  const meta = CASE_FILE_META[locId];
  const noteTokens = `${studentNotes} ${studentProposal}`
    .toLowerCase()
    .split(/[^a-z0-9\u00C0-\u024F]+/)
    .filter((w) => w.length >= 4);
  const combinedKeywords = Array.from(new Set([...meta.domainKeywords, ...noteTokens]));
  const hasEvidenceConnection = combinedKeywords.some((kw) => lower.includes(kw));

  const evidenceMsg = hasEvidenceConnection
    ? 'Pendapat anda menunjukkan perkaitan yang baik dengan lokasi dan bukti siasatan yang dipilih.'
    : 'Perkaitan dengan bukti masih umum. Cuba kaitkan terus ayat anda dengan perkara yang dicatatkan dalam fail kes ini.';

  // 3. Kejelasan pendapat
  const hasOpinionCue = OPINION_MARKERS.some((m) => lower.includes(m));
  const clarityMet = words >= 8 && hasOpinionCue;
  const clarityMsg = clarityMet
    ? 'Pendirian dan pendapat anda dinyatakan dengan jelas dan mudah difahami.'
    : 'Pendapat boleh diperjelaskan lagi dengan menyatakan pendirian serta tujuan atau kesan cadangan anda.';

  return {
    completeness: { met: completenessMet, message: completenessMsg },
    evidenceLink: { met: hasEvidenceConnection, message: evidenceMsg },
    clarity: { met: clarityMet, message: clarityMsg },
  };
}

type DeductionStageId = 'observation' | 'evidence' | 'opinion' | 'justification';

const DEDUCTION_STAGES: {
  id: DeductionStageId;
  code: string;
  label: string;
  explanation: string;
  writingHint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'observation',
    code: '01',
    label: 'PEMERHATIAN',
    explanation:
      'Setiap kes bermula dengan apa yang anda lihat dan rekodkan sendiri di lapangan semasa Fasa 1.',
    writingHint:
      'Rujuk catatan pemerhatian anda untuk mengenal pasti masalah utama di lokasi ini.',
    icon: Eye,
  },
  {
    id: 'evidence',
    code: '02',
    label: 'BUKTI',
    explanation:
      'Petunjuk fizikal yang ditemui mengesahkan masalah sebenar dan menjadi asas kepada pendirian anda.',
    writingHint:
      'Sebutkan unsur bukti nyata (contohnya keadaan meja, buku, sampah atau bangku) dalam ayat anda.',
    icon: FileSearch,
  },
  {
    id: 'opinion',
    code: '03',
    label: 'PENDAPAT',
    explanation:
      'Daripada pemerhatian dan bukti, anda membina satu ayat pendapat yang menyatakan tindakan wajar diambil.',
    writingHint:
      'Gunakan frasa permulaan seperti "Pada pendapat saya..." diikuti cadangan yang jelas dan tanda noktah (.).',
    icon: PenTool,
  },
  {
    id: 'justification',
    code: '04',
    label: 'JUSTIFIKASI',
    explanation:
      'Pendapat yang kukuh di sini akan diteruskan ke Fasa 3 untuk disokong dengan hujah sebab dan akibat.',
    writingHint:
      'Sertakan tujuan atau kesan baik (contohnya "supaya murid lebih selesa") untuk menguatkan pendapat anda.',
    icon: ShieldCheck,
  },
];

const AMBIENT_MOTES = [
  { id: 0, left: '8%', top: '14%', dur: '7.5s', delay: '0s' },
  { id: 1, left: '91%', top: '20%', dur: '6.8s', delay: '1.1s' },
  { id: 2, left: '24%', top: '68%', dur: '8.2s', delay: '0.5s' },
  { id: 3, left: '78%', top: '62%', dur: '7.1s', delay: '1.7s' },
  { id: 4, left: '52%', top: '34%', dur: '9.0s', delay: '0.9s' },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedOpinion(
  text: string,
  locId: LocationId,
  studentNotes: string,
  studentProposal: string
): React.ReactNode {
  const meta = CASE_FILE_META[locId];
  const noteTokens = `${studentNotes} ${studentProposal}`
    .toLowerCase()
    .split(/[^a-z0-9\u00C0-\u024F]+/)
    .filter((w) => w.length >= 4);
  const tokens = Array.from(
    new Set([...meta.domainKeywords, ...noteTokens, ...OPINION_MARKERS])
  )
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);

  if (tokens.length === 0 || !text) {
    return text;
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    const lower = part.toLowerCase();
    const isMarker = OPINION_MARKERS.includes(lower);
    const isEvidence =
      meta.domainKeywords.includes(lower) || noteTokens.includes(lower);

    if (isEvidence) {
      return (
        <mark
          key={`${idx}-${part}`}
          className="bg-[#D6AA4B]/30 text-[#092B22] font-semibold px-1 rounded border-b border-[#8a6a2f]/60"
          title="Kata kunci bukti siasatan"
        >
          {part}
        </mark>
      );
    }
    if (isMarker) {
      return (
        <mark
          key={`${idx}-${part}`}
          className="bg-[#A9C5AD]/45 text-[#092B22] font-semibold px-1 rounded border-b border-[#123D30]/40"
          title="Penanda pendapat"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={`${idx}-${part}`}>{part}</React.Fragment>;
  });
}

interface DetectiveDeductionLabProps {
  state: GameState;
  selectedIds: LocationId[];
  draftOpinions: Record<LocationId, string>;
  editingLocs: Record<LocationId, boolean>;
  openHints: Record<LocationId, boolean>;
  textareaRefs: React.MutableRefObject<Partial<Record<LocationId, HTMLTextAreaElement | null>>>;
  error: string;
  savedNotice: string | null;
  canProceed: boolean;
  onToggleEvidence: (locId: LocationId) => void;
  onDraftChange: (locId: LocationId, value: string) => void;
  onSetEditingLoc: (locId: LocationId, editing: boolean) => void;
  onToggleHint: (locId: LocationId) => void;
  onInsertStarter: (locId: LocationId, insertText: string) => void;
  onClearOpinion: (locId: LocationId) => void;
  onClearAllOpinions: () => void;
  onSaveSingleOpinion: (locId: LocationId) => boolean;
  onSaveAll: (e: React.FormEvent) => void;
  onProceedToPhase3: () => void;
}

export function DetectiveDeductionLab({
  state,
  selectedIds,
  draftOpinions,
  editingLocs,
  openHints,
  textareaRefs,
  error,
  savedNotice,
  canProceed,
  onToggleEvidence,
  onDraftChange,
  onSetEditingLoc,
  onToggleHint,
  onInsertStarter,
  onClearOpinion,
  onClearAllOpinions,
  onSaveSingleOpinion,
  onSaveAll,
  onProceedToPhase3,
}: DetectiveDeductionLabProps) {
  const [focusedLocId, setFocusedLocId] = useState<LocationId>(
    selectedIds[0] ?? 'kantin'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMentorOpen, setMobileMentorOpen] = useState(true);
  const [activeStageByLoc, setActiveStageByLoc] = useState<
    Record<LocationId, DeductionStageId>
  >({
    kantin: 'observation',
    kelas: 'observation',
    perpustakaan: 'observation',
    taman: 'observation',
  });
  const [scanningLoc, setScanningLoc] = useState<LocationId | null>(null);
  const [scanStageText, setScanStageText] = useState('SEDANG MENGANALISIS HUJAH ANDA...');
  const [successBannerLoc, setSuccessBannerLoc] = useState<LocationId | null>(null);
  const [imageErrorByLoc, setImageErrorByLoc] = useState<Partial<Record<LocationId, boolean>>>({});

  const scanTimerRef = useRef<number | null>(null);
  const scanMidTimerRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
      if (scanMidTimerRef.current !== null) window.clearTimeout(scanMidTimerRef.current);
      if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const earnedBadges = getEarnedBadgeIds(state);
  const overallPercent = getOverallProgressPercent(state);
  const agentRank = getAgentRank(state.xp, state.finalReportSaved);
  const selectedCount = selectedIds.length;
  const completedSelectedCount = selectedIds.filter(
    (id) => (state.opinions[id]?.opinionText || '').trim().length >= 10
  ).length;

  // Focused mission data
  const loc = LOCATION_MAP[focusedLocId];
  const inv = state.investigations[focusedLocId];
  const meta = CASE_FILE_META[focusedLocId];
  const LocIcon = meta.icon;
  const isSelectedForAnalysis = selectedIds.includes(focusedLocId);
  const currentText = draftOpinions[focusedLocId] || '';
  const wordCount = countWords(currentText);
  const isEditing = editingLocs[focusedLocId] ?? true;
  const isSavedTextValid =
    (state.opinions[focusedLocId]?.opinionText || '').trim().length >= 10;
  const hintVisible = openHints[focusedLocId];
  const activeStageId = activeStageByLoc[focusedLocId] ?? 'observation';
  const activeStageDef =
    DEDUCTION_STAGES.find((s) => s.id === activeStageId) ?? DEDUCTION_STAGES[0];
  const isScanning = scanningLoc === focusedLocId;
  const showDeductionSuccess = successBannerLoc === focusedLocId;

  const savedOrDraft = state.opinions[focusedLocId]?.opinionText || currentText;
  const feedback =
    isSelectedForAnalysis && !isEditing && isSavedTextValid
      ? evaluateOpinionFeedback(
          savedOrDraft,
          focusedLocId,
          inv.notes,
          inv.initialProposal
        )
      : null;

  const criteriaMetCount = feedback
    ? [
        feedback.completeness.met,
        feedback.evidenceLink.met,
        feedback.clarity.met,
      ].filter(Boolean).length
    : 0;

  const hasPeriod = /[.!?]$/.test(currentText.trim());
  const wordProgressPct = Math.min(100, Math.round((wordCount / 10) * 100));

  // Mentor contextual dialogue message
  const mentorDialogue = (() => {
    if (!isSelectedForAnalysis) {
      return `Fail ${loc.name} sedia untuk diteliti. Pilih kes ini untuk analisis sekiranya anda ingin membina pendapat baginya.`;
    }
    if (isScanning) {
      return 'Bertenang, Ejen. Pengimbas HQ sedang meneliti kelengkapan dan perkaitan bukti hujah anda...';
    }
    if (feedback) {
      if (criteriaMetCount === 3) {
        return `Syabas, Ejen! Ketiga-tiga kriteria bagi ${loc.name} telah dipenuhi. Anda bersedia ke kes seterusnya atau Fasa 3.`;
      }
      return `Hujah anda bagi ${loc.name} telah direkodkan. Semak maklum balas di bawah dan klik "Edit Jawapan" jika mahu memperhalusinya.`;
    }
    if (wordCount === 0) {
      return `Teliti soalan siasatan bagi ${loc.name}. Klik nod pada Papan Deduksi atau pilih frasa permulaan untuk memulakan jurnal anda.`;
    }
    if (!hasPeriod) {
      return `Bagus, anda sudah menulis ${wordCount} perkataan. Jangan lupa akhiri ayat pendapat anda dengan tanda noktah (.).`;
    }
    return `Jurnal anda kelihatan kemas (${wordCount} perkataan). Tekan "SEMAK DEDUKSI" untuk menjalankan imbasan HQ!`;
  })();

  const handleSelectMission = (locId: LocationId) => {
    if (state.soundEnabled) {
      gameAudio.playClick();
    }
    setFocusedLocId(locId);
    setMobileNavOpen(false);
  };

  const handleRunDeductionScanner = (locId: LocationId) => {
    const selCheck = validateEvidenceSelection(selectedIds);
    const text = (draftOpinions[locId] || '').trim();
    if (!selCheck.valid || text.length < 10) {
      if (state.soundEnabled) {
        gameAudio.playError();
      }
      onSaveSingleOpinion(locId);
      return;
    }

    if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    if (scanMidTimerRef.current !== null) window.clearTimeout(scanMidTimerRef.current);
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);

    if (state.soundEnabled) {
      gameAudio.playClick();
    }
    setScanStageText('SEDANG MENGANALISIS HUJAH ANDA...');
    setScanningLoc(locId);

    scanMidTimerRef.current = window.setTimeout(() => {
      setScanStageText('MENYEMAK PERKAITAN BUKTI & KEJELASAN PENDAPAT...');
    }, 520);

    scanTimerRef.current = window.setTimeout(() => {
      const ok = onSaveSingleOpinion(locId);
      setScanningLoc(null);
      if (ok) {
        const currentInv = state.investigations[locId];
        const result = evaluateOpinionFeedback(
          text,
          locId,
          currentInv.notes,
          currentInv.initialProposal
        );
        const allMet =
          result.completeness.met && result.evidenceLink.met && result.clarity.met;

        if (state.soundEnabled) {
          if (allMet) {
            gameAudio.playSuccess();
          } else {
            gameAudio.playClueFound();
          }
        }
        setActiveStageByLoc((prev) => ({ ...prev, [locId]: 'opinion' }));
        setSuccessBannerLoc(locId);
        bannerTimerRef.current = window.setTimeout(() => {
          setSuccessBannerLoc((curr) => (curr === locId ? null : curr));
        }, 4200);
      }
    }, 1050);
  };

  return (
    <form
      onSubmit={onSaveAll}
      className="hq-secret-chamber relative overflow-hidden rounded-2xl border-2 border-[#D6AA4B]/80 p-4 sm:p-6 lg:p-7 space-y-5 text-[#F1E5C7]"
    >
      {/* Subtle Ambient Floating Golden Particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {AMBIENT_MOTES.map((mote) => (
          <span
            key={mote.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#D6AA4B]/45 float-mote"
            style={
              {
                left: mote.left,
                top: mote.top,
                '--mote-dur': mote.dur,
                '--mote-delay': mote.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 8A. MISSION INTRODUCTION & 7. MISSION PROGRESSION GAME HUD */}
      <div className="relative rounded-xl bg-[#07211A]/90 border border-[#D6AA4B]/45 p-4 sm:p-5 space-y-4 lab-title-reveal">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <p className="font-mono-tabular text-xs font-bold tracking-widest text-[#D6AA4B]">
              SELAMAT DATANG KE MAKMAL ANALISIS KES.
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F1E5C7] tracking-tight hq-title-glow">
              THE SECRET DETECTIVE HQ
            </h2>
            <p className="text-sm text-[#A9C5AD] max-w-2xl">
              Detektif, masanya telah tiba untuk menganalisis bukti dan membina hujah anda.
            </p>
          </div>

          {/* Connected Real Game Progression HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Misi Aktif</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7] truncate">
                {meta.orderCode} · {loc.shortName}
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Mata XP &amp; Pangkat</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#D6AA4B]">
                {state.xp} XP · {agentRank}
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Kes Dianalisis</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {completedSelectedCount}/{Math.max(2, selectedCount)} Selesai ({selectedCount}/3 dipilih)
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Kemajuan · Lencana</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {overallPercent}% · {earnedBadges.length}/5 Lencana
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DEDUCTION SUCCESSFUL ACHIEVEMENT TOAST */}
      {showDeductionSuccess && (
        <div
          role="status"
          className="relative rounded-xl hq-brass-plaque p-4 text-[#092B22] flex flex-wrap items-center justify-between gap-3 shadow-xl p1-toast-enter"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#092B22] text-[#D6AA4B] flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono-tabular text-xs font-extrabold tracking-widest uppercase">
                DEDUCTION SUCCESSFUL!
              </p>
              <p className="text-sm font-bold">
                Hujah bagi {loc.name} telah diimbas, disahkan dan direkodkan ke Fail Keputusan Ejen.
              </p>
            </div>
          </div>
          <span className="font-mono-tabular text-xs font-bold px-3 py-1.5 rounded-lg bg-[#092B22]/15 border border-[#092B22]/30">
            VERIFIED · {criteriaMetCount}/3 Kriteria
          </span>
        </div>
      )}

      {/* 2. THREE-PART DETECTIVE HQ LAYOUT */}
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* LEFT SIDE: MISSION CONTROL PANEL (ALL 4 MISSIONS 01-04) */}
        <aside
          aria-label="Panel Kawalan Misi"
          className="md:col-span-4 xl:col-span-3 rounded-xl bg-[#07211A]/95 border border-[#D6AA4B]/45 p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#D6AA4B]" />
              <h3 className="font-display text-base font-bold text-[#F1E5C7]">
                Panel Kawalan Misi
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-expanded={mobileNavOpen}
              className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-[#D6AA4B] px-2.5 py-1 rounded bg-[#123D30]"
            >
              {mobileNavOpen ? 'Tutup' : 'Senarai'}
              {mobileNavOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <p className="text-xs text-[#A9C5AD]">
            Pilih misi siasatan untuk membuka fail kes di ruang utama.
          </p>

          <nav
            aria-label="Navigasi Fail Kes 01 hingga 04"
            className={`${mobileNavOpen ? 'block' : 'hidden'} md:block space-y-2.5`}
          >
            {LOCATIONS.map((item) => {
              const itemMeta = CASE_FILE_META[item.id];
              const ItemIcon = itemMeta.icon;
              const isFocused = focusedLocId === item.id;
              const isSelected = selectedIds.includes(item.id);
              const itemDraftLen = (draftOpinions[item.id] || '').trim().length;
              const itemVerified =
                isSelected &&
                !(editingLocs[item.id] ?? true) &&
                (state.opinions[item.id]?.opinionText || '').trim().length >= 10;

              const statusLabel = itemVerified
                ? 'Disahkan'
                : isSelected && itemDraftLen >= 10
                  ? 'Draf Aktif'
                  : isSelected
                    ? 'Dipilih · Perlu Hujah'
                    : 'Arkib Kes';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMission(item.id)}
                  aria-current={isFocused ? 'true' : undefined}
                  className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6AA4B] ${
                    isFocused
                      ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_20px_rgba(214,170,75,0.22)]'
                      : 'bg-[#092B22]/85 border-[#D6AA4B]/25 text-[#A9C5AD] hover:border-[#D6AA4B]/70 hover:text-[#F1E5C7]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isFocused
                        ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                        : itemVerified
                          ? 'bg-[#1a5240] text-[#D6AA4B] border-[#D6AA4B]/50'
                          : 'bg-[#07211A] text-[#D6AA4B] border-[#D6AA4B]/30'
                    }`}
                  >
                    <ItemIcon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#D6AA4B]">
                        {itemMeta.orderCode} – {item.shortName.toUpperCase()}
                      </span>
                      {itemVerified ? (
                        <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0" />
                      ) : isFocused ? (
                        <ArrowRight className="w-3.5 h-3.5 text-[#D6AA4B] shrink-0" />
                      ) : null}
                    </div>
                    <p className="text-xs sm:text-sm font-bold truncate text-[#F1E5C7]">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#A9C5AD] mt-0.5">{statusLabel}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          {selectedIds.some((id) => (draftOpinions[id] || '').trim().length > 0) && (
            <div className="pt-2 border-t border-[#D6AA4B]/20">
              <button
                type="button"
                onClick={() => {
                  if (state.soundEnabled) gameAudio.playClick();
                  onClearAllOpinions();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#2A1D17] hover:bg-[#3D2920] text-[#F1E5C7] border border-[#D6AA4B]/35 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#D6AA4B]" />
                Kosongkan Semua Jawapan
              </button>
            </div>
          )}
        </aside>

        {/* CENTRE: MAIN INVESTIGATION WORKSPACE */}
        <section
          key={focusedLocId}
          aria-label={`Ruang Siasatan Utama ${loc.name}`}
          className="md:col-span-8 xl:col-span-6 space-y-5 lab-report-reveal"
        >
          {/* CINEMATIC DETECTIVE DOSSIER HEADER WITH LOCATION ILLUSTRATION */}
          <div className="relative overflow-hidden rounded-xl border-2 border-[#D6AA4B]/70 bg-[#123D30] shadow-xl">
            <div className="relative h-44 sm:h-52 w-full bg-gradient-to-br from-[#123D30] via-[#092B22] to-[#2b1d12]">
              {!imageErrorByLoc[focusedLocId] ? (
                <img
                  src={meta.photoUrl}
                  alt={`Ilustrasi lokasi penyiasatan ${loc.name}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setImageErrorByLoc((prev) => ({ ...prev, [focusedLocId]: true }))
                  }
                  className="w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#D6AA4B]/50">
                  <LocIcon className="w-16 h-16" />
                </div>
              )}

              {/* Contrast Scrim */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#092B22] via-[#092B22]/60 to-transparent"
              />

              {/* Golden VERIFIED Stamp when mission deduction is saved */}
              {isSelectedForAnalysis && !isEditing && isSavedTextValid && (
                <div className="absolute top-3.5 right-3.5 px-3 py-1.5 rounded-md bg-[#092B22]/90 border-2 border-[#D6AA4B] text-[#D6AA4B] font-mono-tabular text-xs font-extrabold tracking-widest shadow-lg room-stamp-slam flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>VERIFIED</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono-tabular text-xs font-bold text-[#D6AA4B]">
                    <span>{meta.caseNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{loc.zoneLabel}</span>
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F1E5C7]">
                    {loc.name}
                  </h3>
                </div>

                {/* Quick toggle selection right inside HQ if needed */}
                <button
                  type="button"
                  onClick={() => {
                    if (state.soundEnabled) gameAudio.playClick();
                    onToggleEvidence(focusedLocId);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap shrink-0 ${
                    isSelectedForAnalysis
                      ? 'bg-[#092B22]/90 hover:bg-[#2A1D17] text-[#F1E5C7] border-[#D6AA4B]/70'
                      : 'hq-brass-plaque hover:brightness-105 text-[#092B22] border-[#F1E5C7]/60'
                  }`}
                >
                  {isSelectedForAnalysis ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D6AA4B]" />
                      Dipilih Untuk Analisis
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Pilih Kes Ini ({selectedCount}/3)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Layered Parchment Brief: Investigation Question & Phase 1 Observation Notes */}
            <div className="p-4 sm:p-5 bg-[#F1E5C7] text-[#092B22] space-y-3 border-t border-[#D6AA4B]/70">
              <div className="space-y-1">
                <p className="font-mono-tabular text-[11px] font-bold tracking-wider uppercase text-[#5C4128]">
                  Soalan Siasatan Utama
                </p>
                <p className="text-sm sm:text-base font-bold leading-relaxed text-[#092B22]">
                  {meta.stimulatingQuestion}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#5C4128]/20 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-[#123D30]">Catatan Pemerhatian Anda (Fasa 1)</p>
                  <p className="text-[#27463B] leading-relaxed">
                    {inv.notes.trim()
                      ? `“${inv.notes}”`
                      : 'Tiada catatan bertulis Fasa 1 — rujuk bukti lapangan kes ini.'}
                  </p>
                  {inv.initialProposal.trim() && (
                    <p className="text-[#5C4128]">
                      Cadangan awal: {inv.initialProposal}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-[#123D30]">
                    Petunjuk Kes ({inv.discoveredClueIds.length}/{loc.clues.length} ditemui)
                  </p>
                  <ul className="space-y-1 text-[#27463B]">
                    {loc.clues.map((clue) => (
                      <li key={clue.id} className="leading-snug">
                        <strong>{clue.label}:</strong> {clue.issueSummary}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 3. INTERACTIVE DEDUCTION BOARD */}
          <div className="rounded-xl bg-[#07211A]/95 border border-[#D6AA4B]/50 p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D6AA4B]" />
                <h4 className="font-display text-base sm:text-lg font-bold text-[#F1E5C7]">
                  Papan Deduksi Interaktif
                </h4>
              </div>
              <span className="text-xs text-[#A9C5AD]">
                Klik setiap peringkat untuk meneliti aliran hujah
              </span>
            </div>

            {/* Animated Golden Connecting Line + 4 Interactive Stage Nodes */}
            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 600 12"
                preserveAspectRatio="none"
                className="hidden sm:block absolute top-6 left-8 right-8 w-[calc(100%-4rem)] h-3 pointer-events-none"
              >
                <line
                  x1="0"
                  y1="6"
                  x2="600"
                  y2="6"
                  stroke="#D6AA4B"
                  strokeOpacity="0.25"
                  strokeWidth="2"
                />
                <line
                  x1="0"
                  y1="6"
                  x2="600"
                  y2="6"
                  stroke="#D6AA4B"
                  strokeWidth="2.5"
                  strokeDasharray="10 8"
                  className="lab-gold-line-flow"
                />
              </svg>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
                {DEDUCTION_STAGES.map((stage) => {
                  const StageIcon = stage.icon;
                  const isStageActive = activeStageId === stage.id;
                  const isStageComplete =
                    stage.id === 'observation'
                      ? inv.notes.trim().length > 0
                      : stage.id === 'evidence'
                        ? inv.discoveredClueIds.length > 0 || loc.clues.length > 0
                        : stage.id === 'opinion'
                          ? !isEditing && isSavedTextValid
                          : isSavedTextValid;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        if (state.soundEnabled) gameAudio.playClick();
                        setActiveStageByLoc((prev) => ({
                          ...prev,
                          [focusedLocId]: stage.id,
                        }));
                      }}
                      className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6AA4B] ${
                        isStageActive
                          ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_18px_rgba(214,170,75,0.24)] -translate-y-0.5'
                          : 'bg-[#092B22] border-[#D6AA4B]/30 text-[#A9C5AD] hover:border-[#D6AA4B]/70 hover:text-[#F1E5C7]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            isStageActive
                              ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                              : isStageComplete
                                ? 'bg-[#1a5240] text-[#D6AA4B] border-[#D6AA4B]/45'
                                : 'bg-[#07211A] text-[#A9C5AD] border-[#D6AA4B]/25'
                          }`}
                        >
                          <StageIcon className="w-4 h-4" />
                        </div>
                        <span className="font-mono-tabular text-[11px] font-bold text-[#D6AA4B]">
                          {stage.code}
                        </span>
                      </div>
                      <span className="text-xs font-bold tracking-wide text-[#F1E5C7]">
                        {stage.code} – {stage.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Node Explanation & Writing Hint */}
            <div className="rounded-lg bg-[#092B22] border border-[#D6AA4B]/35 p-3.5 space-y-1.5 text-xs sm:text-sm lab-report-reveal">
              <div className="flex items-center gap-2 font-bold text-[#D6AA4B]">
                <activeStageDef.icon className="w-4 h-4" />
                <span>
                  Peringkat {activeStageDef.code}: {activeStageDef.label}
                </span>
              </div>
              <p className="text-[#F1E5C7] leading-relaxed">{activeStageDef.explanation}</p>
              <p className="text-xs text-[#A9C5AD]">
                <strong className="text-[#D6AA4B]">Tip Penulisan:</strong>{' '}
                {activeStageDef.writingHint}
              </p>
            </div>
          </div>

          {/* 4. DETECTIVE'S PRIVATE JOURNAL + 5. DEDUCTION SCANNER */}
          {!isSelectedForAnalysis ? (
            <div className="rounded-xl bg-[#07211A]/90 border border-dashed border-[#D6AA4B]/55 p-5 text-sm text-[#F1E5C7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="font-bold text-[#D6AA4B]">
                  Jurnal Peribadi Detektif Berkunci Untuk Kes Ini
                </p>
                <p className="text-xs sm:text-sm text-[#A9C5AD]">
                  Pilih 2 hingga 3 kes untuk dianalisis. Klik &ldquo;Pilih Kes Ini&rdquo; untuk
                  membuka Jurnal Peribadi Detektif bagi {loc.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (state.soundEnabled) gameAudio.playClick();
                  onToggleEvidence(focusedLocId);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg hq-brass-plaque text-[#092B22] font-bold text-xs sm:text-sm whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Buka Jurnal Kes Ini
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl lab-journal-paper border-2 border-[#D6AA4B] p-4 sm:p-5 text-[#092B22]">
                {/* 5. DEDUCTION SCANNER OVERLAY (STEPS 1-3) */}
                {isScanning && (
                  <div
                    aria-live="polite"
                    className="absolute inset-0 z-20 bg-[#051813]/88 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-[#F1E5C7]"
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-transparent via-[#D6AA4B]/50 to-transparent border-b-2 border-[#D6AA4B] lab-scanner-beam pointer-events-none"
                    />
                    <div className="relative z-10 flex flex-col items-center gap-3.5 max-w-sm">
                      <div className="w-14 h-14 rounded-full bg-[#123D30] border-2 border-[#D6AA4B] flex items-center justify-center shadow-[0_0_24px_rgba(214,170,75,0.45)]">
                        <ScanSearch className="w-7 h-7 text-[#D6AA4B]" />
                      </div>
                      <p className="font-mono-tabular text-xs sm:text-sm font-bold tracking-widest text-[#D6AA4B]">
                        {scanStageText}
                      </p>
                      <div className="w-48 h-1.5 rounded-full bg-[#123D30] overflow-hidden border border-[#D6AA4B]/30">
                        <div className="h-full w-2/3 rounded-full bg-[#D6AA4B] animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* JOURNAL NOTEBOOK HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#092B22]/15 pl-6">
                  <div>
                    <p className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#5C4128]">
                      DETECTIVE&apos;S PRIVATE JOURNAL
                    </p>
                    <h4 className="font-display text-lg font-bold text-[#092B22]">
                      Jurnal Peribadi Detektif — {loc.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 font-mono-tabular text-xs font-bold text-[#123D30]">
                    {isEditing && currentText.trim().length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#8a4526]">
                        <span className="w-2 h-2 rounded-full bg-[#C2593F] lab-cursor-blink" />
                        Menulis
                      </span>
                    )}
                    <span>{wordCount} perkataan</span>
                  </div>
                </div>

                {!isEditing && isSavedTextValid ? (
                  /* SAVED JOURNAL VIEW */
                  <div className="space-y-4 pl-6 lab-report-reveal">
                    <div className="rounded-xl bg-white/90 p-4 border border-[#123D30]/30 text-sm sm:text-base text-[#092B22] leading-relaxed whitespace-pre-wrap shadow-xs">
                      {renderHighlightedOpinion(
                        currentText,
                        focusedLocId,
                        inv.notes,
                        inv.initialProposal
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#27463B]">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-[#D6AA4B]/45 border border-[#8a6a2f]/60" />
                          Kata kunci bukti
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-[#A9C5AD]/60 border border-[#123D30]/40" />
                          Penanda pendapat
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (state.soundEnabled) gameAudio.playClick();
                            onClearOpinion(focusedLocId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E8DFC9] hover:bg-[#DFD2B4] text-[#5C4128] border border-[#5C4128]/30 font-bold text-xs transition-colors whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Kosongkan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (state.soundEnabled) gameAudio.playClick();
                            onSetEditingLoc(focusedLocId, true);
                            window.requestAnimationFrame(() => {
                              textareaRefs.current[focusedLocId]?.focus();
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123D30] hover:bg-[#092B22] text-[#F1E5C7] border border-[#D6AA4B] font-bold text-xs transition-colors whitespace-nowrap"
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#D6AA4B]" />
                          Edit Jawapan
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ACTIVE WRITING WORKSPACE */
                  <div className="space-y-3.5 pl-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#27463B]">
                        Frasa Permulaan Ayat (klik untuk masukkan ke jurnal):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {INTERACTIVE_STARTERS.map((starter) => (
                          <button
                            key={starter.label}
                            type="button"
                            onClick={() => {
                              if (state.soundEnabled) gameAudio.playClick();
                              onInsertStarter(focusedLocId, starter.insertText);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#123D30] hover:text-[#F1E5C7] text-[#092B22] border border-[#5C4128]/40 hover:border-[#D6AA4B] text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6AA4B]"
                          >
                            + {starter.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`opinion-${focusedLocId}`} className="sr-only">
                        Ruang jawapan ayat pendapat bagi {loc.name}
                      </label>
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[focusedLocId] = el;
                        }}
                        id={`opinion-${focusedLocId}`}
                        rows={5}
                        value={currentText}
                        onChange={(e) => onDraftChange(focusedLocId, e.target.value)}
                        placeholder={`Taip ayat pendapat anda sendiri bagi ${loc.name} di sini...`}
                        className="w-full min-h-[150px] rounded-xl p-4 bg-white/95 border-2 border-[#123D30]/35 focus:border-[#092B22] focus:ring-2 focus:ring-[#D6AA4B]/50 focus:outline-none text-sm sm:text-base leading-relaxed text-[#092B22] placeholder-[#6B7F77]"
                      />
                    </div>

                    {/* Writing Progress & Controls */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#27463B]">
                        <span>
                          {wordCount >= 7 ? 'Panjang ayat mencukupi' : `${wordCount}/7+ perkataan disyorkan`}
                          {' · '}
                          {hasPeriod ? 'Tanda baca lengkap' : 'Akhiri ayat dengan noktah (.)'}
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-[#DFD2B4] overflow-hidden border border-[#5C4128]/20">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#5C4128] via-[#D6AA4B] to-[#123D30] transition-all duration-300"
                          style={{ width: `${wordProgressPct}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-xs text-[#5C4128] font-medium">
                          Tulis menggunakan pemikiran anda sendiri
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {currentText.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (state.soundEnabled) gameAudio.playClick();
                                onClearOpinion(focusedLocId);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#E8DFC9] hover:bg-[#DFD2B4] text-[#5C4128] border border-[#5C4128]/30 font-bold text-xs transition-colors whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Kosongkan
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isScanning}
                            onClick={() => handleRunDeductionScanner(focusedLocId)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] disabled:opacity-60 text-[#F1E5C7] border-2 border-[#D6AA4B] font-bold text-xs sm:text-sm shadow-md transition-colors whitespace-nowrap shrink-0"
                          >
                            <ScanSearch className="w-4 h-4 text-[#D6AA4B]" />
                            SEMAK DEDUKSI
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5 (STEPS 4 & 5). ANALYSIS REPORT WITH EXISTING ASSESSMENT LOGIC */}
              {feedback && (
                <div className="rounded-xl bg-[#07211A] border-2 border-[#D6AA4B]/75 p-4 sm:p-5 text-[#F1E5C7] space-y-3.5 shadow-xl lab-report-reveal">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
                    <div>
                      <p className="font-mono-tabular text-[11px] font-bold tracking-wider text-[#D6AA4B]">
                        LAPORAN PENILAIAN KESESUAIAN
                      </p>
                      <h4 className="font-display text-base sm:text-lg font-bold text-[#F1E5C7]">
                        Keputusan Imbasan Deduksi
                      </h4>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-[#D6AA4B]">
                      {criteriaMetCount}/3 Kriteria Terpenuhi
                    </span>
                  </div>

                  {/* 3-Criteria Progress Indicator */}
                  <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                    {[
                      feedback.completeness.met,
                      feedback.evidenceLink.met,
                      feedback.clarity.met,
                    ].map((met, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full border transition-colors ${
                          met
                            ? 'bg-[#D6AA4B] border-[#F1E5C7]/60'
                            : 'bg-[#123D30] border-[#D6AA4B]/30'
                        }`}
                      />
                    ))}
                  </div>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#F1E5C7]">
                    <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-3">
                      {feedback.completeness.met ? (
                        <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <strong className="text-[#D6AA4B]">Kelengkapan Ayat:</strong>{' '}
                        {feedback.completeness.message}
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-3">
                      {feedback.evidenceLink.met ? (
                        <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <strong className="text-[#D6AA4B]">Perkaitan dengan Bukti:</strong>{' '}
                        {feedback.evidenceLink.message}
                      </span>
                    </li>

                    <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-3">
                      {feedback.clarity.met ? (
                        <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <strong className="text-[#D6AA4B]">Kejelasan Pendapat:</strong>{' '}
                        {feedback.clarity.message}
                      </span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* RIGHT SIDE: DETECTIVE ASSISTANT (PROFESOR NURIN) */}
        <aside
          aria-label="Pembantu Detektif Profesor Nurin"
          className="md:col-span-12 xl:col-span-3 rounded-xl bg-[#07211A]/95 border border-[#D6AA4B]/45 p-4 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#D6AA4B]" />
              <h3 className="font-display text-base font-bold text-[#F1E5C7]">
                Pembantu Detektif
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setMobileMentorOpen((prev) => !prev)}
              aria-expanded={mobileMentorOpen}
              className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-[#D6AA4B] px-2.5 py-1 rounded bg-[#123D30]"
            >
              {mobileMentorOpen ? 'Sembunyi' : 'Buka'}
              {mobileMentorOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className={`${mobileMentorOpen ? 'space-y-4' : 'hidden md:block space-y-4'}`}>
            {/* Mentor Portrait + Speaking Halo + Dialogue Bubble */}
            <div className="flex flex-row xl:flex-col items-start xl:items-center gap-3.5 xl:text-center">
              <div
                className={`p-1 rounded-full bg-gradient-to-br from-[#D6AA4B] to-[#5C4128] shrink-0 ${
                  hintVisible || isScanning || Boolean(feedback) ? 'lab-mentor-speak' : ''
                }`}
              >
                <ProfesorCitraPortrait realistic className="w-16 h-16 xl:w-20 xl:h-20" />
              </div>

              <div className="space-y-1">
                <p className="font-display text-base font-bold text-[#F1E5C7]">
                  Profesor Nurin
                </p>
                <p className="font-mono-tabular text-[11px] text-[#D6AA4B]">
                  Mentor Penyiasatan HQ
                </p>
              </div>
            </div>

            {/* Contextual Mentor Dialogue Bubble */}
            <div className="rounded-xl bg-[#123D30] border border-[#D6AA4B]/50 p-3.5 text-xs sm:text-sm text-[#F1E5C7] leading-relaxed">
              <p>“{mentorDialogue}”</p>
            </div>

            {/* 8B. Professor Nurin's Interactive Guidance Toggle */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (state.soundEnabled) gameAudio.playHint();
                  onToggleHint(focusedLocId);
                }}
                aria-expanded={hintVisible}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] text-[#D6AA4B] border border-[#D6AA4B]/60 text-xs font-bold transition-colors whitespace-nowrap"
              >
                <HelpCircle className="w-4 h-4" />
                {hintVisible ? 'Tutup Panduan Profesor Nurin' : 'Buka Panduan Profesor Nurin'}
              </button>

              {hintVisible && (
                <div className="rounded-xl bg-[#092B22] border border-[#D6AA4B]/40 p-3.5 text-xs text-[#F1E5C7] space-y-2 lab-report-reveal">
                  <p className="font-bold text-[#D6AA4B]">
                    Panduan Khusus {loc.name}:
                  </p>
                  <p className="leading-relaxed text-[#E8DFC9]">{meta.briefGuide}</p>
                  <div className="pt-2 border-t border-[#D6AA4B]/20 text-[11px] text-[#A9C5AD] space-y-1">
                    <p className="font-bold text-[#F1E5C7]">Senarai Semak Pantas:</p>
                    <p>1. Mulakan ayat dengan pendirian jelas.</p>
                    <p>2. Kaitkan dengan bukti lokasi pilihan anda.</p>
                    <p>3. Akhiri ayat dengan tanda noktah (.).</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Mission Progress Overview */}
            <div className="rounded-xl bg-[#092B22]/90 border border-[#D6AA4B]/30 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#D6AA4B]">Kemajuan Kes Terpilih</span>
                <span className="font-mono-tabular font-bold text-[#F1E5C7]">
                  {completedSelectedCount}/{selectedCount} Siap
                </span>
              </div>

              {selectedIds.length === 0 ? (
                <p className="text-xs text-[#A9C5AD]">
                  Pilih 2 hingga 3 kes pada papan bukti atau klik &ldquo;Pilih Kes Ini&rdquo;.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedIds.map((id) => {
                    const targetLoc = LOCATION_MAP[id];
                    const done = (state.opinions[id]?.opinionText || '').trim().length >= 10;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectMission(id)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs border transition-colors ${
                          focusedLocId === id
                            ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7]'
                            : 'bg-[#07211A] border-[#D6AA4B]/20 text-[#A9C5AD] hover:text-[#F1E5C7]'
                        }`}
                      >
                        <span className="truncate font-semibold">{targetLoc.name}</span>
                        {done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D6AA4B] shrink-0" />
                        ) : (
                          <span className="font-mono-tabular text-[11px] text-[#D6AA4B] shrink-0">
                            Perlu Hujah
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* VALIDATION ERROR & STATUS NOTICES */}
      {error && (
        <div
          role="alert"
          className="relative p-4 rounded-xl bg-[#3D1A16] border-2 border-[#C2593F] text-sm font-semibold text-[#FCE5DF] flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-[#F2A18D] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {savedNotice && (
        <div
          role="status"
          className="relative p-4 rounded-xl bg-[#123D30] border-2 border-[#D6AA4B]/80 text-sm font-semibold text-[#F1E5C7] flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-[#D6AA4B] shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* BOTTOM HQ ACTION BAR */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D6AA4B]/30">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#123D30] hover:bg-[#195241] border-2 border-[#D6AA4B] text-[#F1E5C7] font-bold text-sm shadow-lg transition-colors whitespace-nowrap"
        >
          <Save className="w-4 h-4 text-[#D6AA4B]" />
          Simpan Semua ke Kad Keputusan Ejen
        </button>

        {canProceed && (
          <button
            type="button"
            onClick={() => {
              if (state.soundEnabled) gameAudio.playSuccess();
              onProceedToPhase3();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl hq-brass-plaque hover:brightness-105 text-[#092B22] font-bold text-sm shadow-lg transition-all whitespace-nowrap"
          >
            Teruskan ke Fasa 3: Buktikan Teori
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
