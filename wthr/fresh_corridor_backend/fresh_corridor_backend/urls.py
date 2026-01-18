from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    PlannerViewSet, HealthViewSet, FarmerViewSet, CitizenViewSet, 
    dashboard, get_stations_api, traffic_monitor, get_traffic_data, get_simulated_weather
)

router = DefaultRouter()
router.register(r'planner', PlannerViewSet, basename='planner')
router.register(r'health', HealthViewSet, basename='health')
router.register(r'farmer', FarmerViewSet, basename='farmer')
router.register(r'citizen', CitizenViewSet, basename='citizen')

urlpatterns = [
    path('admin/', admin.site.urls),
    # Specific API endpoints MUST come before the router include to avoid being swallowed
    path('api/get_stations', get_stations_api, name='get_stations'),
    path('api/weather/', get_simulated_weather, name='get_simulated_weather'),
    path('api/traffic/', get_traffic_data, name='get_traffic_data'),
    path('api/', include(router.urls)),
    path('', dashboard, name='dashboard'),
    path('traffic/', traffic_monitor, name='traffic_monitor'),
]
