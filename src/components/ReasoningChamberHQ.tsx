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
  FileCheck2,
  HelpCircle,
  Layers,
  Library,
  Lightbulb,
  MessageCircle,
  NotebookPen,
  Pencil,
  RotateCcw,
  Save,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
  Utensils,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import kantinPhotoUrl from '../assets/images/kantin_ceria_realistik_1794831646132.jpg';
import kelasPhotoUrl from '../assets/images/kelas_harmoni_realistik_1794831926269.jpg';
import perpustakaanPhotoUrl from '../assets/images/perpustakaan_ilmu_realistik_1794832156528.jpg';
import tamanPhotoUrl from '../assets/images/taman_rekreasi_realistik_1794832375203.jpg';
import { gameAudio } from '../game/audio';
import { LOCATION_MAP } from '../game/data';
import { countWords, getAgentRank, getEarnedBadgeIds } from '../game/rules';
import type { GameState, LocationId } from '../game/types';
import { ProfesorCitraPortrait } from './DetectiveArt';

const CASE_META: Record<
  LocationId,
  {
    caseCode: string;
    icon: React.ComponentType<{ className?: string }>;
    photoUrl: string;
    domainKeywords: string[];
  }
> = {
  kantin: {
    caseCode: 'CASE #01',
    icon: Utensils,
    photoUrl: kantinPhotoUrl,
    domainKeywords: ['kantin', 'makan', 'sampah', 'tong', 'meja', 'lantai', 'bersih', 'sisa'],
  },
  kelas: {
    caseCode: 'CASE #02',
    icon: BookOpenCheck,
    photoUrl: kelasPhotoUrl,
    domainKeywords: ['kelas', 'meja', 'kerusi', 'sudut', 'belajar', 'tumpuan', 'kemas', 'laluan'],
  },
  perpustakaan: {
    caseCode: 'CASE #03',
    icon: Library,
    photoUrl: perpustakaanPhotoUrl,
    domainKeywords: ['perpustakaan', 'buku', 'baca', 'rak', 'selesa', 'kategori', 'ilmu'],
  },
  taman: {
    caseCode: 'CASE #04',
    icon: Trees,
    photoUrl: tamanPhotoUrl,
    domainKeywords: ['taman', 'pokok', 'bunga', 'bangku', 'rehat', 'hijau', 'alam', 'selesa'],
  },
};

const INTERACTIVE_CLUES: {
  id: 'investigation' | 'benefits' | 'impact';
  code: string;
  title: string;
  question: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'investigation',
    code: 'CLUE 01',
    title: 'CLUE 01 – INVESTIGATION',
    question: 'Mengapakah pendapat ini wajar dilaksanakan?',
    hint: 'Mulakan alasan anda dengan menyatakan sebab utama mengapa masalah tersebut perlu diselesaikan segera.',
    icon: Search,
  },
  {
    id: 'benefits',
    code: 'CLUE 02',
    title: 'CLUE 02 – BENEFITS',
    question: 'Apakah kebaikan yang boleh diperoleh?',
    hint: 'Terangkan hasil positif yang berlaku kepada suasana atau kemudahan di lokasi sekolah itu.',
    icon: Sparkles,
  },
  {
    id: 'impact',
    code: 'CLUE 03',
    title: 'CLUE 03 – IMPACT',
    question: 'Bagaimanakah tindakan ini dapat membantu warga sekolah?',
    hint: 'Nyatakan bagaimana murid, guru atau warga sekolah menjadi lebih selesa, selamat atau fokus.',
    icon: ShieldCheck,
  },
];

type ReasoningNodeId = 'pendapat' | 'alasan' | 'kesan';

const REASONING_NODES: {
  id: ReasoningNodeId;
  step: string;
  label: string;
  explanation: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'pendapat',
    step: '01',
    label: 'PENDAPAT',
    explanation: 'Pendirian atau cadangan utama yang telah anda bina di Fasa 2.',
    hint: 'Baca semula pernyataan pendapat anda di sebelah kiri sebelum menyambungnya dengan alasan.',
    icon: FileCheck2,
  },
  {
    id: 'alasan',
    step: '02',
    label: 'ALASAN',
    explanation: 'Sebab logik yang menerangkan mengapa cadangan tersebut wajar dilakukan.',
    hint: 'Gunakan kata hubung seperti "kerana", "hal ini demikian kerana" atau "bagi" untuk menyambung idea.',
    icon: Lightbulb,
  },
  {
    id: 'kesan',
    step: '03',
    label: 'KESAN',
    explanation: 'Manfaat nyata terhadap keselesaan, kebersihan atau pembelajaran warga sekolah.',
    hint: 'Akhiri ayat dengan akibat baik menggunakan kata hubung seperti "supaya", "agar" atau "membolehkan".',
    icon: Layers,
  },
];

const REASON_CONNECTORS = [
  'kerana',
  'supaya',
  'agar',
  'untuk',
  'bagi',
  'dapat',
  'boleh',
  'membantu',
  'membolehkan',
  'meningkatkan',
  'mengelakkan',
  'menjadikan',
  'sebab',
  'kesannya',
];

const CONFETTI_PIECES = [
  { x: -110, y: -55, rotate: -35, color: '#D6AA4B' },
  { x: -75, y: -80, rotate: 28, color: '#123D30' },
  { x: -35, y: -90, rotate: -18, color: '#A9C5AD' },
  { x: 0, y: -95, rotate: 42, color: '#D6AA4B' },
  { x: 40, y: -88, rotate: -25, color: '#C2593F' },
  { x: 80, y: -76, rotate: 32, color: '#123D30' },
  { x: 115, y: -50, rotate: -40, color: '#D6AA4B' },
  { x: -55, y: -62, rotate: 15, color: '#F1E5C7' },
  { x: 58, y: -64, rotate: -22, color: '#A9C5AD' },
];

const AMBIENT_MOTES = [
  { id: 0, left: '6%', top: '12%', dur: '7.6s', delay: '0s' },
  { id: 1, left: '93%', top: '18%', dur: '6.8s', delay: '1.0s' },
  { id: 2, left: '22%', top: '74%', dur: '8.4s', delay: '0.5s' },
  { id: 3, left: '79%', top: '65%', dur: '7.2s', delay: '1.4s' },
  { id: 4, left: '49%', top: '26%', dur: '8.9s', delay: '0.8s' },
];

interface ReasoningEvalResult {
  completeness: { met: boolean; message: string };
  reasoningCue: { met: boolean; message: string };
  relevanceLink: { met: boolean; message: string };
}

function evaluateReasoningText(
  reasonText: string,
  opinionText: string,
  locId: LocationId
): ReasoningEvalResult {
  const trimmed = reasonText.trim();
  const lower = trimmed.toLowerCase();
  const words = countWords(trimmed);
  const endsWithPunctuation = /[.!?]$/.test(trimmed);

  const completenessMet = trimmed.length >= 10 && words >= 6 && endsWithPunctuation;
  const completenessMsg = completenessMet
    ? `Alasan anda lengkap (${words} perkataan) dan diakhiri dengan tanda baca yang tepat.`
    : words < 6
      ? `Alasan masih ringkas (${words} perkataan). Cuba huraikan sebab dan kesannya dengan lebih jelas.`
      : 'Struktur alasan sudah baik, tetapi pastikan ayat diakhiri dengan tanda noktah (.).';

  const hasConnector = REASON_CONNECTORS.some((c) => lower.includes(c));
  const reasoningCueMet = hasConnector && words >= 6;
  const reasoningCueMsg = reasoningCueMet
    ? 'Penggunaan penanda alasan dan kesan (sebab/akibat) amat jelas dan teratur.'
    : 'Cuba sertakan kata hubung sebab atau kesan seperti "kerana", "supaya" atau "agar" untuk menguatkan alasan.';

  const meta = CASE_META[locId];
  const opinionTokens = opinionText
    .toLowerCase()
    .split(/[^a-z0-9\u00C0-\u024F]+/)
    .filter((w) => w.length >= 4);
  const combined = Array.from(new Set([...meta.domainKeywords, ...opinionTokens]));
  const relevanceMet = combined.some((kw) => lower.includes(kw));
  const relevanceMsg = relevanceMet
    ? `Alasan anda berkait rapat dengan pernyataan pendapat dan isu di ${LOCATION_MAP[locId].name}.`
    : `Kaitkan alasan anda secara langsung dengan situasi di ${LOCATION_MAP[locId].name} agar hujah lebih meyakinkan.`;

  return {
    completeness: { met: completenessMet, message: completenessMsg },
    reasoningCue: { met: reasoningCueMet, message: reasoningCueMsg },
    relevanceLink: { met: relevanceMet, message: relevanceMsg },
  };
}

interface ReasoningChamberHQProps {
  state: GameState;
  draftReasons: Record<LocationId, string>;
  typingLoc: LocationId | null;
  labSoundEnabled: boolean;
  challengesPassed: boolean;
  phase3Done: boolean;
  savedNotice: boolean;
  celebrationVisible: boolean;
  error: string;
  onReasonChange: (locId: LocationId, value: string) => void;
  onClearReason: (locId: LocationId) => void;
  onSaveSingleReason: (locId: LocationId) => boolean;
  onSubmitReasons: (e: React.FormEvent) => void;
  onProceedToPhase4: () => void;
}

export function ReasoningChamberHQ({
  state,
  draftReasons,
  typingLoc,
  labSoundEnabled,
  challengesPassed,
  phase3Done,
  savedNotice,
  celebrationVisible,
  error,
  onReasonChange,
  onClearReason,
  onSaveSingleReason,
  onSubmitReasons,
  onProceedToPhase4,
}: ReasoningChamberHQProps) {
  const selectedIds = state.selectedEvidenceIds;
  const [focusedLocId, setFocusedLocId] = useState<LocationId>(
    selectedIds[0] ?? 'kantin'
  );
  const [activeClueId, setActiveClueId] = useState<'investigation' | 'benefits' | 'impact'>(
    'investigation'
  );
  const [activeBuilderNode, setActiveBuilderNode] = useState<ReasoningNodeId>('alasan');
  const [editingLocs, setEditingLocs] = useState<Record<LocationId, boolean>>(() => ({
    kantin: (state.opinions.kantin.reasonText || '').trim().length < 10,
    kelas: (state.opinions.kelas.reasonText || '').trim().length < 10,
    perpustakaan: (state.opinions.perpustakaan.reasonText || '').trim().length < 10,
    taman: (state.opinions.taman.reasonText || '').trim().length < 10,
  }));
  const [analysedLocs, setAnalysedLocs] = useState<Record<LocationId, boolean>>(() => ({
    kantin: (state.opinions.kantin.reasonText || '').trim().length >= 10,
    kelas: (state.opinions.kelas.reasonText || '').trim().length >= 10,
    perpustakaan: (state.opinions.perpustakaan.reasonText || '').trim().length >= 10,
    taman: (state.opinions.taman.reasonText || '').trim().length >= 10,
  }));
  const [scanningLoc, setScanningLoc] = useState<LocationId | null>(null);
  const [scanPhaseText, setScanPhaseText] = useState('MENGANALISIS ALASAN ANDA...');
  const [showMentorDrawer, setShowMentorDrawer] = useState(true);
  const [showCluesMobile, setShowCluesMobile] = useState(true);
  const [mentorGuideOpen, setMentorGuideOpen] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Partial<Record<LocationId, boolean>>>({});

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scanMidRef = useRef<number | null>(null);
  const scanEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedIds.length > 0 && !selectedIds.includes(focusedLocId)) {
      setFocusedLocId(selectedIds[0]);
    }
  }, [selectedIds, focusedLocId]);

  useEffect(() => {
    return () => {
      if (scanMidRef.current !== null) window.clearTimeout(scanMidRef.current);
      if (scanEndRef.current !== null) window.clearTimeout(scanEndRef.current);
    };
  }, []);

  const loc = LOCATION_MAP[focusedLocId];
  const meta = CASE_META[focusedLocId];
  const LocIcon = meta.icon;
  const opinion = state.opinions[focusedLocId]?.opinionText || '';
  const currentReason = draftReasons[focusedLocId] || '';
  const wordCount = countWords(currentReason);
  const isTypingHere = typingLoc === focusedLocId;
  const isEditing = editingLocs[focusedLocId] ?? true;
  const isSavedValid =
    (state.opinions[focusedLocId]?.reasonText || '').trim().length >= 10;
  const isAnalysed = Boolean(analysedLocs[focusedLocId] && !isEditing && isSavedValid);
  const isScanning = scanningLoc === focusedLocId;

  const completedReasonCount = selectedIds.filter(
    (id) => (state.opinions[id]?.reasonText || '').trim().length >= 10
  ).length;
  const progressPct =
    selectedIds.length > 0
      ? Math.round((completedReasonCount / selectedIds.length) * 100)
      : 0;

  const activeClue =
    INTERACTIVE_CLUES.find((c) => c.id === activeClueId) ?? INTERACTIVE_CLUES[0];
  const activeBuilderDef =
    REASONING_NODES.find((n) => n.id === activeBuilderNode) ?? REASONING_NODES[1];

  const evalResult = isAnalysed
    ? evaluateReasoningText(
        state.opinions[focusedLocId]?.reasonText || currentReason,
        opinion,
        focusedLocId
      )
    : null;
  const evalScoreCount = evalResult
    ? [
        evalResult.completeness.met,
        evalResult.reasoningCue.met,
        evalResult.relevanceLink.met,
      ].filter(Boolean).length
    : 0;

  const earnedBadges = getEarnedBadgeIds(state);
  const agentRank = getAgentRank(state.xp, state.finalReportSaved);

  const handleAnalyseReasoning = (locId: LocationId) => {
    if ((draftReasons[locId] || '').trim().length < 10) {
      if (labSoundEnabled) gameAudio.playError();
      onSaveSingleReason(locId);
      return;
    }

    if (scanMidRef.current !== null) window.clearTimeout(scanMidRef.current);
    if (scanEndRef.current !== null) window.clearTimeout(scanEndRef.current);

    if (labSoundEnabled) gameAudio.playClick();
    setScanPhaseText('MENGANALISIS ALASAN ANDA...');
    setScanningLoc(locId);

    scanMidRef.current = window.setTimeout(() => {
      setScanPhaseText('MENYEMAK HUBUNG KAIT PENDAPAT, ALASAN & KESAN...');
    }, 480);

    scanEndRef.current = window.setTimeout(() => {
      const ok = onSaveSingleReason(locId);
      setScanningLoc(null);
      if (ok) {
        setEditingLocs((prev) => ({ ...prev, [locId]: false }));
        setAnalysedLocs((prev) => ({ ...prev, [locId]: true }));
        setActiveBuilderNode('kesan');
        if (labSoundEnabled) {
          gameAudio.playSuccess();
        }
      }
    }, 980);
  };

  const mentorDialogue = (() => {
    if (selectedIds.length === 0) {
      return 'Pilih 2 hingga 3 kes di Fasa 2 terlebih dahulu supaya Fail Kes anda dapat dibuka di Ruang Penaakulan ini.';
    }
    if (isScanning) {
      return 'Pengimbas Makmal sedang meneliti kejelasan alasan serta perkaitannya dengan pendapat asal anda...';
    }
    if (evalResult) {
      if (evalScoreCount === 3) {
        return `Syabas, Ejen! Alasan anda bagi ${loc.name} amat mantap, lengkap dan menyokong pendapat dengan tepat.`;
      }
      return `Alasan anda bagi ${loc.name} telah direkodkan. Semak keputusan pengimbas dan klik "Edit Alasan" jika mahu memperkukuhnya lagi.`;
    }
    if (wordCount === 0) {
      return `Teliti Fail Rahsia bagi ${loc.name}, kemudian klik kad CLUE 01–03 untuk mendapatkan rangsangan idea sebelum menulis di jurnal.`;
    }
    return `Teruskan! Pastikan alasan anda menerangkan sebab dan kebaikan yang menyokong pendapat asal anda (${wordCount} perkataan).`;
  })();

  return (
    <form
      id="part-b-notebook"
      onSubmit={onSubmitReasons}
      className="hq-secret-chamber relative overflow-hidden rounded-2xl border-2 border-[#D6AA4B]/80 p-4 sm:p-6 lg:p-7 space-y-6 text-[#F1E5C7]"
    >
      {/* Ambient Floating Golden Particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {AMBIENT_MOTES.map((m) => (
          <span
            key={m.id}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#D6AA4B]/45 float-mote"
            style={
              {
                left: m.left,
                top: m.top,
                '--mote-dur': m.dur,
                '--mote-delay': m.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 2. CINEMATIC MISSION HEADER */}
      <div className="relative rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/55 p-4 sm:p-5 space-y-4 lab-title-reveal">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl hq-brass-plaque text-[#092B22] flex items-center justify-center shrink-0 shadow-lg">
              <NotebookPen className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[11px] font-bold tracking-widest text-[#D6AA4B]">
                <span>THE REASONING CHAMBER</span>
                <span aria-hidden="true">·</span>
                <span>BAHAGIAN B · BUKU NOTA PENYIASATAN DIGITAL</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F1E5C7] hq-title-glow">
                MISSION: BINA ALASAN YANG RELEVAN
              </h2>
              <p className="text-xs sm:text-sm text-[#A9C5AD]">
                CASE NUMBER:{' '}
                <strong className="text-[#D6AA4B]">
                  {meta.caseCode} – {loc.name.toUpperCase()}
                </strong>
                {' · '}
                Berikan alasan yang relevan untuk menyokong pendapat yang dinyatakan menggunakan
                pemikiran anda sendiri.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Status Misi</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#D6AA4B]">
                {phase3Done ? 'SELESAI' : 'AKTIF'} · {completedReasonCount}/
                {selectedIds.length} Kes
              </p>
            </div>
            <div className="rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">XP &amp; Pangkat</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {state.xp} XP · {agentRank}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-lg bg-[#123D30]/85 border border-[#D6AA4B]/35 px-3 py-2">
              <p className="text-[11px] text-[#A9C5AD]">Lencana HQ</p>
              <p className="font-mono-tabular text-xs sm:text-sm font-bold text-[#F1E5C7]">
                {earnedBadges.length}/5 Terbuka
              </p>
            </div>
          </div>
        </div>

        {/* Golden Mission Progress Bar */}
        <div className="space-y-1.5 pt-1 border-t border-[#D6AA4B]/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-tabular font-bold text-[#D6AA4B]">
              KEMAJUAN ALASAN KES: {completedReasonCount}/{selectedIds.length} SIAP
            </span>
            <span className="font-mono-tabular font-bold text-[#F1E5C7]">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#123D30] border border-[#D6AA4B]/35 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D6AA4B] to-[#A9C5AD] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {selectedIds.length === 0 ? (
        <div className="relative p-6 rounded-xl bg-[#071D17]/90 border border-dashed border-[#D6AA4B]/50 text-sm text-[#E8DFC9]">
          Belum ada bukti lokasi dipilih dalam Fasa 2. Sila kembali ke Fasa 2 untuk memilih bukti
          dan menulis pendapat dahulu.
        </div>
      ) : (
        /* 11. THREE-COLUMN DESKTOP / TWO-COLUMN TABLET / SINGLE-COLUMN MOBILE */
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* LEFT: CASE DOSSIER & MISSION NAVIGATION */}
          <aside
            aria-label="Navigasi Kes & Fail Rahsia"
            className="md:col-span-4 xl:col-span-3 space-y-4"
          >
            {/* Mission Case Switcher */}
            <div className="rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/45 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-[#D6AA4B]/25 pb-2">
                <Compass className="w-4 h-4 text-[#D6AA4B]" />
                <h3 className="font-display text-base font-bold text-[#F1E5C7]">
                  Fail Kes Terpilih
                </h3>
              </div>

              <div className="space-y-2">
                {selectedIds.map((id, idx) => {
                  const itemLoc = LOCATION_MAP[id];
                  const itemMeta = CASE_META[id];
                  const ItemIcon = itemMeta.icon;
                  const isFocused = focusedLocId === id;
                  const hasSavedReason =
                    (state.opinions[id]?.reasonText || '').trim().length >= 10;
                  const hasDraft = (draftReasons[id] || '').trim().length >= 10;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (labSoundEnabled) gameAudio.playClick();
                        setFocusedLocId(id);
                      }}
                      aria-current={isFocused ? 'true' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 hover:translate-x-1 ${
                        isFocused
                          ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_18px_rgba(214,170,75,0.22)]'
                          : 'bg-[#092B22] border-[#D6AA4B]/25 text-[#A9C5AD] hover:border-[#D6AA4B]/65 hover:text-[#F1E5C7]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isFocused
                            ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                            : 'bg-[#071D17] text-[#D6AA4B] border-[#D6AA4B]/30'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono-tabular text-[10px] font-bold text-[#D6AA4B]">
                            KES #{idx + 1} · {itemMeta.caseCode}
                          </span>
                          {hasSavedReason && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#D6AA4B] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-bold truncate text-[#F1E5C7]">
                          {itemLoc.name}
                        </p>
                        <p className="text-[11px] text-[#A9C5AD]">
                          {hasSavedReason
                            ? 'Disahkan'
                            : hasDraft
                              ? 'Draf Sedia'
                              : 'Perlu Alasan'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. CLASSIFIED DOSSIER (FOLDER WITH PHOTO, STAMP & EXACT OPINION STATEMENT) */}
            <div
              key={`dossier-${focusedLocId}`}
              className="rounded-xl overflow-hidden border-2 border-[#D6AA4B]/70 bg-[#123D30] shadow-xl dossier-unfold"
            >
              {/* Folder Tab Header */}
              <div className="bg-[#071D17] px-4 py-2.5 flex items-center justify-between border-b border-[#D6AA4B]/40">
                <span className="font-mono-tabular text-[11px] font-bold text-[#D6AA4B]">
                  {meta.caseCode} · SULIT
                </span>
                <span className="px-2 py-0.5 rounded border border-[#C2593F] text-[10px] font-mono-tabular font-extrabold tracking-widest text-[#F2A18D]">
                  CLASSIFIED
                </span>
              </div>

              {/* Location Illustration */}
              <div className="relative h-32 w-full bg-[#092B22]">
                {!imageErrorMap[focusedLocId] ? (
                  <img
                    src={meta.photoUrl}
                    alt={`Fail lokasi ${loc.name}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImageErrorMap((prev) => ({ ...prev, [focusedLocId]: true }))
                    }
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#D6AA4B]/50">
                    <LocIcon className="w-12 h-12" />
                  </div>
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#092B22] via-[#092B22]/45 to-transparent"
                />
                {isSavedValid && !isEditing && (
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-[#092B22]/90 border border-[#D6AA4B] text-[#D6AA4B] font-mono-tabular text-[10px] font-extrabold tracking-widest room-stamp-slam">
                    VERIFIED
                  </div>
                )}
                <p className="absolute bottom-2.5 left-3.5 font-display text-base font-bold text-[#F1E5C7]">
                  {loc.name}
                </p>
              </div>

              {/* Exact Original Opinion Statement */}
              <div className="p-4 bg-[#F1E5C7] text-[#092B22] space-y-1.5 border-t border-[#D6AA4B]">
                <p className="font-mono-tabular text-[10px] font-bold uppercase tracking-wider text-[#5C4128]">
                  Pernyataan Pendapat Asal (Fasa 2):
                </p>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed text-[#092B22]">
                  {opinion ? `“${opinion}”` : 'Tiada pernyataan pendapat direkodkan.'}
                </p>
              </div>
            </div>
          </aside>

          {/* CENTRE: INTERACTIVE CLUE SYSTEMS + REASONING BUILDER + PRIVATE JOURNAL + SCANNER */}
          <div className="md:col-span-8 xl:col-span-6 space-y-5">
            {/* 4. THREE INTERACTIVE CLUE SYSTEMS */}
            <div className="rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/50 p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#D6AA4B]" />
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#F1E5C7]">
                    Sistem Petunjuk Rangsangan Pemikiran
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCluesMobile((prev) => !prev)}
                  className="md:hidden text-xs font-bold text-[#D6AA4B] inline-flex items-center gap-1"
                >
                  {showCluesMobile ? 'Tutup' : 'Buka'}
                  {showCluesMobile ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className={`${showCluesMobile ? 'space-y-3' : 'hidden md:block space-y-3'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {INTERACTIVE_CLUES.map((clue) => {
                    const ClueIcon = clue.icon;
                    const isActive = activeClueId === clue.id;
                    return (
                      <button
                        key={clue.id}
                        type="button"
                        onClick={() => {
                          if (labSoundEnabled) gameAudio.playClick();
                          setActiveClueId(clue.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6AA4B] ${
                          isActive
                            ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_20px_rgba(214,170,75,0.24)] -translate-y-0.5'
                            : 'bg-[#092B22] border-[#D6AA4B]/30 text-[#A9C5AD] hover:border-[#D6AA4B]/70 hover:text-[#F1E5C7]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                              isActive
                                ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                                : 'bg-[#071D17] text-[#D6AA4B] border-[#D6AA4B]/35'
                            }`}
                          >
                            <ClueIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-mono-tabular text-[10px] font-bold text-[#D6AA4B]">
                            {clue.code}
                          </span>
                        </div>
                        <p className="text-xs font-bold leading-snug">{clue.title}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Revealed Original Question & Hint */}
                <div className="rounded-xl bg-[#123D30]/80 border border-[#D6AA4B]/45 p-3.5 space-y-1.5 lab-report-reveal">
                  <p className="text-xs sm:text-sm font-bold text-[#F1E5C7]">
                    {activeClue.question}
                  </p>
                  <p className="text-xs text-[#A9C5AD] leading-relaxed">
                    <strong className="text-[#D6AA4B]">Petunjuk Berfikir:</strong> {activeClue.hint}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. VISUAL REASONING BUILDER: PENDAPAT -> ALASAN -> KESAN */}
            <div className="rounded-xl bg-[#071D17]/95 border border-[#D6AA4B]/45 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-tabular text-xs font-bold text-[#D6AA4B]">
                  PEMBINA ALASAN VISUAL · PENDAPAT → ALASAN → KESAN
                </span>
                <span className="text-[11px] text-[#A9C5AD]">Klik nod untuk panduan</span>
              </div>

              <div className="relative">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 10"
                  preserveAspectRatio="none"
                  className="hidden sm:block absolute top-5 left-10 right-10 w-[calc(100%-5rem)] h-2.5 pointer-events-none"
                >
                  <line
                    x1="0"
                    y1="5"
                    x2="400"
                    y2="5"
                    stroke="#D6AA4B"
                    strokeWidth="2.5"
                    strokeDasharray="8 6"
                    className="lab-gold-line-flow"
                  />
                </svg>

                <div className="grid grid-cols-3 gap-2.5 relative z-10">
                  {REASONING_NODES.map((node) => {
                    const NodeIcon = node.icon;
                    const active = activeBuilderNode === node.id;
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          if (labSoundEnabled) gameAudio.playClick();
                          setActiveBuilderNode(node.id);
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-[#123D30] border-[#D6AA4B] text-[#F1E5C7] shadow-[0_0_16px_rgba(214,170,75,0.22)]'
                            : 'bg-[#092B22] border-[#D6AA4B]/30 text-[#A9C5AD] hover:border-[#D6AA4B]/70 hover:text-[#F1E5C7]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            active
                              ? 'bg-[#D6AA4B] text-[#092B22] border-[#F1E5C7]'
                              : 'bg-[#071D17] text-[#D6AA4B] border-[#D6AA4B]/30'
                          }`}
                        >
                          <NodeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono-tabular text-[10px] font-bold text-[#D6AA4B]">
                            {node.step}
                          </p>
                          <p className="text-xs font-bold truncate">{node.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg bg-[#092B22] border border-[#D6AA4B]/30 p-3 text-xs space-y-1">
                <p className="font-bold text-[#D6AA4B]">
                  {activeBuilderDef.step}. {activeBuilderDef.label} — {activeBuilderDef.explanation}
                </p>
                <p className="text-[#E8DFC9]">{activeBuilderDef.hint}</p>
              </div>
            </div>

            {/* 5. DETECTIVE'S PRIVATE JOURNAL + 7. IMMERSIVE REASONING SCANNER */}
            <div className="relative overflow-hidden rounded-xl lab-journal-paper border-2 border-[#D6AA4B] p-4 sm:p-5 text-[#092B22]">
              {/* SCANNER OVERLAY */}
              {isScanning && (
                <div
                  aria-live="polite"
                  className="absolute inset-0 z-30 bg-[#04120E]/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center text-[#F1E5C7]"
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
                      {scanPhaseText}
                    </p>
                    <div className="w-48 h-1.5 rounded-full bg-[#123D30] overflow-hidden border border-[#D6AA4B]/35">
                      <div className="h-full w-3/4 rounded-full bg-[#D6AA4B] animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Journal Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#092B22]/15 pl-6">
                <div>
                  <p className="font-mono-tabular text-[10px] font-bold tracking-wider text-[#5C4128]">
                    DETECTIVE&apos;S PRIVATE JOURNAL · {meta.caseCode}
                  </p>
                  <h4 className="font-display text-lg font-bold text-[#092B22]">
                    Jurnal Alasan Penyokong — {loc.name}
                  </h4>
                </div>

                <div className="flex items-center gap-3 font-mono-tabular text-xs font-bold text-[#123D30]">
                  {isTypingHere && (
                    <span className="inline-flex items-center gap-1 text-[#8a4526]">
                      <span className="w-2 h-2 rounded-full bg-[#C2593F] lab-cursor-blink" />
                      Menulis...
                    </span>
                  )}
                  <span>{wordCount} perkataan</span>
                </div>
              </div>

              {/* Quick Opinion Reference Strip Right Above Writing Area */}
              <div className="ml-6 mb-3 rounded-lg bg-[#E8DFC9]/85 border border-[#5C4128]/25 p-3 text-xs text-[#092B22]">
                <span className="font-bold text-[#5C4128]">Pendapat Asal: </span>
                <span className="font-medium">
                  {opinion ? `“${opinion}”` : 'Tiada pernyataan pendapat direkodkan.'}
                </span>
              </div>

              {!isEditing && isSavedValid ? (
                <div className="space-y-4 pl-6 lab-report-reveal">
                  <div className="rounded-xl bg-white/95 p-4 border border-[#123D30]/30 text-sm sm:text-base text-[#092B22] leading-relaxed whitespace-pre-wrap">
                    {currentReason}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (labSoundEnabled) gameAudio.playClick();
                        onClearReason(focusedLocId);
                        setEditingLocs((prev) => ({ ...prev, [focusedLocId]: true }));
                        setAnalysedLocs((prev) => ({ ...prev, [focusedLocId]: false }));
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E8DFC9] hover:bg-[#DFD2B4] text-[#5C4128] border border-[#5C4128]/30 font-bold text-xs transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Kosongkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (labSoundEnabled) gameAudio.playClick();
                        setEditingLocs((prev) => ({ ...prev, [focusedLocId]: true }));
                        window.requestAnimationFrame(() => {
                          textareaRef.current?.focus();
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#123D30] hover:bg-[#092B22] text-[#F1E5C7] border border-[#D6AA4B] font-bold text-xs transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#D6AA4B]" />
                      Edit Alasan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pl-6">
                  <div>
                    <label
                      htmlFor={`reason-${focusedLocId}`}
                      className="block text-xs font-bold text-[#123D30] mb-1.5"
                    >
                      Ruang Alasan Relevan Penyokong Pendapat
                    </label>
                    <textarea
                      ref={textareaRef}
                      id={`reason-${focusedLocId}`}
                      rows={5}
                      value={currentReason}
                      onChange={(e) => {
                        onReasonChange(focusedLocId, e.target.value);
                        setAnalysedLocs((prev) => ({ ...prev, [focusedLocId]: false }));
                      }}
                      placeholder={`Taip alasan relevan anda sendiri bagi menyokong pendapat untuk ${loc.name}...`}
                      className="w-full min-h-[140px] rounded-xl p-4 bg-white/95 border-2 border-[#123D30]/35 focus:border-[#092B22] focus:ring-2 focus:ring-[#D6AA4B]/50 focus:outline-none text-sm sm:text-base leading-relaxed text-[#092B22] placeholder-[#6B7F77]"
                    />
                  </div>

                  {/* Writing Readiness & Action Row */}
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-[#DFD2B4] overflow-hidden border border-[#5C4128]/20">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#5C4128] via-[#D6AA4B] to-[#123D30] transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((wordCount / 8) * 100))}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <span className="text-xs text-[#5C4128] font-medium">
                        {wordCount >= 6
                          ? 'Alasan kelihatan mantap untuk diimbas'
                          : 'Tulis sekurang-kurangnya 10 aksara dengan sebab & kesan'}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {currentReason.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (labSoundEnabled) gameAudio.playClick();
                              onClearReason(focusedLocId);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E8DFC9] hover:bg-[#DFD2B4] text-[#5C4128] border border-[#5C4128]/30 font-bold text-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Kosongkan
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isScanning}
                          onClick={() => handleAnalyseReasoning(focusedLocId)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] disabled:opacity-60 text-[#F1E5C7] border-2 border-[#D6AA4B] font-bold text-xs sm:text-sm shadow-md transition-colors whitespace-nowrap"
                        >
                          <ScanSearch className="w-4 h-4 text-[#D6AA4B]" />
                          ANALYSE MY REASONING
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SCANNER ASSESSMENT REPORT */}
            {evalResult && (
              <div className="rounded-xl bg-[#071D17] border-2 border-[#D6AA4B]/75 p-4 sm:p-5 text-[#F1E5C7] space-y-3 shadow-xl lab-report-reveal">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6AA4B]/25 pb-2.5">
                  <p className="font-mono-tabular text-xs font-bold text-[#D6AA4B]">
                    LAPORAN PENILAIAN ALASAN · {loc.name.toUpperCase()}
                  </p>
                  <span className="font-mono-tabular text-xs font-bold text-[#F1E5C7]">
                    {evalScoreCount}/3 Kriteria Terpenuhi
                  </span>
                </div>

                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-2.5">
                    {evalResult.completeness.met ? (
                      <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong className="text-[#D6AA4B]">Kelengkapan Ayat:</strong>{' '}
                      {evalResult.completeness.message}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-2.5">
                    {evalResult.reasoningCue.met ? (
                      <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong className="text-[#D6AA4B]">Penanda Sebab &amp; Kesan:</strong>{' '}
                      {evalResult.reasoningCue.message}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 rounded-lg bg-[#092B22] border border-[#D6AA4B]/25 p-2.5">
                    {evalResult.relevanceLink.met ? (
                      <CheckCircle2 className="w-4 h-4 text-[#D6AA4B] shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#D6AA4B]/70 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <strong className="text-[#D6AA4B]">Perkaitan Kes:</strong>{' '}
                      {evalResult.relevanceLink.message}
                    </span>
                  </li>
                </ul>

                {!challengesPassed && (
                  <p className="text-xs text-[#F2CE74] pt-1">
                    Nota: Pastikan kesemua 3 ujian dalam Bahagian A turut disahkan tepat sebelum
                    membuka Studio Arkitek.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: PROFESSOR NURIN – DETECTIVE MENTOR */}
          <aside
            aria-label="Profesor Nurin Pembimbing Penaakulan"
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
                onClick={() => setShowMentorDrawer((prev) => !prev)}
                className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-[#D6AA4B]"
              >
                {showMentorDrawer ? 'Tutup' : 'Buka'}
                {showMentorDrawer ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className={`${showMentorDrawer ? 'space-y-4' : 'hidden md:block space-y-4'}`}>
              <div className="flex flex-row xl:flex-col items-center gap-3.5 xl:text-center">
                <div
                  className={`p-1 rounded-full bg-gradient-to-br from-[#D6AA4B] to-[#5C4128] shrink-0 ${
                    isScanning || Boolean(evalResult) || mentorGuideOpen ? 'lab-mentor-speak' : ''
                  }`}
                >
                  <ProfesorCitraPortrait realistic className="w-16 h-16 xl:w-20 xl:h-20" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-display text-base font-bold text-[#F1E5C7]">
                    Profesor Nurin
                  </p>
                  <p className="font-mono-tabular text-[11px] text-[#D6AA4B]">
                    Pembimbing Penaakulan HQ
                  </p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${focusedLocId}-${Boolean(evalResult)}-${isScanning}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl bg-[#123D30] border border-[#D6AA4B]/55 p-3.5 text-xs sm:text-sm text-[#F1E5C7] leading-relaxed"
                >
                  <p>“{mentorDialogue}”</p>
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={() => {
                  if (labSoundEnabled) gameAudio.playHint();
                  setMentorGuideOpen((prev) => !prev);
                }}
                aria-expanded={mentorGuideOpen}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#092B22] hover:bg-[#123D30] text-[#D6AA4B] border border-[#D6AA4B]/60 text-xs font-bold transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                {mentorGuideOpen ? 'Tutup Panduan Penulisan' : 'Buka Panduan Profesor'}
              </button>

              {mentorGuideOpen && (
                <div className="rounded-xl bg-[#092B22] border border-[#D6AA4B]/40 p-3.5 text-xs text-[#E8DFC9] space-y-2 lab-report-reveal">
                  <p className="font-bold text-[#D6AA4B]">Formula Alasan Berkesan:</p>
                  <p>
                    Gabungkan <strong>Sebab</strong> + <strong>Kesan Baik</strong>. Contoh kata
                    hubung berguna: <em>kerana, supaya, agar, membolehkan</em>.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* VALIDATION ERROR */}
      {error && (
        <div
          role="alert"
          className="relative p-4 rounded-xl bg-[#3D1A16] border-2 border-[#C2593F] text-sm font-semibold text-[#FCE5DF] flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-[#F2A18D] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 10. REWARD EXPERIENCE ("REASONING VERIFIED!") */}
      <AnimatePresence>
        {(savedNotice || (phase3Done && celebrationVisible)) && (
          <motion.div
            role="status"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-2xl hq-brass-plaque text-[#092B22] border-2 border-[#F1E5C7]/80 p-5 sm:p-6 shadow-2xl"
          >
            {celebrationVisible && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                {CONFETTI_PIECES.map((piece, i) => (
                  <motion.span
                    key={i}
                    className="absolute w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: piece.color }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{
                      x: piece.x,
                      y: piece.y,
                      opacity: 0,
                      scale: 0.8,
                      rotate: piece.rotate * 4,
                    }}
                    transition={{ duration: 1.15, ease: 'easeOut' }}
                  />
                ))}
              </div>
            )}

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <motion.div
                  initial={{ rotate: -20, scale: 0.7 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="w-12 h-12 rounded-xl bg-[#092B22] text-[#D6AA4B] flex items-center justify-center shrink-0 shadow-md"
                >
                  <Star className="w-6 h-6 fill-[#D6AA4B]" />
                </motion.div>
                <div className="space-y-1">
                  <p className="font-mono-tabular text-xs font-extrabold tracking-widest uppercase">
                    REASONING VERIFIED!
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-[#092B22]">
                    ANDA BERJAYA MEMBINA ALASAN YANG RELEVAN!
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-[#123D30]">
                    Alasan penyokong berjaya disimpan ke Kad Keputusan Ejen. Lencana{' '}
                    <strong>Ahli Logik</strong> dan ganjaran +130 XP telah dikemas kini!
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#092B22] border border-[#D6AA4B] text-xs font-mono-tabular font-bold text-[#D6AA4B] shrink-0 room-stamp-slam">
                <Award className="w-4 h-4" />
                <span>Ahli Logik · Selesai</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORM ACTIONS */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D6AA4B]/30">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#123D30] hover:bg-[#195241] border-2 border-[#D6AA4B] text-[#F1E5C7] font-bold text-sm shadow-lg transition-colors whitespace-nowrap"
        >
          <Save className="w-4 h-4 text-[#D6AA4B]" />
          Simpan Alasan ke Kad Keputusan
        </button>

        {phase3Done && (
          <button
            type="button"
            onClick={onProceedToPhase4}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl hq-brass-plaque hover:brightness-105 text-[#092B22] font-bold text-sm shadow-lg transition-all whitespace-nowrap"
          >
            Buka Cabaran Akhir: Studio Arkitek
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
}
