# Plan d'Implémentation — Pipeline CI/CD ClubManager

## Vue d'ensemble

Ce plan convertit le design technique du pipeline CI/CD en tâches de code incrémentales. Chaque tâche s'appuie sur la précédente et aboutit à un pipeline GitHub Actions complet couvrant : lint, tests unitaires (Jest + fast-check), tests d'intégration (Supertest + PostgreSQL), tests de non-régression, build Docker, déploiement ECS Fargate avec rollback automatique, et authentification AWS via OIDC.

L'application cible est ClubManager v3.1.4 (Node.js 22 / Express 5), dont la logique métier est concentrée dans `services/ClubService.js`. Les services à extraire et tester sont : MemberService, PaymentService, TeamService, EventService, FacilityService, ReportService.

## Tâches

- [x] 1. Configurer l'outillage de test et la structure du projet
  - Installer les dépendances de développement : `jest`, `jest-junit`, `@jest/globals`, `fast-check`, `supertest`, `eslint`, `eslint-plugin-security`
  - Créer le fichier `jest.config.js` avec la configuration suivante :
    - `testMatch: ['tests/**/*.test.js']` (correspond à la structure réelle `tests/unit/`, `tests/integration/`, `tests/non-regression/`)
    - `setupFilesAfterEnv: ['./tests/setup.js']` (clé correcte — `setupFilesAfterFramework` n'existe pas dans Jest)
    - Couverture ≥ 70%, reporters JUnit (`jest-junit`, output dans `reports/junit.xml`)
  - Créer le fichier `.eslintrc.js` avec `eslint:recommended` + `plugin:security/recommended` et les règles bloquantes (`no-eval`, `security/detect-sql-injection`, `security/detect-eval-with-expression`)
  - Créer la structure de répertoires `tests/unit/`, `tests/integration/`, `tests/non-regression/`
  - Créer le fichier `tests/setup.js` (configuration globale Jest : timeout, variables d'environnement de test)
  - Mettre à jour `package.json` : ajouter les scripts `"test": "jest --runInBand"`, `"test:unit": "jest tests/unit"`, `"test:integration": "jest tests/integration"`, `"test:nr": "jest tests/non-regression"`, `"lint": "eslint . --ext .js"`
  - _Exigences : 2.1, 3.1, 3.4_

- [x] 2. Extraire et implémenter les services métier testables
  - [x] 2.1 Créer `services/MemberService.js` en extrayant les fonctions membres de `ClubService.js`
    - Extraire : `getAllMembers`, `getMemberById`, `createMember`, `updateMember`, `deleteMember`, `generateMemberNumber`
    - Ajouter la fonction pure `isMembershipExpired(renewalDate)` retournant `true` si `renewalDate < Date.now()`
    - Conserver la dépendance sur `../database` via `require` (sera mockée dans les tests)
    - _Exigences : 3.7_

  - [x] 2.2 Créer `services/PaymentService.js` en extrayant les fonctions paiement de `ClubService.js`
    - Extraire : `recordPayment`, `getOverduePayments`, `getPendingPayments`, `getPayments`
    - _Exigences : 3.8_

  - [x] 2.3 Créer `services/EventService.js` en extrayant les fonctions événement de `ClubService.js`
    - Extraire : `getEvents`, `createEvent`, `recordMatchResult`
    - Exposer `computeMatchResult(homeScore, awayScore)` comme fonction pure (sans accès BDD) retournant `'win'`, `'loss'` ou `'draw'`
    - _Exigences : 3.9_

  - [x] 2.4 Créer `services/FacilityService.js` en extrayant les fonctions installation de `ClubService.js`
    - Extraire : `getFacilities`, `checkFacilityAvailability`, `getBookings`
    - Exposer `hasTimeOverlap(start1, end1, start2, end2)` comme fonction pure retournant `true` si chevauchement
    - _Exigences : 3.10_

  - [x] 2.5 Créer `services/TeamService.js` et `services/ReportService.js`
    - Extraire les fonctions équipe (`getAllTeams`, `getTeamById`, `createTeam`, `updateTeam`) dans `TeamService.js`
    - Extraire les fonctions rapport (`getMembershipReport`, `getFinancialReport`, `getDashboardStats`) dans `ReportService.js`
    - _Exigences : 3.2_

- [x] 3. Écrire les tests unitaires pour MemberService
  - [x] 3.1 Créer `tests/unit/MemberService.test.js` avec mocks Jest
    - Mocker `../database` avec `jest.mock('../database')` pour isoler tous les tests de la BDD
    - Tester `getAllMembers` : retourne un tableau filtrable par `status` et `sport` (cas nominal, filtre vide, filtre combiné)
    - Tester `getMemberById` : retourne `null` pour un identifiant inexistant
    - Tester `createMember` : génère un numéro de membre au format `M00001+` (regex `/^M\d{5}$/`)
    - Tester `createMember` : le champ `password_hash` est un hash bcrypt (ne contient pas le mot de passe en clair)
    - Tester `isMembershipExpired` : retourne `true` pour une date passée, `false` pour une date future
    - _Exigences : 3.3, 3.7_

  - [x] 3.2 Écrire le test de propriété pour le filtrage des membres (Propriété 1)
    - **Propriété 1 : Filtrage des membres**
    - **Valide : Exigences 3.7**
    - Utiliser `fc.array(fc.record({status: fc.constantFrom('active','inactive'), sport: fc.string()}))` pour générer des jeux de membres
    - Vérifier que `getAllMembers({status})` ne retourne jamais de membre dont le statut diffère du filtre

  - [x] 3.3 Écrire le test de propriété pour l'expiration d'adhésion (Propriété 2)
    - **Propriété 2 : Expiration d'adhésion**
    - **Valide : Exigences 3.7**
    - Utiliser `fc.date()` pour générer des dates passées et futures
    - Vérifier que `isMembershipExpired(date)` retourne `true` ↔ `date < Date.now()`

- [x] 4. Écrire les tests unitaires pour PaymentService
  - [x] 4.1 Créer `tests/unit/PaymentService.test.js` avec mocks Jest
    - Mocker `../database` avec `jest.mock('../database')`
    - Tester `recordPayment` avec un `member_id` inexistant : doit lever une erreur `'Membre introuvable'`
    - Tester `getOverduePayments` : retourne uniquement les paiements `status='pending'` avec `due_date < today`
    - _Exigences : 3.3, 3.8_

  - [x] 4.2 Écrire le test de propriété pour les paiements en retard (Propriété 3)
    - **Propriété 3 : Paiements en retard**
    - **Valide : Exigences 3.8**
    - Utiliser `fc.array(fc.record({status: fc.constantFrom('pending','paid'), due_date: fc.date()}))` pour générer des jeux de paiements
    - Vérifier que le résultat ne contient jamais de paiement `paid` ni de paiement dont `due_date >= today`

- [x] 5. Écrire les tests unitaires pour EventService et FacilityService
  - [x] 5.1 Créer `tests/unit/EventService.test.js`
    - Mocker `../database` avec `jest.mock('../database')`
    - Tester `computeMatchResult(homeScore, awayScore)` : score domicile supérieur → `'win'`, inférieur → `'loss'`, égal → `'draw'`
    - _Exigences : 3.3, 3.9_

  - [x] 5.2 Écrire le test de propriété pour le résultat de match (Propriété 4)
    - **Propriété 4 : Résultat de match**
    - **Valide : Exigences 3.9**
    - Utiliser `fc.nat()` pour générer des couples `(scoreHome, scoreAway)` non-négatifs
    - Vérifier que `computeMatchResult` retourne exactement `'win'`, `'loss'` ou `'draw'` selon la comparaison des scores
    - Configurer `{ numRuns: 100 }`

  - [x] 5.3 Créer `tests/unit/FacilityService.test.js`
    - Mocker `../database` avec `jest.mock('../database')`
    - Tester `checkFacilityAvailability` : retourne `false` en cas de conflit de réservation, `true` en l'absence de conflit
    - Tester `hasTimeOverlap` : cas limites (plages adjacentes, plages identiques, plages disjointes)
    - _Exigences : 3.3, 3.10_

  - [x] 5.4 Écrire le test de propriété pour la disponibilité d'installation (Propriété 5)
    - **Propriété 5 : Disponibilité d'installation**
    - **Valide : Exigences 3.10**
    - Utiliser `fc.date()` pour générer des paires de plages horaires
    - Vérifier que `hasTimeOverlap(d1, f1, d2, f2)` retourne `true` ↔ `d1 < f2 && d2 < f1`
    - Configurer `{ numRuns: 100 }`

- [x] 6. Écrire les tests unitaires pour TeamService et ReportService
  - [x] 6.1 Créer `tests/unit/TeamService.test.js`
    - Mocker `../database` avec `jest.mock('../database')`
    - Tester `getAllTeams` : retourne un tableau (cas nominal avec mock retournant des données)
    - Tester `getTeamById` : retourne `null` pour un identifiant inexistant
    - _Exigences : 3.2, 3.3_

  - [x] 6.2 Créer `tests/unit/ReportService.test.js`
    - Mocker `../database` avec `jest.mock('../database')`
    - Tester `getFinancialReport` : utilise des requêtes paramétrées (le paramètre `year` est passé via `parseInt`, pas par concaténation)
    - _Exigences : 3.2, 3.3_

- [x] 7. Configurer le service container PostgreSQL et les migrations de test
  - **Note : L'application utilise MySQL 8.0 en production (driver `mysql2`). PostgreSQL est utilisé ici uniquement pour les tests d'intégration via service container GitHub Actions (plus léger, mieux supporté dans cet environnement). Les requêtes SQL paramétrées de l'application sont compatibles entre les deux moteurs pour les cas testés. Voir décision de design §Décisions de design notables.**
  - Créer le fichier `tests/integration/setup-db.sql` avec le schéma minimal (tables `members`, `payments`, `teams`, `events`, `facilities`, `bookings`, `event_participants`) compatible PostgreSQL
  - Créer le fichier `tests/integration/seed.sql` avec des données de test (1 admin, 2 membres, 1 équipe, 2 paiements dont 1 en retard)
  - Créer le fichier `tests/integration/db-helper.js` : helper qui applique les migrations et le seed via `pg` (driver PostgreSQL) avant les tests
  - Ajouter `pg` aux dépendances de développement (`npm install --save-dev pg`)
  - _Exigences : 4.1, 4.2, 4.3_

- [x] 8. Écrire les tests d'intégration d'authentification et d'autorisation
  - [x] 8.1 Créer `tests/integration/auth.test.js` avec Supertest
    - Importer l'application Express depuis `server.js` (ou créer un `app.js` exportable si nécessaire)
    - Tester POST `/login` avec identifiants valides : redirection 302 vers `/dashboard`
    - Tester POST `/login` avec identifiants invalides : statut 200 avec message d'erreur
    - Tester POST `/login` avec injection SQL (`' OR 1=1 --`) : accès refusé (pas de redirection vers dashboard)
    - _Exigences : 4.4_

  - [x] 8.2 Écrire le test de propriété pour la prévention des injections SQL (Propriété 6)
    - **Propriété 6 : Prévention des injections SQL**
    - **Valide : Exigences 4.4, 4.7**
    - Utiliser `fc.constantFrom("' OR 1=1 --", "'; DROP TABLE members; --", "UNION SELECT * FROM members --")` pour générer des payloads d'injection
    - Vérifier que POST `/login` avec ces payloads retourne toujours un statut ≠ 302 (pas de redirection vers dashboard)

  - [x] 8.3 Créer `tests/integration/security.test.js`
    - Tester GET `/members` sans session : redirection 302 vers `/login`
    - Tester POST `/members` avec rôle `member` : statut 403
    - Tester POST `/members` avec rôle `admin` : statut 200 ou 302
    - _Exigences : 4.5_

  - [x] 8.4 Écrire le test de propriété pour le contrôle d'accès par rôle (Propriété 7)
    - **Propriété 7 : Contrôle d'accès par rôle**
    - **Valide : Exigences 4.5**
    - Utiliser `fc.constantFrom('/members', '/payments', '/teams', '/events', '/reports')` pour générer des routes protégées
    - Vérifier que toute requête avec une session `role='member'` vers ces routes retourne 403 ou 302 (jamais 200 pour les actions admin)

- [x] 9. Écrire les tests d'intégration membres et paiements
  - [x] 9.1 Créer `tests/integration/members.test.js`
    - Tester GET `/members` avec session admin : statut 200 avec liste des membres
    - Tester POST `/members` avec données valides : création réussie et redirection vers le détail
    - Tester GET `/members/export/csv` : statut 200 avec `Content-Type: text/csv`
    - Tester POST `/members` avec champs obligatoires vides : erreur de validation
    - _Exigences : 4.6, 4.8_

  - [x] 9.2 Créer `tests/integration/payments.test.js`
    - Tester l'enregistrement d'un paiement avec un `member_id` inexistant : erreur métier
    - Tester l'enregistrement d'un paiement avec un montant négatif : erreur de validation
    - Tester la recherche avec `'; DROP TABLE members; --` : données intactes après la requête
    - _Exigences : 4.7, 4.8_

  - [x] 9.3 Écrire le test de propriété pour la validation des données à la création (Propriété 8)
    - **Propriété 8 : Validation des données à la création**
    - **Valide : Exigences 4.8**
    - Utiliser `fc.record({email: fc.string(), first_name: fc.constant('')})` pour générer des objets avec champs invalides
    - Vérifier que POST `/members` avec ces données ne retourne jamais 200/302 (toujours une erreur de validation)

- [x] 10. Écrire les tests de non-régression (workflows end-to-end)
  - [x] 10.1 Créer `tests/non-regression/member-lifecycle.test.js`
    - Implémenter le workflow complet : création d'un membre → consultation → modification → renouvellement → suppression
    - Utiliser `process.env.ALB_URL || 'http://localhost:3000'` comme base URL (injectable pour les tests post-déploiement)
    - Vérifier que chaque étape retourne le statut HTTP attendu
    - _Exigences : 5.1, 5.4_

  - [x] 10.2 Créer `tests/non-regression/payment-workflow.test.js`
    - Implémenter le workflow : création d'un paiement → consultation → mise à jour du statut → export CSV
    - Vérifier la cohérence des données entre chaque étape
    - _Exigences : 5.2, 5.4_

  - [x] 10.3 Créer `tests/non-regression/event-booking.test.js`
    - Implémenter le workflow : création d'un événement avec installation → consultation de la réservation → annulation
    - Vérifier que l'annulation libère bien la disponibilité de l'installation
    - _Exigences : 5.3, 5.4_

- [x] 11. Créer le workflow GitHub Actions CI (`ci.yml`)
  - [x] 11.1 Créer `.github/workflows/ci.yml` avec les déclencheurs `push` (toutes branches) et `pull_request` vers `main`
    - Définir le job `lint` : checkout, `npm ci`, `npm run lint`, `npm audit --audit-level=critical`, scan de secrets avec `truffleHog` (action `trufflesecurity/trufflehog@main`)
    - _Exigences : 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 8.3_

  - [x] 11.2 Ajouter le job `unit-tests` dans `ci.yml`
    - Déclarer `needs: [lint]`
    - Exécuter `npm ci` puis `npm run test:unit -- --coverage`
    - Uploader le rapport de couverture HTML comme artifact `coverage-report` (rétention 30 jours)
    - Uploader le rapport JUnit XML comme artifact `unit-test-results` (rétention 30 jours)
    - _Exigences : 1.4, 3.1, 3.4, 3.5, 3.6, 9.4_

  - [x] 11.3 Ajouter le job `integration-tests` dans `ci.yml`
    - Déclarer `needs: [unit-tests]`
    - Configurer le service container PostgreSQL 15 avec health check (`pg_isready`, interval 10s, timeout 5s, retries 5)
    - **Note : L'application utilise MySQL en production mais PostgreSQL est utilisé ici pour les tests d'intégration (service container GitHub Actions). Les requêtes paramétrées sont compatibles entre les deux moteurs.**
    - Appliquer les migrations (`psql -f tests/integration/setup-db.sql`) et le seed avant les tests
    - Exécuter `npm run test:integration`
    - Uploader le rapport JUnit XML comme artifact `integration-test-results` (rétention 30 jours)
    - _Exigences : 1.4, 4.1, 4.2, 4.3, 9.4_

  - [x] 11.4 Ajouter le job `non-regression-tests` dans `ci.yml`
    - Déclarer `needs: [integration-tests]`
    - Configurer un timeout de 10 minutes (`timeout-minutes: 10`)
    - Exécuter `npm run test:nr` avec le service container PostgreSQL
    - Uploader le rapport JUnit XML comme artifact `non-regression-results` (rétention 30 jours)
    - _Exigences : 1.4, 5.6, 9.4_

- [x] 12. Créer le workflow GitHub Actions CD (`cd.yml`)
  - [x] 12.1 Créer `.github/workflows/cd.yml` avec le déclencheur `push` sur `main`
    - Définir le job `build-push-ecr` avec `needs: []` (déclenché après succès CI via `workflow_run` ou jobs enchaînés)
    - Configurer l'authentification AWS OIDC : `aws-actions/configure-aws-credentials@v4` avec `role-to-assume: ${{ secrets.AWS_ROLE_ARN }}`
    - Ajouter le login ECR : `aws-actions/amazon-ecr-login@v2`
    - Builder l'image Docker avec le tag `${{ env.ECR_REGISTRY }}/${{ vars.ECR_REPOSITORY }}:${{ github.sha | slice(0,7) }}` et `:latest`
    - Pousser l'image vers ECR et déclencher le scan ECR (warning si vulnérabilités critiques, sans bloquer)
    - _Exigences : 1.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1, 8.4, 8.5_

  - [x] 12.2 Écrire le test unitaire pour le tagging d'image Docker (Propriété 9)
    - **Propriété 9 : Tagging d'image Docker**
    - **Valide : Exigences 6.2**
    - Créer `tests/unit/docker-tag.test.js` avec une fonction utilitaire `getShortSha(sha)` extraite du workflow
    - Utiliser `fc.hexaString({minLength: 40, maxLength: 40})` pour générer des SHA Git complets
    - Vérifier que `getShortSha` produit exactement 7 caractères hexadécimaux sans caractères parasites
    - _Exigences : 6.2_

  - [x] 12.3 Ajouter le job `deploy-dev` dans `cd.yml`
    - Déclarer `needs: [build-push-ecr]` et `environment: dev`
    - Récupérer la Task Definition ECS courante (`aws ecs describe-task-definition`)
    - Mettre à jour l'URI d'image dans la Task Definition (`aws-actions/amazon-ecs-render-task-definition@v1`)
    - Déployer avec `aws-actions/amazon-ecs-deploy-task-definition@v2` (`wait-for-service-stability: true`, timeout 10 min)
    - Implémenter le rollback automatique : en cas d'échec, récupérer l'ARN de la Task Definition précédente et appeler `aws ecs update-service --task-definition {ARN_PRÉCÉDENT}`
    - Exécuter les tests de non-régression post-déploiement contre `${{ vars.ALB_URL }}`
    - Logger l'URI de l'image déployée et le SHA du commit
    - _Exigences : 1.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 12.4 Ajouter le job `deploy-prod` dans `cd.yml`
    - Déclarer `needs: [deploy-dev]` et `environment: prod` (approbation manuelle requise via GitHub Environments)
    - Mêmes étapes que `deploy-dev` avec les variables de l'environnement `prod` (`ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`, `ECS_TASK_DEFINITION`, `ALB_URL`)
    - Exécuter les tests de non-régression complets post-déploiement contre l'URL ALB prod
    - _Exigences : 1.3, 5.4, 5.5, 5.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 10.1, 10.2, 10.4_

- [ ] 13. Créer le rôle IAM OIDC pour GitHub Actions dans Terraform
  - Créer le fichier `infra/iam_github_actions.tf` avec :
    - La ressource `aws_iam_openid_connect_provider` pour `https://token.actions.githubusercontent.com`
    - Le rôle `aws_iam_role` assumable via OIDC avec condition `StringLike` sur `token.actions.githubusercontent.com:sub` = `repo:{ORG}/{REPO}:*`
    - La politique inline avec les permissions minimales : ECR (GetAuthorizationToken, BatchCheckLayerAvailability, PutImage, InitiateLayerUpload, UploadLayerPart, CompleteLayerUpload, DescribeImages), ECS (UpdateService, RegisterTaskDefinition, DescribeServices, DescribeTaskDefinition, ListTaskDefinitions), IAM (PassRole limité aux rôles ECS), CloudWatch Logs (PutLogEvents, CreateLogStream)
    - L'output `github_actions_role_arn` pour récupérer l'ARN à configurer dans les secrets GitHub
  - _Exigences : 8.1, 8.5_

- [ ] 14. Créer la documentation de configuration des GitHub Environments
  - Créer le fichier `docs/github-environments-setup.md` documentant la procédure de configuration manuelle des GitHub Environments
  - Documenter la configuration de l'environnement `dev` : variables `ECR_REPOSITORY=nodejs-app-dev`, `ECS_CLUSTER=nodejs-app-dev-cluster`, `ECS_SERVICE=nodejs-app-dev-service`, `ECS_TASK_DEFINITION=nodejs-app-dev`, `ALB_URL`, `AWS_REGION=us-east-1`
  - Documenter la configuration de l'environnement `prod` : mêmes variables avec suffixe `-prod`, protection rules (approbation manuelle requise, liste des approbateurs autorisés)
  - Documenter les secrets à configurer au niveau dépôt : `AWS_ROLE_ARN` (ARN du rôle IAM OIDC), `TEST_DB_PASSWORD`
  - Documenter les notifications GitHub Actions : configuration des webhooks Slack/email optionnels pour les échecs sur `main` et les succès de déploiement
  - _Exigences : 8.2, 9.1, 9.2, 10.1, 10.2, 10.3_

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP plus rapide
- Chaque tâche référence les exigences spécifiques pour la traçabilité
- Les tests de propriété utilisent `fast-check` avec `{ numRuns: 100 }` minimum
- Les tests unitaires s'exécutent sans aucune connexion BDD (mocks Jest uniquement)
- **Discordance MySQL/PostgreSQL** : L'application utilise MySQL 8.0 en production (driver `mysql2`, RDS MySQL). Les tests d'intégration utilisent PostgreSQL 15 via service container GitHub Actions (plus léger, mieux supporté). Les requêtes SQL paramétrées sont compatibles entre les deux moteurs pour les cas testés. Cette décision est documentée dans le design (§Décisions de design notables, point 1).
- Le rollback ECS est automatique : en cas d'échec, la Task Definition précédente est réactivée
- L'authentification AWS utilise OIDC exclusivement — aucune clé d'accès de longue durée dans les secrets GitHub
- La tâche 12.2 (test de propriété pour le tagging Docker) est **obligatoire** car elle valide une fonction utilitaire concrète (`getShortSha`) directement testable en isolation
