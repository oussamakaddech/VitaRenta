# backend/text_analyzer.py
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np
from .models import Vehicule, UserProfile
from .data_preparation import prepare_dataset, calculate_eco_score

class TextAnalyzer:
    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        self.model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    
    def get_text_embedding(self, text):
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            outputs = self.model(**inputs)
        return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

    def enrich_user_features(self, user_id, comments):
        text_embedding = self.get_text_embedding(comments)
        
        vehicle_features = {
            "economique": ["prix_range:0-100", "carburant:hybride"],
            "spacieux": ["type:SUV", "type:Minivan", "places:6", "places:7"],
            "rapide": ["type:Sport"],
            "écologique": ["carburant:electrique", "carburant:hybride", "co2_range:0-50"],
            "green": ["carburant:electrique", "carburant:hybride", "co2_range:0-50"]
        }
        
        user_features = []
        for keyword, features in vehicle_features.items():
            if keyword in comments.lower():
                user_features.extend(features)
        
        user_features.append(f"text_embedding:{np.mean(text_embedding)}")
        return user_features

    def find_similar_vehicles(self, text, n=5):
        text_embedding = self.get_text_embedding(text)
        vehicles = Vehicule.objects.all()
        
        vehicle_embeddings = []
        for v in vehicles:
            desc = f"{v.marque} {v.modele} {v.type} {v.carburant} {v.transmission} {v.places} places CO2:{v.co2_emissions} g/km"
            emb = self.get_text_embedding(desc)
            eco_score = calculate_eco_score(v.co2_emissions, v.carburant)
            vehicle_embeddings.append((v.id, emb, eco_score))
        
        similarities = [
            (vid, np.dot(text_embedding, v_emb) / (np.linalg.norm(text_embedding) * np.linalg.norm(v_emb)) + eco_score * 0.3)
            for vid, v_emb, eco_score in vehicle_embeddings
        ]
        
        top_vehicles = sorted(similarities, key=lambda x: x[1], reverse=True)[:n]
        vehicle_ids = [vid for vid, _ in top_vehicles]
        
        return Vehicule.objects.filter(id__in=vehicle_ids)

def train_text_analyzer(csv_path):
    df = prepare_dataset(csv_path)
    text_analyzer = TextAnalyzer()
    
    for user_id, group in df.groupby('user_id'):
        comments = group['commentaires'].iloc[0]
        if comments:
            profile = UserProfile.objects.get(user_id=user_id)
            profile.text_features = text_analyzer.enrich_user_features(user_id, comments)
            profile.save()