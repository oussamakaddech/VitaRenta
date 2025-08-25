#!/usr/bin/env python3
import requests
import json

def test_complete_flow():
    """Test complet du flux d'eco-challenges avec ObjectId"""
    base_url = "http://127.0.0.1:8000"
    
    print("🎯 TEST COMPLET: Authentification + Join avec ObjectId MongoDB")
    
    # 1. Authentification
    print("\n1️⃣ AUTHENTIFICATION")
    login_data = {
        "email": "oussama.kaddech11@gmail.com",
        "password": "123"  # Mot de passe de test
    }
    
    try:
        auth_response = requests.post(f"{base_url}/api/login/", json=login_data)
        print(f"Status Login: {auth_response.status_code}")
        
        if auth_response.status_code == 200:
            auth_data = auth_response.json()
            access_token = auth_data.get('access')
            headers = {"Authorization": f"Bearer {access_token}"}
            print(f"✅ Authentification réussie")
            
            # 2. Récupération des défis disponibles
            print("\n2️⃣ DÉFIS DISPONIBLES (sans auth pour tester)")
            available_response = requests.get(f"{base_url}/api/eco-challenges/available/")
            print(f"Status Available: {available_response.status_code}")
            
            if available_response.status_code == 200:
                challenges = available_response.json()
                print(f"✅ {len(challenges)} défis trouvés")
                
                if challenges:
                    # Utiliser le premier défi avec son ObjectId
                    first_challenge = challenges[0]
                    challenge_id = first_challenge['id']  # C'est un ObjectId MongoDB
                    print(f"Premier défi: {first_challenge['title']} (ID: {challenge_id})")
                    
                    # 3. Test JOIN avec ObjectId authentifié
                    print(f"\n3️⃣ JOIN AVEC OBJECTID AUTHENTIFIÉ")
                    join_url = f"{base_url}/api/eco-challenges/{challenge_id}/join/"
                    print(f"URL: {join_url}")
                    
                    join_response = requests.post(join_url, json={}, headers=headers)
                    print(f"Status Join: {join_response.status_code}")
                    print(f"Response: {join_response.text}")
                    
                    if join_response.status_code in [200, 201]:
                        print("🎉 SUCCÈS TOTAL! Join avec ObjectId fonctionne!")
                    elif join_response.status_code == 400:
                        response_data = join_response.json()
                        if "déjà" in response_data.get("error", "").lower():
                            print("✅ Déjà participé - comportement normal")
                        else:
                            print(f"❌ Erreur 400: {response_data}")
                    else:
                        print(f"❌ Erreur inattendue: {join_response.status_code}")
                        print(f"Response: {join_response.text}")
                else:
                    print("❌ Aucun défi disponible")
            else:
                print(f"❌ Erreur available: {available_response.text}")
        else:
            print(f"❌ Erreur auth: {auth_response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_complete_flow()
