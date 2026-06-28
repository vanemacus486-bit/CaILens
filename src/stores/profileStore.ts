/**
 * # ProfileStore — 个人档案数据
 *
 * 存储身体指标数据，通过 ProfileRepository 持久化（统一走 StorageAdapter 体系）。
 * 作息基线数据不在本 store 中存储，由睡眠统计实时派生。
 *
 * 迁移：首次加载时自动将旧 localStorage 数据迁移到 ProfileRepository。
 */

import { create } from 'zustand'
import type { Profile, BodyMetrics } from '@/domain/profile'
import { DEFAULT_PROFILE } from '@/domain/profile'
import { getProfileRepo } from '@/data/getRepositories'

const PROFILE_KEY = 'cailens-profile'

/** 一次性迁移：localStorage → Repository */
async function migrateFromLocalStorage(): Promise<Profile | null> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Profile
    // Ensure the Profile has the `id` field (v16 profiles don't)
    if (!parsed.id) (parsed as Profile).id = 'default'
    // Persist to the new storage backend
    await getProfileRepo().update({ body: parsed.body, updatedAt: parsed.updatedAt })
    // Clear localStorage after successful migration
    localStorage.removeItem(PROFILE_KEY)
    return parsed
  } catch {
    return null
  }
}

interface ProfileState {
  profile: Profile
  isLoaded: boolean
  loadProfile: () => Promise<void>
  updateBodyMetrics: (metrics: Partial<BodyMetrics>) => Promise<void>
  updateAccount: (patch: { name?: string; avatar?: string }) => Promise<void>
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: { ...DEFAULT_PROFILE },
  isLoaded: false,

  loadProfile: async () => {
    // Attempt one-time migration from localStorage
    const migrated = await migrateFromLocalStorage()
    if (migrated) {
      set({ profile: migrated, isLoaded: true })
      return
    }

    // Normal path: load from Repository
    const saved = await getProfileRepo().get()
    if (saved) {
      set({ profile: saved, isLoaded: true })
    } else {
      set({ isLoaded: true })
    }
  },

  updateBodyMetrics: async (metrics) => {
    const current = get().profile
    const updatedAt = new Date().toISOString().slice(0, 10)
    const updated = await getProfileRepo().update({
      body: { ...current.body, ...metrics },
      updatedAt,
    })
    set({ profile: updated })
  },

  updateAccount: async (patch) => {
    const updatedAt = new Date().toISOString().slice(0, 10)
    const updated = await getProfileRepo().update({ ...patch, updatedAt })
    set({ profile: updated })
  },
}))
