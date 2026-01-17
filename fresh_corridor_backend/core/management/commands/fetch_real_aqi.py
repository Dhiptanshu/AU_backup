import urllib.request
import json
import ssl
from django.core.management.base import BaseCommand
from core.models import CityZone, WeatherLog
from core.utils import haversine

class Command(BaseCommand):
    help = 'Fetches real-time AQI data from CPCB JSON feed'

    def handle(self, *args, **kwargs):
        url = "https://airquality.cpcb.gov.in/caaqms/iit_rss_feed_with_coordinates"
        self.stdout.write(f"Fetching CPCB Data (JSON) from {url}...")
        
        try:
            # Setup SSL Context (Unverified) and Headers
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                raw_data = response.read().decode('utf-8')
                # The data might be a dictionary with keys like 'rss' or a list. 
                # From debug output: {"siteId":"site_5... suggests a Dictionary or List of Obj.
                # Let's handle both.
                try:
                    data = json.loads(raw_data)
                except json.JSONDecodeError:
                    # Sometimes APIs wrap JSON in XML or HTML.
                    # If valid JSON, we proceed.
                    self.stdout.write(self.style.ERROR("Failed to decode JSON"))
                    return

            # CPCB JSON Structure Assumption (based on typical CPCB feeds & debug output)
            # Usually strict key names. Let's iterate safely.
            # If it's a dict with one key 'stations', use that. 
            # If it's a raw list, use that.
            
                # Recursive finder for "stationsInCity" or lists with "siteId"
                items = []
                def find_stations(obj):
                    if isinstance(obj, dict):
                        # Pattern 1: stationsInCity key (Standard CPCB structure)
                        if 'stationsInCity' in obj and isinstance(obj['stationsInCity'], list):
                            items.extend(obj['stationsInCity'])
                        
                        # Pattern 2: Single station dict (has siteId and latitude)
                        # We must be careful not to add the parent container if it just *contains* stations
                        elif 'siteId' in obj and ('latitude' in obj or 'lat' in obj):
                            items.append(obj)
                        
                        # Recurse values
                        for k, v in obj.items():
                            if isinstance(v, (dict, list)):
                                find_stations(v)
                    
                    elif isinstance(obj, list):
                        for i in obj:
                            find_stations(i)

                find_stations(data)
                
                # Deduplicate by siteId or Name
                unique_stations = {}
                for i in items:
                    # Prefer siteId, fallback to name, fallback to lat/lon string
                    key = i.get('siteId') or i.get('stationName') or i.get('name') or f"{i.get('latitude')}_{i.get('longitude')}"
                    if key not in unique_stations:
                        unique_stations[key] = i
                
                items = list(unique_stations.values())

                self.stdout.write(f"Found {len(items)} unique stations after deep recursive search.")
                # Debug: Print first 3 names
                if len(items) > 0:
                     names = [i.get('stationName') or i.get('name') or 'Unnamed' for i in items[:3]]
                     self.stdout.write(f"Sample Stations: {names}")
            
            zones = list(CityZone.objects.all())
            count = 0
            
            for item in items:
                try:
                    # Extract Data
                    # Keys from CPCB are usually PascalCase or camelCase. 
                    # We look for lat/lon/aqi variants.
                    
                    # 1. Coordinates
                    lat = item.get('latitude') or item.get('lat')
                    lon = item.get('longitude') or item.get('lng') or item.get('lon')
                    
                    if not lat or not lon: continue
                    lat, lon = float(lat), float(lon)
                    
                    
                    # 2. Location Name
                    name = item.get('siteName') or item.get('station') or item.get('stationName') or item.get('id')
                    
                    # 3. AQI / PM2.5
                    # Keys: airQualityIndexValue (User snippet), aqi, or pollutants list
                    aqi = item.get('airQualityIndexValue') or item.get('aqi')
                    
                    if aqi is None:
                        # try nested pollutant
                        pollutants = item.get('pollutants', [])
                        for p in pollutants:
                            if p.get('indexId') == 'PM2.5' or p.get('id') == 'PM2.5': # indexId from user snippet
                                aqi = p.get('aqi') or p.get('avg')
                                break
                    
                    # Fallback or sanitization
                    if aqi is None or aqi == 'NA' or aqi == '-': 
                        continue
                    try:
                        aqi = int(float(aqi))
                    except:
                        continue
                    
                    # 4. Create or Update Specific Zone for this Station
                    # We want ALL stations, so we create a zone if it doesn't exist by name/location
                    
                    # Check for existing zone by unique Name or very close proximity (<50m)
                    # Ideally use name as unique identifier
                    zone, created = CityZone.objects.get_or_create(
                        name=name,
                        defaults={
                            'latitude': lat,
                            'longitude': lon,
                            'area_type': 'Monitoring Station'
                        }
                    )
                    
                    if not created:
                         # Ensure coords are precise if it was originally an imprecise mapped zone?
                         # Or just trust the name match. Let's update type effectively.
                         zone.area_type = 'Monitoring Station'
                         zone.latitude = lat # Update potential shift
                         zone.longitude = lon
                         zone.save()

                    # 5. Update WeatherLog
                    WeatherLog.objects.create(
                        zone=zone,
                        temperature_c=item.get('temp', 30.0), # Use temp if available
                        precipitation_mm=0,
                        wind_speed_kmh=10,
                        visibility_km=5,
                        air_quality_index=aqi,
                        pollutant_details=json.dumps(item.get('pollutants', []))
                    )
                    count += 1
                    self.stdout.write(f"{'Created' if created else 'Updated'} Station Zone: {name} | AQI: {aqi}")
                    
                except Exception as e:
                    # print(e)
                    continue

            self.stdout.write(self.style.SUCCESS(f"Successfully updated AQI for {count} zones from CPCB."))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))
