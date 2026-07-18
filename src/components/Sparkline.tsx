export function Sparkline({ values, label, color = '#71f6aa' }: { values: number[]; label: string; color?: string }) {
  if (values.length < 2) return <div className="spark-empty">Not enough history</div>;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const points = values.map((value, i) => `${i / (values.length - 1) * 100},${28 - (value - min) / range * 24}`).join(' ');
  return <svg className="spark" viewBox="0 0 100 32" role="img" aria-label={`${label}; recent values ${values.map((v) => v.toFixed(1)).join(', ')}`} preserveAspectRatio="none"><polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}
