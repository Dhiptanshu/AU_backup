from django.db import models
from django.utils import timezone

class FoodBatch(models.Model):
    batch_id = models.CharField(max_length=20, unique=True, editable=False)
    farmer_name = models.CharField(max_length=100)
    crop_name = models.CharField(max_length=50) # Storing "Tomatoes" directly
    quantity_kg = models.FloatField()
    
    # ✅ Image Upload
    quality_scan = models.ImageField(upload_to='scans/', blank=True, null=True)

    # ✅ Simulation Fields (Required for Stress Test)
    transit_hours = models.FloatField(default=0.0)
    current_temp_exposure = models.FloatField(default=24.0)
    spoilage_risk_score = models.FloatField(default=0.0)

    # Status
    STATUS_CHOICES = [('IN_TRANSIT', 'In Transit'), ('VERIFIED', 'Verified')]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_TRANSIT')
    
    blockchain_tx_hash = models.CharField(max_length=100, blank=True, null=True)
    dispatch_time = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.batch_id:
            import uuid
            self.batch_id = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.crop_name} - {self.farmer_name}"