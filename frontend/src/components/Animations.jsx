import { useEffect, useState } from 'react'
import { mouvementReduit, useVisible } from '../hooks.js'

/** Bloc qui glisse doucement en place quand on arrive dessus. */
export function Apparition({ as: Balise = 'div', className = '', delai = 0, children, ...reste }) {
  const [ref, visible] = useVisible(0.15)
  return (
    <Balise
      ref={ref}
      className={`apparition${visible ? ' apparition--visible' : ''} ${className}`}
      style={delai ? { transitionDelay: `${delai}ms` } : undefined}
      {...reste}
    >
      {children}
    </Balise>
  )
}

/** Nombre qui monte de 0 à sa valeur la première fois qu'il apparaît. */
export function Compteur({ valeur, duree = 1200 }) {
  const [ref, visible] = useVisible(0.5)
  const [affiche, setAffiche] = useState(0)
  const immediat = mouvementReduit()
  useEffect(() => {
    if (!visible || immediat) return
    let image
    const debut = performance.now()
    const avancer = (maintenant) => {
      const t = Math.min((maintenant - debut) / duree, 1)
      setAffiche(Math.round(valeur * (1 - (1 - t) ** 3)))
      if (t < 1) image = requestAnimationFrame(avancer)
    }
    image = requestAnimationFrame(avancer)
    return () => cancelAnimationFrame(image)
  }, [visible, immediat, valeur, duree])
  return <span ref={ref}>{immediat ? valeur : affiche}</span>
}
