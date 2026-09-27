# Audit des Sources d'Emploi (V2)

| Source | Méthode | Test réel | Verdict | Activée par défaut |
|--------|---------|-----------|---------|-------------------|
| Adzuna | API REST | Non (sans credentials) | GO_WITH_CREDENTIALS — NOT LIVE TESTED | Oui |
| France Travail | API OAuth2 | Non (sans credentials) | GO_WITH_CREDENTIALS — NOT LIVE TESTED | Non |
| HelloWork | HTML Scraping (JSON-LD) | Non (sandbox restrictif) | UNVERIFIED | Oui |
| Apec | HTML Scraping | Non (sandbox restrictif) | UNVERIFIED | Oui |
| Indeed / LinkedIn | Scraper | Non | NO_GO | Non |

Notes:
- Les verdicts UNVERIFIED et NOT LIVE TESTED reflètent l'impossibilité technique d'exécuter des requêtes réseau réelles vers ces services dans l'environnement de génération de code.
- Le code est structurellement prêt, respecte les contraintes anti-bot (User-Agent honnête, pas de contournement) et échoue gracieusement sans credentials.
