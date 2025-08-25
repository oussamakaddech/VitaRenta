from django.utils import timezone
from datetime import timedelta
from django.http import JsonResponse
from django.core.cache import cache  # Use Django's cache framework for persistent blocking
from users.models import User
import json
import logging

logger = logging.getLogger(__name__)
class BearerTokenMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            # Tu peux ici vérifier le token si tu veux
            request.bearer_token = token  # Attache le token à la requête si besoin
        return self.get_response(request)
class TooManyAttemptsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.max_attempts = 5
        self.lockout_duration = timedelta(minutes=1)
        self.cache_prefix = 'login_attempts_'

    def __call__(self, request):
        if request.path == '/api/users/login/' and request.method == 'POST':
            try:
                client_ip = self.get_client_ip(request)

                # Check if IP is blocked
                if self.is_ip_blocked(client_ip):
                    logger.warning(f"IP bloquée temporairement: {client_ip}")
                    blocked_until = cache.get(f"{self.cache_prefix}ip_{client_ip}")
                    return JsonResponse({
                        'error': 'Trop de tentatives. Réessayez dans quelques minutes.',
                        'blocked_until': blocked_until.isoformat() if blocked_until else timezone.now().isoformat()
                    }, status=429)

                if hasattr(request, 'body') and request.body:
                    try:
                        data = json.loads(request.body.decode('utf-8'))
                        email = data.get('email', '').lower().strip()

                        if email:
                            try:
                                user = User.objects.get(email=email)  # Corrigé: était "email=not email"
                                # Check user-specific lockout
                                if (hasattr(user, 'login_attempts') and
                                        hasattr(user, 'last_login_attempt') and
                                        user.login_attempts >= self.max_attempts and
                                        user.last_login_attempt and
                                        timezone.now() - user.last_login_attempt < self.lockout_duration):

                                    self.block_ip(client_ip)
                                    logger.warning(f"Compte bloqué pour {email} (IP: {client_ip})")
                                    return JsonResponse({
                                        'error': 'Trop de tentatives. Compte bloqué pendant 1 minute.',
                                        'blocked_until': (user.last_login_attempt + self.lockout_duration).isoformat(),
                                        'attempts_remaining': 0
                                    }, status=429)

                                # Track failed attempt if authentication fails (done in LoginView)
                            except User.DoesNotExist:
                                self.track_failed_attempt(client_ip)
                                logger.warning(f"Tentative de connexion avec email inexistant: {email} (IP: {client_ip})")

                    except json.JSONDecodeError:
                        logger.error(f"JSON invalide dans la requête de login depuis {client_ip}")
                        return JsonResponse({
                            'error': 'Requête JSON invalide'
                        }, status=400)

            except Exception as e:
                logger.error(f"Erreur dans TooManyAttemptsMiddleware: {str(e)}")

        response = self.get_response(request)

        # Reset attempts on successful login
        if (request.path == '/api/users/login/' and
                request.method == 'POST' and
                response.status_code == 200):
            try:
                user = User.objects.get(email=json.loads(request.body.decode('utf-8')).get('email', '').lower().strip())
                if hasattr(user, 'login_attempts'):
                    user.login_attempts = 0
                    user.last_login_attempt = None
                    user.save()
                    cache.delete(f"{self.cache_prefix}ip_{client_ip}")
                    logger.info(f"Réinitialisation des tentatives de connexion pour {user.email} (IP: {client_ip})")
            except (User.DoesNotExist, json.JSONDecodeError):
                pass

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def is_ip_blocked(self, ip):
        blocked_until = cache.get(f"{self.cache_prefix}ip_{ip}")
        if blocked_until and timezone.now() < blocked_until:
            return True
        elif blocked_until:
            cache.delete(f"{self.cache_prefix}ip_{ip}")
        return False

    def block_ip(self, ip):
        cache.set(f"{self.cache_prefix}ip_{ip}", timezone.now() + self.lockout_duration, timeout=self.lockout_duration.total_seconds())

    def track_failed_attempt(self, ip):
        attempts = cache.get(f"{self.cache_prefix}ip_attempts_{ip}", 0)
        attempts += 1
        cache.set(f"{self.cache_prefix}ip_attempts_{ip}", attempts, timeout=self.lockout_duration.total_seconds())
        if attempts >= self.max_attempts:
            self.block_ip(ip)
            logger.warning(f"IP {ip} bloquée après {attempts} tentatives échouées")

class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Configure allowed origins (replace with your frontend URL in production)
        self.allowed_origins = ['http://localhost:3000', 'https://your-production-domain.com']

    def __call__(self, request):
        response = self.get_response(request)

        origin = request.META.get('HTTP_ORIGIN', '')
        if origin in self.allowed_origins or not self.allowed_origins:
            response['Access-Control-Allow-Origin'] = origin or '*'
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

            user_info = request.user.email if request.user.is_authenticated else 'anonyme'
            client_ip = self.get_client_ip(request)
            logger.info(f"API Request: {request.method} {request.path} from {user_info} (IP: {client_ip})")

            response = self.get_response(request)

            duration = timezone.now() - start_time
            logger.info(f"API Response: {response.status_code} in {duration.total_seconds():.2f}s for {user_info} (IP: {client_ip})")

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
        # Optional: Add Content-Security-Policy (configure as needed)
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"

        return response