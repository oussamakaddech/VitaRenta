from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
import logging
import traceback
from pymongo import MongoClient
import os

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def simple_mongo_test(request):
    """Test direct MongoDB sans Djongo"""
    try:
        logger.info("🧪 TEST: Connexion directe à MongoDB")
        
        # Connexion directe à MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['vitarenta_db']
        
        # Récupérer les défis directement
        challenges_collection = db['users_ecochallenge']
        challenges = list(challenges_collection.find({}))
        
        # Convertir ObjectId en string
        for challenge in challenges:
            challenge['_id'] = str(challenge['_id'])
            if 'id' in challenge:
                challenge['id'] = str(challenge['id'])
        
        client.close()
        
        return Response({
            'status': 'success',
            'count': len(challenges),
            'challenges': challenges,
            'message': 'Test MongoDB direct réussi'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"🧪 MONGO TEST ERROR: {str(e)}")
        logger.error(f"🧪 TRACEBACK: {traceback.format_exc()}")
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def active_challenges_mongo(request):
    """Défis actifs via MongoDB direct"""
    try:
        logger.info("🧪 TEST: Récupération des défis actifs via MongoDB")
        
        # Connexion directe à MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['vitarenta_db']
        
        # Récupérer les défis actifs directement
        challenges_collection = db['users_ecochallenge']
        active_challenges = list(challenges_collection.find({'is_active': True}))
        
        # Convertir ObjectId en string et formater
        formatted_challenges = []
        for challenge in active_challenges:
            formatted_challenge = {
                'id': str(challenge.get('_id', '')),
                'title': challenge.get('title', ''),
                'description': challenge.get('description', ''),
                'challenge_type': challenge.get('challenge_type', ''),
                'is_active': challenge.get('is_active', False),
                'target_value': challenge.get('target_value', 0),
                'reward_points': challenge.get('reward_points', 0),
            }
            formatted_challenges.append(formatted_challenge)
        
        client.close()
        
        return Response({
            'status': 'success',
            'count': len(formatted_challenges),
            'challenges': formatted_challenges,
            'message': 'Défis actifs récupérés via MongoDB'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"🧪 MONGO ACTIVE ERROR: {str(e)}")
        logger.error(f"🧪 TRACEBACK: {traceback.format_exc()}")
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
