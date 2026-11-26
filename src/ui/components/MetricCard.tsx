export function MetricCard({ titulo, valor, badge, tom }: { titulo: string; valor: string; badge?: string; tom?: 'bom' | 'ruim' | 'neutro' }) {
  return (
    <div className="card">
      <h3>{titulo}</h3>
      {badge ? <span className={`badge ${tom ?? ''}`}>{badge}</span> : <span className="badge" style={{ visibility: 'hidden' }}>-</span>}
      <div className="valor">{valor}</div>
    </div>
  )
}
