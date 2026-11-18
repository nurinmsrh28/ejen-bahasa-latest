import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Move,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  DESIGN_ACTIONS,
  FACILITY_ASSETS,
  FACILITY_ASSET_MAP,
  GRID_COLS,
  GRID_ROWS,
  INITIAL_BLUEPRINT_PLAN,
  LOCATIONS,
  LOCATION_MAP,
} from '../game/data';
import {
  getJustifiedFacilityCount,
  moveFacilityOnGrid,
  placeFacilityOnGrid,
  removeFacilityFromGrid,
} from '../game/rules';
import type {
  DesignActionType,
  FacilityAssetId,
  GameState,
  LocationId,
  PlacedFacility,
} from '../game/types';
import { FacilityIconSvg } from './DetectiveArt';

interface Phase4ArchitectProps {
  state: GameState;
  onUpdatePlan: (plan: PlacedFacility[], markSaved: boolean) => void;
  onBackToHq: () => void;
  onProceedToPhase5: () => void;
  onPlayPlaceSound: () => void;
}

export function Phase4Architect({
  state,
  onUpdatePlan,
  onBackToHq,
  onProceedToPhase5,
  onPlayPlaceSound,
}: Phase4ArchitectProps) {
  const [plan, setPlan] = useState<PlacedFacility[]>(state.builderPlan);
  const [categoryFilter, setCategoryFilter] = useState<'semua' | 'bangunan' | 'alam' | 'kemudahan'>(
    'semua'
  );
  const [activePaletteAsset, setActivePaletteAsset] = useState<FacilityAssetId | null>(null);
  const [movingUid, setMovingUid] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(plan[0]?.uid || null);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const selectedFacility = plan.find((item) => item.uid === selectedUid) || null;
  const justifiedCount = getJustifiedFacilityCount(plan);
  const canUnlockReport = state.builderSaved && justifiedCount >= 2;

  const filteredAssets = FACILITY_ASSETS.filter(
    (a) => categoryFilter === 'semua' || a.category === categoryFilter
  );

  const handleCellAction = (row: number, col: number) => {
    setError('');
    setSavedMessage('');
    const existingAtCell = plan.find((item) => item.row === row && item.col === col);

    if (movingUid) {
      const next = moveFacilityOnGrid(plan, movingUid, row, col);
      setPlan(next);
      setSelectedUid(movingUid);
      setMovingUid(null);
      onPlayPlaceSound();
      onUpdatePlan(next, false);
      return;
    }

    if (activePaletteAsset) {
      const uid = `fac_${activePaletteAsset}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const next = placeFacilityOnGrid(plan, activePaletteAsset, row, col, uid);
      setPlan(next);
      setSelectedUid(uid);
      setActivePaletteAsset(null);
      onPlayPlaceSound();
      onUpdatePlan(next, false);
      return;
    }

    if (existingAtCell) {
      setSelectedUid(existingAtCell.uid);
    }
  };

  const handleDropOnCell = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setError('');
    setSavedMessage('');
    const assetDrag = e.dataTransfer.getData('application/x-ejen-asset') as FacilityAssetId | '';
    const moveDragUid = e.dataTransfer.getData('application/x-ejen-uid');

    if (moveDragUid) {
      const next = moveFacilityOnGrid(plan, moveDragUid, row, col);
      setPlan(next);
      setSelectedUid(moveDragUid);
      setMovingUid(null);
      onPlayPlaceSound();
      onUpdatePlan(next, false);
    } else if (assetDrag && FACILITY_ASSET_MAP[assetDrag]) {
      const uid = `fac_${assetDrag}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const next = placeFacilityOnGrid(plan, assetDrag, row, col, uid);
      setPlan(next);
      setSelectedUid(uid);
      setActivePaletteAsset(null);
      onPlayPlaceSound();
      onUpdatePlan(next, false);
    }
  };

  const updateSelectedMeta = (patch: Partial<PlacedFacility>) => {
    if (!selectedFacility) return;
    setSavedMessage('');
    const next = plan.map((item) =>
      item.uid === selectedFacility.uid ? { ...item, ...patch } : item
    );
    setPlan(next);
    onUpdatePlan(next, false);
  };

  const handleRemoveSelected = () => {
    if (!selectedFacility) return;
    const next = removeFacilityFromGrid(plan, selectedFacility.uid);
    setPlan(next);
    setSelectedUid(next[0]?.uid || null);
    setMovingUid(null);
    onUpdatePlan(next, false);
  };

  const handleResetToBase = () => {
    const base = INITIAL_BLUEPRINT_PLAN.map((item) => ({ ...item }));
    setPlan(base);
    setSelectedUid(base[0]?.uid || null);
    setActivePaletteAsset(null);
    setMovingUid(null);
    setSavedMessage('');
    onUpdatePlan(base, false);
  };

  const handleSavePlan = () => {
    if (justifiedCount < 2) {
      setError(
        `Sila lengkapkan justifikasi reka bentuk untuk sekurang-kurangnya 2 kemudahan pada pelan (kini: ${justifiedCount}/2).`
      );
      return;
    }
    setError('');
    onUpdatePlan(plan, true);
    setSavedMessage('Pelan Sekolah Impian dan justifikasi anda berjaya disimpan!');
  };

  const getZoneTag = (row: number, col: number): string => {
    if (row <= 1 && col <= 3) return 'Zon Kantin';
    if (row <= 1 && col >= 4) return 'Zon Kelas';
    if (row >= 3 && col <= 3) return 'Zon Taman';
    if (row >= 3 && col >= 4) return 'Zon Perpustakaan';
    return 'Laluan Tengah';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-[#1F362D]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#315C4C]/15 pb-4">
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
            Cabaran Akhir · Studio Arkitek (School Builder)
          </h1>
          <p className="text-sm text-[#4A6358]">
            Seret atau ketik kemudahan untuk membina Pelan Sekolah Impian, kemudian pautkan bukti
            serta justifikasi reka bentuk anda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono-tabular text-xs font-bold px-3.5 py-2 rounded-xl bg-[#A9C5AD]/60 text-[#1F362D] border border-[#315C4C]/25">
            Justifikasi Lengkap: {justifiedCount} / 2 min
          </span>
          <button
            type="button"
            onClick={handleResetToBase}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F8F5EC] hover:bg-white text-[#1F362D] border border-[#315C4C]/25 text-xs font-semibold shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#795A40]" />
            Pelan Asal
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Palette | Center Canvas | Right Justification Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Asset Palette */}
        <aside className="xl:col-span-3 bg-[#F8F5EC] rounded-2xl p-4 border border-[#315C4C]/20 shadow-md space-y-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#795A40]">
              Panel Aset (12 Kemudahan)
            </p>
            <p className="text-xs text-[#4A6358] mt-0.5">
              Seret ke kanvas atau klik aset lalu ketik petak kanvas.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-[#E8DFC9] rounded-lg border border-[#315C4C]/15">
            {(
              [
                ['semua', 'Semua'],
                ['bangunan', 'Blok'],
                ['kemudahan', 'Kemudahan'],
                ['alam', 'Alam'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  categoryFilter === key
                    ? 'bg-[#315C4C] text-[#F8F5EC] font-bold'
                    : 'text-[#315C4C] hover:bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-1 gap-2 max-h-[430px] overflow-y-auto pr-1">
            {filteredAssets.map((asset) => {
              const isSelectedForPlacement = activePaletteAsset === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-ejen-asset', asset.id);
                    setActivePaletteAsset(asset.id);
                  }}
                  onClick={() => {
                    setMovingUid(null);
                    setActivePaletteAsset((prev) => (prev === asset.id ? null : asset.id));
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all cursor-grab active:cursor-grabbing ${
                    isSelectedForPlacement
                      ? 'bg-[#315C4C] text-[#F8F5EC] border-[#E7B94F]'
                      : 'bg-white hover:bg-[#A9C5AD]/25 text-[#1F362D] border-[#315C4C]/15'
                  }`}
                >
                  <FacilityIconSvg assetId={asset.id} className="w-8 h-8 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{asset.name}</p>
                    <p
                      className={`text-[11px] truncate ${
                        isSelectedForPlacement ? 'text-[#E7B94F]' : 'text-[#4A6358]'
                      }`}
                    >
                      {isSelectedForPlacement ? 'Ketik petak kanvas' : asset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Interactive Blueprint Canvas */}
        <section className="xl:col-span-5 space-y-3">
          <div className="blueprint-grid-bg rounded-2xl p-4 border-2 border-[#E7B94F] shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#F8F5EC]">
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-widest text-[#E7B94F]">
                  Pelan Induk · Sekolah Seri Bestari
                </p>
                <h2 className="font-display text-lg font-bold">Kanvas Reka Bentuk (8 × 5)</h2>
              </div>
              {(activePaletteAsset || movingUid) && (
                <span className="text-xs font-bold text-[#1F362D] bg-[#E7B94F] px-3 py-1 rounded-lg">
                  {movingUid
                    ? 'Ketik petak baharu untuk memindahkan kemudahan'
                    : `Ketik petak kanvas untuk meletakkan ${FACILITY_ASSET_MAP[activePaletteAsset!].name}`}
                </span>
              )}
            </div>

            {/* 4 Zone Header Strip */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tabular text-[#F8F5EC]">
              <div className="bg-[#244639]/90 px-2.5 py-1 rounded border border-[#E7B94F]/40">
                Barat Laut · Zon Kantin Ceria
              </div>
              <div className="bg-[#244639]/90 px-2.5 py-1 rounded border border-[#E7B94F]/40">
                Timur Laut · Zon Kelas Harmoni
              </div>
            </div>

            {/* 8x5 Grid */}
            <div data-testid="school-builder-grid" className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: GRID_ROWS }).map((_, row) =>
                Array.from({ length: GRID_COLS }).map((__, col) => {
                  const occupant = plan.find((p) => p.row === row && p.col === col);
                  const isSelected = occupant?.uid === selectedUid;
                  const isJustified = Boolean(
                    occupant?.justification && occupant.justification.trim().length >= 8
                  );
                  const zoneTag = getZoneTag(row, col);

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      draggable={Boolean(occupant)}
                      onDragStart={(e) => {
                        if (occupant) {
                          e.dataTransfer.setData('application/x-ejen-uid', occupant.uid);
                        }
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnCell(e, row, col)}
                      onClick={() => handleCellAction(row, col)}
                      title={occupant ? FACILITY_ASSET_MAP[occupant.assetId].name : zoneTag}
                      aria-label={
                        occupant
                          ? `${FACILITY_ASSET_MAP[occupant.assetId].name} di baris ${row + 1} lajur ${col + 1} (${zoneTag})`
                          : `Petak kosong baris ${row + 1} lajur ${col + 1} (${zoneTag})`
                      }
                      className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B94F] ${
                        occupant
                          ? isSelected
                            ? 'bg-white border-2 border-[#E7B94F] shadow-md scale-[1.03]'
                            : 'bg-[#F8F5EC] border-[#E7B94F]/80 hover:bg-white'
                          : activePaletteAsset || movingUid
                          ? 'bg-[#3D6E5C]/80 border-dashed border-[#E7B94F] hover:bg-[#49806B]'
                          : 'bg-[#244639]/75 border-[#E7B94F]/25 hover:border-[#E7B94F]/70'
                      }`}
                    >
                      {occupant && (
                        <>
                          <FacilityIconSvg
                            assetId={occupant.assetId}
                            className="w-6 h-6 sm:w-7 sm:h-7"
                          />
                          {isJustified && (
                            <span
                              aria-label="Mempunyai justifikasi"
                              className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#315C4C] border border-[#E7B94F]"
                            />
                          )}
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tabular text-[#F8F5EC]">
              <div className="bg-[#244639]/90 px-2.5 py-1 rounded border border-[#E7B94F]/40">
                Barat Daya · Zon Taman Rekreasi
              </div>
              <div className="bg-[#244639]/90 px-2.5 py-1 rounded border border-[#E7B94F]/40">
                Timur Daya · Zon Perpustakaan Ilmu
              </div>
            </div>
          </div>
        </section>

        {/* Design Justification Inspector */}
        <aside className="xl:col-span-4 bg-[#F8F5EC] rounded-2xl p-5 border border-[#315C4C]/20 shadow-md space-y-4">
          {!selectedFacility ? (
            <div className="p-6 text-center space-y-2 text-sm text-[#4A6358]">
              <p className="font-semibold text-[#1F362D]">Tiada kemudahan dipilih</p>
              <p>
                Klik mana-mana kemudahan di atas kanvas pelan untuk memindahkan, membuang atau
                menulis justifikasi reka bentuknya.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[#315C4C]/15 pb-3">
                <div className="flex items-center gap-3">
                  <FacilityIconSvg assetId={selectedFacility.assetId} className="w-10 h-10 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#795A40]">
                      Maklumat Kemudahan Dipilih
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#1F362D]">
                      {FACILITY_ASSET_MAP[selectedFacility.assetId].name}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePaletteAsset(null);
                      setMovingUid((prev) =>
                        prev === selectedFacility.uid ? null : selectedFacility.uid
                      );
                    }}
                    title="Pindah kedudukan"
                    aria-label="Pindahkan kemudahan ini"
                    className={`p-2 rounded-lg border text-xs font-semibold ${
                      movingUid === selectedFacility.uid
                        ? 'bg-[#E7B94F] text-[#1F362D] border-[#315C4C]'
                        : 'bg-[#E8DFC9]/65 text-[#1F362D] border-[#315C4C]/20 hover:border-[#E7B94F]'
                    }`}
                  >
                    <Move className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    title="Buang kemudahan"
                    aria-label="Buang kemudahan ini daripada pelan"
                    className="p-2 rounded-lg bg-[#FBECE8] hover:bg-[#F7DCD5] text-[#9F432C] border border-[#C2593F]/35"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="design-action-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#315C4C] mb-1"
                  >
                    Tindakan Reka Bentuk
                  </label>
                  <select
                    id="design-action-select"
                    value={selectedFacility.actionType || 'ubah_suai'}
                    onChange={(e) =>
                      updateSelectedMeta({ actionType: e.target.value as DesignActionType })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-[#315C4C]/25 text-sm text-[#1F362D]"
                  >
                    {DESIGN_ACTIONS.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="linked-location-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#315C4C] mb-1"
                  >
                    Pautan Bukti & Kad Keputusan Ejen
                  </label>
                  <select
                    id="linked-location-select"
                    value={selectedFacility.linkedLocationId || ''}
                    onChange={(e) =>
                      updateSelectedMeta({
                        linkedLocationId: (e.target.value || undefined) as LocationId | undefined,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-[#315C4C]/25 text-sm text-[#1F362D]"
                  >
                    <option value="">-- Pilih Lokasi Bukti Berkaitan --</option>
                    {LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFacility.linkedLocationId && (
                  <div className="bg-[#A9C5AD]/40 rounded-xl p-3 border border-[#315C4C]/20 text-xs space-y-1.5">
                    <p className="font-bold text-[#315C4C]">
                      Rujukan {LOCATION_MAP[selectedFacility.linkedLocationId].name}:
                    </p>
                    <p className="text-[#1F362D]">
                      <strong>Catatan:</strong>{' '}
                      {state.investigations[selectedFacility.linkedLocationId].notes || '-'}
                    </p>
                    {state.opinions[selectedFacility.linkedLocationId]?.opinionText && (
                      <p className="text-[#1F362D]">
                        <strong>Pendapat:</strong>{' '}
                        {state.opinions[selectedFacility.linkedLocationId].opinionText}
                      </p>
                    )}
                    {state.opinions[selectedFacility.linkedLocationId]?.reasonText && (
                      <p className="text-[#1F362D]">
                        <strong>Alasan:</strong>{' '}
                        {state.opinions[selectedFacility.linkedLocationId].reasonText}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="facility-justification-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#795A40] mb-1"
                  >
                    Justifikasi Reka Bentuk Anda
                  </label>
                  <textarea
                    id="facility-justification-input"
                    rows={3}
                    value={selectedFacility.justification || ''}
                    onChange={(e) => updateSelectedMeta({ justification: e.target.value })}
                    placeholder="Terangkan mengapa kemudahan ini ditambah, diubah suai atau disusun semula berdasarkan bukti..."
                    className="w-full rounded-xl p-3 bg-white border-2 border-[#315C4C]/25 focus:border-[#315C4C] focus:outline-none text-sm text-[#1F362D] placeholder-[#7B8B83]"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-[#FBECE8] border border-[#C2593F] text-xs font-medium text-[#8C331D]"
            >
              {error}
            </div>
          )}

          {savedMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#A9C5AD]/45 border border-[#315C4C]/40 text-xs font-semibold text-[#1F362D] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedMessage}</span>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-[#315C4C]/15">
            <button
              type="button"
              onClick={handleSavePlan}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#315C4C] hover:bg-[#3D6E5C] border-2 border-[#E7B94F] text-[#F8F5EC] font-bold text-sm shadow transition-colors"
            >
              <Save className="w-4 h-4 text-[#E7B94F]" />
              Simpan Pelan Sekolah Impian
            </button>

            {canUnlockReport && (
              <button
                type="button"
                onClick={onProceedToPhase5}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E7B94F] hover:bg-[#F2CE74] text-[#1F362D] font-bold text-sm shadow transition-colors"
              >
                Teruskan ke Produk Akhir: Laporan Sekolah Impian
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
