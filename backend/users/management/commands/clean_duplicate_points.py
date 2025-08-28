# users/management/commands/clean_duplicate_points.py

from django.core.management.base import BaseCommand
from users.models import UserPoints, User
from django.db.models import Count

class Command(BaseCommand):
    help = 'Nettoie les comptes points en doublon'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Recherche des doublons UserPoints...')
        
        # Trouver les utilisateurs avec plusieurs comptes points
        users_with_duplicates = UserPoints.objects.values('user').annotate(
            count=Count('user')
        ).filter(count__gt=1)
        
        total_duplicates = 0
        
        for item in users_with_duplicates:
            user_id = item['user']
            count = item['count']
            
            try:
                user = User.objects.get(id=user_id)
                self.stdout.write(f'👤 Utilisateur {user.email} a {count} comptes points')
                
                # Récupérer tous les comptes points de cet utilisateur
                user_points_list = UserPoints.objects.filter(user=user).order_by('created_at')
                
                # Garder le premier (le plus ancien)
                main_account = user_points_list.first()
                duplicates = user_points_list.exclude(id=main_account.id)
                
                # Fusionner les données
                for duplicate in duplicates:
                    main_account.current_points += duplicate.current_points
                    main_account.total_earned += duplicate.total_earned
                    main_account.total_spent += duplicate.total_spent
                    main_account.level = max(main_account.level, duplicate.level)
                    
                    self.stdout.write(f'  📊 Fusion: +{duplicate.current_points} points, +{duplicate.total_earned} total')
                    total_duplicates += 1
                
                # Sauvegarder le compte principal
                main_account.save()
                
                # Supprimer les doublons
                duplicates.delete()
                
                self.stdout.write(f'  ✅ Compte fusionné: {main_account.current_points} points total')
                
            except User.DoesNotExist:
                self.stdout.write(f'  ❌ Utilisateur {user_id} non trouvé')
            except Exception as e:
                self.stdout.write(f'  ❌ Erreur pour utilisateur {user_id}: {str(e)}')
        
        self.stdout.write(f'🎉 Nettoyage terminé. {total_duplicates} doublons supprimés.')
