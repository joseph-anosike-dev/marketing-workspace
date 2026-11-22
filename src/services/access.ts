/**
 * Placeholder for future authentication and paid plans.
 * Today there is one local user and every feature is allowed.
 */

// A fixed UUID so records are already shaped like Postgres rows.
export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000000'

export function getCurrentUserId(): string {
  return LOCAL_USER_ID
}

export type Feature = 'ai' | 'export' | 'unlimited_projects'

export function canUse(_feature: Feature): boolean {
  return true
}