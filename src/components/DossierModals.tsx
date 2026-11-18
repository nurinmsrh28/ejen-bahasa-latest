import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { LOCATIONS } from '../game/data';
import type { GameState } from '../game/types';

export function EvidenceDossierModal({
  state,
  onClose,
}: {
  state: GameState;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
      className="fixed inset-0 z-50 bg-[#315C4C]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
    >
      <div className="dossier-unfold bg-[#F8F5EC] text-[#1F362D] rounded-2xl max-w-3xl w-full p-6 border-2 border-[#E7B94F] shadow-2xl max-h-[88vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#315C4C]/15 pb-3">
          <div>
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#795A40]">
              DOKUMEN SULIT · Fail Bukti Ejen · {state.profile?.name || 'Ejen'}
            </p>
            <h2 id="evidence-modal-title" className="font-display text-2xl font-bold text-[#1F362D]">
              Rekod Penyiasatan Empat Lokasi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Fail Bukti Ejen"
            className="p-2 rounded-lg hover:bg-[#E8DFC9] text-[#1F362D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCATIONS.map((loc) => {
            const inv = state.investigations[loc.id];
            return (
              <div
                key={loc.id}
                className={`rounded-xl p-4 border space-y-2.5 ${
                  inv.completed
                    ? 'bg-[#A9C5AD]/40 border-[#315C4C]/30'
                    : 'bg-[#E8DFC9]/55 border-[#315C4C]/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-[#1F362D]">{loc.name}</h3>
                  {inv.completed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#315C4C]">
                      <CheckCircle2 className="w-4 h-4" />
                      Selesai
                    </span>
                  ) : (
                    <span className="text-xs font-mono-tabular text-[#4A6358]">
                      {inv.discoveredClueIds.length}/{loc.clues.length} Petunjuk
                    </span>
                  )}
                </div>
                <div className="text-xs space-y-1.5 text-[#2E483E]">
                  <p>
                    <strong className="text-[#795A40]">Catatan:</strong>{' '}
                    {inv.notes || 'Belum dicatatkan.'}
                  </p>
                  <p>
                    <strong className="text-[#795A40]">Cadangan Awal:</strong>{' '}
                    {inv.initialProposal || 'Belum dicatatkan.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DecisionCardModal({
  state,
  onClose,
}: {
  state: GameState;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
      className="fixed inset-0 z-50 bg-[#315C4C]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
    >
      <div className="dossier-unfold bg-[#F8F5EC] text-[#1F362D] rounded-2xl max-w-2xl w-full p-6 border-2 border-[#E7B94F] shadow-2xl max-h-[88vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#315C4C]/15 pb-3">
          <div>
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#795A40]">
              DOKUMEN SULIT · Kad Keputusan Ejen · {state.profile?.name || 'Ejen'}
            </p>
            <h2 id="decision-modal-title" className="font-display text-2xl font-bold text-[#1F362D]">
              Pendapat & Alasan Terkumpul
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Kad Keputusan Ejen"
            className="p-2 rounded-lg hover:bg-[#E8DFC9] text-[#1F362D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {state.selectedEvidenceIds.length === 0 ? (
          <p className="text-sm text-[#4A6358] bg-[#E8DFC9]/55 border border-[#315C4C]/15 p-4 rounded-xl">
            Belum ada bukti dipilih dalam Makmal Analisis Kes (Fasa 2).
          </p>
        ) : (
          <div className="space-y-3">
            {state.selectedEvidenceIds.map((locId) => {
              const loc = LOCATIONS.find((l) => l.id === locId);
              const entry = state.opinions[locId];
              return (
                <div
                  key={locId}
                  className="rounded-xl p-4 bg-[#A9C5AD]/35 border border-[#315C4C]/20 space-y-2 text-sm"
                >
                  <p className="font-display font-bold text-[#1F362D]">{loc?.name}</p>
                  <p className="text-[#2E483E]">
                    <strong className="text-[#315C4C]">Ayat Pendapat:</strong>{' '}
                    {entry?.opinionText || 'Belum ditulis.'}
                  </p>
                  <p className="text-[#2E483E]">
                    <strong className="text-[#795A40]">Alasan Relevan:</strong>{' '}
                    {entry?.reasonText || 'Belum ditulis dalam Fasa 3.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
