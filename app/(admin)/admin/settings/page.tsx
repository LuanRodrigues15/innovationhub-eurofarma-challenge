'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import Icon, { type IconName } from '@/components/shared/Icon'
import ProfileShell from '@/components/shared/ProfileShell'
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  type PlatformSettings,
} from '@/services/managementService'

type SettingKind = 'weight' | 'integer' | 'boolean'
type Category = 'hub' | 'points' | 'mentorships'

type SettingDef = {
  key: string
  label: string
  desc: string
  icon: IconName
  category: Category
  group?: string
  kind: SettingKind
  defaultValue: string
  unit?: string
  min?: number
  max?: number
  step?: number
}

type ConfirmMode = 'save' | 'restore' | null

const SETTING_DEFS: SettingDef[] = [
  // HUB
  {
    key: 'hybrid_weight_ai',
    label: 'Peso da IA',
    desc: 'Participação do AI Score na priorização do gestor.',
    icon: 'cpu',
    category: 'hub',
    kind: 'weight',
    defaultValue: '0.7',
    min: 0, max: 1, step: 0.05,
  },
  {
    key: 'hybrid_weight_social',
    label: 'Peso da comunidade',
    desc: 'Participação do Social Score na priorização do gestor.',
    icon: 'heart',
    category: 'hub',
    kind: 'weight',
    defaultValue: '0.3',
    min: 0, max: 1, step: 0.05,
  },
  {
    key: 'min_validations_for_analysis',
    label: 'Validações para análise',
    desc: 'Quantidade de apoios para a ideia entrar na fila do gestor.',
    icon: 'check-circle',
    category: 'hub',
    kind: 'integer',
    defaultValue: '5',
    unit: 'val.',
    min: 1, max: 99,
  },
  // POINTS — Ideias
  {
    key: 'points_publish_idea',
    label: 'Publicar ideia',
    desc: 'Crédito ao publicar uma proposta aprovada pela IA.',
    icon: 'sparkles',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '10',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_validate_idea',
    label: 'Validar ideia',
    desc: 'Crédito ao apoiar uma proposta de outro colaborador.',
    icon: 'heart',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '5',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_comment_idea',
    label: 'Comentar ideia',
    desc: 'Crédito ao deixar um comentário em uma proposta.',
    icon: 'send',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '2',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_idea_to_analysis',
    label: 'Entrar em análise',
    desc: 'Crédito quando a ideia alcança a fila do gestor.',
    icon: 'trending-up',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '25',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_idea_approved',
    label: 'Ideia aprovada',
    desc: 'Crédito quando o gestor aprova a implantação.',
    icon: 'award',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '100',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_idea_knowledge',
    label: 'Ideia concluída',
    desc: 'Bônus ao concluir e registrar a ideia implantada.',
    icon: 'layers',
    category: 'points',
    group: 'Ideias',
    kind: 'integer',
    defaultValue: '250',
    unit: 'pts',
    min: 0, max: 10000,
  },
  // POINTS — Academy
  {
    key: 'points_complete_course',
    label: 'Concluir curso',
    desc: 'Crédito ao finalizar um curso da Academy.',
    icon: 'award',
    category: 'points',
    group: 'Academy',
    kind: 'integer',
    defaultValue: '15',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_complete_quiz',
    label: 'Acertar quiz',
    desc: 'Crédito adicional ao passar no quiz de um curso.',
    icon: 'check-circle',
    category: 'points',
    group: 'Academy',
    kind: 'integer',
    defaultValue: '20',
    unit: 'pts',
    min: 0, max: 10000,
  },
  // POINTS — Marketplace
  {
    key: 'show_points_table_marketplace',
    label: 'Tabela de pontos',
    desc: 'Exibe a tabela de pontuação na vitrine do Marketplace.',
    icon: 'layers',
    category: 'points',
    group: 'Marketplace',
    kind: 'boolean',
    defaultValue: 'true',
  },
  // MENTORSHIPS
  {
    key: 'max_active_mentorships',
    label: 'Mentorias simultâneas',
    desc: 'Limite de mentorias ativas que um mentor pode conduzir ao mesmo tempo.',
    icon: 'settings',
    category: 'mentorships',
    kind: 'integer',
    defaultValue: '3',
    unit: 'max',
    min: 1, max: 20,
  },
  {
    key: 'points_give_mentorship',
    label: 'Conduzir mentoria',
    desc: 'Crédito ao mentor quando o pareamento é confirmado.',
    icon: 'users',
    category: 'mentorships',
    kind: 'integer',
    defaultValue: '30',
    unit: 'pts',
    min: 0, max: 10000,
  },
  {
    key: 'points_receive_mentorship',
    label: 'Receber mentoria',
    desc: 'Crédito ao mentorado quando o pareamento é confirmado.',
    icon: 'user',
    category: 'mentorships',
    kind: 'integer',
    defaultValue: '15',
    unit: 'pts',
    min: 0, max: 10000,
  },
]

const CATEGORY_META: Record<Category, { title: string; desc: string; icon: IconName }> = {
  hub: {
    title: 'Score e Hub',
    desc: 'Pesos do score híbrido e gatilho de entrada em análise.',
    icon: 'bar-chart',
  },
  points: {
    title: 'Pontuação',
    desc: 'Créditos por ações em ideias, Academy e Marketplace.',
    icon: 'zap',
  },
  mentorships: {
    title: 'Mentorias',
    desc: 'Limite de mentorias simultâneas e créditos de pareamento.',
    icon: 'users',
  },
}

const CATEGORY_ORDER: Category[] = ['hub', 'points', 'mentorships']

const DEFAULT_SETTINGS = SETTING_DEFS.reduce<PlatformSettings>((acc, item) => {
  acc[item.key] = item.defaultValue
  return acc
}, {})

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function cleanDecimal(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, '')
}

function parseSettingNumber(settings: PlatformSettings, key: string, fallback: number) {
  const parsed = Number(settings[key])
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeLoadedSettings(data: PlatformSettings) {
  return { ...DEFAULT_SETTINGS, ...data }
}

function formatSettingValue(def: SettingDef, value: string | undefined) {
  if (def.kind === 'boolean') return value === 'false' ? 'Oculta' : 'Visível'

  const numeric = Number(value ?? def.defaultValue)
  if (!Number.isFinite(numeric)) return value ?? '-'

  if (def.kind === 'weight') return `${Math.round(numeric * 100)}%`
  if (def.unit === 'val.') return `${numeric} validações`
  if (def.unit === 'max') return `${numeric}`
  return `${numeric.toLocaleString('pt-BR')} pts`
}

function getValidationMessages(settings: PlatformSettings) {
  const messages: string[] = []
  const ai = Number(settings.hybrid_weight_ai)
  const social = Number(settings.hybrid_weight_social)

  if (!Number.isFinite(ai) || !Number.isFinite(social)) {
    messages.push('Os pesos do Score Híbrido precisam ser numéricos.')
  } else {
    if (ai < 0 || ai > 1 || social < 0 || social > 1) {
      messages.push('Os pesos do Score Híbrido precisam ficar entre 0 e 1.')
    }
    if (Math.abs(ai + social - 1) > 0.001) {
      messages.push('A soma dos pesos (IA + Comunidade) deve ser 100%.')
    }
  }

  SETTING_DEFS.filter((def) => def.kind === 'integer').forEach((def) => {
    const value = Number(settings[def.key])
    if (!Number.isInteger(value)) messages.push(`${def.label} precisa ser um número inteiro.`)
    if (Number.isFinite(value) && def.min !== undefined && value < def.min) {
      messages.push(`${def.label} precisa ser maior ou igual a ${def.min}.`)
    }
    if (Number.isFinite(value) && def.max !== undefined && value > def.max) {
      messages.push(`${def.label} precisa ser menor ou igual a ${def.max}.`)
    }
  })

  return messages
}

export default function AdminSettingsPage() {
  const { user, loading: userLoading } = useUser()
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('hub')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      setLoading(true)
      setFeedback(null)

      try {
        const data = normalizeLoadedSettings(await fetchPlatformSettings())
        if (!active) return
        setSettings(data)
        setOriginalSettings(data)
      } catch {
        if (active) setFeedback('Erro ao carregar configurações.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()
    return () => { active = false }
  }, [])

  const grouped = useMemo(() => {
    return SETTING_DEFS.reduce<Record<Category, SettingDef[]>>(
      (acc, item) => {
        acc[item.category] = [...(acc[item.category] ?? []), item]
        return acc
      },
      { hub: [], points: [], mentorships: [] }
    )
  }, [])

  const pointsGroups = useMemo(() => {
    const result: { label: string; defs: SettingDef[] }[] = []
    const seen = new Set<string>()
    for (const def of SETTING_DEFS.filter((d) => d.category === 'points' && d.kind !== 'weight')) {
      const label = def.group ?? ''
      if (!seen.has(label)) {
        seen.add(label)
        result.push({ label, defs: [] })
      }
      result[result.length - 1].defs.push(def)
    }
    return result
  }, [])

  const changedDefs = useMemo(
    () => SETTING_DEFS.filter((def) => settings[def.key] !== originalSettings[def.key]),
    [settings, originalSettings]
  )

  const changedByCategory = useMemo(() => {
    const result: Partial<Record<Category, number>> = {}
    for (const def of SETTING_DEFS) {
      if (settings[def.key] !== originalSettings[def.key]) {
        result[def.category] = (result[def.category] ?? 0) + 1
      }
    }
    return result
  }, [settings, originalSettings])

  const validationMessages = useMemo(() => getValidationMessages(settings), [settings])
  const hasChanges = changedDefs.length > 0
  const hasErrors = validationMessages.length > 0

  const aiWeight = clamp(parseSettingNumber(settings, 'hybrid_weight_ai', 0.7), 0, 1)
  const socialWeight = clamp(parseSettingNumber(settings, 'hybrid_weight_social', 0.3), 0, 1)

  if (userLoading) return <p className="ih-loading-page">Carregando...</p>

  function setIntegerSetting(def: SettingDef, value: string) {
    if (value === '') {
      setSettings((current) => ({ ...current, [def.key]: '' }))
      return
    }
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) return
    const min = def.min ?? 0
    const max = def.max ?? 10000
    setSettings((current) => ({ ...current, [def.key]: String(Math.round(clamp(numeric, min, max))) }))
  }

  function setAiWeight(value: number) {
    const nextAi = clamp(value, 0, 1)
    setSettings((current) => ({
      ...current,
      hybrid_weight_ai: cleanDecimal(nextAi),
      hybrid_weight_social: cleanDecimal(1 - nextAi),
    }))
  }

  function setBooleanSetting(key: string, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value ? 'true' : 'false' }))
  }

  function handleOpenSaveConfirmation() {
    if (!hasChanges) { setFeedback('Nenhuma alteração pendente para salvar.'); return }
    if (hasErrors) { setFeedback('Revise os campos destacados antes de salvar.'); return }
    setConfirmMode('save')
  }

  async function handleConfirmSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const payload = normalizeLoadedSettings(settings)
      await updatePlatformSettings(payload)
      setOriginalSettings(payload)
      setSettings(payload)
      setConfirmMode(null)
      setFeedback('Configurações salvas com sucesso.')
    } catch {
      setFeedback('Erro ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  function handleRestoreDefaults() {
    setSettings(DEFAULT_SETTINGS)
    setConfirmMode(null)
    setFeedback('Valores padrão preparados. Confirme o salvamento para gravar no banco.')
  }

  return (
    <ProfileShell
      profile="admin"
      title="Configurações"
      subtitle="Parâmetros da plataforma e regras de inovação"
      user={user}
    >
      <div className="admin-settings-page">
        {feedback && (
          <div className={`admin-settings-feedback ${feedback.includes('Erro') || feedback.includes('Revise') ? 'is-error' : ''}`}>
            {feedback}
          </div>
        )}

        <div className="admin-settings-actionbar">
          <div className="admin-settings-status">
            {hasChanges ? (
              <span className="is-pending">
                <Icon name="circle" size={8} />
                {changedDefs.length} {changedDefs.length === 1 ? 'campo alterado' : 'campos alterados'}
              </span>
            ) : (
              <span className="is-clean">Sem alterações pendentes</span>
            )}
            {hasErrors && (
              <span className="is-error">
                <Icon name="shield" size={13} />
                Revise os campos em destaque
              </span>
            )}
          </div>
          <div className="admin-settings-actions">
            <button
              className="btn btn-muted btn-md"
              type="button"
              disabled={loading || saving}
              onClick={() => setConfirmMode('restore')}
            >
              <Icon name="refresh-cw" size={15} />
              Restaurar padrão
            </button>
            <button
              className="btn btn-accent btn-md"
              type="button"
              disabled={loading || saving || !hasChanges || hasErrors}
              onClick={handleOpenSaveConfirmation}
            >
              <Icon name="check" size={16} />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="ih-loading-page admin-settings-loading">Carregando configurações...</p>
        ) : (
          <>
            {hasErrors && (
              <section className="admin-settings-alert" aria-live="polite">
                <Icon name="shield" size={18} />
                <div>
                  <strong>Revise antes de salvar</strong>
                  {validationMessages.map((message) => (
                    <span key={message}>{message}</span>
                  ))}
                </div>
              </section>
            )}

            <div className="admin-settings-layout">
              <nav className="admin-settings-sidenav">
                {CATEGORY_ORDER.map((cat) => {
                  const count = changedByCategory[cat]
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`admin-settings-tab ${activeCategory === cat ? 'is-active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      <span className="admin-settings-tab-icon">
                        <Icon name={CATEGORY_META[cat].icon} size={14} />
                      </span>
                      <span className="admin-settings-tab-label">{CATEGORY_META[cat].title}</span>
                      {count ? <em className="admin-settings-tab-badge">{count}</em> : null}
                    </button>
                  )
                })}
              </nav>

              <div className="admin-settings-panel">
                <div className="admin-settings-panel-head">
                  <span>
                    <Icon name={CATEGORY_META[activeCategory].icon} size={16} />
                  </span>
                  <div>
                    <h3>{CATEGORY_META[activeCategory].title}</h3>
                    <p>{CATEGORY_META[activeCategory].desc}</p>
                  </div>
                </div>

                <div className="admin-settings-panel-body">
                  {activeCategory === 'hub' && (
                    <WeightPairControl
                      aiWeight={aiWeight}
                      socialWeight={socialWeight}
                      dirty={
                        settings.hybrid_weight_ai !== originalSettings.hybrid_weight_ai ||
                        settings.hybrid_weight_social !== originalSettings.hybrid_weight_social
                      }
                      onAiWeightChange={setAiWeight}
                    />
                  )}
                  {activeCategory === 'points'
                    ? pointsGroups.map(({ label, defs }) => (
                        <div key={label} className="admin-settings-group">
                          <div className="admin-settings-group-label">{label}</div>
                          {defs.map((setting) => (
                            <SettingControl
                              key={setting.key}
                              setting={setting}
                              value={settings[setting.key] ?? setting.defaultValue}
                              dirty={settings[setting.key] !== originalSettings[setting.key]}
                              onIntegerChange={(value) => setIntegerSetting(setting, value)}
                              onBooleanChange={(value) => setBooleanSetting(setting.key, value)}
                            />
                          ))}
                        </div>
                      ))
                    : grouped[activeCategory]
                        .filter((setting) => setting.kind !== 'weight')
                        .map((setting) => (
                          <SettingControl
                            key={setting.key}
                            setting={setting}
                            value={settings[setting.key] ?? setting.defaultValue}
                            dirty={settings[setting.key] !== originalSettings[setting.key]}
                            onIntegerChange={(value) => setIntegerSetting(setting, value)}
                            onBooleanChange={(value) => setBooleanSetting(setting.key, value)}
                          />
                        ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmMode && (
        <div className="ih-modal-backdrop" onClick={() => !saving && setConfirmMode(null)}>
          <div className="admin-settings-confirm" onClick={(event) => event.stopPropagation()}>
            <div className="admin-settings-confirm-head">
              <span>
                <Icon name={confirmMode === 'save' ? 'check-circle' : 'refresh-cw'} size={20} />
              </span>
              <div>
                <h2>{confirmMode === 'save' ? 'Confirmar alterações' : 'Restaurar valores padrão'}</h2>
                <p>
                  {confirmMode === 'save'
                    ? 'As chaves abaixo serão atualizadas em platform_settings.'
                    : 'Os campos serão preenchidos com os valores padrão do projeto.'}
                </p>
              </div>
            </div>

            {confirmMode === 'save' ? (
              <div className="admin-settings-change-list">
                {changedDefs.map((def) => (
                  <div key={def.key}>
                    <span>{def.label}</span>
                    <strong>
                      {formatSettingValue(def, originalSettings[def.key])} {'→'} {formatSettingValue(def, settings[def.key])}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-settings-confirm-note">
                Esta ação ainda não grava no banco. Depois de restaurar, use Salvar para confirmar a persistência.
              </div>
            )}

            <div className="admin-settings-confirm-actions">
              <button className="btn btn-muted btn-md" type="button" disabled={saving} onClick={() => setConfirmMode(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-accent btn-md"
                type="button"
                disabled={saving}
                onClick={confirmMode === 'save' ? handleConfirmSave : handleRestoreDefaults}
              >
                <Icon name={confirmMode === 'save' ? 'check' : 'refresh-cw'} size={15} />
                {confirmMode === 'save' ? (saving ? 'Salvando...' : 'Confirmar e salvar') : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileShell>
  )
}

function SettingControl({
  setting,
  value,
  dirty,
  onIntegerChange,
  onBooleanChange,
}: {
  setting: SettingDef
  value: string
  dirty: boolean
  onIntegerChange: (value: string) => void
  onBooleanChange: (value: boolean) => void
}) {
  const isBoolean = setting.kind === 'boolean'

  return (
    <label className={`admin-settings-control ${dirty ? 'is-dirty' : ''}`}>
      <span className="admin-settings-control-icon">
        <Icon name={setting.icon} size={14} />
      </span>

      <div className="admin-settings-control-body">
        <div className="admin-settings-control-label">
          {setting.label}
          {dirty && <em>Alterado</em>}
        </div>
        <div className="admin-settings-control-desc">{setting.desc}</div>
      </div>

      <div className="admin-settings-control-field">
        {isBoolean ? (
          <button
            className={`admin-settings-switch ${value !== 'false' ? 'is-on' : ''}`}
            type="button"
            role="switch"
            aria-checked={value !== 'false'}
            onClick={() => onBooleanChange(value === 'false')}
          >
            <span aria-hidden="true" />
            <strong>{value !== 'false' ? 'Sim' : 'Não'}</strong>
          </button>
        ) : (
          <div className="admin-settings-number-row">
            <input
              className="ih-input"
              type="number"
              min={setting.min}
              max={setting.max}
              step={setting.step ?? 1}
              value={value}
              onChange={(event) => onIntegerChange(event.target.value)}
            />
            <span>{setting.unit ?? 'pts'}</span>
          </div>
        )}
      </div>
    </label>
  )
}

function WeightPairControl({
  aiWeight,
  socialWeight,
  dirty,
  onAiWeightChange,
}: {
  aiWeight: number
  socialWeight: number
  dirty: boolean
  onAiWeightChange: (value: number) => void
}) {
  const aiPct = Math.round(aiWeight * 100)
  const socialPct = Math.round(socialWeight * 100)

  function handleAiChange(raw: string) {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onAiWeightChange(Math.min(100, Math.max(0, n)) / 100)
  }

  function handleSocialChange(raw: string) {
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onAiWeightChange((100 - Math.min(100, Math.max(0, n))) / 100)
  }

  return (
    <>
      <label className={`admin-settings-control ${dirty ? 'is-dirty' : ''}`}>
        <span className="admin-settings-control-icon">
          <Icon name="cpu" size={14} />
        </span>
        <div className="admin-settings-control-body">
          <div className="admin-settings-control-label">
            Peso da IA
            {dirty && <em>Alterado</em>}
          </div>
          <div className="admin-settings-control-desc">Participação do AI Score na priorização do gestor.</div>
        </div>
        <div className="admin-settings-control-field">
          <div className="admin-settings-number-row">
            <input className="ih-input" type="number" min={0} max={100} step={5} value={aiPct}
              onChange={(e) => handleAiChange(e.target.value)} />
            <span>%</span>
          </div>
        </div>
      </label>
      <label className={`admin-settings-control ${dirty ? 'is-dirty' : ''}`}>
        <span className="admin-settings-control-icon">
          <Icon name="heart" size={14} />
        </span>
        <div className="admin-settings-control-body">
          <div className="admin-settings-control-label">Peso da comunidade</div>
          <div className="admin-settings-control-desc">Participação do Social Score na priorização do gestor.</div>
        </div>
        <div className="admin-settings-control-field">
          <div className="admin-settings-number-row">
            <input className="ih-input" type="number" min={0} max={100} step={5} value={socialPct}
              onChange={(e) => handleSocialChange(e.target.value)} />
            <span>%</span>
          </div>
        </div>
      </label>
    </>
  )
}
