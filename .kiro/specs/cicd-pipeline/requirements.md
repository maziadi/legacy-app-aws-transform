# Document d'Exigences — Pipeline CI/CD ClubManager

## Introduction

Ce document définit les exigences pour la mise en place d'un pipeline CI/CD complet pour l'application ClubManager (Club Manager v3.1.4). L'application est une application Node.js/Express gérant les membres, équipes, événements, paiements et installations d'un club sportif. Elle est déployée sur AWS via ECS Fargate, avec une base de données PostgreSQL sur RDS, un registre d'images sur ECR et un load balancer ALB.

Le pipeline CI/CD remplace le déploiement manuel par `rsync` (scripts/deploy.sh) et introduit une suite de tests automatisés (unitaires, d'intégration, de non-régression) ainsi qu'un déploiement continu vers AWS.

## Glossaire

- **Pipeline** : Séquence automatisée d'étapes de build, test et déploiement déclenchée par un événement Git, implémentée via GitHub Actions Workflows (fichiers `.github/workflows/`)
- **CI (Continuous Integration)** : Processus d'intégration automatique du code incluant build, lint et tests
- **CD (Continuous Deployment)** : Processus de déploiement automatique vers un environnement cible après validation CI
- **ECR** : Amazon Elastic Container Registry — registre Docker hébergé sur AWS
- **ECS** : Amazon Elastic Container Service — service d'orchestration de conteneurs AWS (Fargate)
- **ALB** : Application Load Balancer — répartiteur de charge AWS devant le service ECS
- **RDS** : Amazon Relational Database Service — base de données PostgreSQL managée AWS
- **Test_Unitaire** : Test isolé d'une fonction ou d'un module sans dépendances externes
- **Test_Integration** : Test vérifiant l'interaction entre plusieurs composants (routes Express + base de données)
- **Test_Non_Regression** : Test vérifiant que les fonctionnalités existantes ne sont pas dégradées après un changement
- **Health_Check** : Vérification de l'état de santé de l'application après déploiement
- **Rollback** : Retour automatique à la version précédente en cas d'échec du déploiement
- **Coverage** : Taux de couverture du code par les tests, exprimé en pourcentage
- **Artefact** : Image Docker versionnée produite par le pipeline et stockée dans ECR
- **Stage** : Étape distincte du pipeline (ex. : lint, test, build, deploy)
- **Branch_Principale** : Branche Git `main` ou `master` déclenchant le déploiement en production
- **PR** : Pull Request — demande de fusion de code déclenchant les vérifications CI

---

## Exigences

### Exigence 1 : Déclenchement et Structure du Pipeline

**User Story :** En tant que développeur, je veux que le pipeline se déclenche automatiquement sur les événements Git pertinents, afin que chaque modification de code soit validée sans intervention manuelle.

#### Critères d'Acceptation

1. WHEN un commit est poussé sur n'importe quelle branche, THE Pipeline SHALL déclencher les stages de lint, test unitaire et test d'intégration via un GitHub Actions Workflow défini dans `.github/workflows/`.
2. WHEN une Pull Request est ouverte ou mise à jour vers la Branch_Principale, THE Pipeline SHALL exécuter l'ensemble des stages CI (lint, tests unitaires, tests d'intégration, tests de non-régression) via GitHub Actions et bloquer la fusion en cas d'échec grâce aux branch protection rules.
3. WHEN un commit est poussé sur la Branch_Principale après fusion d'une PR validée, THE Pipeline SHALL exécuter le stage de build Docker, pousser l'Artefact vers ECR et déclencher le déploiement vers ECS via un GitHub Actions Workflow dédié au déploiement.
4. THE Pipeline SHALL exécuter les stages dans l'ordre séquentiel suivant via des jobs GitHub Actions enchaînés : lint → tests unitaires → tests d'intégration → tests de non-régression → build → push ECR → déploiement ECS.
5. IF un Stage échoue, THEN THE Pipeline SHALL interrompre l'exécution des stages suivants et notifier l'équipe via les mécanismes de notification GitHub Actions.
6. THE Pipeline SHALL produire un rapport d'exécution consultable incluant les logs de chaque Stage et le statut final, accessibles depuis l'interface GitHub Actions.

---

### Exigence 2 : Analyse Statique et Qualité du Code

**User Story :** En tant que développeur, je veux que le code soit analysé automatiquement pour détecter les erreurs de style et les problèmes de sécurité, afin de maintenir une qualité de code homogène.

#### Critères d'Acceptation

1. THE Pipeline SHALL exécuter un linter ESLint sur l'ensemble des fichiers JavaScript du projet lors de chaque déclenchement.
2. WHEN le linter détecte des erreurs bloquantes (errors), THE Pipeline SHALL marquer le Stage lint comme échoué et interrompre le pipeline.
3. WHERE la configuration ESLint inclut les règles de sécurité (`eslint-plugin-security`), THE Pipeline SHALL signaler les patterns dangereux (injections SQL, eval, etc.) comme erreurs bloquantes.
4. THE Pipeline SHALL vérifier que les dépendances npm ne contiennent pas de vulnérabilités critiques ou élevées via `npm audit`.
5. IF `npm audit` détecte des vulnérabilités de sévérité critique, THEN THE Pipeline SHALL marquer le Stage lint comme échoué.

---

### Exigence 3 : Tests Unitaires

**User Story :** En tant que développeur, je veux que les services métier soient couverts par des tests unitaires automatisés, afin de détecter les régressions dans la logique applicative.

#### Critères d'Acceptation

1. THE Pipeline SHALL exécuter la suite de tests unitaires via `npm test` lors de chaque déclenchement.
2. THE Test_Unitaire Suite SHALL couvrir les modules suivants : MemberService, PaymentService, TeamService, EventService, FacilityService, ReportService.
3. WHEN les tests unitaires sont exécutés, THE Test_Unitaire Suite SHALL s'exécuter sans connexion à une base de données réelle en utilisant des mocks.
4. THE Pipeline SHALL mesurer la couverture de code (Coverage) et produire un rapport de couverture.
5. IF la Coverage globale est inférieure à 70%, THEN THE Pipeline SHALL émettre un avertissement sans bloquer le pipeline.
6. WHEN un test unitaire échoue, THE Pipeline SHALL afficher le nom du test, le message d'erreur et la stack trace dans les logs du Stage.
7. THE Test_Unitaire Suite SHALL valider les cas suivants pour MemberService :
   - `getAllMembers` retourne un tableau de membres filtrables par statut et sport
   - `getMemberById` retourne null pour un identifiant inexistant
   - `createMember` génère un numéro de membre unique au format M00001+
   - `createMember` hache le mot de passe avec bcrypt (aucun texte en clair stocké)
   - `isMembershipExpired` retourne true pour une date de renouvellement passée et false pour une date future
8. THE Test_Unitaire Suite SHALL valider les cas suivants pour PaymentService :
   - `recordPayment` avec un `member_id` inexistant retourne une erreur métier
   - `getOverduePayments` retourne uniquement les paiements en attente avec une date d'échéance passée
9. THE Test_Unitaire Suite SHALL valider les cas suivants pour EventService :
   - `recordMatchResult` avec score domicile supérieur retourne le résultat `win`
   - `recordMatchResult` avec score domicile inférieur retourne le résultat `loss`
   - `recordMatchResult` avec scores égaux retourne le résultat `draw`
10. THE Test_Unitaire Suite SHALL valider les cas suivants pour FacilityService :
    - `checkFacilityAvailability` retourne false en cas de conflit de réservation
    - `checkFacilityAvailability` retourne true en l'absence de conflit

---

### Exigence 4 : Tests d'Intégration

**User Story :** En tant que développeur, je veux que les routes Express soient testées avec une base de données réelle, afin de valider le comportement de bout en bout des API.

#### Critères d'Acceptation

1. THE Pipeline SHALL démarrer une base de données PostgreSQL de test via Docker Compose avant d'exécuter les tests d'intégration.
2. WHEN les tests d'intégration démarrent, THE Test_Integration Suite SHALL appliquer les migrations de schéma et les données de seed sur la base de données de test.
3. WHEN les tests d'intégration se terminent, THE Pipeline SHALL arrêter et supprimer la base de données de test.
4. THE Test_Integration Suite SHALL valider l'authentification :
   - POST `/login` avec des identifiants valides retourne une redirection 302 vers `/dashboard`
   - POST `/login` avec des identifiants invalides retourne un statut 200 avec un message d'erreur
   - POST `/login` avec une tentative d'injection SQL (`' OR 1=1 --`) ne permet pas l'accès
5. THE Test_Integration Suite SHALL valider les autorisations :
   - GET `/members` sans session authentifiée retourne une redirection 302 vers `/login`
   - POST `/members` avec un rôle `member` retourne un statut 403
   - POST `/members` avec un rôle `admin` retourne un statut 200 ou 302
6. THE Test_Integration Suite SHALL valider les routes membres :
   - GET `/members` retourne un statut 200 avec la liste des membres
   - POST `/members` avec des données valides crée un membre et redirige vers le détail
   - GET `/members/export/csv` retourne un statut 200 avec le Content-Type `text/csv`
7. THE Test_Integration Suite SHALL valider la prévention des injections SQL :
   - Une recherche avec `'; DROP TABLE members; --` ne provoque aucune perte de données
   - Le rapport financier avec un paramètre `year` malveillant est bloqué par les requêtes paramétrées
8. THE Test_Integration Suite SHALL valider la validation des données :
   - La création d'un membre avec des champs obligatoires vides retourne une erreur de validation
   - L'enregistrement d'un paiement avec un montant négatif retourne une erreur de validation

---

### Exigence 5 : Tests de Non-Régression

**User Story :** En tant que responsable qualité, je veux que les workflows métier critiques soient validés de bout en bout après chaque déploiement, afin de garantir qu'aucune fonctionnalité existante n'est dégradée.

#### Critères d'Acceptation

1. THE Test_Non_Regression Suite SHALL valider le workflow complet du cycle de vie d'un membre : création → consultation → modification → renouvellement → suppression.
2. THE Test_Non_Regression Suite SHALL valider le workflow de paiement : création d'un paiement → consultation → mise à jour du statut → export CSV.
3. THE Test_Non_Regression Suite SHALL valider le workflow événement avec réservation : création d'un événement avec une installation → consultation de la réservation → annulation.
4. WHEN les tests de non-régression sont exécutés après un déploiement, THE Pipeline SHALL exécuter les tests contre l'environnement déployé via l'URL de l'ALB.
5. IF un test de non-régression échoue après déploiement, THEN THE Pipeline SHALL déclencher automatiquement le Rollback vers la version précédente.
6. THE Test_Non_Regression Suite SHALL s'exécuter dans un délai maximum de 10 minutes.
7. WHEN un déploiement vers `prod` est déclenché, THE Pipeline SHALL exiger une approbation manuelle explicite d'un membre de l'équipe autorisé via les GitHub Environments avec protection rules configurées sur l'environnement `prod`.

---

### Exigence 6 : Build et Publication de l'Image Docker

**User Story :** En tant qu'ingénieur DevOps, je veux que l'image Docker soit construite et publiée automatiquement dans ECR, afin d'avoir un Artefact versionné et traçable pour chaque déploiement.

#### Critères d'Acceptation

1. WHEN tous les stages de test réussissent sur la Branch_Principale, THE Pipeline SHALL construire l'image Docker en utilisant le Dockerfile multi-stage existant.
2. THE Pipeline SHALL taguer l'Artefact avec le SHA court du commit Git (ex. : `abc1234`) et le tag `latest`.
3. THE Pipeline SHALL s'authentifier auprès d'ECR en utilisant les credentials AWS du rôle IAM du pipeline sans stocker de secrets en clair.
4. THE Pipeline SHALL pousser l'Artefact vers le dépôt ECR `nodejs-app-{environment}`.
5. IF la construction de l'image Docker échoue, THEN THE Pipeline SHALL afficher les logs de build complets et marquer le Stage comme échoué.
6. THE Pipeline SHALL scanner l'image Docker pour les vulnérabilités via ECR Image Scanning après le push.
7. IF ECR Image Scanning détecte des vulnérabilités critiques, THEN THE Pipeline SHALL émettre un avertissement dans les logs sans bloquer le déploiement.

---

### Exigence 7 : Déploiement sur ECS Fargate

**User Story :** En tant qu'ingénieur DevOps, je veux que le déploiement vers ECS Fargate soit automatisé avec une stratégie zéro-downtime, afin que les utilisateurs ne subissent aucune interruption de service lors des mises à jour.

#### Critères d'Acceptation

1. WHEN l'Artefact est publié dans ECR, THE Pipeline SHALL mettre à jour la Task Definition ECS avec le nouvel URI d'image.
2. THE Pipeline SHALL déclencher un déploiement rolling update sur le service ECS `nodejs-app-{environment}-service` avec une stratégie zéro-downtime.
3. WHILE le déploiement est en cours, THE Pipeline SHALL surveiller l'état du service ECS et attendre la stabilisation complète avant de marquer le Stage comme réussi.
4. THE Pipeline SHALL vérifier le Health_Check de l'ALB après déploiement pour confirmer que les nouvelles tâches répondent correctement.
5. IF le service ECS ne se stabilise pas dans un délai de 10 minutes, THEN THE Pipeline SHALL marquer le déploiement comme échoué et déclencher le Rollback.
6. IF le Health_Check de l'ALB échoue après déploiement, THEN THE Pipeline SHALL déclencher le Rollback vers la Task Definition précédente.
7. THE Pipeline SHALL enregistrer l'URI de l'image déployée et le SHA du commit dans les logs de déploiement pour traçabilité.

---

### Exigence 8 : Gestion des Secrets et de la Configuration

**User Story :** En tant qu'ingénieur sécurité, je veux que les secrets ne soient jamais exposés dans le code ou les logs du pipeline, afin de protéger les credentials AWS, les mots de passe de base de données et les clés d'application.

#### Critères d'Acceptation

1. THE Pipeline SHALL récupérer les credentials AWS (Access Key, Secret Key, région) depuis les GitHub Actions Secrets (variables d'environnement chiffrées GitHub) et non depuis des fichiers versionnés.
2. THE Pipeline SHALL récupérer les paramètres de connexion à la base de données de test depuis les GitHub Actions Secrets configurés sur le dépôt ou l'environnement GitHub correspondant.
3. IF un secret est détecté dans le code source (pattern de clé AWS, mot de passe en dur), THEN THE Pipeline SHALL marquer le Stage lint comme échoué via un outil de détection de secrets (ex. : `detect-secrets` ou `truffleHog`).
4. THE Pipeline SHALL masquer automatiquement les valeurs des secrets dans tous les logs GitHub Actions grâce au mécanisme natif de masquage des secrets GitHub.
5. THE Pipeline SHALL utiliser le rôle IAM OIDC du pipeline pour s'authentifier auprès d'AWS sans stocker de credentials de longue durée dans les GitHub Actions Secrets.

---

### Exigence 9 : Notifications et Observabilité

**User Story :** En tant que développeur, je veux être notifié des résultats du pipeline, afin de réagir rapidement en cas d'échec.

#### Critères d'Acceptation

1. WHEN un pipeline échoue sur la Branch_Principale, THE Pipeline SHALL envoyer une notification incluant le nom du Stage échoué, le lien vers les logs GitHub Actions et le SHA du commit.
2. WHEN un déploiement réussit sur la Branch_Principale, THE Pipeline SHALL envoyer une notification de succès incluant la version déployée et l'URL de l'ALB.
3. THE Pipeline SHALL publier les métriques d'exécution (durée totale, durée par Stage, statut) dans les logs CloudWatch du groupe `/ecs/nodejs-app-{environment}`.
4. THE Pipeline SHALL conserver les rapports de tests (JUnit XML) et les rapports de couverture comme GitHub Actions Artifacts téléchargeables pendant au moins 30 jours.

---

### Exigence 10 : Environnements et Stratégie de Branches

**User Story :** En tant qu'ingénieur DevOps, je veux que le pipeline gère plusieurs environnements de déploiement, afin de valider les changements en staging avant la production.

#### Critères d'Acceptation

1. THE Pipeline SHALL supporter au minimum deux GitHub Environments : `dev` (déploiement automatique depuis la Branch_Principale) et `prod` (déploiement déclenché manuellement après validation en `dev`).
2. WHEN un déploiement vers `prod` est déclenché, THE Pipeline SHALL exiger une approbation manuelle explicite d'un membre de l'équipe autorisé via les GitHub Environments avec protection rules configurées sur l'environnement `prod`.
3. THE Pipeline SHALL utiliser des variables d'environnement distinctes (noms de ressources ECR, ECS, RDS) pour chaque GitHub Environment cible.
4. WHERE l'environnement est `prod`, THE Pipeline SHALL exécuter les tests de non-régression complets avant d'approuver le déploiement.
