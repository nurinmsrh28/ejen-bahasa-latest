import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Download,
  Eye,
  FileEdit,
  Printer,
  Save,
} from 'lucide-react';
import {
  DESIGN_ACTIONS,
  FACILITY_ASSET_MAP,
  GRID_COLS,
  GRID_ROWS,
  LOCATION_MAP,
} from '../game/data';
import { countSentences, countWords, getAgentRank, validateFinalReport } from '../game/rules';
import type { GameState } from '../game/types';
import { AcademyEmblem, BadgeIconSvg, FacilityIconSvg } from './DetectiveArt';

interface Phase5ReportProps {
  state: GameState;
  onSaveReport: (reportText: string) => void;
  onBackToHq: () => void;
  onExportJson: () => void;
}

export function Phase5Report({
  state,
  onSaveReport,
  onBackToHq,
  onExportJson,
}: Phase5ReportProps) {
  const [reportText, setReportText] = useState(state.finalReportText);
  const [previewMode, setPreviewMode] = useState(state.finalReportSaved);
  const [error, setError] = useState('');
  const [savedBanner, setSavedBanner] = useState(false);

  const sentenceCount = countSentences(reportText);
  const wordCount = countWords(reportText);
  const justifiedFacilities = state.builderPlan.filter(
    (item) => (item.justification || '').trim().length >= 8
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateFinalReport(reportText);
    if (!check.valid) {
      setError(check.error || 'Sila semak panjang laporan (3–5 ayat).');
      return;
    }
    setError('');
    onSaveReport(reportText.trim());
    setSavedBanner(true);
    setPreviewMode(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-[#1F362D]">
      {/* Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-[#315C4C]/15 pb-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToHq}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#795A40] hover:text-[#315C4C] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Pusat Operasi
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#315C4C]">
            Produk Akhir · Laporan Sekolah Impian
          </h1>
          <p className="text-sm text-[#4A6358]">
            Gabungkan maklumat siasatan, pendapat, alasan dan pelan anda menjadi satu laporan rasmi
            sepanjang 3 hingga 5 ayat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F8F5EC] hover:bg-white border border-[#315C4C]/25 text-[#1F362D] text-xs font-semibold shadow-sm"
          >
            {previewMode ? (
              <>
                <FileEdit className="w-4 h-4 text-[#795A40]" />
                Sunting Laporan
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-[#795A40]" />
                Pratonton Laporan
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#315C4C] hover:bg-[#3D6E5C] text-[#F8F5EC] border border-[#E7B94F] text-xs font-bold shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#E7B94F]" />
            Cetak Laporan
          </button>

          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E7B94F] hover:bg-[#F2CE74] text-[#1F362D] text-xs font-bold shadow-sm"
          >
            <Download className="w-4 h-4 text-[#1F362D]" />
            Eksport JSON
          </button>
        </div>
      </div>

      {/* Achievement Banner when Final Report Saved */}
      {state.finalReportSaved && (
        <div className="no-print bg-[#315C4C] text-[#F8F5EC] rounded-2xl p-5 border-2 border-[#E7B94F] flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <BadgeIconSvg badgeId="arkitek_impian" earned={true} className="w-14 h-14 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#E7B94F]">
                Lencana Tertinggi Dianugerahkan
              </p>
              <h2 className="font-display text-2xl font-bold">ARKITEK SEKOLAH IMPIAN</h2>
              <p className="text-xs text-[#F8F5EC]">
                Tahniah, {state.profile?.name}! Operasi Sekolah Impian berjaya disempurnakan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono-tabular text-sm font-bold text-[#E7B94F]">
            <Award className="w-5 h-5" />
            <span>{state.xp} XP · Operasi Lengkap</span>
          </div>
        </div>
      )}

      {!previewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Reference Notes from Student's Own Work */}
          <aside className="lg:col-span-5 bg-[#F8F5EC] rounded-2xl p-5 border border-[#315C4C]/20 shadow-md space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#795A40]">
                Rujukan Hasil Kerja Anda
              </p>
              <h2 className="font-display text-xl font-bold text-[#315C4C]">
                Kad Keputusan & Pelan Anda
              </h2>
            </div>

            <div className="space-y-3">
              {state.selectedEvidenceIds.map((locId) => {
                const op = state.opinions[locId];
                return (
                  <div
                    key={locId}
                    className="bg-[#A9C5AD]/40 rounded-xl p-3.5 border border-[#315C4C]/20 text-xs space-y-1.5"
                  >
                    <p className="font-bold text-[#315C4C]">{LOCATION_MAP[locId].name}</p>
                    <p className="text-[#1F362D]">
                      <strong className="text-[#1F362D]">Pendapat:</strong> {op?.opinionText || '-'}
                    </p>
                    <p className="text-[#1F362D]">
                      <strong className="text-[#1F362D]">Alasan:</strong> {op?.reasonText || '-'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#315C4C]/15">
              <p className="text-xs font-bold uppercase tracking-wider text-[#795A40]">
                Justifikasi Studio Arkitek ({justifiedFacilities.length})
              </p>
              {justifiedFacilities.map((fac) => (
                <div
                  key={fac.uid}
                  className="bg-[#E8DFC9]/55 rounded-xl p-3 border border-[#315C4C]/15 text-xs"
                >
                  <p className="font-bold text-[#1F362D]">
                    {FACILITY_ASSET_MAP[fac.assetId].name} (
                    {DESIGN_ACTIONS.find((a) => a.id === fac.actionType)?.label || 'Diubah suai'})
                  </p>
                  <p className="text-[#4A6358] mt-0.5">{fac.justification}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* Right: Free-Form Report Editor */}
          <form
            onSubmit={handleSave}
            className="lg:col-span-7 bg-[#F8F5EC] rounded-2xl p-6 border border-[#315C4C]/20 shadow-md space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#795A40]">
                  Penulisan Bebas Ejen
                </p>
                <h2 className="font-display text-2xl font-bold text-[#315C4C]">
                  Tulis Laporan Sekolah Impian (3–5 Ayat)
                </h2>
              </div>

              <div className="font-mono-tabular text-xs font-bold flex items-center gap-4 bg-[#A9C5AD]/55 px-3.5 py-2 rounded-xl border border-[#315C4C]/20">
                <span
                  className={
                    sentenceCount >= 3 && sentenceCount <= 5
                      ? 'text-[#315C4C]'
                      : 'text-[#9F432C]'
                  }
                >
                  Kiraan Ayat: {sentenceCount} / 3–5
                </span>
                <span className="text-[#2E483E]">{wordCount} patah perkataan</span>
              </div>
            </div>

            <p className="text-xs text-[#1F362D] leading-relaxed bg-[#E8DFC9]/65 p-3.5 rounded-xl border border-[#E7B94F]">
              Susun laporan anda sendiri berdasarkan pemerhatian di Sekolah Seri Bestari, pendapat
              utama, alasan yang relevan serta cadangan perubahan pada Pelan Sekolah Impian anda.
              Pastikan setiap ayat diakhiri dengan tanda noktah (.).
            </p>

            <div>
              <label htmlFor="final-report-textarea" className="sr-only">
                Teks Laporan Sekolah Impian
              </label>
              <textarea
                id="final-report-textarea"
                rows={8}
                value={reportText}
                onChange={(e) => {
                  setReportText(e.target.value);
                  setSavedBanner(false);
                  if (error) setError('');
                }}
                placeholder="Tulis laporan pendapat anda sepanjang 3 hingga 5 ayat di sini..."
                className="w-full rounded-xl p-4 bg-white border-2 border-[#315C4C]/25 focus:border-[#315C4C] focus:outline-none text-base leading-relaxed text-[#1F362D] placeholder-[#7B8B83]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-[#FBECE8] border border-[#C2593F] text-sm font-medium text-[#8C331D]"
              >
                {error}
              </div>
            )}

            {savedBanner && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-[#A9C5AD]/45 border border-[#315C4C]/40 text-sm font-semibold text-[#1F362D]"
              >
                Laporan Sekolah Impian berjaya disimpan!
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#315C4C] hover:bg-[#3D6E5C] border-2 border-[#E7B94F] text-[#F8F5EC] font-bold text-sm shadow transition-colors"
              >
                <Save className="w-4 h-4 text-[#E7B94F]" />
                Simpan Laporan & Pratonton
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Official Dossier Print Preview combining Report + Blueprint Plan */
        <article className="print-only-full bg-[#F8F5EC] text-[#1F362D] rounded-2xl p-6 sm:p-10 border-2 border-[#E7B94F] shadow-xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#315C4C]/20 pb-5">
            <div className="flex items-center gap-4">
              <AcademyEmblem className="w-14 h-14 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#795A40]">
                  Akademi Ejen Rahsia · Sekolah Seri Bestari
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#315C4C]">
                  Laporan Rasmi Sekolah Impian
                </h2>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="font-bold text-sm text-[#1F362D]">{state.profile?.name}</p>
              <p className="text-[#4A6358]">
                Kelas: {state.profile?.className} · {getAgentRank(state.xp, state.finalReportSaved)}
              </p>
              <p className="font-mono-tabular text-[#795A40] font-semibold">
                Jumlah Ayat: {countSentences(reportText)} · {state.xp} XP
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Written Report */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="font-display text-xl font-bold text-[#315C4C]">
                1. Laporan Pendapat Ejen
              </h3>
              <div className="bg-white rounded-xl p-5 border border-[#E7B94F] leading-relaxed text-base text-[#1F362D] whitespace-pre-line">
                {reportText || 'Belum ada teks laporan ditulis.'}
              </div>

              <h3 className="font-display text-xl font-bold text-[#315C4C] pt-2">
                2. Ringkasan Justifikasi Reka Bentuk
              </h3>
              <ul className="space-y-2 text-sm">
                {justifiedFacilities.map((fac) => (
                  <li
                    key={fac.uid}
                    className="p-3 rounded-xl bg-[#A9C5AD]/40 border border-[#315C4C]/20 text-[#1F362D]"
                  >
                    <strong className="text-[#1F362D]">
                      {FACILITY_ASSET_MAP[fac.assetId].name} (
                      {DESIGN_ACTIONS.find((a) => a.id === fac.actionType)?.label || 'Ubah Suai'})
                    </strong>
                    : {fac.justification}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Blueprint Snapshot */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-display text-xl font-bold text-[#315C4C]">
                3. Pelan Sekolah Impian
              </h3>
              <div className="blueprint-grid-bg rounded-xl p-3 border-2 border-[#E7B94F]">
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: GRID_ROWS }).map((_, row) =>
                    Array.from({ length: GRID_COLS }).map((__, col) => {
                      const occ = state.builderPlan.find((p) => p.row === row && p.col === col);
                      return (
                        <div
                          key={`${row}-${col}`}
                          className={`aspect-square rounded flex items-center justify-center ${
                            occ ? 'bg-[#F8F5EC]' : 'bg-[#244639]/75 border border-[#E7B94F]/20'
                          }`}
                        >
                          {occ && <FacilityIconSvg assetId={occ.assetId} className="w-5 h-5" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <p className="text-xs text-[#4A6358]">
                Pelan susunan kemudahan Sekolah Seri Bestari oleh {state.profile?.name}.
              </p>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
