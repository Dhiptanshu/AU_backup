import time
import random
import json
from django.core.management.base import BaseCommand
from core.models import Hospital, WeatherLog, HealthStats, CityZone

class Command(BaseCommand):
    help = 'Simulates real-time fluctuations in hospital capacity and health/weather stats'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting Health Monitor Simulation... (Press Ctrl+C to stop)'))
        
        while True:
            try:
                # 1. Update Hospitals
                hospitals = Hospital.objects.all()
                if not hospitals.exists():
                    self.stdout.write(self.style.WARNING("No hospitals found! Generating synthetic data..."))
                    hospital_names = [
                        "Delhi City General Hospital", "Capital Care Medical Center", "North Delhi Trauma Center",
                        "South Extension Speciality Hospital", "Yamuna Bank Trust Hospital", "Red Fort Memorial Hospital",
                        "Dwarka Community Health Center", "Rohini Super Speciality", "Okhla Industrial Medical Bay",
                        "Connaught Place Emergency Center", "Lajpat Nagar Maternity Home", "Karol Bagh Chest Clinic"
                    ]
                    zones = list(CityZone.objects.all())
                    if not zones: # Last resort fallback if zones missing
                         z = CityZone.objects.create(name="Zone A (Downtown)", latitude=28.6304, longitude=77.2177, area_type="Commercial")
                         zones = [z]

                    for name in hospital_names:
                        is_big = "General" in name or "Speciality" in name
                        Hospital.objects.create(
                            name=name,
                            zone=random.choice(zones),
                            total_beds_icu=random.randint(50, 150) if is_big else random.randint(20, 60),
                            occupied_beds_icu=random.randint(10, 40),
                            total_beds_general=random.randint(300, 800) if is_big else random.randint(100, 250),
                            occupied_beds_general=random.randint(50, 200),
                            oxygen_supply_level=random.randint(80, 100),
                            is_live_data=False
                        )
                    self.stdout.write(self.style.SUCCESS(f"Created {len(hospital_names)} simulated hospitals."))
                    hospitals = Hospital.objects.all()

                for h in hospitals:
                    # Randomly discharge or admit patient
                    fluctuation = random.choice([-1, 0, 1, 2])
                    h.occupied_beds_icu = max(0, min(h.total_beds_icu, h.occupied_beds_icu + fluctuation))
                    
                    gen_flux = random.choice([-2, -1, 0, 1, 2, 3])
                    h.occupied_beds_general = max(0, min(h.total_beds_general, h.occupied_beds_general + gen_flux))
                    
                    # AUTO-SCALE: If data is legacy (too small), boost it
                    if h.total_beds_icu < 20: 
                        h.total_beds_icu = random.randint(30, 80)
                        h.occupied_beds_icu = int(h.total_beds_icu * 0.7)
                    if h.total_beds_general < 100:
                        h.total_beds_general = random.randint(150, 400)
                        h.occupied_beds_general = int(h.total_beds_general * 0.8)

                    # Oxygen supply slight fluctuation
                    h.oxygen_supply_level = max(0, min(100, h.oxygen_supply_level + random.uniform(-2, 2)))
                    h.save()
                    
                # 2. Update Environmental Factors (AQI, Temp causes Health changes)
                zones = CityZone.objects.all()
                for zone in zones:
                    weather = WeatherLog.objects.filter(zone=zone).last()
                    health = HealthStats.objects.filter(zone=zone).last()
                    
                    if weather:
                        # AQI drift
                        weather.air_quality_index = max(0, weather.air_quality_index + random.randint(-5, 8))
                        
                        # Simulate Pollutant Details
                        pm25 = int(weather.air_quality_index * random.uniform(0.7, 0.9))
                        pm10 = int(weather.air_quality_index * random.uniform(0.8, 1.1))
                        no2 = random.randint(20, 80)
                        so2 = random.randint(10, 40)
                        dummy_pollutants = [
                            {"indexId": "PM2.5", "avg": pm25, "Hourly_sub_index": pm25},
                            {"indexId": "PM10", "avg": pm10, "Hourly_sub_index": pm10},
                            {"indexId": "NO2", "avg": no2, "Hourly_sub_index": no2},
                            {"indexId": "SO2", "avg": so2, "Hourly_sub_index": so2}
                        ]
                        weather.pollutant_details = json.dumps(dummy_pollutants)
                        weather.save()
                    
                    if health and weather:
                         # 5% chance of case spike if AQI is bad
                        if weather.air_quality_index > 200 and random.random() > 0.95:
                            health.respiratory_cases_active += random.randint(1, 5)
                        elif random.random() > 0.8: # Random recovery
                            health.respiratory_cases_active = max(0, health.respiratory_cases_active - 1)
                        health.save()
                
                self.stdout.write(f"Updated live stats at {time.strftime('%H:%M:%S')}")
                time.sleep(5) # Update every 5 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error: {e}"))
                time.sleep(5)
