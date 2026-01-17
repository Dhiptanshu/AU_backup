from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CityZone, WeatherLog, Hospital, TrafficStats, AgriSupply, CitizenReport
from .serializers import (
    CityZoneSerializer, WeatherLogSerializer, HospitalSerializer, 
    TrafficStatsSerializer, AgriSupplySerializer, CitizenReportSerializer
)

# --- Tab 1: Planner View ---
class PlannerViewSet(viewsets.ModelViewSet):
    queryset = CityZone.objects.all()
    serializer_class = CityZoneSerializer

    @action(detail=True, methods=['get'])
    def full_status(self, request, pk=None):
        """Returns consolidated status for a zone (Weather, Traffic, Hospitals)"""
        zone = self.get_object()
        weather = WeatherLog.objects.filter(zone=zone).last()
        traffic = TrafficStats.objects.filter(zone=zone).last()
        hospitals = Hospital.objects.filter(zone=zone)
        
        return Response({
            'zone': CityZoneSerializer(zone).data,
            'weather': WeatherLogSerializer(weather).data if weather else None,
            'traffic': TrafficStatsSerializer(traffic).data if traffic else None,
            'hospitals': HospitalSerializer(hospitals, many=True).data
        })

# --- Tab 2: Health View ---
class HealthViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all()
    serializer_class = HospitalSerializer

# --- Tab 3: Farmer View ---
class FarmerViewSet(viewsets.ModelViewSet):
    queryset = AgriSupply.objects.all()
    serializer_class = AgriSupplySerializer

# --- Tab 4: Citizen View ---
class CitizenViewSet(viewsets.ModelViewSet):
    queryset = CitizenReport.objects.all()
    serializer_class = CitizenReportSerializer
