#!/usr/bin/env python3
import os
import sys
import django

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')
django.setup()

from users.models import EcoChallenge

def list_challenges():
    """Lister tous les défis pour voir les vrais IDs"""
    print("🔍 Liste des défis dans la base de données:")
    print("-" * 50)
    
    challenges = EcoChallenge.objects.all()
    
    if not challenges.exists():
        print("❌ Aucun défi trouvé dans la base de données")
        return
    
    for challenge in challenges:
        print(f"📝 ID: {challenge.id}")
        print(f"   Titre: {challenge.title}")
        print(f"   Type: {challenge.type}")
        print(f"   Actif: {challenge.is_active}")
        print("-" * 30)
    
    print(f"\n✅ Total: {challenges.count()} défis trouvés")
    
    # Montrer le format UUID attendu
    if challenges.exists():
        first_id = str(challenges.first().id)
        print(f"\n💡 Format UUID attendu: {first_id}")
        print(f"   Longueur: {len(first_id)} caractères")

if __name__ == "__main__":
    list_challenges()
