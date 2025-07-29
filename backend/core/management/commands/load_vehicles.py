# -*- coding: utf-8 -*-
import os, json
from django.core.management.base import BaseCommand
from populate_core_vehicule import populate_core_vehicule
from django.conf import settings

class Command(BaseCommand):
    help = "Populate (or refresh) the MongoDB core_vehicule collection from the CSV"

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default=os.path.join(settings.BASE_DIR, 'data', 'recommendation_dataset_cars_2025.csv'),
            help='Path to the vehicles CSV file'
        )

    def handle(self, *args, **options):
        csv_path = options['csv']
        if not os.path.exists(csv_path):
            self.stderr.write(self.style.ERROR(f'CSV file not found: {csv_path}'))
            return

        try:
            populate_core_vehicule(csv_path)
            self.stdout.write(self.style.SUCCESS('✅ core_vehicule collection refreshed'))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'❌ Failed to load vehicles: {exc}'))