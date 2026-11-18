import { createInitialGameState } from './rules';
import type { GameState } from './types';

export const STORAGE_KEY = 'ejen_bahasa_operasi_v1';

/**
 * Adapter pattern so localStorage can be swapped or synced with Supabase
 * in a future cloud-sync release without changing UI components.
 */
export interface StorageAdapter {
  load(): GameState;
  save(state: GameState): void;
  clear(): GameState;
}

export const localStorageAdapter: StorageAdapter = {
  load(): GameState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialGameState();
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const base = createInitialGameState();
      return {
        ...base,
        ...parsed,
        investigations: {
          ...base.investigations,
          ...(parsed.investigations || {}),
        },
        opinions: {
          ...base.opinions,
          ...(parsed.opinions || {}),
        },
        builderPlan:
          Array.isArray(parsed.builderPlan) && parsed.builderPlan.length > 0
            ? parsed.builderPlan
            : base.builderPlan,
      };
    } catch {
      return createInitialGameState();
    }
  },

  save(state: GameState): void {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...state,
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch {
      // Ignore quota errors gracefully
    }
  },

  clear(): GameState {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
    return createInitialGameState();
  },
};

export function exportAgentRecordJson(state: GameState): void {
  const safeName = (state.profile?.name || 'ejen')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const payload = {
    aplikasi: 'Ejen Bahasa: Operasi Sekolah Impian',
    eksportPada: new Date().toISOString(),
    notaPenyimpanan: 'Rekod ini dieksport daripada penyimpanan setempat pelayar (localStorage).',
    dataEjen: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekod_${safeName || 'ejen'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
