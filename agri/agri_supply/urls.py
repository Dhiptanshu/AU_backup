from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodBatchViewSet, get_market_metrics, dashboard_view

router = DefaultRouter()
router.register(r'batches', FoodBatchViewSet)

urlpatterns = [
    path('', dashboard_view, name='dashboard'),
    path('api/agri/', include(router.urls)),
    path('api/agri/market-metrics/', get_market_metrics),
]