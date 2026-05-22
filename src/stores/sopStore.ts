import { create } from 'zustand'
import type { SOP, SOPVersion, SopSection } from '@/domain/sop'
import { getSopRepo } from '@/data/getRepositories'

interface SopState {
  sops: SOP[]
  versions: Record<string, SOPVersion[]> // sopId → versions
  isLoaded: boolean
  loadSops: () => Promise<void>
  getByProject: (projectId: string) => SOP | null
  createSop: (projectId: string, name: string) => Promise<SOP>
  updateSop: (sopId: string, sections: SopSection[], changelog: string) => Promise<SOP>
  revertSop: (sopId: string, version: number) => Promise<SOP>
  loadVersions: (sopId: string) => Promise<void>
}

export const useSopStore = create<SopState>((set, get) => ({
  sops: [],
  versions: {},
  isLoaded: false,

  loadSops: async () => {
    const sops = await getSopRepo().getAll()
    set({ sops, isLoaded: true })
  },

  getByProject: (projectId) => {
    return get().sops.find((s) => s.projectId === projectId) ?? null
  },

  createSop: async (projectId, name) => {
    const sop = await getSopRepo().create(projectId, name, [])
    set((state) => ({ sops: [...state.sops, sop] }))
    return sop
  },

  updateSop: async (sopId, sections, changelog) => {
    const sop = await getSopRepo().update(sopId, sections, changelog)
    set((state) => ({
      sops: state.sops.map((s) => (s.id === sopId ? sop : s)),
    }))
    return sop
  },

  revertSop: async (sopId, version) => {
    const sop = await getSopRepo().revertTo(sopId, version)
    set((state) => ({
      sops: state.sops.map((s) => (s.id === sopId ? sop : s)),
    }))
    return sop
  },

  loadVersions: async (sopId) => {
    const versions = await getSopRepo().getVersions(sopId)
    set((state) => ({ versions: { ...state.versions, [sopId]: versions } }))
  },
}))
