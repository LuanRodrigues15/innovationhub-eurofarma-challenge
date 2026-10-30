'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

interface LikeButtonProps {
  score: number
  validated: boolean
  disabled: boolean
  onToggle: () => void
}

const THUMB_PATH =
  'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'

const N_PARTICLES = 10
const PARTICLE_ANGLES = Array.from({ length: N_PARTICLES }, (_, i) => (i / N_PARTICLES) * Math.PI * 2)

export default function LikeButton({ score, validated, disabled, onToggle }: LikeButtonProps) {
  const wrapRef        = useRef<HTMLDivElement>(null)
  const btnRef         = useRef<HTMLButtonElement>(null)
  const yellowFillRef  = useRef<HTMLDivElement>(null)
  const blueFillRef    = useRef<HTMLDivElement>(null)
  const thumbFillRef   = useRef<SVGPathElement>(null)
  const thumbOutRef    = useRef<SVGPathElement>(null)
  const countRef       = useRef<HTMLSpanElement>(null)
  const particleRefs   = useRef<(HTMLDivElement | null)[]>([])
  const tlRef          = useRef<gsap.core.Timeline | null>(null)
  const isAnimatingRef = useRef(false)
  const isLikedRef     = useRef(validated)

  const applyLikedState = () => {
    const wrap = wrapRef.current, btn = btnRef.current
    const yf = yellowFillRef.current, bf = blueFillRef.current
    const tf = thumbFillRef.current, to = thumbOutRef.current
    const count = countRef.current
    if (!wrap || !btn || !yf || !bf || !tf || !to || !count) return
    wrap.style.background = 'transparent'
    btn.style.background  = '#0057A8'
    btn.style.color       = 'white'
    yf.style.clipPath = 'circle(160% at 50% 50%)'
    bf.style.clipPath = 'circle(160% at 50% -5%)'
    tf.style.opacity  = '1'
    to.style.opacity  = '0'
    count.style.color = 'white'
    // dark mode: substitui overflow:hidden+border-radius por clip-path via inline style
    // para eliminar a franja branca de antialiasing no botão azul — sem tocar no CSS nem no GSAP
    if (localStorage.getItem('ih-dark-mode') === 'true') {
      btn.style.borderRadius = '0'
      btn.style.overflow     = 'visible'
      btn.style.clipPath     = 'inset(0 round 12px)'
    }
    gsap.set([btn, count], { clearProps: 'transform' })
    gsap.set(tf, { clearProps: 'all' }); tf.style.opacity = '1'
  }

  const applyIdleState = () => {
    const wrap = wrapRef.current, btn = btnRef.current
    const yf = yellowFillRef.current, bf = blueFillRef.current
    const tf = thumbFillRef.current, to = thumbOutRef.current
    const count = countRef.current
    if (!wrap || !btn || !yf || !bf || !tf || !to || !count) return
    wrap.style.background  = ''
    btn.style.background   = ''
    btn.style.color        = ''
    btn.style.borderRadius = ''
    btn.style.overflow     = ''
    btn.style.clipPath     = ''
    yf.style.clipPath = ''
    bf.style.clipPath = ''
    tf.style.opacity  = ''
    to.style.opacity  = ''
    count.style.color = ''
    gsap.set([btn, count], { clearProps: 'transform' })
    gsap.set(tf, { clearProps: 'all' })
    particleRefs.current.forEach(p => p && gsap.set(p, { clearProps: 'all' }))
  }

  useLayoutEffect(() => {
    isLikedRef.current = validated
    if (!validated) {
      // Forçado a idle (ex: dislike clicado externamente) — cancela animação em andamento
      tlRef.current?.kill()
      tlRef.current = null
      isAnimatingRef.current = false
      applyIdleState()
    } else if (!isAnimatingRef.current) {
      applyLikedState()
    }
    // se validated=true e animando: deixa a timeline terminar normalmente
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validated])

  const handleMouseEnter = () => {
    if (isLikedRef.current || disabled) return
    if (wrapRef.current) wrapRef.current.style.background = '#005EB5'
  }

  const handleMouseLeave = () => {
    if (isLikedRef.current) return
    if (wrapRef.current) wrapRef.current.style.background = ''
  }

  const handleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isAnimatingRef.current) return

    if (isLikedRef.current) {
      isLikedRef.current = false
      tlRef.current?.kill()
      tlRef.current = null
      applyIdleState()
      onToggle()
      return
    }

    isLikedRef.current = true
    isAnimatingRef.current = true

    const btn   = btnRef.current
    const yf    = yellowFillRef.current
    const bf    = blueFillRef.current
    const tf    = thumbFillRef.current
    const to    = thumbOutRef.current
    const count = countRef.current
    const parts = particleRefs.current.filter(Boolean) as HTMLDivElement[]

    if (!btn || !yf || !bf || !tf || !to || !count) {
      isAnimatingRef.current = false
      return
    }

    // Reset
    gsap.set(wrapRef.current!, { background: '#f1f5f9' })  // match button so border vanishes instantly
    gsap.set(btn,   { scale: 1 })
    gsap.set(yf,    { clipPath: 'circle(0% at 50% 50%)' })
    gsap.set(bf,    { clipPath: 'circle(0% at 50% -5%)' })
    gsap.set(tf,    { scale: 0, opacity: 0, transformOrigin: '50% 60%' })
    gsap.set(to,    { opacity: 1 })
    gsap.set(count, { y: 0, scale: 1, color: '' })
    gsap.set(parts, { x: 0, y: 0, scale: 0, opacity: 0 })

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false
        tlRef.current = null
        applyLikedState()
      },
    })
    tlRef.current = tl

    // Press
    tl.to(btn, { scale: 0.82, duration: 0.07, ease: 'power3.in' })

    // Instant state switch at peak of press
    tl.call(() => {
      wrapRef.current!.style.background = 'transparent'
      btn.style.background = '#0057A8'
      btn.style.color      = 'white'
      yf.style.clipPath    = 'circle(160% at 50% 50%)'
      bf.style.clipPath    = 'circle(160% at 50% -5%)'
      if (localStorage.getItem('ih-dark-mode') === 'true') {
        btn.style.borderRadius = '0'
        btn.style.overflow     = 'visible'
        btn.style.clipPath     = 'inset(0 round 12px)'
      }
    })

    // Spring back
    tl.to(btn, { scale: 1, duration: 0.7, ease: 'elastic.out(1.3, 0.3)' })

    // Mouse position relative to wrapper center — particles originate from click point
    const wrapRect = wrapRef.current!.getBoundingClientRect()
    const mx = e.clientX - (wrapRect.left + wrapRect.width  / 2)
    const my = e.clientY - (wrapRect.top  + wrapRect.height / 2)

    // Physics burst: X eases out (friction), Y arcs up then falls (gravity)
    parts.forEach((p, i) => {
      const angle   = PARTICLE_ANGLES[i]
      const dist    = 28 + Math.random() * 22
      const t       = 0.07 + i * 0.015
      const upKick  = 14 + Math.random() * 18   // vertical launch impulse
      const finalX  = mx + Math.cos(angle) * dist
      const finalY  = my + Math.sin(angle) * dist + upKick * 0.5  // gravity overshoot

      tl.set(p, { x: mx, y: my, scale: 0, opacity: 0 }, t)
      // X: smooth deceleration (friction)
      tl.to(p, { x: finalX, duration: 0.55, ease: 'power2.out' }, t)
      // Y: launch upward, then gravity pulls down past target
      tl.to(p, { y: my + Math.sin(angle) * dist * 0.35 - upKick, duration: 0.2, ease: 'power2.out' }, t)
      tl.to(p, { y: finalY, duration: 0.35, ease: 'power2.in' }, t + 0.2)
      // Visibility: pop in, then fade out
      tl.to(p, { scale: 1.1, opacity: 1, duration: 0.12, ease: 'power3.out' }, t)
      tl.to(p, { scale: 0, opacity: 0, duration: 0.35, ease: 'power2.in' }, t + 0.2)
    })

    // Count bounces up
    tl.fromTo(count,
      { y: 10, scale: 1.3 },
      { y: 0, scale: 1, color: 'white', duration: 0.6, ease: 'elastic.out(1.1, 0.4)' },
      0.12
    )

    // Thumb pops in with strong elastic
    tl.to(tf, { scale: 1, opacity: 1, duration: 0.7, ease: 'elastic.out(1.4, 0.28)' }, 0.16)
    tl.to(to, { opacity: 0, duration: 0.06 }, 0.17)

    onToggle()
  }

  useEffect(() => {
    return () => {
      tlRef.current?.kill()
      tlRef.current = null
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      className="ih-like-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
    >
      {/* Particles live in the wrapper so they can fly outside the button bounds */}
      {PARTICLE_ANGLES.map((_, i) => (
        <div
          key={i}
          className="ih-particle ih-particle--yellow"
          ref={el => { particleRefs.current[i] = el }}
        />
      ))}
      <button
        ref={btnRef}
        type="button"
        className="ih-like-btn"
        onClick={e => handleLike(e)}
        disabled={disabled}
        title={disabled ? 'Você não pode validar sua própria ideia' : validated ? 'Remover validação' : 'Validar ideia'}
      >
        <div ref={yellowFillRef} className="ih-yellow-fill" />
        <div ref={blueFillRef}   className="ih-blue-fill" />
        <svg className="ih-thumb-svg" width="18" height="18" viewBox="0 0 24 24">
          <path ref={thumbFillRef} className="ih-thumb-fill" d={THUMB_PATH} />
          <path ref={thumbOutRef}  className="ih-thumb-outline" d={THUMB_PATH} />
        </svg>
        <span ref={countRef} className="ih-like-count">{score}</span>
      </button>
    </div>
  )
}
