import type { Table } from 'dexie'

/**
 * Looking up many ids one by one gets very slow as the number of findings
 * grows (measured: 1,000 ids took about 2 seconds, 2,000 about 9 seconds).
 * Past this many ids, reading the table once and filtering is far faster.
 */
const SCAN_ABOVE = 50

type ItemKeyed = { item_id: string }

/** Every row of `table` whose item_id is one of `ids`. */
export async function rowsForItems<T extends ItemKeyed, K, I>(
  table: Table<T, K, I>,
  ids: readonly string[],
): Promise<T[]> {
  if (ids.length === 0) return []
  if (ids.length <= SCAN_ABOVE) return table.where('item_id').anyOf([...ids]).toArray()
  // One bulk read, then filter here. Walking the table record by record with
  // a cursor is much slower in a real browser.
  const wanted = new Set(ids)
  return (await table.toArray()).filter((row) => wanted.has(row.item_id))
}

/** Deletes every row of `table` whose item_id is one of `ids`. Run inside a transaction. */
export async function deleteRowsForItems<T extends ItemKeyed, K, I>(
  table: Table<T, K, I>,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return
  if (ids.length <= SCAN_ABOVE) {
    await table.where('item_id').anyOf([...ids]).delete()
    return
  }
  const wanted = new Set(ids)
  await table.filter((row) => wanted.has(row.item_id)).delete()
}
