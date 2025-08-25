#!/usr/bin/env python
"""
Patch pour corriger le problème de Djongo avec PyMongo
Fix pour l'erreur: Database objects do not implement truth value testing or bool()
"""

import os
import sys

def patch_djongo():
    """Applique le patch pour corriger le problème de connexion MongoDB"""
    
    # Chemin vers le fichier base.py de djongo
    djongo_base_path = os.path.join(
        os.path.dirname(__file__), 
        'venv', 
        'Lib', 
        'site-packages', 
        'djongo', 
        'base.py'
    )
    
    if not os.path.exists(djongo_base_path):
        print(f"❌ Fichier Djongo non trouvé: {djongo_base_path}")
        return False
    
    try:
        # Lire le contenu actuel
        with open(djongo_base_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remplacer la ligne problématique
        old_line = "        if self.connection:"
        new_line = "        if self.connection is not None:"
        
        if old_line in content:
            content = content.replace(old_line, new_line)
            
            # Écrire le fichier corrigé
            with open(djongo_base_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print("✅ Patch Djongo appliqué avec succès")
            return True
        else:
            print("⚠️ Ligne à patcher non trouvée, peut-être déjà corrigée")
            return True
            
    except Exception as e:
        print(f"❌ Erreur lors du patch: {e}")
        return False

if __name__ == "__main__":
    patch_djongo()
