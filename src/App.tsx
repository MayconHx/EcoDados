import { useEffect, useMemo, useState, type FormEvent } from 'react'

type Category = 'Água' | 'Energia' | 'Resíduos'
type Entry = { id: string; category: Category; amount: number; unit: string; date: string; note: string }
const STORAGE_KEY = 'ecodados.entries.v1'
const categories: Category[] = ['Água', 'Energia', 'Resíduos']
const units: Record<Category, string[]> = { Água: ['L', 'm³'], Energia: ['kWh'], Resíduos: ['kg', 't'] }
const today = new Date().toISOString().slice(0, 10)

function readEntries(): Entry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as Entry[] : []
  } catch {
    return []
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function App() {
  const [entries, setEntries] = useState<Entry[]>(readEntries)
  const [category, setCategory] = useState<Category>('Água')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState(units['Água'][0])
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [period, setPeriod] = useState('')
  const [error, setError] = useState('')

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)), [entries])

  const visibleEntries = useMemo(() => entries
    .filter((entry) => !period || entry.date.startsWith(period))
    .sort((a, b) => b.date.localeCompare(a.date)), [entries, period])

  const totals = useMemo(() => categories.map((name) => {
    const matching = visibleEntries.filter((entry) => entry.category === name)
    const byUnit = new Map<string, number>()
    matching.forEach((entry) => byUnit.set(entry.unit, (byUnit.get(entry.unit) ?? 0) + entry.amount))
    return { name, count: matching.length, values: [...byUnit.entries()] }
  }), [visibleEntries])

  const monthly = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - (5 - index))
      return d.toISOString().slice(0, 7)
    })
    return categories.map((name) => {
      const unit = units[name][0]
      const values = months.map((month) => visibleEntries
        .filter((entry) => entry.category === name && entry.unit === unit && entry.date.startsWith(month))
        .reduce((sum, entry) => sum + entry.amount, 0))
      return { name, unit, values }
    })
  }, [visibleEntries])

  function onCategoryChange(value: Category) {
    setCategory(value)
    setUnit(units[value][0])
  }

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }
    if (!date) {
      setError('Informe a data do registro.')
      return
    }
    setEntries((current) => [{ id: crypto.randomUUID(), category, amount: parsed, unit, date, note: note.trim() }, ...current])
    setAmount('')
    setNote('')
    setError('')
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="EcoDados início"><span className="brand-mark" aria-hidden="true">E</span><span>EcoDados</span></a>
        <nav aria-label="Navegação principal"><a href="#painel">Painel</a><a href="#registros">Registros</a></nav>
        <span className="status"><span className="status-dot" /> Dados salvos neste dispositivo</span>
      </header>

      <section className="hero" id="inicio" aria-labelledby="page-title">
        <div><p className="eyebrow">PLATAFORMA DE INDICADORES DE SUSTENTABILIDADE</p><h1 id="page-title">Pequenos dados.<br /><em>Grandes mudanças.</em></h1>
          <p className="intro">Acompanhe água, energia e resíduos em um só lugar. Transforme seus registros em indicadores claros para orientar escolhas mais sustentáveis.</p></div>
        <div className="hero-note"><span className="hero-note-mark">↗</span><div><small>PRIMEIRO PASSO</small><strong>Registre um consumo ou resíduo</strong></div></div>
      </section>

      <section className="dashboard" id="painel" aria-labelledby="dashboard-title">
        <div className="section-heading"><div><p className="eyebrow">VISÃO GERAL</p><h2 id="dashboard-title">Seu impacto em números</h2></div>
          <label className="period-filter">Período <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Filtrar por mês" /></label></div>
        <div className="metric-grid">{totals.map((total) => <article className="metric-card" key={total.name}><span className={`metric-icon ${total.name.toLowerCase()}`} aria-hidden="true">{total.name === 'Água' ? '≈' : total.name === 'Energia' ? 'ϟ' : '↻'}</span><p>{total.name}</p><strong>{total.values.length ? total.values.map(([u, value]) => `${formatNumber(value)} ${u}`).join(' / ') : '—'}</strong><small>{total.count} {total.count === 1 ? 'registro' : 'registros'} no período</small></article>)}</div>
      </section>

      <section className="content-grid">
        <section className="panel chart-panel" aria-labelledby="chart-title"><div className="panel-heading"><div><p className="eyebrow">TENDÊNCIA</p><h2 id="chart-title">Últimos 6 meses</h2></div><span className="unit-hint">unidades principais</span></div>
          <div className="chart" role="img" aria-label="Gráfico de barras com os registros dos últimos seis meses, separados por categoria">
            {monthly.map((series) => { const max = Math.max(...series.values, 1); return <div className="chart-series" key={series.name}><div className="series-label">{series.name} <small>({series.unit})</small></div><div className="bar-row">{series.values.map((value, index) => <div className="bar-cell" key={`${series.name}-${index}`} title={`${formatNumber(value)} ${series.unit}`}><span className={`bar ${series.name.toLowerCase()}`} style={{ height: `${value ? Math.max(5, value / max * 100) : 0}%` }} /></div>)}</div></div> })}
            <div className="month-labels">{Array.from({ length: 6 }, (_, index) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - index)); return <span key={index}>{new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')}</span> })}</div>
          </div>
          <p className="chart-footnote">A visualização considera os últimos seis meses e unidades principais (L, kWh e kg).</p>
        </section>

        <section className="panel form-panel" aria-labelledby="form-title"><div className="panel-heading"><div><p className="eyebrow">NOVO LANÇAMENTO</p><h2 id="form-title">Adicionar registro</h2></div></div>
          <form onSubmit={addEntry} noValidate>
            <label>Tipo de registro<select value={category} onChange={(event) => onCategoryChange(event.target.value as Category)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="field-row"><label>Quantidade<input inputMode="decimal" placeholder="Ex.: 250" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Unidade<select value={unit} onChange={(event) => setUnit(event.target.value)}>{units[category].map((item) => <option key={item}>{item}</option>)}</select></label></div>
            <label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Observação <span className="optional">opcional</span><input maxLength={100} placeholder="Ex.: leitura mensal" value={note} onChange={(event) => setNote(event.target.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit">Salvar registro <span aria-hidden="true">↗</span></button>
          </form>
        </section>
      </section>

      <section className="panel records-panel" id="registros" aria-labelledby="records-title"><div className="panel-heading"><div><p className="eyebrow">HISTÓRICO</p><h2 id="records-title">Registros recentes</h2></div><button className="print-button" type="button" onClick={() => window.print()}>Imprimir relatório <span aria-hidden="true">↗</span></button></div>
        {visibleEntries.length === 0 ? <div className="empty-state"><span aria-hidden="true">＋</span><strong>Nenhum registro neste período</strong><p>Adicione seu primeiro lançamento para começar a acompanhar os indicadores.</p></div> : <div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Quantidade</th><th>Data</th><th>Observação</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>{visibleEntries.map((entry) => <tr key={entry.id}><td><span className={`record-dot ${entry.category.toLowerCase()}`} />{entry.category}</td><td>{formatNumber(entry.amount)} {entry.unit}</td><td>{new Intl.DateTimeFormat('pt-BR').format(new Date(`${entry.date}T12:00:00`))}</td><td className="note-cell">{entry.note || '—'}</td><td><button className="delete-button" type="button" onClick={() => removeEntry(entry.id)} aria-label={`Excluir registro de ${entry.category} em ${entry.date}`}>Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
      <footer><span>EcoDados</span><span></span><span className="privacy-note">Seus registros ficam salvos somente neste dispositivo.</span></footer>
    </main>
  )
}

export default App
