import os

# 1. FIX fresh_corridor/urls.py (The one causing the crash)
project_urls = """
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # Delegate EVERYTHING to the agri_supply app
    path('', include('agri_supply.urls')), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.BASE_DIR)
"""

# 2. FIX agri_supply/views.py (Add the missing dashboard_view)
app_views = """
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.http import JsonResponse
from django.db.models import Sum
from .models import FoodBatch
from .serializers import FoodBatchSerializer
from web3 import Web3
import os
import random
from dotenv import load_dotenv

load_dotenv()

SEPOLIA_URL = os.getenv('SEPOLIA_URL')
PRIVATE_KEY = os.getenv('PRIVATE_KEY')
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
CONTRACT_ABI = '[{"inputs":[{"internalType":"string","name":"_batchId","type":"string"},{"internalType":"string","name":"_farmerName","type":"string"},{"internalType":"string","name":"_crop","type":"string"},{"internalType":"uint256","name":"_quantity","type":"uint256"}],"name":"verifyBatch","outputs":[],"stateMutability":"nonpayable","type":"function"}]'

# ✅ THIS WAS MISSING
def dashboard_view(request):
    return render(request, 'index.html')

class FoodBatchViewSet(viewsets.ModelViewSet):
    queryset = FoodBatch.objects.all().order_by('-dispatch_time')
    serializer_class = FoodBatchSerializer

    def create(self, request, *args, **kwargs):
        crop = request.data.get('crop_name', 'Wheat')
        base_risk = 5.0 if crop in ['Tomatoes', 'Onions'] else 1.0
        data = request.data.copy()
        data['spoilage_risk_score'] = base_risk
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['post'])
    def refresh_risks(self, request):
        batches = FoodBatch.objects.filter(status='IN_TRANSIT')
        count = 0
        for b in batches:
            b.transit_hours += 5.0
            b.current_temp_exposure += random.uniform(0.5, 2.0)
            b.spoilage_risk_score = min(100, b.spoilage_risk_score + 5)
            b.save()
            count += 1
        return Response({'message': f"Updated {count} trucks", 'status': 'success'})

    @action(detail=True, methods=['post'])
    def verify_chain(self, request, pk=None):
        batch = self.get_object()
        try:
            w3 = Web3(Web3.HTTPProvider(SEPOLIA_URL))
            if not w3.is_connected(): raise Exception("No Chain Connection")
            account = w3.eth.account.from_key(PRIVATE_KEY)
            contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
            tx = contract.functions.verifyBatch(
                str(batch.batch_id), batch.farmer_name, str(batch.crop_name), int(batch.quantity_kg)
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 2000000,
                'gasPrice': w3.to_wei('20', 'gwei')
            })
            signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            batch.blockchain_tx_hash = w3.to_hex(tx_hash)
            batch.status = 'VERIFIED'
            batch.spoilage_risk_score = 0
            batch.save()
            return Response({'status': 'minted', 'tx_hash': batch.blockchain_tx_hash})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_market_metrics(request):
    data = []
    prices = {'Wheat': 26.5, 'Mustard': 54.0, 'Tomatoes': 48.0, 'Onions': 72.0}
    for crop, price in prices.items():
        total = FoodBatch.objects.filter(crop_name=crop).aggregate(Sum('quantity_kg'))['quantity_kg__sum'] or 0
        trend = "up" if total < 2000 else "stable"
        alert = True if total < 2000 else False
        data.append({
            "commodity": crop, "modal_price": price, "trend": trend,
            "scarcity_alert": alert, "city_stock_kg": total,
        })
    return JsonResponse({"commodities": data})
"""

# 3. FIX agri_supply/urls.py (Ensure it maps correctly)
app_urls = """
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
"""

def write_file(path, content):
    with open(path, 'w') as f:
        f.write(content.strip())
    print(f"✅ Repaired {path}")

if __name__ == "__main__":
    write_file('fresh_corridor/urls.py', project_urls)
    write_file('agri_supply/views.py', app_views)
    write_file('agri_supply/urls.py', app_urls)
    print("\n🚀 CRASH FIXED. Run 'python manage.py runserver' now.")
