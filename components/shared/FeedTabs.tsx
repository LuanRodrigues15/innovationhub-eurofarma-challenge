'use client'

export type FeedTab = 'para-voce' | 'global'

interface FeedTabsProps {
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
}

const TABS: Array<{ value: FeedTab; label: string; description: string }> = [
  { value: 'para-voce', label: 'Para Você', description: 'Ideias do seu setor' },
  { value: 'global', label: 'Global', description: 'Todas as ideias' },
]

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar feed por escopo"
      style={{
        display: 'inline-flex',
        gap: 2,
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-lg)',
        padding: 3,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls="idea-feed-panel"
            onClick={() => onTabChange(tab.value)}
            style={{
              padding: '7px 18px',
              borderRadius: 'calc(var(--r-lg) - 2px)',
              border: 'none',
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? 'var(--ink)' : 'var(--ink-3)',
              fontSize: 13,
              fontWeight: isActive ? 800 : 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
