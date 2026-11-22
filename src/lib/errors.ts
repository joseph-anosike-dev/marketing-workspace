export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
    // Not "NotFoundError": Dexie has a built-in error with that name and
    // would swap ours for its own when it is thrown inside a transaction.
    this.name = 'EntityNotFoundError'
  }
}