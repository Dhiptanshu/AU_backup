import requests
from datetime import datetime, timezone
import math

class AQIService:
    _instance = None
    CPCB_FEED_URL = "https://airquality.cpcb.gov.in/caaqms/iit_rss_feed_with_coordinates"
    STATION_POLLUTANTS_LIVE = {}
    STATIONS = [] # In-memory cache of stations with AQI

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AQIService, cls).__new__(cls)
        return cls._instance

    @staticmethod
    def _sanitize_co2(value):
        try:
            v = float(value)
            return max(350.0, min(v, 2000.0))
        except:
            return 400.0

    @classmethod
    def estimate_co2_from_pollutants(cls, pm25, pm10, no2, co):
        pm25 = (pm25 if pm25 is not None else 0)
        pm10 = (pm10 if pm10 is not None else 0)
        no2  = (no2  if no2  is not None else 0)
        co   = (co   if co   is not None else 0)

        factor = (pm25 * 1.8) + (pm10 * 0.4) + (no2 * 1.2) + (co * 50.0)
        est_raw = 400 + (factor / 20.0)
        return round(cls._sanitize_co2(est_raw), 2)

    @classmethod
    def fetch_live_data(cls):
        """Fetch and parse CPCB data."""
        try:
            resp = requests.get(cls.CPCB_FEED_URL, timeout=15)
            resp.raise_for_status()
            payload = resp.json()
        except Exception as e:
            print(f"[AQI Service] Fetch failed: {e}")
            return False

        # Normalize payload
        if isinstance(payload, list): state_objs = payload
        elif isinstance(payload, dict):
            # Try to find list in common keys
            for k in ["data", "results", "stations", "feeds"]:
                if isinstance(payload.get(k), list):
                    state_objs = payload[k]
                    break
            else:
                 # heuristic
                 for v in payload.values():
                    if isinstance(v, list) and v:
                         if isinstance(v[0], dict) and ("stateId" in v[0] or "citiesInState" in v[0]):
                             state_objs = v
                             break
                 else:
                     state_objs = []
        else: state_objs = []

        new_stations = []

        for state in state_objs:
             cities = state.get("citiesInState") or state.get("cities") or state.get("stations") or []
             # Flatten if needed
             if not isinstance(cities, list) and isinstance(state.get("stations"), list):
                 cities = [{"cityId": state.get("cityId"), "stationsInCity": state.get("stations")}]
             
             for city in cities:
                 stations_list = city.get("stationsInCity") or city.get("stations") or []
                 for st in stations_list:
                     if not isinstance(st, dict): continue
                     
                     st_name = st.get("stationName") or st.get("Station")
                     try:
                         lat = float(st.get("latitude") or st.get("lat"))
                         lon = float(st.get("longitude") or st.get("lon"))
                     except: continue

                     # Pollutants
                     pollutants_detail = []
                     pm25 = pm10 = no2 = co = None
                     
                     raw_p = st.get("pollutants") or []
                     for p in raw_p:
                         idx = str(p.get("indexId")).lower()
                         avg = p.get("avg")
                         
                         pollutants_detail.append({
                             "id": p.get("indexId"),
                             "min": p.get("min"),
                             "max": p.get("max"),
                             "avg": avg,
                             "sub_index": p.get("Hourly_sub_index")
                         })

                         try: avg_f = float(avg)
                         except: avg_f = None
                         
                         if "pm2" in idx: pm25 = pm25 or avg_f
                         elif "pm10" in idx: pm10 = pm10 or avg_f
                         elif "no2" in idx: no2 = no2 or avg_f
                         elif "co" in idx: co = co or avg_f
                     
                     est_co2 = cls.estimate_co2_from_pollutants(pm25, pm10, no2, co)
                     
                     new_stations.append({
                         "name": st_name,
                         "city": city.get("cityId") or st.get("city"),
                         "state": state.get("stateId"),
                         "lat": lat,
                         "lon": lon,
                         "aqi": st.get("airQualityIndexValue"),
                         "predominant_parameter": st.get("predominantParameter"),
                         "pollutants": pollutants_detail,
                         "co2_estimated": est_co2,
                         "live_ts": st.get("lastUpdate") or datetime.now(timezone.utc).isoformat()
                     })
        
        cls.STATIONS = new_stations
        print(f"[AQI Service] Updated {len(new_stations)} stations.")
        return True

    @classmethod
    def get_stations(cls):
        if not cls.STATIONS:
            cls.fetch_live_data()
        return cls.STATIONS
