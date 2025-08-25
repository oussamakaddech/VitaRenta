#!/usr/bin/env python3
"""
Vérifier le format des IDs retournés par le backend
"""
import os
import sys
import django

# Configuration Django
sys.path.append('c:\\Users\\oussama\\Desktop\\VitaRenta\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')
django.setup()

from django.test import Client
import json

def check_ids_format():
    """Vérifier le format des IDs retournés"""
    client = Client()
    
    print("🔍 Vérification des formats d'ID depuis le backend")
    
    # Test défis disponibles
    response = client.get('/api/eco-challenges/available/')
    print(f"\n📊 Status: {response.status_code}")
    
    if response.status_code == 200:
        data = json.loads(response.content.decode())
        print(f"📊 Nombre de défis: {len(data)}")
        
        print("\n🔍 Analyse des IDs:")
        for i, challenge in enumerate(data[:5]):  # Analyser les 5 premiers
            challenge_id = challenge.get('id')
            print(f"\n  Défi {i+1}: {challenge.get('title', 'Sans titre')}")
            print(f"    ID: {challenge_id}")
            print(f"    Type: {type(challenge_id)}")
            print(f"    Longueur: {len(str(challenge_id))} caractères")
            
            # Test format UUID
            import re
            uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            is_uuid = bool(re.match(uuid_pattern, str(challenge_id), re.IGNORECASE))
            print(f"    Format UUID: {'✅ OUI' if is_uuid else '❌ NON'}")
            
            # Test format ObjectId
            objectid_pattern = r'^[0-9a-f]{24}$'
            is_objectid = bool(re.match(objectid_pattern, str(challenge_id), re.IGNORECASE))
            print(f"    Format ObjectId: {'✅ OUI' if is_objectid else '❌ NON'}")
    else:
        print(f"❌ Erreur: {response.status_code}")
        print(f"Contenu: {response.content.decode()}")

if __name__ == "__main__":
    check_ids_format()
