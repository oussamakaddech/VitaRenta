from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, Agence, Vehicule, Reservation, EcoChallenge, UserEcoChallenge, 
    EcoChallengeProgress, EcoChallengeReward
)

class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'nom', 'role', 'is_active', 'get_agence_display', 'date_joined')
    list_filter = ('role', 'is_active', 'date_joined')
    search_fields = ('email', 'nom', 'telephone')
    ordering = ('-date_joined',)
    readonly_fields = ('id', 'date_joined', 'last_login', 'login_attempts', 'last_login_attempt')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informations personnelles', {
            'fields': ('nom', 'telephone', 'preference_carburant', 'photo_url', 'budget_journalier')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'role')
        }),
        ('Dates importantes', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
        ('Sécurité', {
            'fields': ('login_attempts', 'last_login_attempt'),
            'classes': ('collapse',)
        }),
        ('Agence', {
            'fields': ('agence',)
        }),
        ('Métadonnées', {
            'fields': ('id',),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nom', 'password1', 'password2', 'role'),
        }),
    )

    def get_agence_display(self, obj):
        if obj.agence:
            return format_html(
                '<a href="/admin/users/agence/{}/change/">{}</a>',
                obj.agence.id, obj.agence.nom
            )
        return format_html(
            '<span style="color: gray;">Aucune agence</span>'
        )

    get_agence_display.short_description = "Agence"
    get_agence_display.admin_order_field = 'agence__nom'

@admin.register(Agence)
class AgenceAdmin(admin.ModelAdmin):
    list_display = ('nom', 'email', 'adresse', 'telephone', 'date_creation')
    list_filter = ('date_creation', 'ville', 'pays', 'active')
    search_fields = ('nom', 'email', 'adresse', 'telephone', 'ville', 'code_postal', 'pays')
    ordering = ('-date_creation',)
    readonly_fields = ('id', 'date_creation')

    fieldsets = (
        ('Informations de base', {
            'fields': ('nom', 'adresse', 'ville', 'code_postal', 'pays')
        }),
        ('Contact', {
            'fields': ('telephone', 'email', 'site_web')
        }),
        ('Détails', {
            'fields': ('description', 'active'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'date_creation'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Vehicule)
class VehiculeAdmin(admin.ModelAdmin):
    list_display = ('marque', 'modele', 'get_status_display', 'prix_par_jour', 'get_agence_name', 'created_at')
    list_filter = ('statut', 'carburant', 'transmission', 'created_at')
    search_fields = ('marque', 'modele', 'immatriculation', 'localisation')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'get_eco_score')

    fieldsets = (
        ('Informations de base', {
            'fields': ('marque', 'modele', 'immatriculation', 'annee', 'couleur')
        }),
        ('Caractéristiques techniques', {
            'fields': ('carburant', 'transmission', 'nombre_places', 'kilometrage')
        }),
        ('Informations écologiques', {
            'fields': ('emissionsCO2', 'consommationEnergie', 'get_eco_score'),
            'classes': ('collapse',)
        }),
        ('Location', {
            'fields': ('prix_par_jour', 'localisation', 'statut', 'agence')
        }),
        ('Maintenance', {
            'fields': ('date_derniere_maintenance', 'prochaine_maintenance'),
            'classes': ('collapse',)
        }),
        ('Détails', {
            'fields': ('description', 'image'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['make_available', 'make_maintenance', 'make_unavailable']

    def get_agence_name(self, obj):
        if obj.agence:
            return format_html(
                '<a href="/admin/users/agence/{}/change/">{}</a>',
                obj.agence.id, obj.agence.nom
            )
        return format_html(
            '<span style="color: gray;">Aucune agence</span>'
        )

    get_agence_name.short_description = "Agence"
    get_agence_name.admin_order_field = 'agence__nom'

    def get_status_display(self, obj):
        colors = {
            'disponible': '#28a745',
            'loué': '#ffc107',
            'maintenance': '#dc3545',
            'hors_service': '#6c757d'
        }
        return format_html(
            '<span style="color: {};">● {}</span>',
            colors.get(obj.statut, '#6c757d'),
            obj.get_statut_display()
        )

    get_status_display.short_description = "Statut"
    get_status_display.admin_order_field = 'statut'

    def get_eco_score(self, obj):
        if not obj.emissionsCO2 and not obj.consommationEnergie:
            return format_html('<span style="color: gray;">Non calculé</span>')
        score = 100
        if obj.emissionsCO2:
            if obj.emissionsCO2 > 150:
                score -= 30
            elif obj.emissionsCO2 > 100:
                score -= 20
            elif obj.emissionsCO2 > 50:
                score -= 10
        if obj.consommationEnergie and obj.consommationEnergie > 10:
            score -= 10
        if obj.carburant == 'électrique':
            score += 20
        elif obj.carburant == 'hybride':
            score += 10
        score = max(0, min(100, score))
        color = '#28a745' if score >= 80 else '#ffc107' if score >= 60 else '#dc3545'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}%</span>',
            color, score
        )

    get_eco_score.short_description = "Score Éco"

    def make_available(self, request, queryset):
        queryset.update(statut='disponible')
        self.message_user(request, f"{queryset.count()} véhicules marqués comme disponibles.")

    make_available.short_description = "Marquer comme disponible"

    def make_maintenance(self, request, queryset):
        queryset.update(statut='maintenance')
        self.message_user(request, f"{queryset.count()} véhicules marqués en maintenance.")

    make_maintenance.short_description = "Marquer en maintenance"

    def make_unavailable(self, request, queryset):
        queryset.update(statut='hors_service')
        self.message_user(request, f"{queryset.count()} véhicules marqués hors service.")

    make_unavailable.short_description = "Marquer hors service"

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_user_name', 'get_vehicule_info', 'date_debut', 'date_fin', 'get_status_display', 'montant_total', 'created_at')
    list_filter = ('statut', 'created_at', 'date_debut', 'date_fin')
    search_fields = ('user__email', 'user__nom', 'vehicule__marque', 'vehicule__modele', 'commentaires')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'get_duration')
    date_hierarchy = 'date_debut'

    fieldsets = (
        ('Informations de base', {
            'fields': ('user', 'vehicule', 'statut')
        }),
        ('Période de location', {
            'fields': ('date_debut', 'date_fin', 'get_duration')
        }),
        ('Informations financières', {
            'fields': ('montant_total',)
        }),
        ('Options', {
            'fields': ('assurance_complete', 'conducteur_supplementaire', 'gps', 'siege_enfant'),
            'classes': ('collapse',)
        }),
        ('Détails', {
            'fields': ('commentaires',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_reservations', 'cancel_reservations']

    def get_user_name(self, obj):
        if obj.user:
            return format_html(
                '<a href="/admin/users/user/{}/change/">{}</a><br><small>{}</small>',
                obj.user.id, obj.user.nom, obj.user.email
            )
        return format_html(
            '<span style="color: gray;">Aucun utilisateur</span>'
        )

    get_user_name.short_description = "Utilisateur"
    get_user_name.admin_order_field = 'user__email'

    def get_vehicule_info(self, obj):
        if obj.vehicule:
            return format_html(
                '<a href="/admin/users/vehicule/{}/change/">{} {}</a><br><small>{}</small>',
                obj.vehicule.id, obj.vehicule.marque, obj.vehicule.modele, 
                obj.vehicule.immatriculation or 'Sans immatriculation'
            )
        return format_html(
            '<span style="color: gray;">Aucun véhicule</span>'
        )

    get_vehicule_info.short_description = "Véhicule"
    get_vehicule_info.admin_order_field = 'vehicule__marque'

    def get_status_display(self, obj):
        colors = {
            'en_attente': '#ffc107',
            'confirmee': '#28a745',
            'terminee': '#17a2b8',
            'annulee': '#dc3545'
        }
        return format_html(
            '<span style="color: {};">● {}</span>',
            colors.get(obj.statut, '#6c757d'),
            obj.get_statut_display()
        )

    get_status_display.short_description = "Statut"
    get_status_display.admin_order_field = 'statut'

    def get_duration(self, obj):
        if obj.date_debut and obj.date_fin:
            duration = obj.date_fin - obj.date_debut
            days = duration.days
            hours = duration.seconds // 3600
            return format_html(
                '{} jour{} et {} heure{}',
                days, 's' if days > 1 else '', hours, 's' if hours > 1 else ''
            )
        return format_html('<span style="color: gray;">Non calculé</span>')

    get_duration.short_description = "Durée"

    def approve_reservations(self, request, queryset):
        for reservation in queryset:
            if reservation.vehicule and reservation.vehicule.statut == 'disponible':
                reservation.statut = 'confirmee'
                reservation.vehicule.statut = 'loué'
                reservation.vehicule.save()
                reservation.save()
        self.message_user(request, f"{queryset.count()} réservations confirmées.")

    approve_reservations.short_description = "Confirmer les réservations"

    def cancel_reservations(self, request, queryset):
        for reservation in queryset:
            if reservation.vehicule and reservation.vehicule.statut == 'loué':
                reservation.vehicule.statut = 'disponible'
                reservation.vehicule.save()
            reservation.statut = 'annulee'
            reservation.save()
        self.message_user(request, f"{queryset.count()} réservations annulées.")

    cancel_reservations.short_description = "Annuler les réservations"

# Admin pour les défis éco-responsables
@admin.register(EcoChallenge)
class EcoChallengeAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'type', 'difficulty', 'target_value', 'unit',
        'reward_points', 'reward_credit_euros', 'duration_days',
        'is_active', 'participants_count', 'created_at'
    ]
    list_filter = ['type', 'difficulty', 'is_active', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at', 'participants_count']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('title', 'description', 'type', 'difficulty')
        }),
        ('Objectif', {
            'fields': ('target_value', 'unit', 'duration_days')
        }),
        ('Récompenses', {
            'fields': ('reward_points', 'reward_credit_euros', 'reward_badge')
        }),
        ('Paramètres', {
            'fields': ('is_active', 'max_participants', 'valid_from', 'valid_until')
        }),
        ('Statistiques', {
            'fields': ('participants_count',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def participants_count(self, obj):
        """Affiche le nombre de participants"""
        count = obj.user_challenges.count()
        return format_html(
            '<span style="font-weight: bold; color: {};">{} participants</span>',
            'green' if count > 0 else 'gray',
            count
        )
    participants_count.short_description = 'Participants'

@admin.register(UserEcoChallenge)
class UserEcoChallengeAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'challenge_title', 'status', 'progress_display',
        'progress_percentage_display', 'days_remaining_display',
        'started_at', 'deadline'
    ]
    list_filter = ['status', 'challenge__type', 'started_at', 'completed_at']
    search_fields = ['user__username', 'user__email', 'challenge__title']
    readonly_fields = ['started_at', 'progress_percentage', 'days_remaining']
    
    def challenge_title(self, obj):
        return obj.challenge.title
    challenge_title.short_description = 'Défi'
    
    def progress_display(self, obj):
        return f"{obj.progress} / {obj.challenge.target_value} {obj.challenge.unit}"
    progress_display.short_description = 'Progression'
    
    def progress_percentage_display(self, obj):
        percentage = obj.progress_percentage
        color = 'green' if percentage >= 75 else 'orange' if percentage >= 50 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color, percentage
        )
    progress_percentage_display.short_description = 'Pourcentage'
    
    def days_remaining_display(self, obj):
        days = obj.days_remaining
        color = 'red' if days <= 3 else 'orange' if days <= 7 else 'green'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} jours</span>',
            color, days
        )
    days_remaining_display.short_description = 'Jours restants'

@admin.register(EcoChallengeProgress)
class EcoChallengeProgressAdmin(admin.ModelAdmin):
    list_display = [
        'user_challenge', 'value', 'eco_score', 'co2_saved',
        'distance_km', 'recorded_at'
    ]
    list_filter = ['recorded_at', 'user_challenge__challenge__type']
    search_fields = ['user_challenge__user__username', 'user_challenge__challenge__title']
    readonly_fields = ['recorded_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user_challenge__user', 'user_challenge__challenge'
        )

@admin.register(EcoChallengeReward)
class EcoChallengeRewardAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'challenge_title', 'points_awarded', 'credit_awarded',
        'badge_awarded', 'awarded_at', 'applied_to_account'
    ]
    list_filter = ['awarded_at', 'applied_to_account']
    search_fields = ['user__username', 'user__email', 'user_challenge__challenge__title']
    readonly_fields = ['awarded_at']
    
    def challenge_title(self, obj):
        return obj.user_challenge.challenge.title
    challenge_title.short_description = 'Défi'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'user_challenge__challenge'
        )

admin.site.register(User, UserAdmin)
admin.site.site_header = "Administration VitaRenta"
admin.site.site_title = "VitaRenta Admin"
admin.site.index_title = "Gestion de la plateforme VitaRenta"
admin.site.empty_value_display = '(Aucun)'