# backend/utils.py (New file for shared utilities)
import logging

logger = logging.getLogger(__name__)

def calculate_eco_score(emissionsCO2, carburant):
    """Calculate the eco score for a vehicle."""
    if emissionsCO2 < 0:
        logger.warning("Negative CO2 emissions detected, corrected to 0")
        emissionsCO2 = 0
    max_co2 = 300
    co2_score = 1 - (emissionsCO2 / max_co2) if emissionsCO2 else 1
    fuel_bonus = 0.3 if carburant.lower() in ["électrique", "hybride"] else 0
    return min(1.0, co2_score + fuel_bonus)