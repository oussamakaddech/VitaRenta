from django.utils import timezone
from datetime import timedelta
from django.http import JsonResponse
from users.models import User
import json
import logging

logger = logging.getLogger(__name__)

class TooManyAttemptsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.blocked_ips = {}
        self.max_attempts = 5
        self.lockout_duration = timedelta(minutes=1)

    def __call__(self, request):
        if request.path == '/api/login/' and request.method == 'POST':
            try:
                client_ip = self.get_client_ip(request)
                
                if self.is_ip_blocked(client_ip):
                    logger.warning(f"IP bloquée temporairement: {client_ip}")
                    return JsonResponse({
                        'error': 'Trop de tentatives. Réessayez dans quelques minutes.',
                        'blocked_until': (timezone.now() + self.lockout_duration).isoformat()
                    }, status=429)

                if hasattr(request, 'body') and request.body:
                    try:
                        data = json.loads(request.body.decode('utf-8'))
                        email = data.get('email', '').lower().strip()
                        
                        if email:
                            try:
                                user = User.objects.get(email=email)
                                
                                if (user.login_attempts >= self.max_attempts and 
                                    user.last_login_attempt and
                                    timezone.now() - user.last_login_attempt < self.lockout_duration):
                                    
                                    self.block_ip(client_ip)
                                    
                                    logger.warning(f"Compte bloqué pour {email} (IP: {client_ip})")
                                    return JsonResponse({
                                        'error': 'Trop de tentatives. Compte bloqué pendant 1 minute.',
                                        'blocked_until': (user.last_login_attempt + self.lockout_duration).isoformat(),
                                        'attempts_remaining': 0
                                    }, status=429)
                                    
                            except User.DoesNotExist:
                                self.track_failed_attempt(client_ip)
                                
                    except json.JSONDecodeError:
                        logger.error(f"JSON invalide dans la requête de login depuis {client_ip}")
                        
            except Exception as e:
                logger.error(f"Erreur dans TooManyAttemptsMiddleware: {e}")
        
        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def is_ip_blocked(self, ip):
        if ip in self.blocked_ips:
            blocked_until = self.blocked_ips[ip]
            if timezone.now() < blocked_until:
                return True
            else:
                del self.blocked_ips[ip]
        return False

    def block_ip(self, ip):
        self.blocked_ips[ip] = timezone.now() + self.lockout_duration

    def track_failed_attempt(self, ip):
        pass

class BearerTokenMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ', 1)[1]
                if token.strip():
                    request.META['HTTP_AUTHORIZATION'] = f'Token {token}'
                    logger.debug(f"Token Bearer converti pour {request.path}")
                else:
                    logger.warning(f"Token Bearer vide reçu pour {request.path}")
                    
            except IndexError:
                logger.error(f"Format Bearer token invalide: {auth_header} pour {request.path}")
                
        elif auth_header.startswith('Token '):
            logger.debug(f"Token Django déjà correct pour {request.path}")
            
        return self.get_response(request)

class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response['Access-Control-Allow-Credentials'] = 'true'
        
        if request.method == 'OPTIONS':
            response.status_code = 200
            
        return response

class APILoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/'):
            start_time = timezone.now()
            
            logger.info(f"API Request: {request.method} {request.path} from {self.get_client_ip(request)}")
            
            response = self.get_response(request)
            
            duration = timezone.now() - start_time
            logger.info(f"API Response: {response.status_code} in {duration.total_seconds():.2f}s")
            
            return response
        
        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response