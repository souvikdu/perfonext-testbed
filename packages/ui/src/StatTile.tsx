export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className="stat-tile__value">{value}</div>
      {hint ? <div className="stat-tile__hint">{hint}</div> : null}
    </div>
  );
}
