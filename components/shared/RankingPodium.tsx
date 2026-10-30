import Icon from '@/components/shared/Icon'
import type { LeaderboardUser } from '@/services/ideasService'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function formatPoints(value: number) {
  return value.toLocaleString('pt-BR')
}

type SlotMeta = {
  rank: string
  iconSize: number
  avatarSize: number
  stepHeight: number
  medalColor: string
  avatarBg: string
  stepFrom: string
  stepTo: string
}

// display indices: 0 = left (2nd), 1 = center (1st), 2 = right (3rd)
function getSlotMeta(rankIndex: number, totem: boolean): SlotMeta {
  const defs: SlotMeta[] = [
    {
      rank: '1º',
      iconSize: totem ? 26 : 20,
      avatarSize: totem ? 64 : 50,
      stepHeight: totem ? 96 : 76,
      medalColor: '#f6c35b',
      avatarBg: '#b8860b',
      stepFrom: '#f6d060',
      stepTo: '#b8750a',
    },
    {
      rank: '2º',
      iconSize: totem ? 20 : 16,
      avatarSize: totem ? 50 : 40,
      stepHeight: totem ? 64 : 52,
      medalColor: '#94a3b8',
      avatarBg: '#607d8b',
      stepFrom: '#b0bec5',
      stepTo: '#546e7a',
    },
    {
      rank: '3º',
      iconSize: totem ? 20 : 16,
      avatarSize: totem ? 44 : 36,
      stepHeight: totem ? 46 : 36,
      medalColor: '#fb923c',
      avatarBg: '#c2410c',
      stepFrom: '#ffb74d',
      stepTo: '#bf360c',
    },
  ]
  return defs[rankIndex]!
}

type Props = {
  users: LeaderboardUser[]
  currentUserId?: string
  totem?: boolean
}

export default function RankingPodium({ users, currentUserId, totem = false }: Props) {
  // Render order: 2nd (left), 1st (center), 3rd (right)
  const slots = [
    { person: users[1] ?? null, rankIndex: 1 },
    { person: users[0] ?? null, rankIndex: 0 },
    { person: users[2] ?? null, rankIndex: 2 },
  ]

  return (
    <div className={`ranking-podium${totem ? ' ranking-podium--totem' : ''}`}>
      {slots.map(({ person, rankIndex }, displayIndex) => {
        const meta = getSlotMeta(rankIndex, totem)
        const isFirst = rankIndex === 0
        const isCurrentUser = person?.id === currentUserId

        if (!person) {
          return <div key={displayIndex} className="ranking-podium-slot ranking-podium-slot--empty" />
        }

        return (
          <div key={person.id} className={`ranking-podium-slot${isFirst ? ' is-first' : ''}`}>
            <div className="ranking-podium-info">
              <span className="ranking-podium-medal" style={{ color: meta.medalColor }}>
                <Icon name="award" size={meta.iconSize} />
              </span>

              <div
                className="ih-avatar"
                style={{
                  width: meta.avatarSize,
                  height: meta.avatarSize,
                  fontSize: Math.round(meta.avatarSize * 0.3),
                  fontWeight: 800,
                  background: meta.avatarBg,
                  flexShrink: 0,
                  boxShadow: isFirst ? `0 0 0 3px ${meta.medalColor}55` : undefined,
                }}
              >
                {initials(person.name)}
              </div>

              <div className="ranking-podium-name">
                {person.name}
                {isCurrentUser && <span className="ranking-podium-you">você</span>}
              </div>

              <div className="ranking-podium-sector">
                {person.sector_name ?? '—'}
              </div>

              <div className="ranking-podium-pts tabnum">
                {formatPoints(person.points ?? 0)} pts
              </div>
            </div>

            <div
              className="ranking-podium-step"
              style={{
                height: meta.stepHeight,
                background: `linear-gradient(to bottom, ${meta.stepFrom}, ${meta.stepTo})`,
              }}
            >
              {meta.rank}
            </div>
          </div>
        )
      })}
    </div>
  )
}
