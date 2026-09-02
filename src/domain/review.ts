export type ReviewDomain = 'trend' | 'heatmap' | 'sleep' | 'diet' | 'hygiene'

export interface ReviewRouteState {
  domain: ReviewDomain
}

const REVIEW_DOMAINS = new Set<ReviewDomain>(['trend', 'heatmap', 'sleep', 'diet', 'hygiene'])

export function resolveReviewRoute(view: string | null): ReviewRouteState {
  const domain = view && REVIEW_DOMAINS.has(view as ReviewDomain) ? view as ReviewDomain : 'trend'
  return { domain }
}
