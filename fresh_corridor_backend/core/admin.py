from django.contrib import admin
from .models import (
    CityZone, WeatherLog, Hospital, TrafficStats, RealTimeTraffic,
    HealthStats, AgriSupply, CitizenReport
)

@admin.register(CityZone)
class CityZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'latitude', 'longitude', 'risk_level', 'area_type']
    list_filter = ['risk_level', 'area_type', 'average_income_tier']
    search_fields = ['name']

@admin.register(WeatherLog)
class WeatherLogAdmin(admin.ModelAdmin):
    list_display = ['zone', 'timestamp', 'temperature_c', 'air_quality_index']
    list_filter = ['zone', 'timestamp']
    date_hierarchy = 'timestamp'

@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    list_display = ['name', 'zone', 'total_beds_icu', 'occupied_beds_icu', 'is_live_data']
    list_filter = ['zone', 'is_live_data']
    search_fields = ['name']

@admin.register(TrafficStats)
class TrafficStatsAdmin(admin.ModelAdmin):
    list_display = ['zone', 'timestamp', 'congestion_level', 'is_road_closed']
    list_filter = ['zone', 'is_road_closed', 'timestamp']
    date_hierarchy = 'timestamp'

@admin.register(RealTimeTraffic)
class RealTimeTrafficAdmin(admin.ModelAdmin):
    list_display = ['latitude', 'longitude', 'timestamp', 'congestion_score', 'current_speed', 'road_closure']
    list_filter = ['zone', 'road_closure', 'timestamp']
    date_hierarchy = 'timestamp'
    readonly_fields = ['timestamp']

@admin.register(HealthStats)
class HealthStatsAdmin(admin.ModelAdmin):
    list_display = ['zone', 'timestamp', 'respiratory_cases_active']
    list_filter = ['zone', 'timestamp']
    date_hierarchy = 'timestamp'

@admin.register(AgriSupply)
class AgriSupplyAdmin(admin.ModelAdmin):
    list_display = ['crop_type', 'quantity_kg', 'farmer_name', 'origin_zone', 'harvest_date']
    list_filter = ['crop_type', 'origin_zone', 'harvest_date']
    search_fields = ['farmer_name', 'crop_type']

@admin.register(CitizenReport)
class CitizenReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'zone', 'timestamp']
    list_filter = ['report_type', 'zone', 'timestamp']
    date_hierarchy = 'timestamp'
    search_fields = ['description']

