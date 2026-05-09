import { EventRepository } from './eventRepository'
import { CategoryRepository } from './categoryRepository'
import { SettingsRepository } from './settingsRepository'
import { EstimateRepository } from './estimateRepository'
import type { StorageAdapter } from './adapters/StorageAdapter'

let _eventRepo: EventRepository
let _categoryRepo: CategoryRepository
let _settingsRepo: SettingsRepository
let _estimateRepo: EstimateRepository

export function initRepositories(adapter: StorageAdapter) {
  _eventRepo = new EventRepository(adapter)
  _categoryRepo = new CategoryRepository(adapter)
  _settingsRepo = new SettingsRepository(adapter)
  _estimateRepo = new EstimateRepository(adapter)
}

export function getEventRepo(): EventRepository {
  if (!_eventRepo) throw new Error('EventRepository not initialized. Call initRepositories() first.')
  return _eventRepo
}

export function getCategoryRepo(): CategoryRepository {
  if (!_categoryRepo) throw new Error('CategoryRepository not initialized. Call initRepositories() first.')
  return _categoryRepo
}

export function getSettingsRepo(): SettingsRepository {
  if (!_settingsRepo) throw new Error('SettingsRepository not initialized. Call initRepositories() first.')
  return _settingsRepo
}

export function getEstimateRepo(): EstimateRepository {
  if (!_estimateRepo) throw new Error('EstimateRepository not initialized. Call initRepositories() first.')
  return _estimateRepo
}
