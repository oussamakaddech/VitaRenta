# 🗺️ Mise à Jour du Modèle Agence - Backend Django

## 📋 Résumé des Modifications

Cette mise à jour ajoute des champs de géolocalisation et d'informations détaillées au modèle `Agence` pour supporter la fonctionnalité de carte interactive.

## 🔧 Nouveaux Champs Ajoutés

### 📍 Géolocalisation
- **`latitude`** : Decimal(10,7) - Latitude en degrés décimaux
- **`longitude`** : Decimal(10,7) - Longitude en degrés décimaux

### 👨‍💼 Gestion
- **`manager_nom`** : Nom du responsable de l'agence
- **`manager_telephone`** : Téléphone du responsable
- **`horaires_ouverture`** : Horaires d'ouverture (format texte)
- **`services_proposes`** : Services proposés par l'agence
- **`capacite_vehicules`** : Capacité maximale de véhicules

### 🏢 Informations Détaillées
- **`nombre_employes`** : Nombre d'employés
- **`surface_m2`** : Surface en mètres carrés
- **`date_modification`** : Date de dernière modification (auto)

### 🏠 Adresse Détaillée
- **`numero_rue`** : Numéro de rue
- **`nom_rue`** : Nom de la rue
- **`quartier`** : Quartier ou zone
- **`code_region`** : Code région/gouvernorat

## 🚀 Instructions d'Installation

### 1. Mettre à Jour le Modèle

Remplacez votre modèle `Agence` existant par le contenu du fichier `agence_model_updated.py`.

### 2. Créer et Appliquer les Migrations

```bash
# Générer les migrations
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate
```

### 3. Mettre à Jour les Agences Existantes

```bash
# Exécuter le script de mise à jour des coordonnées
python manage.py shell < update_agence_coordinates.py
```

### 4. Mettre à Jour les Serializers

Remplacez vos serializers existants par le contenu de `agence_serializers.py`.

### 5. Mettre à Jour les Views (Optionnel)

Utilisez le contenu de `agence_views.py` pour avoir des endpoints enrichis.

## 📊 Nouveaux Endpoints API

### Endpoints Existants Enrichis
- `GET /api/agences/` - Liste avec coordonnées
- `POST /api/agences/` - Création avec géolocalisation auto
- `GET /api/agences/{id}/` - Détails complets
- `PUT /api/agences/{id}/` - Mise à jour complète

### Nouveaux Endpoints
- `GET /api/agences/active_only/` - Agences actives uniquement
- `GET /api/agences/with_coordinates/` - Agences géolocalisées
- `GET /api/agences/by_city/?city=tunis` - Agences par ville
- `GET /api/agences/cities/` - Liste des villes
- `GET /api/agences/stats/` - Statistiques générales
- `POST /api/agences/{id}/update_coordinates/` - Mettre à jour coordonnées
- `POST /api/agences/{id}/auto_geocode/` - Géocodage automatique

### Paramètres de Filtrage
- `?has_coordinates=true` - Avec/sans coordonnées
- `?lat_min=&lat_max=&lng_min=&lng_max=` - Zone géographique
- `?city=tunis` - Par ville
- `?active=true` - Par statut

## 🗺️ Fonctionnalités de Géolocalisation

### Géocodage Automatique
Le modèle inclut une méthode `set_approximate_coordinates()` qui :
- Reconnaît automatiquement 30+ villes tunisiennes
- Assigne des coordonnées approximatives basées sur la ville
- Supporte les variantes de noms (avec/sans accents)
- Utilise des coordonnées par défaut si la ville n'est pas reconnue

### Villes Supportées
**Principales** : Tunis, Sfax, Sousse, Bizerte, Kairouan, Gabès, Ariana
**Complètes** : Monastir, Mahdia, Nabeul, Gafsa, Médenine, Tataouine, etc.
**Zones spéciales** : Carthage, Sidi Bou Saïd, Djerba, etc.

## 🔒 Permissions et Sécurité

### Accès par Rôle
- **Client** : Lecture seule des agences actives
- **Agence** : Gestion de leur propre agence
- **Admin** : Accès complet à toutes les agences

### Validation
- Coordonnées dans les plages valides (-90/90, -180/180)
- Code postal tunisien (4 chiffres)
- Validation des numéros de téléphone
- Nettoyage automatique des espaces et caractères spéciaux

## 📱 Intégration Frontend

### Utilisation avec React-Leaflet
```javascript
// Récupération des agences avec coordonnées
const response = await axios.get('/api/agences/with_coordinates/');
const agencies = response.data;

// Affichage sur la carte
agencies.forEach(agency => {
  if (agency.coordinates) {
    // Créer un marqueur à agency.coordinates.lat, agency.coordinates.lng
  }
});
```

### Propriétés Calculées Disponibles
- `coordinates` : `{lat: number, lng: number}` ou `null`
- `adresse_complete` : Adresse formatée complète
- `has_coordinates` : Boolean
- `coordinates_source` : 'manual' ou 'auto'

## 🧪 Tests

### Tester la Géolocalisation
```python
# Dans le shell Django
from myapp.models import Agence

# Créer une agence
agence = Agence.objects.create(
    nom="Test Agence",
    ville="Tunis",
    adresse="Avenue Bourguiba"
)

# Vérifier les coordonnées auto-générées
print(agence.coordinates)  # {'lat': 36.8065, 'lng': 10.1815}
```

### Tester l'API
```bash
# Récupérer toutes les agences avec coordonnées
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/api/agences/with_coordinates/"

# Obtenir les statistiques
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/api/agences/stats/"
```

## 🔄 Migration en Production

### 1. Sauvegarde
```bash
# Sauvegarder la base de données
python manage.py dumpdata > backup_before_migration.json
```

### 2. Maintenance
```bash
# Mode maintenance (optionnel)
python manage.py collectstatic --noinput
```

### 3. Migration
```bash
python manage.py migrate
python manage.py shell < update_agence_coordinates.py
```

### 4. Vérification
```bash
python manage.py shell -c "
from myapp.models import Agence
print(f'Agences avec coordonnées: {Agence.objects.filter(latitude__isnull=False).count()}')
"
```

## 📚 Documentation API

### Réponse Type
```json
{
  "id": "uuid-string",
  "nom": "VitaRenta Tunis",
  "ville": "Tunis",
  "adresse": "Avenue Bourguiba",
  "latitude": "36.8065000",
  "longitude": "10.1815000",
  "coordinates": {
    "lat": 36.8065,
    "lng": 10.1815
  },
  "adresse_complete": "Avenue Bourguiba, Tunis, 1000, Tunisie",
  "manager_nom": "Ahmed Ben Ali",
  "horaires_ouverture": "Lun-Ven: 8h-18h\nSam: 9h-13h",
  "active": true,
  "has_coordinates": true,
  "coordinates_source": "auto"
}
```

## 🎯 Points d'Attention

### Performance
- Les nouveaux index améliorent les requêtes géographiques
- Le champ `coordinates` est calculé à la volée (pas stocké)
- Pagination recommandée pour les grandes listes

### Compatibilité
- Les champs existants restent inchangés
- Rétrocompatibilité assurée avec l'API actuelle
- Les nouveaux champs sont optionnels

### Maintenance
- Script de mise à jour disponible pour les données existantes
- Géolocalisation automatique pour les nouvelles agences
- Validation robuste des données géographiques

---

**✅ Prêt pour la production !** Cette mise à jour enrichit considérablement les fonctionnalités de géolocalisation tout en maintenant la compatibilité avec l'existant.
