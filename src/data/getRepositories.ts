import { EventRepository } from './eventRepository'
import { CategoryRepository } from './categoryRepository'
import { SettingsRepository } from './settingsRepository'
import { EstimateRepository } from './estimateRepository'
import { ProjectRepository } from './projectRepository'
import { InspirationRepository } from './inspirationRepository'
import { ProfileRepository } from './profileRepository'
import { DailyContextRepository } from './dailyContextRepository'
import { TodoRepository } from './todoRepository'
import type { StorageAdapter } from './adapters/StorageAdapter'

let _eventRepo: EventRepository
let _categoryRepo: CategoryRepository
let _settingsRepo: SettingsRepository
let _estimateRepo: EstimateRepository
let _projectRepo: ProjectRepository
let _inspirationRepo: InspirationRepository
let _profileRepo: ProfileRepository
let _dailyContextRepo: DailyContextRepository
let _todoRepo: TodoRepository

export function initRepositories(adapter: StorageAdapter) {
  _eventRepo = new EventRepository(adapter)
  _categoryRepo = new CategoryRepository(adapter)
  _settingsRepo = new SettingsRepository(adapter)
  _estimateRepo = new EstimateRepository(adapter)
  _projectRepo = new ProjectRepository(adapter)
  _inspirationRepo = new InspirationRepository(adapter)
  _profileRepo = new ProfileRepository(adapter)
  _dailyContextRepo = new DailyContextRepository(adapter)
  _todoRepo = new TodoRepository(adapter)
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

export function getProjectRepo(): ProjectRepository {
  if (!_projectRepo) throw new Error('ProjectRepository not initialized. Call initRepositories() first.')
  return _projectRepo
}

export function getInspirationRepo(): InspirationRepository {
  if (!_inspirationRepo) throw new Error('InspirationRepository not initialized.')
  return _inspirationRepo
}

export function getProfileRepo(): ProfileRepository {
  if (!_profileRepo) throw new Error('ProfileRepository not initialized. Call initRepositories() first.')
  return _profileRepo
}

export function getDailyContextRepo(): DailyContextRepository {
  if (!_dailyContextRepo) throw new Error('DailyContextRepository not initialized.')
  return _dailyContextRepo
}

export function getTodoRepo(): TodoRepository {
  if (!_todoRepo) throw new Error('TodoRepository not initialized. Call initRepositories() first.')
  return _todoRepo
}
