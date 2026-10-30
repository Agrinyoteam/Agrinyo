import { useEffect, useMemo, useRef, useState } from 'react'
import { getFiltres, getMachines, useDonnees } from '../api.js'
import { Apparition, Compteur } from '../components/Animations.jsx'
import { Visuel } from '../components/CarteMachine.jsx'
import { Marque } from '../components/EnTetePage.jsx'
import {
  IconeCalendrier, IconeCoche, IconeDemandes, IconeFleche, IconeLoupe, IconePhoto, IconeProfil, IconeRepere, IconeTracteur,
} from '../components/Icones.jsx'
import Lien from '../components/Lien.jsx'
import Navigation from '../components/Navigation.jsx'
import photoGrande from '../assets/bienvenue-tracteur-1280.jpg'
import photoPetite from '../assets/bienvenue-tracteur-800.jpg'
import { formaterPrix, iconeMachine } from '../format.js'
import { mouvementReduit, useParallaxe } from '../hooks.js'
import { naviguer } from '../routeur.js'

const ANNEE = new Date().getFullYear()
const INSCRIPTION_AGRICULTEUR = '/connexion?mode=inscription&role=AGRICULTEUR'
const INSCRIPTION_PROPRIETAIRE = '/connexion?mode=inscription&role=DETENTEUR'
const NOMBRE_SUGGESTIONS = 5
const INTERVALLE_SELECTION = 2000
const ECART_SELECTION = 14 // doit correspondre au gap de .selection__piste

const PROFILS = {
  agriculteur: {
    titre: 'Vous cherchez une machine',
    texte: 'Louez le tracteur, la batteuse ou la motopompe d’un voisin, au jour, à l’heure ou à l’hectare.',
    Icone: IconeLoupe,
    etapes: [
      { Icone: IconeLoupe, titre: 'Cherchez près de chez vous', texte: 'Tracteur, batteuse, motopompe… Filtrez par région et par type de machine.' },
      { Icone: IconeCalendrier, titre: 'Choisissez la date', texte: 'Jours, heures ou hectares : le prix estimé s’affiche avant d’envoyer.' },
      { Icone: IconeCoche, titre: 'Suivez la réponse', texte: 'Le propriétaire accepte ou refuse. Le statut s’affiche dans « Mes réservations ».' },
    ],
    lien: INSCRIPTION_AGRICULTEUR,
    libelleLien: 'Créer un compte agriculteur',
  },
  proprietaire: {
    titre: 'Vous avez une machine',
    texte: 'Votre machine dort entre deux saisons ? Louez-la aux agriculteurs de votre région.',
    Icone: IconeTracteur,
    etapes: [
      { Icone: IconePhoto, titre: 'Publiez votre machine', texte: 'Une photo, un prix par jour, par heure ou par hectare, et votre ville.' },
      { Icone: IconeDemandes, titre: 'Recevez les demandes', texte: 'Les agriculteurs de votre région vous envoient leurs dates.' },
      { Icone: IconeCoche, titre: 'Acceptez en un appui', texte: 'Les dates acceptées sont bloquées : jamais de double réservation.' },
    ],
    lien: INSCRIPTION_PROPRIETAIRE,
    libelleLien: 'Créer un compte propriétaire',
  },
}

const sansAccents = (texte) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Recherche du bandeau : suggestions en direct parmi les machines, Entrée ouvre la liste complète. */
function RechercheVivante({ machines }) {
  const [saisie, setSaisie] = useState('')
  const [ouverte, setOuverte] = useState(false)
  const [active, setActive] = useState(-1)

  const suggestions = useMemo(() => {
    const cherche = sansAccents(saisie.trim())
    if (!cherche) return []
    return machines
      .filter((m) => sansAccents(`${m.nom} ${m.type_machine_libelle} ${m.localisation} ${m.zone_libelle}`).includes(cherche))
      .slice(0, NOMBRE_SUGGESTIONS)
  }, [machines, saisie])

  const valider = (e) => {
    e.preventDefault()
    const choisie = suggestions[active]
    if (choisie) naviguer(`/machines#machine-${choisie.id}`)
    else if (saisie.trim()) naviguer(`/machines?q=${encodeURIComponent(saisie.trim())}`)
  }

  const clavier = (e) => {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOuverte(false)
    }
  }

  const listeVisible = ouverte && saisie.trim() !== ''
  return (
    <form className="vitrine__recherche" role="search" onSubmit={valider}>
      <IconeLoupe className="vitrine__loupe" />
      <input
        type="search"
        value={saisie}
        onChange={(e) => {
          setSaisie(e.target.value)
          setActive(-1)
          setOuverte(true)
        }}
        onFocus={() => setOuverte(true)}
        onBlur={() => setOuverte(false)}
        onKeyDown={clavier}
        placeholder="Tracteur à Kara, motopompe…"
        aria-label="Rechercher une machine, une ville ou une région"
        role="combobox"
        aria-expanded={listeVisible}
        aria-controls="suggestions-machines"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `suggestion-${suggestions[active]?.id}` : undefined}
        enterKeyHint="search"
        autoComplete="off"
      />
      <button type="submit" className="vitrine__chercher">Chercher</button>

      {listeVisible && (
        <ul id="suggestions-machines" className="trouvailles" role="listbox">
          {suggestions.length === 0 ? (
            <li className="trouvailles__vide">Aucune machine ne correspond. Appuyez sur Entrée pour chercher partout.</li>
          ) : (
            suggestions.map((m, i) => (
              <li
                key={m.id}
                id={`suggestion-${m.id}`}
                role="option"
                aria-selected={i === active}
                className="trouvaille"
                // mousedown : avant le blur du champ, sinon la liste se ferme sans naviguer.
                onMouseDown={(e) => {
                  e.preventDefault()
                  naviguer(`/machines#machine-${m.id}`)
                }}
              >
                <span className="trouvaille__icone" aria-hidden="true">{iconeMachine(m.type_machine)}</span>
                <span className="trouvaille__texte">
                  <strong>{m.nom}</strong>
                  <span>{m.localisation}, {m.zone_libelle}</span>
                </span>
                <span className="trouvaille__prix">{formaterPrix(m.prix)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </form>
  )
}

/** Carrousel de machines réelles, filtrable par catégorie, avec flèches. */
function Selection({ machines, types }) {
  const [type, setType] = useState('')
  const piste = useRef(null)
  const enPause = useRef(false)
  const visibles = type ? machines.filter((m) => m.type_machine === type) : machines
  // Seulement les catégories qui ont au moins une machine.
  const presents = types.filter((t) => machines.some((m) => m.type_machine === t.valeur))

  // Une carte à la fois ; arrivé au bout, on repart du début.
  const defiler = (sens) => {
    const el = piste.current
    if (!el) return
    const pas = (el.firstElementChild?.offsetWidth ?? el.clientWidth) + ECART_SELECTION
    const auBout = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    if (sens > 0 && auBout) el.scrollTo({ left: 0, behavior: 'smooth' })
    else if (sens < 0 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
    else el.scrollBy({ left: sens * pas, behavior: 'smooth' })
  }

  // Défilement automatique, suspendu tant que la personne survole, touche ou parcourt le carrousel au clavier.
  useEffect(() => {
    if (visibles.length < 2 || mouvementReduit()) return
    const minuteur = setInterval(() => {
      if (!enPause.current && document.visibilityState === 'visible') defiler(1)
    }, INTERVALLE_SELECTION)
    return () => clearInterval(minuteur)
  }, [visibles.length])

  const choisirType = (valeur) => {
    setType(valeur)
    piste.current?.scrollTo({ left: 0 })
  }
  const pause = () => { enPause.current = true }
  const reprise = () => { enPause.current = false }

  return (
    <section className="selection" aria-labelledby="titre-selection">
      <div className="selection__entete">
        <Apparition>
          <p className="surtitre">Disponibles maintenant</p>
          <h2 id="titre-selection" className="grand-titre">Réservez dès cette saison</h2>
        </Apparition>
        <div className="selection__fleches">
          <button type="button" className="rond" onClick={() => defiler(-1)} aria-label="Machines précédentes">
            <IconeFleche sens="gauche" />
          </button>
          <button type="button" className="rond rond--plein" onClick={() => defiler(1)} aria-label="Machines suivantes">
            <IconeFleche />
          </button>
        </div>
      </div>

      <div className="filtres-pastilles" role="group" aria-label="Filtrer par type de machine">
        <button type="button" className="pastille-filtre" aria-pressed={type === ''} onClick={() => choisirType('')}>
          Tout <span className="pastille-filtre__compte">{machines.length}</span>
        </button>
        {presents.map((t) => (
          <button key={t.valeur} type="button" className="pastille-filtre" aria-pressed={type === t.valeur} onClick={() => choisirType(t.valeur)}>
            {t.libelle}
          </button>
        ))}
      </div>

      <ul
        className="selection__piste"
        ref={piste}
        onPointerEnter={pause}
        onPointerLeave={reprise}
        onTouchStart={pause}
        onTouchEnd={reprise}
        onFocus={pause}
        onBlur={reprise}
      >
        {visibles.map((m, i) => (
          <li key={m.id} className={`selection__carte selection__carte--${i % 3}`}>
            <Lien vers={`/machines#machine-${m.id}`} className="selection__lien">
              <Visuel machine={m} className="selection__visuel" />
              <span className="selection__prix">{formaterPrix(m.prix)} / {m.unite_prix_libelle}</span>
              <span className="selection__legende">
                <span className="selection__numero">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{m.nom}</strong>
                  <span>{m.type_machine_libelle} · {m.localisation}</span>
                </span>
              </span>
            </Lien>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Page d'accueil des visiteurs (maquette « Bring fresh growth ») : présente AgriLink. */
export default function Bienvenue() {
  const machines = useDonnees('bienvenue-machines', (signal) => getMachines({}, signal))
  const filtres = useDonnees('filtres', getFiltres)
  const parallaxe = useParallaxe(0.12)

  // Chiffres réels, tirés du catalogue : rien d'inventé.
  const liste = useMemo(() => machines.donnees ?? [], [machines.donnees])
  const zones = filtres.donnees?.zones ?? []
  const types = filtres.donnees?.types ?? []
  const parZone = liste.reduce((compte, m) => ({ ...compte, [m.zone]: (compte[m.zone] ?? 0) + 1 }), {})
  const chiffres = [
    { Icone: IconeTracteur, valeur: liste.length, libelle: 'machines disponibles' },
    { Icone: IconeRepere, valeur: Object.keys(parZone).length, libelle: `régions couvertes sur ${zones.length || 5}` },
    { Icone: IconeCalendrier, valeur: new Set(liste.map((m) => m.type_machine)).size, libelle: 'types de machines' },
    { Icone: IconeProfil, valeur: new Set(liste.map((m) => m.proprietaire?.id)).size, libelle: 'propriétaires' },
  ]

  return (
    <div className="page bienvenue">
      <header className="vitrine">
        <div className="vitrine__barre">
          <Marque />
          <Navigation variante="haut" sansCompte />
          <div className="vitrine__compte">
            <Lien vers="/connexion?mode=connexion" className="vitrine__connexion">Se connecter</Lien>
            <Lien vers={INSCRIPTION_AGRICULTEUR} className="vitrine__inscription">Créer un compte</Lien>
          </div>
        </div>

        <span className="etincelle etincelle--1" aria-hidden="true">+</span>
        <span className="etincelle etincelle--2" aria-hidden="true">+</span>
        <span className="etincelle etincelle--3" aria-hidden="true">+</span>
        <span className="etincelle etincelle--4" aria-hidden="true">+</span>

        <div className="vitrine__texte">
          <p className="vitrine__surtitre">Location de machines agricoles · Togo</p>
          <h1 className="vitrine__titre">La bonne machine, au bon moment.</h1>
          <p className="vitrine__sous-titre">
            Réservez un tracteur près de chez vous, ou louez le vôtre quand il ne sert pas.
          </p>
          <RechercheVivante machines={liste} />
          <Lien vers="/machines" className="vitrine__action">
            Voir toutes les machines <IconeFleche width={18} height={18} />
          </Lien>
        </div>

        <div className="vitrine__photo">
          {/* Photo CC0 (Wikimedia Commons, Chandapiwa Malema) : voir src/assets/CREDITS.md. */}
          <img
            ref={parallaxe}
            src={photoGrande}
            srcSet={`${photoPetite} 800w, ${photoGrande} 1280w`}
            sizes="100vw"
            alt=""
            fetchPriority="high"
          />
        </div>
      </header>

      <main className="bienvenue__contenu">
        <ul className="indicateurs" aria-label="AgriLink en chiffres">
          {chiffres.map(({ Icone, valeur, libelle }, i) => (
            <Apparition as="li" key={libelle} className="indicateur" delai={i * 90}>
              <span className="indicateur__icone" aria-hidden="true"><Icone width={20} height={20} /></span>
              <strong className="indicateur__valeur">
                {machines.etat === 'pret' ? <Compteur valeur={valeur} /> : '–'}
              </strong>
              <span className="indicateur__libelle">{libelle}</span>
            </Apparition>
          ))}
        </ul>

        {/* « Comment ça marche » : les deux parcours côte à côte, bouton d'inscription au centre de chacun. */}
        <section className="fonctionnement" aria-labelledby="titre-fonctionnement">
          <Apparition className="fonctionnement__entete">
            <p className="surtitre">Comment ça marche</p>
            <h2 id="titre-fonctionnement" className="fonctionnement__titre">
              Au Togo, beaucoup de champs attendent une machine qui dort chez un voisin.
            </h2>
            <p className="fonctionnement__texte">AgriLink les met en relation, en trois étapes de chaque côté.</p>
          </Apparition>

          <div className="parcours-liste">
            {Object.entries(PROFILS).map(([cle, p], colonne) => (
              <Apparition as="article" key={cle} className={`parcours parcours--${cle}`} delai={colonne * 120} aria-labelledby={`parcours-${cle}`}>
                <div className="parcours__entete">
                  <span className="parcours__icone" aria-hidden="true"><p.Icone /></span>
                  <div>
                    <h3 id={`parcours-${cle}`} className="parcours__titre">{p.titre}</h3>
                    <p className="parcours__texte">{p.texte}</p>
                  </div>
                </div>
                <ol className="etapes">
                  {p.etapes.map(({ Icone, titre, texte }, i) => (
                    <li key={titre} className="etape">
                      <span className="etape__icone" aria-hidden="true"><Icone /></span>
                      <span className="etape__numero">{String(i + 1).padStart(2, '0')}</span>
                      <h4 className="etape__titre">{titre}</h4>
                      <p className="etape__texte">{texte}</p>
                    </li>
                  ))}
                </ol>
                <Lien vers={p.lien} className="parcours__lien">
                  {p.libelleLien} <IconeFleche width={18} height={18} />
                </Lien>
              </Apparition>
            ))}
          </div>
        </section>

        {liste.length > 0 && <Selection machines={liste} types={types} />}

        {zones.length > 0 && machines.etat === 'pret' && (
          <section className="regions" aria-labelledby="titre-regions">
            <Apparition>
              <p className="surtitre">Partout au Togo</p>
              <h2 id="titre-regions" className="grand-titre">Choisissez votre région</h2>
            </Apparition>
            <ul className="regions__liste">
              {zones.map((z, i) => (
                <Apparition as="li" key={z.valeur} delai={i * 70}>
                  <Lien vers={`/machines?zone=${z.valeur}`} className="region">
                    <IconeRepere className="region__repere" />
                    <span className="region__nom">{z.libelle}</span>
                    <span className="region__compte">
                      {parZone[z.valeur] ? `${parZone[z.valeur]} machine${parZone[z.valeur] > 1 ? 's' : ''}` : 'Bientôt'}
                    </span>
                    <IconeFleche className="region__fleche" width={18} height={18} />
                  </Lien>
                </Apparition>
              ))}
            </ul>
          </section>
        )}

      </main>

      {/* Photo pleine largeur jusqu'en bas de page ; le pied de page est posé dessus. */}
      <Apparition as="section" className="banniere" aria-labelledby="titre-banniere">
        <img src={photoGrande} srcSet={`${photoPetite} 800w, ${photoGrande} 1280w`} sizes="100vw" alt="" loading="lazy" className="banniere__fond" />
        <div className="banniere__texte">
          <h2 id="titre-banniere" className="banniere__titre">Prêt pour la prochaine saison ?</h2>
          <p>Créez votre compte avec votre numéro de téléphone. C’est rapide.</p>
          <div className="banniere__actions">
            <Lien vers={INSCRIPTION_AGRICULTEUR} className="banniere__bouton">Je suis agriculteur</Lien>
            <Lien vers={INSCRIPTION_PROPRIETAIRE} className="banniere__bouton banniere__bouton--contour">J’ai une machine</Lien>
          </div>
        </div>
        <p className="banniere__pied">© {ANNEE} AgriLink · Location de machines agricoles au Togo</p>
      </Apparition>

      <Navigation variante="bas" />
    </div>
  )
}
