import type { SOP, SOPVersion } from '@/domain/sop'
import type { StorageAdapter } from './adapters/StorageAdapter'

interface Clock { now(): number }

export class SopRepository {
  private adapter: StorageAdapter
  private clock: Clock
  constructor(adapter: StorageAdapter, clock: Clock = { now: () => Date.now() }) {
    this.adapter = adapter; this.clock = clock
  }

  async getAll(): Promise<SOP[]> { return this.adapter.sops.getAll() }
  async getById(id: string): Promise<SOP | undefined> { return this.adapter.sops.get(id) }
  async getByProject(projectId: string): Promise<SOP | null> {
    const all = await this.adapter.sops.getAll()
    return all.find((s) => s.projectId === projectId) ?? null
  }

  async create(projectId: string, name: string, sections: SOP['sections']): Promise<SOP> {
    const now = this.clock.now()
    const sop: SOP = { id: crypto.randomUUID(), projectId, name, sections, currentVersionId: '', createdAt: now, updatedAt: now }
    const version: SOPVersion = { id: crypto.randomUUID(), sopId: sop.id, projectId, version: 1, sections, changelog: '初始版本', source: 'initial', createdAt: now }
    sop.currentVersionId = version.id
    await this.adapter.sops.put(sop)
    await this.adapter.sopVersions.put(version)
    return sop
  }

  async update(sopId: string, sections: SOP['sections'], changelog: string, source: SOPVersion['source'] = 'manual', inspirationId?: string): Promise<SOP> {
    const existing = await this.adapter.sops.get(sopId)
    if (!existing) throw new Error(`SOP not found: ${sopId}`)
    const allVersions = await this.adapter.sopVersions.getAll()
    const sopVersions = allVersions.filter((v) => v.sopId === sopId)
    const maxVer = Math.max(...sopVersions.map((v) => v.version), 0)
    const now = this.clock.now()
    const version: SOPVersion = { id: crypto.randomUUID(), sopId, projectId: existing.projectId, version: maxVer + 1, sections, changelog, source, inspirationId, createdAt: now }
    existing.sections = sections
    existing.currentVersionId = version.id
    existing.updatedAt = now
    await this.adapter.sopVersions.put(version)
    await this.adapter.sops.put(existing)
    return existing
  }

  async getVersions(sopId: string): Promise<SOPVersion[]> {
    const all = await this.adapter.sopVersions.getAll()
    return all.filter((v) => v.sopId === sopId).sort((a, b) => b.version - a.version)
  }

  async revertTo(sopId: string, targetVersion: number): Promise<SOP> {
    const allVersions = await this.getVersions(sopId)
    const target = allVersions.find((v) => v.version === targetVersion)
    if (!target) throw new Error(`Version ${targetVersion} not found`)
    return this.update(sopId, target.sections, `回退到 v${targetVersion}`, 'manual')
  }

  async delete(sopId: string): Promise<void> {
    const allV = await this.adapter.sopVersions.getAll()
    const toDel = allV.filter((v) => v.sopId === sopId)
    for (const v of toDel) await this.adapter.sopVersions.delete(v.id)
    await this.adapter.sops.delete(sopId)
  }
}
