import { isEnvironmentalRecord, type EnvironmentalRecord } from './metrics'

export const DEFAULT_STORAGE_KEY = 'ecodados.entries.v1'

/** Minimal Storage interface, injectable for tests and non-browser consumers. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; value: T; error: Error }

function browserStorage(): StorageLike | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage
  } catch {
    // Accessing localStorage itself can throw in restricted browser contexts.
    return undefined
  }
}

/** Loads only validated records. Corrupt or incompatible persisted data safely falls back to []. */
export function loadRecords(storage: StorageLike | undefined = browserStorage(), key = DEFAULT_STORAGE_KEY): StorageResult<EnvironmentalRecord[]> {
  if (!storage) return { ok: false, value: [], error: new Error('Armazenamento local indisponível.') }
  try {
    const serialized = storage.getItem(key)
    if (serialized === null) return { ok: true, value: [] }
    const parsed: unknown = JSON.parse(serialized)
    if (!Array.isArray(parsed)) throw new Error('Formato de dados salvo inválido.')
    const records = parsed.filter(isEnvironmentalRecord)
    return records.length === parsed.length
      ? { ok: true, value: records }
      : { ok: false, value: records, error: new Error('Alguns registros inválidos foram ignorados.') }
  } catch (error) {
    return { ok: false, value: [], error: error instanceof Error ? error : new Error('Falha ao ler os dados salvos.') }
  }
}

/** Validates the complete batch before writing, avoiding partial or malformed persistence. */
export function saveRecords(records: readonly EnvironmentalRecord[], storage: StorageLike | undefined = browserStorage(), key = DEFAULT_STORAGE_KEY): StorageResult<EnvironmentalRecord[]> {
  const safeRecords = records.filter(isEnvironmentalRecord)
  if (safeRecords.length !== records.length) {
    return { ok: false, value: [...safeRecords], error: new Error('A gravação foi cancelada: há registros inválidos.') }
  }
  if (!storage) return { ok: false, value: [...records], error: new Error('Armazenamento local indisponível.') }
  try {
    storage.setItem(key, JSON.stringify(records))
    return { ok: true, value: [...records] }
  } catch (error) {
    return { ok: false, value: [...records], error: error instanceof Error ? error : new Error('Falha ao salvar os dados.') }
  }
}

/** Removes the stored collection when the injected storage supports removal. */
export function clearRecords(storage: StorageLike | undefined = browserStorage(), key = DEFAULT_STORAGE_KEY): StorageResult<[]> {
  if (!storage?.removeItem) return { ok: false, value: [], error: new Error('Remoção do armazenamento indisponível.') }
  try {
    storage.removeItem(key)
    return { ok: true, value: [] }
  } catch (error) {
    return { ok: false, value: [], error: error instanceof Error ? error : new Error('Falha ao limpar os dados.') }
  }
}
