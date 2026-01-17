from core.models import CityZone, WeatherLog, TrafficStats, HealthStats, Hospital

class SimulationService:
    @staticmethod
    def calculate_resilience_metrics(zone_id):
        try:
            zone = CityZone.objects.get(pk=zone_id)
            weather = WeatherLog.objects.filter(zone=zone).last()
            health = HealthStats.objects.filter(zone=zone).last()
            hospitals = Hospital.objects.filter(zone=zone)
            
            # 1. AQI Score (0-100, higher is better)
            # AQI > 300 is 0 score, AQI < 50 is 100 score.
            aqi_val = weather.air_quality_index if weather else 150
            aqi_score = max(0, min(100, 100 - ((aqi_val - 50) * 0.4)))
            
            # 2. Medical Capacity Score
            # Based on ICU bed availability
            total_beds = sum(h.total_beds_icu for h in hospitals)
            occupied_beds = sum(h.occupied_beds_icu for h in hospitals)
            if total_beds > 0:
                occupancy_rate = occupied_beds / total_beds
                medical_score = max(0, min(100, (1 - occupancy_rate) * 100))
            else:
                medical_score = 0
                
            # 3. Nutrition/Supply Score (Mocked for now as we don't have deep supply stats yet)
            # Default to medium-high unless it's a "Low Income" area, then lower.
            nutrition_score = 40 if zone.average_income_tier == 'Low' else 85
            
            # Overall Resilience Metric
            overall_score = (aqi_score * 0.4) + (medical_score * 0.4) + (nutrition_score * 0.2)
            
            return {
                "zone_name": zone.name,
                "overall_resilience_score": round(overall_score, 1),
                "metrics": {
                    "aqi_score": round(aqi_score, 1),
                    "medical_capacity_score": round(medical_score, 1),
                    "nutrition_access_score": nutrition_score
                }
            }
        except CityZone.DoesNotExist:
            return None

    @staticmethod
    def run_what_if_simulation(zone_id, modifiers):
        """
        modifiers: dict with keys like 'rain_intensity', 'traffic_load' (percentage increases)
        """
        try:
            zone = CityZone.objects.get(pk=zone_id)
            current_traffic = TrafficStats.objects.filter(zone=zone).last()
            
            rain_increase = float(modifiers.get('rain_intensity', 0))
            traffic_increase = float(modifiers.get('traffic_load', 0))
            
            # --- Simulation Logic ---
            
            # 1. Traffic Congestion Prediction
            base_congestion = current_traffic.congestion_level if current_traffic else 0.3
            # Rain adds 0.5% congestion per 1% rain intensity
            # User input adds directly to load
            predicted_congestion = base_congestion + (rain_increase * 0.005) + (traffic_increase * 0.01)
            predicted_congestion = min(1.0, max(0.0, predicted_congestion))
            
            # 2. Ambulance Response Time Delay
            # Baseline 15 mins. Congestion > 0.7 adds exponential delay.
            base_time = 15
            delay_factor = 1.0
            if predicted_congestion > 0.5:
                delay_factor = 1 + (predicted_congestion - 0.5) * 2 # up to 2x multiplier
                
            predicted_response_time = base_time * delay_factor
            
            # 3. Flood Risk
            # Simple threshold: If Rain > 80%, high risk.
            flood_risk_prob = min(100, rain_increase * 0.8)
            if zone.latitude < 28.5: # Mock: South zones more prone
                flood_risk_prob += 10
            
            return {
                "status": "success",
                "scenarios": {
                    "traffic_congestion_level": round(predicted_congestion, 2),
                    "traffic_congestion_display": f"{int(predicted_congestion*100)}%",
                    "ambulance_response_time_min": round(predicted_response_time, 1),
                    "flood_risk_probability": round(flood_risk_prob, 1)
                },
                "alerts": [
                    "⚠️ High Flood Risk Detected" if flood_risk_prob > 70 else None,
                    "🚑 Ambulance Delays Likely" if predicted_response_time > 20 else None
                ]
            }
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
