# Audit des Sources d'Emploi (V2)

> Scope de cette passe : audit technique des 7 sources candidates IT / Remote. France Travail est déjà opérationnel et ne doit pas être modifié.
>
> Règle absolue suivie : sans contournement de CAPTCHA, Cloudflare, login, authentification utilisateur, rotation proxy, rate limit, ni mécanisme anti-automatisation. Privilégié l’ordre : API officielle > API publique/documentée > RSS/Atom > JSON public > données structurées publiques > HTML simple exploitable sans contournement.

## Audit multi-sources IT / Remote

| Source | Type d’accès | HTTP | Auth | Résultats | ID stable | URL stable | Remote fiable | Scope remote | Limites | Verdict |
|--------|--------------|------|------|-----------|-----------|------------|---------------|--------------|---------|---------|
| LesJeudis | HTML public + recherche par query | 200 | Aucune | Recherche publique accessible sur /jobs?query=…, mais pas de vrai API | Partiel | Partiel | Moyen | France / EU visible via HTML, mais pas fiable en structure | Pas de contrat API stable, structure JS/HTML dynamique, distant de l’API officielle | GO_WITH_LIMITS |
| Free-Work | HTML public + CMS | 200 (home), 404 sur endpoints de recherche | Aucune | Site accessible, mais contrat de recherche non standardisé et peu exploitable proprement | Incertain | Incertain | Faible | Pas de donnée remote robuste et lisible | Pas d’API publique claire ; HTML très dépendant de la page ; recherche peu fiable | GO_WITH_LIMITS |
| Welcome to the Jungle | HTML public + recherche | 200 | Aucune | Recherche publique sur /fr/jobs?query=… accessible ; structure HTML/JS exploitable sans contournement | Partiel | Partiel | Moyen | Localisation et remote souvent visibles dans le markup ou le payload de page | Aucun API public stable ; données dispersées ; qualité variable | GO_WITH_LIMITS |
| We Work Remotely | HTML public / anti-bot | 403 | Aucune | Blocage Cloudflare / challenge anti-bot direct | Non | Non | Très fort sur la source, mais impossible à récupérer sans contournement | remote-only source en théorie | Protection anti-bot active ; pas d’API publique stable ; NO_GO selon les règles | NO_GO |
| Remote OK | API JSON publique | 200 | Aucune | API publique accessible : /api et /api?tag=it | Oui | Oui | Oui | World wide / country / remote-specific tags | Attribution visible obligatoire : mention du site comme source | GO |
| Remotive | API JSON publique | 200 | Aucune | API publique /api/remote-jobs avec query param, exploitable dans les tests | Oui | Oui | Oui | remote-only source, sans localisation ou avec localisation explicite | API publique mais sans garantie de couverture exhaustive | GO |
| Arbeitnow | API JSON publique | 200 | Aucune | API publique /api/job-board-api + recherche param, résultats exploitables | Oui | Oui | Oui | Location + remote + tags visibles ; utile pour France / Europe / Worldwide | Quelques données bruitées, pas toujours toutes structurées | GO |

### Contrats observés concrets

- LesJeudis : page publique exploitable via /jobs?query=responsable+support+informatique ; HTML de page, pas de contrat stable ni API documentaire, mais aucune protection bloquante constatée.
- Free-Work : site public, mais recherches non normalisées et endpoints mal documentés ; pas d’API robuste ni de flux public stable.
- Welcome to the Jungle : page de recherche publique accessible ; héberge un HTML/JS lourd, mais pas de JSON API documentée et fiable.
- We Work Remotely : 403 Cloudflare sur le site et les pages de recherche ; interdit par la règle absolue.
- Remote OK : API publique accessible et documentée par le site lui-même ; les résultats retournent des objets JSON structurés, avec `id`, `slug`, `position`, `company`, `location`, `tags`, `salary`, etc.
- Remotive : API publique /api/remote-jobs avec support de `search` et `limit`, plausible d’intégration sans credentials.
- Arbeitnow : API publique /api/job-board-api ; résultats JSON structurés avec données de travail à distance et localisation.

### Points de contrôles techniques par source

#### LesJeudis
- Endpoint réel : https://www.lesjeudis.com/jobs?query=responsable+support+informatique
- Type : HTML public
- Auth : aucune
- Contrôle : page accessible, mais pas d’API documentée ; résultats qui ressemblent à du contenu HTML/JS
- ID stable : partiel, dépend du rendu HTML
- URL canonique : partiel, pas garantie stable pour toutes les pages
- Remote : intéressant mais pas fiable dans un champ structuré stable
- Verdict : GO_WITH_LIMITS

#### Free-Work
- Endpoint réel : page publique du site, pas d’API documentée claire ; seuls les pages HTML sont accessibles
- Type : HTML public / CMS
- Auth : aucune
- Contrôle : requêtes de recherche non standardisées, résultats peu fiables
- ID stable : non fiable
- URL canonique : insuffisante
- Remote : pas de preuve solide par champ structuré
- Verdict : GO_WITH_LIMITS

#### Welcome to the Jungle
- Endpoint réel : https://www.welcometothejungle.com/fr/jobs?query=responsable+support+informatique
- Type : HTML public
- Auth : aucune
- Contrôle : page accessible sans anti-bot apparent, mais le site n’expose pas d’API publique stable
- ID stable : partiel
- URL canonique : possible mais pas fiable sans normalisation
- Remote : observables dans le markup ou les labels du site, mais pas toujours normalisés
- Verdict : GO_WITH_LIMITS

#### We Work Remotely
- Endpoint réel : https://weworkremotely.com et pages de recherche
- Type : HTML public, mais protec anti-bot
- Auth : aucune
- Contrôle : HTTP 403 + Cloudflare challenge
- ID stable : non pertinent tant que l’accès est bloqué
- URL canonique : non exploitable proprement
- Remote : source remote-only, mais la règle absolue interdit le contournement
- Verdict : NO_GO

#### Remote OK
- Endpoint réel : https://remoteok.com/api et https://remoteok.com/api?tag=it
- Type : API JSON publique
- Auth : aucune
- Contrôle : HTTP 200, données retournées directement en JSON
- ID stable : oui, `id`/`slug`
- URL canonique : oui
- Titre : oui
- Entreprise : oui
- Localisation : oui
- Contrat : via tags / payload, pas toujours standardisé
- Temps de travail : parfois via tags / metadata
- Salaire : rare mais présent dans certains payloads
- Description : oui
- Date de publication : `last_updated`/timestamps disponibles
- Remote : source remote-only, donc `remote_evidence = remote_only_source` est légitime ; `remote_type = full_remote` si la source est exclusive remote
- Limites : attribution visible obligatoire, logiquement on doit citer la source et conserver le backlink
- Verdict : GO

#### Remotive
- Endpoint réel : https://remotive.com/api/remote-jobs?search=responsable%20support%20informatique&limit=3
- Type : API JSON publique
- Auth : aucune
- Contrôle : HTTP 200, réponses JSON claires sans secret ni authentification
- ID stable : oui
- URL canonique : oui
- Titre : oui
- Entreprise : oui
- Localisation : oui, y compris systèmes de géolocalisation et remote
- Contrat : parfois explicite, sinon indirect
- Temps de travail : variable selon payload
- Salaire : éventuellement présent
- Description : oui
- Date de publication : observable
- Remote : source remote-only par principe, donc `remote_evidence = remote_only_source` est légitime
- Limites : couverture API limitée par le service et pas forcément diffuse pour chaque catégorie, mais la méthode d’intégration est propre
- Verdict : GO

#### Arbeitnow
- Endpoint réel : https://www.arbeitnow.com/api/job-board-api et /api/job-board-api?search=responsable%20support%20informatique
- Type : API JSON publique
- Auth : aucune
- Contrôle : HTTP 200
- ID stable : oui (`slug`/identifiant de travail)
- URL canonique : oui
- Titre : oui
- Entreprise : oui
- Localisation : oui, souvent ville/pays ou remote
- Contrat : parfois présent dans les tags ou le payload
- Temps de travail : variable, souvent dans les métadonnées ou non disponible
- Salaire : rarement structuré
- Description : oui, HTML dans le payload
- Date de publication : observable dans le payload
- Remote : `remote`/`tags`/`location` utiles pour déterminer `full_remote`, `hybrid` ou `unknown`
- Limites : données de source parfois moins homogènes, mais exploitable proprement
- Verdict : GO

## Recommandation d’intégration

### Groupe A — Intégration prioritaire
- Remote OK
- Remotive
- Arbeitnow

Ces 3 sources exposent une vraie API publique ou un flux JSON exploitable sans protection ni credentials. Elles sont les meilleures candidates pour le prochain lot d’intégration. Elles permettent de produire de la donnée fiable pour remote / location / tags.

### Groupe B — Intégration avec limites
- LesJeudis
- Free-Work
- Welcome to the Jungle

Ces sources sont accessibles sans contournement, mais elles n’exposent pas un contrat public propre et stable. Les intégrations doivent passer par de l’HTML/markup public avec une forte normalisation et un traitement des champs de remote. Elles restent utilisables, mais demandent plus de maintenance.

### Groupe C — À écarter pour le moment
- We Work Remotely

Le site est directement protégé par Cloudflare / anti-bot et répond 403. La règle absolue interdit le contournement.

## Full remote : ce qui peut être certifié réellement

### Sources qui peuvent certifier un `full_remote` avec preuve forte
- Remote OK : source remote-only ; `remote_evidence = remote_only_source`
- Remotive : source remote-only ; `remote_evidence = remote_only_source`
- Arbeitnow : si la source expose explicitement `remote` ou `location` : `remote`, `hybrid`, `country_list` ; `full_remote` ne peut être appliqué que sur preuve explicite, pas sur le simple mot “remote” dans la description
- We Work Remotely : source remote-only, mais NO_GO pour cette passe à cause du blocage anti-bot

### Sources qui ne permettent pas de certifier `full_remote` de manière robuste
- LesJeudis
- Free-Work
- Welcome to the Jungle

Ces sources peuvent exposer remote / hybrid / onsite dans le markup, mais pas avec une preuve structurée suffisamment stable pour garantir `full_remote` sans ambiguïté.

### Règle de non-overclassification
Une offre ne doit être classée `full_remote` que si la source fournit une preuve forte :
- champ structuré explicite ;
- label explicite de la source ;
- source exclusivement remote.

Le mot “remote”, “teletravail”, “home office” dans la description seul ne suffit pas. En cas d’ambiguïté, la valeur doit rester `unknown` ou être `hybrid` si la source le précise explicitement.

## Répartition des verdicts

- GO : 3
- GO_WITH_LIMITS : 3
- GO_WITH_CREDENTIALS : 0
- NO_GO : 1
- NOT_TESTED : 0

## Credentials éventuellement nécessaires

Aucune des 7 sources auditées n’exige de credentials pour un accès public de lecture. Seules les sources à forte protection ou à API fermée nécessiteraient une étape d’enregistrement, et aucun cas de ce type n’a été trouvé à travers les endpoints publics testés.

## Priorité de mise en œuvre du prochain lot

1. Remote OK
2. Remotive
3. Arbeitnow
4. LesJeudis
5. Welcome to the Jungle
6. Free-Work
7. We Work Remotely (écarté pour cette passe)

Le prochain lot d’intégration doit prioriser les sources qui exposent des flux JSON publics propres et stables, puis seulement ensuite les sources HTML/markup avec plus de risques et de maintenance.
