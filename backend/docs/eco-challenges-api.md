# API Documentation - Système de Défis Éco-Responsables

## Vue d'ensemble

Le système de défis éco-responsables permet aux utilisateurs de participer à des challenges environnementaux liés à la conduite écologique, la réduction de CO₂, l'efficacité énergétique et les scores écologiques.

## Endpoints de l'API

### Base URL
```
http://localhost:8000/api/
```

### Authentication
Toutes les routes des défis nécessitent une authentification JWT :
```
Authorization: Bearer <access_token>
```

## 1. Défis Éco-Responsables

### GET /eco-challenges/
Récupère tous les défis éco-responsables actifs.

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "eco_driving|co2_reduction|fuel_efficiency|eco_score",
    "title": "Titre du défi",
    "description": "Description détaillée",
    "target_value": "50.00",
    "unit": "km",
    "difficulty": "beginner|intermediate|expert",
    "duration_days": 14,
    "reward_points": 100,
    "reward_credit_euros": "5.00",
    "reward_badge": "Badge Name",
    "is_active": true,
    "max_participants": null,
    "created_at": "2025-08-21T18:00:00Z"
  }
]
```

### GET /eco-challenges/available/
Récupère les défis disponibles pour l'utilisateur connecté (excluant ceux déjà acceptés).

### GET /eco-challenges/{id}/
Récupère les détails d'un défi spécifique.

## 2. Défis Utilisateur

### GET /user-eco-challenges/
Récupère tous les défis de l'utilisateur connecté.

**Response:**
```json
[
  {
    "id": "uuid",
    "challenge": {
      "id": "uuid",
      "title": "Éco-Conducteur Débutant",
      "type": "eco_driving",
      "target_value": "50.00",
      "unit": "km",
      "duration_days": 14,
      "reward_points": 100,
      "reward_credit_euros": "5.00"
    },
    "status": "active|completed|abandoned|expired",
    "progress": "25.50",
    "progress_percentage": 51.0,
    "started_at": "2025-08-21T10:00:00Z",
    "completed_at": null,
    "deadline": "2025-09-04T10:00:00Z",
    "days_remaining": 14,
    "reward_claimed": false,
    "final_score": null,
    "target": "50.00",
    "unit": "km",
    "reward_points": 100,
    "reward_credit": "5.00"
  }
]
```

### GET /user-eco-challenges/active/
Récupère uniquement les défis actifs de l'utilisateur.

### GET /user-eco-challenges/completed/
Récupère uniquement les défis complétés de l'utilisateur.

### POST /user-eco-challenges/accept/
Accepte un nouveau défi.

**Request Body:**
```json
{
  "challenge_id": "uuid-of-challenge"
}
```

**Response:**
```json
{
  "id": "uuid",
  "challenge": { /* défi complet */ },
  "status": "active",
  "progress": "0.00",
  "started_at": "2025-08-21T18:00:00Z",
  "deadline": "2025-09-04T18:00:00Z"
}
```

### POST /user-eco-challenges/{id}/abandon/
Abandonne un défi actif.

**Response:**
```json
{
  "message": "Défi abandonné avec succès"
}
```

### GET /user-eco-challenges/stats/
Récupère les statistiques globales de l'utilisateur.

**Response:**
```json
{
  "total_challenges_completed": 5,
  "total_points_earned": 850,
  "total_credit_earned": 42.50,
  "co2_saved_total": 25.75,
  "eco_km_total": 350.25,
  "current_streak": 3,
  "best_streak": 5
}
```

## 3. Progression des Défis

### GET /eco-challenge-progress/
Récupère l'historique de progression de l'utilisateur.

### POST /eco-challenge-progress/update_progress/
Met à jour la progression d'un défi (généralement appelé automatiquement).

**Request Body:**
```json
{
  "challenge_id": "uuid-of-user-challenge",
  "progress_data": {
    "value": 10.5,
    "eco_score": 87.5,
    "co2_saved": 2.3,
    "energy_consumption": 8.7,
    "distance_km": 10.5,
    "vehicle_id": "uuid",
    "reservation_id": "uuid"
  }
}
```

## 4. Intégration Automatique

### Mise à jour automatique via Éco-Score
Lorsqu'un éco-score est calculé, les défis de l'utilisateur sont automatiquement mis à jour :

```python
# Dans EcoScoreViewSet.calculate_eco_score()
POST /eco-score/calculate_eco_score/
{
  "vehicle_id": "uuid"
}
```

Les défis d'éco-score seront automatiquement progressés si le score ≥ 85.

## 5. Types de Défis

### ECO_DRIVING (Conduite Écologique)
- **Objectif:** Parcourir une distance en mode éco-responsable
- **Unité:** km
- **Progression:** Basée sur la distance parcourue avec un bon éco-score

### CO2_REDUCTION (Réduction CO₂)
- **Objectif:** Économiser une quantité de CO₂
- **Unité:** kg CO₂
- **Progression:** Basée sur les émissions évitées

### FUEL_EFFICIENCY (Efficacité Énergétique)
- **Objectif:** Maintenir une faible consommation
- **Unité:** km
- **Progression:** Basée sur la distance avec bonne efficacité

### ECO_SCORE (Score Écologique)
- **Objectif:** Maintenir un éco-score élevé pendant X jours
- **Unité:** jours
- **Progression:** +1 jour pour chaque jour avec score ≥ 85

## 6. Statuts des Défis

- **ACTIVE:** Défi en cours
- **COMPLETED:** Objectif atteint avec succès
- **ABANDONED:** Abandonné par l'utilisateur
- **EXPIRED:** Date limite dépassée sans completion

## 7. Récompenses

Les récompenses sont automatiquement attribuées lors de la completion :
- **Points:** Ajoutés au profil utilisateur
- **Crédits:** Euros ajoutés au compte
- **Badges:** Récompenses spéciales pour certains défis

## 8. Commandes de gestion

### Créer les défis par défaut
```bash
python manage.py create_default_challenges
```

### Vérifier les défis expirés (sera automatique avec Celery)
```python
from users.tasks import check_expired_challenges
check_expired_challenges()
```

## 9. Administration

L'interface d'administration Django permet de :
- Gérer les défis (créer, modifier, désactiver)
- Voir la progression des utilisateurs
- Gérer les récompenses
- Consulter les statistiques

**URL:** http://localhost:8000/admin/

## 10. Exemple d'utilisation complète

```javascript
// 1. Récupérer les défis disponibles
const availableChallenges = await fetch('/api/eco-challenges/available/', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());

// 2. Accepter un défi
const acceptedChallenge = await fetch('/api/user-eco-challenges/accept/', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ challenge_id: challengeId })
}).then(res => res.json());

// 3. Voir mes défis actifs
const activeChallenges = await fetch('/api/user-eco-challenges/active/', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());

// 4. Voir mes statistiques
const stats = await fetch('/api/user-eco-challenges/stats/', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(res => res.json());
```

## 11. Codes d'erreur

- **400:** Données de requête invalides
- **401:** Non authentifié
- **403:** Non autorisé
- **404:** Ressource non trouvée
- **500:** Erreur serveur

## 12. Notes d'implémentation

- La progression est mise à jour automatiquement via les calculs d'éco-score
- Les récompenses sont créées automatiquement via les signaux Django
- Les défis expirés sont gérés par des tâches périodiques
- L'authentification JWT est requise pour toutes les opérations
