import type { Profile } from '@/domain/profile'
import { DEFAULT_PROFILE, DEFAULT_BODY_METRICS } from '@/domain/profile'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class ProfileRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  /** Returns DEFAULT_PROFILE if the record does not exist yet.
   *  Defensively merges with DEFAULT_PROFILE to handle old records missing newly-added fields. */
  async get(): Promise<Profile> {
    const stored = await this.adapter.profile.get('default')
    if (!stored) return { ...DEFAULT_PROFILE }
    return {
      ...DEFAULT_PROFILE,
      ...stored,
      body: { ...DEFAULT_BODY_METRICS, ...(stored.body ?? {}) },
    }
  }

  async update(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
    const current = await this.get()
    const updated: Profile = { ...current, ...updates }
    await this.adapter.profile.put(updated)
    return updated
  }
}
