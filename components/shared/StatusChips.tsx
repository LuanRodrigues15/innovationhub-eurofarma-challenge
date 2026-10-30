'use client'

import type { IdeaStatus } from '@/services/ideasService'

interface StatusChipsProps {
  activeStatus: IdeaStatus | null
  onStatusChange: (status: IdeaStatus | null) => void
}

const STATUS_CHIPS: Array<{ value: IdeaStatus | null; label: string; color: string | null }> = [
  { value: null, label: 'Todas', color: null },
  { value: 'sugestao', label: 'Sugestão', color: 'rgba(100,116,139,0.6)' },
  { value: 'em_analise', label: 'Em Análise', color: '#f59e0b' },
  { value: 'em_implantacao', label: 'Em Implantação', color: '#10b981' },
  { value: 'conhecimento_org', label: 'Gerou Valor', color: '#3b82f6' },
]

export default function StatusChips({ activeStatus, onStatusChange }: StatusChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar por status"
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
    >
      {STATUS_CHIPS.map((chip) => {
        const isActive = activeStatus === chip.value
        const activeColor = chip.color ?? 'var(--accent)'
        return (
          <button
            key={chip.value ?? 'all'}
            type="button"
            onClick={() => onStatusChange(chip.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 13px',
              borderRadius: 'var(--r-full)',
              border: isActive
                ? `1.5px solid ${activeColor}`
                : '1.5px solid var(--line)',
              background: isActive
                ? chip.color
                  ? `${chip.color}1a`
                  : 'color-mix(in srgb, var(--accent) 10%, transparent)'
                : 'var(--surface)',
              color: isActive ? activeColor : 'var(--ink-3)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {chip.color && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: chip.color,
                  flexShrink: 0,
                }}
              />
            )}
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
