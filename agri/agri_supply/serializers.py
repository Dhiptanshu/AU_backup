from rest_framework import serializers
from .models import FoodBatch

class FoodBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodBatch
        # ✅ REMOVED 'crop' (relationship), KEPT 'crop_name' (text)
        fields = ['id', 'batch_id', 'crop_name', 'farmer_name', 
                  'quantity_kg', 'quality_scan', 'status', 
                  'blockchain_tx_hash', 'dispatch_time', 
                  'spoilage_risk_score', 'transit_hours', 'current_temp_exposure']