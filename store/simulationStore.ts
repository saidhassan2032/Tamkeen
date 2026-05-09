import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SimulationStore {
  selectedMajorId:  string | null;
  selectedTrackId:  string | null;
  selectedMode:     'quick' | 'extended' | null;
  selectedDuration: '1week' | '2weeks' | null;
  activeSessionId:  string | null;
  activeAgentId:    string | null;
  setMajor:    (id: string) => void;
  setTrack:    (id: string) => void;
  setMode:     (mode: 'quick' | 'extended') => void;
  setDuration: (d: '1week' | '2weeks') => void;
  setSession:  (id: string) => void;
  setAgent:    (id: string) => void;
  reset:       () => void;
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set) => ({
      selectedMajorId:  null,
      selectedTrackId:  null,
      selectedMode:     null,
      selectedDuration: null,
      activeSessionId:  null,
      activeAgentId:    null,
      setMajor:    (id) => set({ selectedMajorId: id }),
      setTrack:    (id) => set({ selectedTrackId: id }),
      setMode:     (mode) => set({ selectedMode: mode }),
      setDuration: (d) => set({ selectedDuration: d }),
      setSession:  (id) => set({ activeSessionId: id }),
      setAgent:    (id) => set({ activeAgentId: id }),
      reset: () => set({
        selectedMajorId: null,
        selectedTrackId: null,
        selectedMode: null,
        selectedDuration: null,
        activeSessionId: null,
        activeAgentId: null,
      }),
    }),
    { name: 'tamkeen-store' },
  ),
);
