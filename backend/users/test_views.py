from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
import logging
import traceback

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def test_simple_view(request):
    """Vue simple de test sans authentification"""
    try:
        logger.info("🧪 TEST: test_simple_view appelée")
        return Response({
            'status': 'success',
            'message': 'Test simple réussi',
            'user': str(request.user) if hasattr(request, 'user') else 'No user',
            'auth': str(request.auth) if hasattr(request, 'auth') else 'No auth'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"🧪 TEST ERROR: {str(e)}")
        logger.error(f"🧪 TRACEBACK: {traceback.format_exc()}")
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def active_challenges_simple(request):
    """Vue simple pour les défis actifs sans authentification"""
    try:
        logger.info("🧪 TEST: active_challenges_simple appelée")
        
        from users.models import EcoChallenge
        
        # Récupérer les défis actifs
        active_challenges = EcoChallenge.objects.filter(is_active=True)
        
        challenges_data = []
        for challenge in active_challenges:
            challenges_data.append({
                'id': str(challenge.id),
                'title': challenge.title,
                'description': challenge.description,
                'challenge_type': challenge.challenge_type,
                'is_active': challenge.is_active,
                'start_date': challenge.start_date.isoformat() if challenge.start_date else None,
                'end_date': challenge.end_date.isoformat() if challenge.end_date else None,
            })
        
        return Response({
            'status': 'success',
            'count': len(challenges_data),
            'challenges': challenges_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"🧪 ACTIVE CHALLENGES ERROR: {str(e)}")
        logger.error(f"🧪 TRACEBACK: {traceback.format_exc()}")
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
