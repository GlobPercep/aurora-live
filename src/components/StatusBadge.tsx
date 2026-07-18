import type { DataMode } from '../types';
export function StatusBadge({ mode }: { mode: DataMode }) { return <span className={`status-badge ${mode}`}><i />{mode === 'error' ? 'Unavailable' : mode[0].toUpperCase() + mode.slice(1)}</span>; }
