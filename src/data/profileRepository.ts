import type { Profile } from '@/domain/profile'
import { DEFAULT_PROFILE } from '@/domain/profile'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class ProfileRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  /** Returns DEFAULT_PROFILE if the record does not exist yet. */
  async get(): Promise<Profile> {
    const profile = await this.adapter.profile.get('default')
    return profile ?? { ...DEFAULT_PROFILE }
  }

  async update(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
    const current = await this.get()
    const updated: Profile = { ...current, ...updates }
    await this.adapter.profile.put(updated)
    return updated
  }
}
