#!/usr/bin/env python3
"""
Debug MongoDB direct pour comprendre le problème avec les ObjectId
"""
import os
from pymongo import MongoClient
from bson import ObjectId

def debug_mongodb():
    """Debug direct MongoDB"""
    print("🔍 Debug MongoDB direct - ObjectId")
    
    # Connexion MongoDB
    mongo_host = os.getenv('MONGO_HOST', 'localhost')
    mongo_port = int(os.getenv('MONGO_PORT', 27017))
    mongo_db = os.getenv('MONGO_DB', 'vitarenta_db')
    
    mongo_client = MongoClient(host=mongo_host, port=mongo_port)
    db = mongo_client[mongo_db]
    challenges_collection = db['eco_challenges']
    
    print(f"\n📊 Collection: {challenges_collection.name}")
    
    # Lister les défis
    print("\n1. Tous les défis disponibles:")
    all_challenges = list(challenges_collection.find({}))
    print(f"   Nombre total: {len(all_challenges)}")
    
    for i, challenge in enumerate(all_challenges[:5]):
        print(f"\n   Défi {i+1}:")
        print(f"     _id: {challenge.get('_id')} (type: {type(challenge.get('_id'))})")
        print(f"     title: {challenge.get('title', 'Sans titre')}")
        print(f"     is_active: {challenge.get('is_active', False)}")
    
    # Test de recherche spécifique
    test_id = "68a754c99d2ab0a939ee24a6"
    print(f"\n2. Test de recherche avec ID: {test_id}")
    
    # Recherche avec string
    result_str = challenges_collection.find_one({'_id': test_id})
    print(f"   Recherche string: {'✅ Trouvé' if result_str else '❌ Non trouvé'}")
    
    # Recherche avec ObjectId
    try:
        result_obj = challenges_collection.find_one({'_id': ObjectId(test_id)})
        print(f"   Recherche ObjectId: {'✅ Trouvé' if result_obj else '❌ Non trouvé'}")
        if result_obj:
            print(f"   Titre trouvé: {result_obj.get('title', 'Sans titre')}")
    except Exception as e:
        print(f"   Erreur ObjectId: {e}")
    
    # Recherche avec query alternative
    result_alt = challenges_collection.find_one({'id': test_id})
    print(f"   Recherche champ 'id': {'✅ Trouvé' if result_alt else '❌ Non trouvé'}")
    
    # Afficher la structure d'un document
    if all_challenges:
        print(f"\n3. Structure du premier document:")
        first_doc = all_challenges[0]
        for key, value in first_doc.items():
            print(f"   {key}: {value} (type: {type(value)})")

if __name__ == "__main__":
    debug_mongodb()
