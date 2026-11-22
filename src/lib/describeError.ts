import { ZodError } from 'zod'

/** Turns any error into a message a person can read. */
export function describeError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(' · ')
  }
  return error instanceof Error ? error.message : String(error)
}