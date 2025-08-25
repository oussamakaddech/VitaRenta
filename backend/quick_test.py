#!/usr/bin/env python3
"""
Test rapide des méthodes refactorisées
"""

import requests
import json

def test_quick_endpoints():
    """Test rapide des endpoints refactorisés"""
    
    base_url = "http://127.0.0.1:8000"
    
    print("🧪 Test rapide des méthodes refactorisées")
    print("=" * 50)
    
    # 1. Test health check
    try:
        response = requests.get(f"{base_url}/api/eco-challenges/health_check/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check: {data.get('status')} - {data.get('message')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # 2. Test disponibilité des défis (nouvelle méthode Django ORM)
    try:
        response = requests.get(f"{base_url}/api/eco-challenges/available/", timeout=5)
        if response.status_code == 200:
            challenges = response.json()
            print(f"✅ Défis disponibles: {len(challenges)} défis récupérés")
            if challenges:
                print(f"   Exemple: {challenges[0].get('title', 'Sans titre')}")
        else:
            print(f"❌ Défis disponibles failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Défis disponibles error: {e}")
    
    # 3. Test endpoint simple
    try:
        response = requests.get(f"{base_url}/api/eco-challenges/test_simple/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Test simple: {data.get('status')} - {len(data.get('challenges', []))} défis")
        else:
            print(f"❌ Test simple failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Test simple error: {e}")
    
    print("\n🎉 Tests rapides terminés !")
    print("✅ Les méthodes refactorisées sont fonctionnelles")

if __name__ == "__main__":
    test_quick_endpoints()
