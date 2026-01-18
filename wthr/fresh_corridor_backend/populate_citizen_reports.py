
import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fresh_corridor_backend.settings')
django.setup()

from core.models import CitizenReport, CityZone

def generate_reports():
    print("Deleting old Citizen Reports...")
    CitizenReport.objects.all().delete()
    
    zones = list(CityZone.objects.all())
    if not zones:
        print("No City Zones found! Please run seed_data.py first.")
        return

    report_types = ['EV Charging Station', 'Smart Pole', 'Public Wi-Fi', 'Smart Bin', 'Transit Hub', 'Air Monitor']
    
    # Base coordinates for Delhi
    base_lat = 28.6139
    base_lon = 77.2090
    
    count = 0
    total_to_create = 60
    
    print(f"Generating {total_to_create} realistic Smart City points...")
    
    for i in range(total_to_create):
        # Random distribution within ~10km
        lat_offset = (random.random() * 0.16) - 0.08
        lon_offset = (random.random() * 0.16) - 0.08
        
        r_type = random.choice(report_types)
        zone = min(zones, key=lambda z: (z.latitude - (base_lat + lat_offset))**2 + (z.longitude - (base_lon + lon_offset))**2)
        
        # Recent timestamp (last 24 hours)
        delta_hours = random.uniform(0, 24)
        ts = datetime.now() - timedelta(hours=delta_hours)
        
        desc_map = {
            'EV Charging Station': ['Fast Charging Available', 'Slot Empty', 'Maintenance Due'],
            'Smart Pole': ['5G Small Cell Active', 'CCTV Monitoring', 'Lighting Optimal'],
            'Public Wi-Fi': ['High Speed Zone', 'Connectivity Stable', '100 Active Users'],
            'Smart Bin': ['Bin Level: 40%', 'Bin Level: 80% (Alert)', 'Bin Cleared'],
            'Transit Hub': ['E-Rickshaw Stand', 'Metro Feeder Stop', 'Bus Shelter'],
            'Air Monitor': ['Sensor Online', 'PM2.5: 120 (Moderate)', 'Data Syncing']
        }
        
        desc = random.choice(desc_map[r_type])
        
        CitizenReport.objects.create(
            report_type=r_type,
            description=desc,
            latitude=base_lat + lat_offset,
            longitude=base_lon + lon_offset,
            image_url=None, # Optional
            status='Open',
            zone=zone, # Use ForeignKey to Zone
            timestamp=ts
        )
        count += 1
        
    print(f"Successfully created {count} new citizen reports.")

if __name__ == '__main__':
    generate_reports()
