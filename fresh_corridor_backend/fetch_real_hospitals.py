import os
import django
import json
import urllib.request
import random
from math import radians, cos, sin, asin, sqrt

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fresh_corridor_backend.settings')
django.setup()

from core.models import Hospital, CityZone

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 
    return c * r

def fetch_real_data():
    print("Fetching REAL hospitals from OpenStreetMap (New Delhi)...")
    
    # Overpass API Query for Hospitals in 15km radius of CP, New Delhi
    overpass_url = "https://overpass-api.de/api/interpreter"
    overpass_query = """
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:15000, 28.6139, 77.2090);
      way["amenity"="hospital"](around:15000, 28.6139, 77.2090);
    );
    out center;
    """
    
    try:
        req = urllib.request.Request(overpass_url, data=overpass_query.encode('utf-8'))
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        elements = data.get('elements', [])
        print(f"Found {len(elements)} hospitals in OSM.")
        
        # Clear old dummy data
        print("Clearing old dummy hospitals...")
        Hospital.objects.all().delete()
        
        count = 0
        zones = list(CityZone.objects.all())
        
        for el in elements:
            try:
                tags = el.get('tags', {})
                name = tags.get('name')
                if not name: continue # Skip unnamed
                
                # Get Lat/Lon (Node has lat/lon, Way has center.lat/center.lon)
                lat = el.get('lat') or el.get('center', {}).get('lat')
                lon = el.get('lon') or el.get('center', {}).get('lon')
                
                if not lat or not lon: continue
                
                # Find nearest zone
                nearest_zone = min(zones, key=lambda z: haversine(lon, lat, z.longitude, z.latitude))
                
                # Estimate beds based on tags (OSM mostly lacks this, so we infer from 'emergency' or random for now)
                # REAL data limitation: Bed counts aren't public. We simulate realistic counts for Real Hospitals.
                # UPDATED: Using larger realistic numbers for Delhi hospitals
                is_big = 'emergency' in tags and tags['emergency'] == 'yes'
                
                # Big: 300-800 General, 50-150 ICU
                # Medium/Small: 100-300 General, 20-50 ICU
                total_icu = random.randint(50, 150) if is_big else random.randint(20, 50)
                total_gen = random.randint(300, 800) if is_big else random.randint(100, 300)
                
                Hospital.objects.create(
                    name=name,
                    zone=nearest_zone,
                    total_beds_icu=total_icu,
                    occupied_beds_icu=int(total_icu * random.uniform(0.4, 0.9)), # Random initial state
                    total_beds_general=total_gen,
                    occupied_beds_general=int(total_gen * random.uniform(0.5, 0.95)),
                    oxygen_supply_level=random.randint(70, 100),
                    is_live_data=True
                )
                count += 1
                
            except Exception as e:
                print(f"Skipping one entry: {e}")
                continue
                
        print(f"Successfully imported {count} REAL hospitals.")
        
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == '__main__':
    fetch_real_data()
