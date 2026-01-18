import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fresh_corridor.settings')
django.setup()

from agri_supply.models import FoodBatch

def populate():
    print("🌱 Clearing and Refilling Database (Delhi Context)...")
    FoodBatch.objects.all().delete()
    
    # Delhi Staples: Name, Ideal Temp, Perishability (Imputed for Logic)
    crops_data = [
        ('Wheat', 25.0, 1.0), ('Tomatoes', 12.0, 2.5), 
        ('Mustard', 20.0, 1.5), ('Onions', 25.0, 1.2),
    ]

    # North Indian Farmer Names (Punjab/Haryana/UP Corridor)
    farmers = ["Ram Singh (Punjab)", "Harjeet Singh", "Yadav Logistics (UP)", "Green Haryana Co"]

    # 1. STATIC VERIFIED BATCHES
    print("🔒 Creating Azadpur Registry...")
    for _ in range(6):
        crop_name, ideal_temp, _ = random.choice(crops_data)
        FoodBatch.objects.create(
            crop_name=crop_name,
            farmer_name=random.choice(farmers),
            quantity_kg=random.randint(3000, 8000),
            current_temp_exposure=ideal_temp,
            transit_hours=5.0,
            status='VERIFIED',
            spoilage_risk_score=0.0,
            blockchain_tx_hash=f"0x{random.getrandbits(256):064x}"
        )

    # 2. LIVE MOVING BATCHES
    print("🚛 Dispatching Trucks from Singhu Border...")
    for _ in range(8):
        crop_name, ideal_temp, _ = random.choice(crops_data)
        FoodBatch.objects.create(
            crop_name=crop_name,
            farmer_name=random.choice(farmers),
            quantity_kg=random.randint(1000, 4000),
            current_temp_exposure=ideal_temp + random.uniform(0, 3), # Delhi Heat
            transit_hours=random.uniform(2, 6),
            status='IN_TRANSIT',
            spoilage_risk_score=random.uniform(10, 40)
        )
    print("✅ Delhi Data Ready!")

if __name__ == '__main__':
    populate()