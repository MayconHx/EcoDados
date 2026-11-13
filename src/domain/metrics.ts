/** Shared domain model for the three environmental record categories. */
export const CATEGORIES = ['Água', 'Energia', 'Resíduos'] as const

export type Category = (typeof CATEGORIES)[number]
export type Unit = 'L' | 'm³' | 'kWh' | 'kg' | 't'

export const UNITS_BY_CATEGORY: Readonly<Record<Category, readonly Unit[]>> = {
  Água: ['L', 'm³'],
  Energia: ['kWh'],
  Resíduos: ['kg', 't'],
}

export interface EnvironmentalRecord {
  id: string
  category: Category
  amount: number
  unit: Unit
  /** Calendar date in ISO 8601 YYYY-MM-DD form; interpreted without timezone. */
  date: string
  note: string
}

export type RecordInput = Omit<EnvironmentalRecord, 'id' | 'note'> & {
  id?: string
  note?: string
}

export interface ValidationResult<T> {
  valid: boolean
  value?: T
  errors: Partial<Record<keyof EnvironmentalRecord, string>>
}

export interface RecordPeriod {
  /** Inclusive ISO calendar date. */
  from?: string
  /** Inclusive ISO calendar date. */
  to?: string
  /** Optional YYYY-MM month filter, mutually composable with from/to. */
  month?: string
}

export interface MetricTotal {
  category: Category
  unit: Unit
  amount: number
  count: number
}

export interface PeriodMetricTotal extends MetricTotal {
  period: string
}

export interface UnitMetricTotal {
  unit: Unit
  amount: number
  count: number
  categories: Category[]
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(0)
  parsed.setUTCHours(0, 0, 0, 0)
  parsed.setUTCFullYear(year, month - 1, day)
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export function isUnitForCategory(category: unknown, unit: unknown): unit is Unit {
  return isCategory(category) && typeof unit === 'string' && (UNITS_BY_CATEGORY[category] as readonly string[]).includes(unit)
}

export function validateRecord(input: unknown): ValidationResult<EnvironmentalRecord> {
  const errors: ValidationResult<EnvironmentalRecord>['errors'] = {}
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: { category: 'Registro inválido.' } }
  }
  const candidate = input as Record<string, unknown>
  if (!isCategory(candidate.category)) errors.category = 'Categoria inválida.'
  if (typeof candidate.amount !== 'number' || !Number.isFinite(candidate.amount) || candidate.amount <= 0) {
    errors.amount = 'A quantidade deve ser um número finito maior que zero.'
  }
  if (!isUnitForCategory(candidate.category, candidate.unit)) errors.unit = 'Unidade inválida para a categoria.'
  if (!isValidDate(candidate.date)) errors.date = 'Data inválida; use uma data real no formato AAAA-MM-DD.'
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) errors.id = 'Identificador obrigatório.'
  if (candidate.note !== undefined && typeof candidate.note !== 'string') errors.note = 'Observação deve ser texto.'

  if (Object.keys(errors).length) return { valid: false, errors }
  return {
    valid: true,
    value: {
      id: candidate.id as string,
      category: candidate.category as Category,
      amount: candidate.amount as number,
      unit: candidate.unit as Unit,
      date: candidate.date as string,
      note: (candidate.note as string | undefined)?.trim() ?? '',
    },
    errors,
  }
}

export function createRecord(input: RecordInput): EnvironmentalRecord {
  const result = validateRecord({ ...input, id: input.id ?? createId(), note: input.note ?? '' })
  if (!result.valid || !result.value) throw new TypeError(Object.values(result.errors).join(' '))
  return result.value
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function isEnvironmentalRecord(value: unknown): value is EnvironmentalRecord {
  return validateRecord(value).valid
}

function matchesPeriod(record: EnvironmentalRecord, period?: RecordPeriod): boolean {
  if (!period) return true
  if (period.from && (!isValidDate(period.from) || record.date < period.from)) return false
  if (period.to && (!isValidDate(period.to) || record.date > period.to)) return false
  if (period.month && (!/^\d{4}-\d{2}$/.test(period.month) || !record.date.startsWith(period.month))) return false
  return true
}

/** Totals preserve category and unit, so incompatible measurements are never combined. */
export function aggregateByCategory(records: readonly EnvironmentalRecord[], period?: RecordPeriod): MetricTotal[] {
  const totals = new Map<string, MetricTotal>()
  for (const record of records) {
    if (!isEnvironmentalRecord(record) || !matchesPeriod(record, period)) continue
    const key = `${record.category}\u0000${record.unit}`
    const total = totals.get(key) ?? { category: record.category, unit: record.unit, amount: 0, count: 0 }
    total.amount += record.amount
    total.count += 1
    totals.set(key, total)
  }
  return [...totals.values()].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.unit.localeCompare(b.unit))
}

/** Totals by calendar month, category, and unit; no unit conversions or impact factors are applied. */
export function aggregateByPeriod(records: readonly EnvironmentalRecord[], period?: RecordPeriod): PeriodMetricTotal[] {
  const totals = new Map<string, PeriodMetricTotal>()
  for (const record of records) {
    if (!isEnvironmentalRecord(record) || !matchesPeriod(record, period)) continue
    const month = record.date.slice(0, 7)
    const key = `${month}\u0000${record.category}\u0000${record.unit}`
    const total = totals.get(key) ?? { period: month, category: record.category, unit: record.unit, amount: 0, count: 0 }
    total.amount += record.amount
    total.count += 1
    totals.set(key, total)
  }
  return [...totals.values()].sort((a, b) => a.period.localeCompare(b.period) || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.unit.localeCompare(b.unit))
}

/** Totals across categories sharing a unit, retaining which categories contributed. */
export function aggregateByUnit(records: readonly EnvironmentalRecord[], period?: RecordPeriod): UnitMetricTotal[] {
  const totals = new Map<Unit, UnitMetricTotal>()
  for (const record of records) {
    if (!isEnvironmentalRecord(record) || !matchesPeriod(record, period)) continue
    const total = totals.get(record.unit) ?? { unit: record.unit, amount: 0, count: 0, categories: [] }
    total.amount += record.amount
    total.count += 1
    if (!total.categories.includes(record.category)) total.categories.push(record.category)
    totals.set(record.unit, total)
  }
  return [...totals.values()].sort((a, b) => a.unit.localeCompare(b.unit))
}
