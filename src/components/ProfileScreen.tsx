import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileBadge, ShieldCheck } from 'lucide-react';
import { validateAgentIdentity } from '../game/rules';
import type { AgentProfile } from '../game/types';
import { AgentIdCard } from './AgentIdCard';
import { AcademyEmblem, ProfesorCitraPortrait, TeamInsigniaIcon } from './DetectiveArt';

interface ProfileScreenProps {
  initialProfile?: AgentProfile | null;
  rankLabel?: string;
  onBack: () => void;
  onConfirmProfile: (
    name: string,
    className: string,
    codenameBadge: string
  ) => Promise<AgentProfile | null>;
  onProceedToHq: () => void;
}

const INSIGNIA_CARDS = [
  {
    id: 'Helang Bestari',
    subtitle: 'Pemantau Tajam',
    desc: 'Fokus mengesan perincian kes dan bukti tersembunyi.',
  },
  {
    id: 'Kanta Ilmu',
    subtitle: 'Penganalisis Fakta',
    desc: 'Mengupas punca masalah dengan teliti dan objektif.',
  },
  {
    id: 'Pena Emas',
    subtitle: 'Penggubal Pendapat',
    desc: 'Menyusun hujah bernas dan bahasa yang tersusun.',
  },
  {
    id: 'Arkitek Muda',
    subtitle: 'Pereka Sekolah Impian',
    desc: 'Merangka pelan inovasi persekitaran sekolah.',
  },
];

const QUICK_CLASSES = ['5 Bestari', '5 Cemerlang', '6 Bestari', '6 Harmoni'];

export function ProfileScreen({
  initialProfile,
  rankLabel = 'Ejen Pelatih',
  onBack,
  onConfirmProfile,
  onProceedToHq,
}: ProfileScreenProps) {
  const [name, setName] = useState(initialProfile?.name || '');
  const [className, setClassName] = useState(initialProfile?.className || '');
  const [insignia, setInsignia] = useState(
    initialProfile?.codenameBadge || INSIGNIA_CARDS[0].id
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifiedCard, setVerifiedCard] = useState<AgentProfile | null>(
    initialProfile?.agentId ? initialProfile : null
  );
  const [justVerified, setJustVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateAgentIdentity(name, className, insignia);
    if (!check.valid) {
      setError(check.error || 'Sila lengkapkan maklumat identiti ejen.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const saved = await onConfirmProfile(name.trim(), className.trim(), insignia);
      if (saved) {
        setVerifiedCard(saved);
        setJustVerified(true);
      }
    } catch {
      setError('Gagal mengesahkan identiti dengan pelayan. Sila cuba semula.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen paper-canvas text-[#1F362D] py-8 px-4 sm:px-8">
      {/* Subtle Watermark */}
      <div
        aria-hidden="true"
        className="no-print pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.045]"
      >
        <AcademyEmblem className="w-[540px] h-[540px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-6 intro-stage-1">
        {/* Registration Form Dossier */}
        <div className="no-print rounded-2xl bg-[#F8F5EC] border-2 border-[#E7B94F] shadow-[0_20px_48px_rgba(49,92,76,0.14)] overflow-hidden">
          <div className="bg-[#315C4C] px-6 py-5 border-b-2 border-[#E7B94F]/75 flex flex-wrap items-center justify-between gap-4 text-[#F8F5EC]">
            <div className="flex items-center gap-3.5">
              <AcademyEmblem className="w-12 h-12 shrink-0" />
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-[0.2em] text-[#E7B94F] font-bold">
                  Sekolah Seri Bestari · Fail Kes: Pendaftaran Identiti
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F8F5EC]">
                  KAD TUGAS RASMI EJEN
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#244639] hover:bg-[#3D6E5C] border border-[#E7B94F]/60 text-xs font-semibold text-[#F8F5EC] transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-[#E7B94F]" />
              Kembali ke HQ
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Briefing Bar with Uploaded Portrait — Pastel Green (#A9C5AD) Supporting Strip */}
            <div className="rounded-xl bg-[#A9C5AD]/60 border border-[#315C4C]/25 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <ProfesorCitraPortrait realistic className="w-16 h-16 shrink-0" />
              <div className="space-y-1">
                <p className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[#315C4C]">
                  Profesor Nurin · Ketua Operasi Rahsia
                </p>
                <p className="text-sm text-[#1F362D] leading-relaxed">
                  “Lengkapkan butiran identiti rasmi anda di bawah untuk menjana Nombor ID Ejen unik
                  dan Kad Identiti Digital Akademi Ejen Rahsia Sekolah Seri Bestari.”
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* A. Nama Ejen */}
              <div>
                <label
                  htmlFor="agent-name-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#315C4C] mb-2"
                >
                  A. Nama Ejen (Nama Penuh)
                </label>
                <input
                  id="agent-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setJustVerified(false);
                    if (error) setError('');
                  }}
                  placeholder="Contoh: Ejen Nurin Maisarah"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-[#315C4C]/25 focus:border-[#315C4C] focus:outline-none text-[#1F362D] placeholder-[#7B8B83] text-base transition-colors"
                />
              </div>

              {/* B. Kelas */}
              <div>
                <label
                  htmlFor="agent-class-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#315C4C] mb-2"
                >
                  B. Kelas Rasmi
                </label>
                <input
                  id="agent-class-input"
                  type="text"
                  value={className}
                  onChange={(e) => {
                    setClassName(e.target.value);
                    setJustVerified(false);
                    if (error) setError('');
                  }}
                  placeholder="Pilih di bawah atau taip kelas anda (cth: 5 Bestari)"
                  className="w-full px-4 py-3.5 rounded-xl bg-white border-2 border-[#315C4C]/25 focus:border-[#315C4C] focus:outline-none text-[#1F362D] placeholder-[#7B8B83] text-base transition-colors"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                  {QUICK_CLASSES.map((cls) => {
                    const active = className === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          setClassName(cls);
                          setJustVerified(false);
                          if (error) setError('');
                        }}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-150 ${
                          active
                            ? 'bg-[#315C4C] text-[#F8F5EC] border-[#E7B94F] shadow-md scale-[1.01]'
                            : 'bg-[#E8DFC9]/65 text-[#1F362D] border-[#315C4C]/20 hover:border-[#E7B94F] hover:bg-white'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C. Pilihan Gelaran Pasukan */}
              <div>
                <p className="block text-xs font-bold uppercase tracking-wider text-[#315C4C] mb-2.5">
                  C. Pilihan Gelaran Pasukan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {INSIGNIA_CARDS.map((card) => {
                    const active = insignia === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setInsignia(card.id);
                          setJustVerified(false);
                        }}
                        className={`group relative rounded-xl p-4 border-2 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                          active
                            ? 'insignia-pop bg-[#A9C5AD]/55 border-[#E7B94F] shadow-md'
                            : 'bg-white border-[#315C4C]/20 hover:border-[#E7B94F] hover:bg-[#F8F5EC]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`p-2 rounded-lg border ${
                              active
                                ? 'bg-[#315C4C] text-[#E7B94F] border-[#E7B94F]'
                                : 'bg-[#E8DFC9]/65 text-[#315C4C] border-[#315C4C]/20 group-hover:border-[#E7B94F]'
                            }`}
                          >
                            <TeamInsigniaIcon badgeName={card.id} className="w-4 h-4" />
                          </span>
                          {active && <CheckCircle2 className="w-4 h-4 text-[#315C4C]" />}
                        </div>
                        <p className="font-display text-sm font-bold text-[#1F362D]">
                          {card.id}
                        </p>
                        <p className="font-mono-tabular text-[10px] uppercase tracking-wider text-[#795A40] font-semibold mt-0.5">
                          {card.subtitle}
                        </p>
                        <p className="text-xs text-[#4A6358] mt-1.5 leading-snug">{card.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#FBECE8] border border-[#C2593F] text-sm font-medium text-[#8C331D]"
              >
                {error}
              </div>
            )}

            {justVerified && verifiedCard && (
              <div
                role="status"
                className="dossier-unfold p-4 rounded-xl bg-[#A9C5AD]/55 border-2 border-[#E7B94F] text-sm text-[#1F362D] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#315C4C] shrink-0" />
                  <span>
                    <strong>Identiti Disahkan!</strong> No. ID Ejen{' '}
                    <span className="font-mono-tabular text-[#315C4C] font-bold">
                      {verifiedCard.agentId}
                    </span>{' '}
                    telah dijana.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onProceedToHq}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#315C4C] hover:bg-[#3D6E5C] text-[#F8F5EC] border border-[#E7B94F] text-xs font-bold uppercase tracking-wider"
                >
                  Masuk ke Pusat Operasi Utama
                  <ArrowRight className="w-4 h-4 text-[#E7B94F]" />
                </button>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#315C4C]/15">
              <span className="font-mono-tabular text-xs text-[#4A6358] inline-flex items-center gap-1.5">
                <FileBadge className="w-4 h-4 text-[#795A40]" />
                Dokumen Sulit · Rekod Anggota Akademi
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#315C4C] hover:bg-[#3D6E5C] disabled:opacity-60 text-[#F8F5EC] border-2 border-[#E7B94F] font-bold text-sm tracking-wider uppercase shadow-md transition-all hover:-translate-y-0.5 whitespace-nowrap"
              >
                <ShieldCheck className="w-5 h-5 text-[#E7B94F]" />
                {submitting ? 'Mengesahkan...' : 'SAHKAN IDENTITI'}
              </button>
            </div>
          </form>
        </div>

        {/* Generated Exclusive Digital Agent Identity Card */}
        {verifiedCard && (
          <div className="dossier-unfold space-y-3">
            <div className="no-print flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-[0.18em] text-[#315C4C]">
                Kad Identiti Rasmi Digital Ejen · Siap Dicetak / Dimuat Turun
              </p>
              <button
                type="button"
                onClick={onProceedToHq}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#795A40] hover:text-[#315C4C] hover:underline"
              >
                Teruskan ke Papan Pemuka Utama
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <AgentIdCard profile={verifiedCard} rankLabel={rankLabel} />
          </div>
        )}
      </div>
    </div>
  );
}
