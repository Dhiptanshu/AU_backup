import os

# REWRITE script.js TO MATCH YOUR HTML ID ("feed-container")
script_content = """
const API_BASE = "http://127.0.0.1:8000/api/agri";
let currentFilter = 'All';

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
    fetchMarketData();
    // Auto-refresh every 5s
    setInterval(fetchData, 5000);
});

// --- 1. HANDLE FORM SUBMIT & MINTING ---
async function handleVerification(event) {
    event.preventDefault();
    const btn = document.querySelector('.btn-verify');
    const statusDiv = document.getElementById('mint-status');
    
    // UI Feedback
    btn.innerHTML = "⏳ Uploading...";
    btn.disabled = true;

    // Prepare Data
    const formData = new FormData();
    formData.append('farmer_name', document.getElementById('farmerName').value);
    formData.append('crop_name', document.getElementById('cropType').value);
    formData.append('quantity_kg', document.getElementById('quantity').value);
    
    // Handle Image
    const fileInput = document.getElementById('cropPhoto');
    if(fileInput && fileInput.files[0]) {
        formData.append('quality_scan', fileInput.files[0]);
    }

    try {
        // A. Upload to Database
        const res = await fetch(`${API_BASE}/batches/`, {
            method: 'POST',
            body: formData
        });
        
        if(!res.ok) throw new Error("Upload Failed");
        const data = await res.json();
        
        // B. Trigger Blockchain Mint
        statusDiv.innerHTML = `<span style="color:orange">📡 Minting to Sepolia...</span>`;
        btn.innerHTML = "🔗 Minting...";

        const chainRes = await fetch(`${API_BASE}/batches/${data.id}/verify_chain/`, { method: 'POST' });
        const chainData = await chainRes.json();
        
        // C. Success
        statusDiv.innerHTML = `<span style="color:#10b981">✅ Minted! TX: ${chainData.tx_hash.substring(0,8)}...</span>`;
        document.getElementById('entry-form').reset();
        
        // D. Refresh Feed Immediately
        fetchData();

    } catch (e) {
        console.error(e);
        statusDiv.innerHTML = `<span style="color:red">❌ Error: ${e.message}</span>`;
    } finally {
        btn.innerHTML = "🔗 Verify & Mint on Sepolia";
        btn.disabled = false;
    }
}

// --- 2. FETCH FEED (The Fix) ---
async function fetchData() {
    // ✅ FIX: Target the container that ACTUALLY exists in your HTML
    const container = document.getElementById("feed-container");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE}/batches/`);
        if (!response.ok) throw new Error("API Offline");
        const data = await response.json();

        // Clear container
        container.innerHTML = "";

        if (data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b">No shipments yet.</div>';
            return;
        }

        // Render Cards
        data.forEach(batch => {
            const card = document.createElement("div");
            // Choose Style based on Status
            if (batch.status === 'VERIFIED') {
                card.className = "cargo-card verified";
                card.innerHTML = createVerifiedHTML(batch);
            } else {
                card.className = "cargo-card in-transit";
                card.innerHTML = createLiveHTML(batch);
            }
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Feed Error:", error);
    }
}

// --- 3. HTML GENERATORS ---
function createLiveHTML(batch) {
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:1.5rem">${getEmoji(batch.crop_name)}</span>
            <span style="background:#f59e0b22; color:#d97706; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">⏳ IN TRANSIT</span>
        </div>
        <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px;">${batch.crop_name}</div>
        <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:10px;">👤 ${batch.farmer_name} | 📦 ${batch.quantity_kg}kg</div>
        
        <div style="background:#334155; height:6px; border-radius:3px; overflow:hidden; margin-top:8px;">
            <div style="width:${batch.spoilage_risk_score}%; background:${getColor(batch.spoilage_risk_score)}; height:100%;"></div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748b; margin-top:4px;">
            <span>Risk: ${batch.spoilage_risk_score.toFixed(0)}%</span>
            <span>Temp: ${batch.current_temp_exposure.toFixed(1)}°C</span>
        </div>
    `;
}

function createVerifiedHTML(batch) {
    const txHash = batch.blockchain_tx_hash ? batch.blockchain_tx_hash.substring(0, 16) + '...' : 'Pending';
    const scanBtn = batch.quality_scan ? `<a href="${batch.quality_scan}" target="_blank" style="color:#3b82f6; text-decoration:none; font-size:0.8rem;">📷 View Scan</a>` : '';
    
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:1.5rem">${getEmoji(batch.crop_name)}</span>
            <span style="background:#10b98122; color:#10b981; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">✅ ON CHAIN</span>
        </div>
        <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px;">${batch.crop_name}</div>
        <div style="color:#94a3b8; font-size:0.9rem; margin-bottom:10px;">👤 ${batch.farmer_name} | 📦 ${batch.quantity_kg}kg</div>
        
        <div style="background:#0f172a; padding:8px; border-radius:6px; margin-top:5px; border:1px solid #334155;">
            <div style="font-family:monospace; color:#64748b; font-size:0.75rem; margin-bottom:4px;">TX: ${txHash}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <a href="https://sepolia.etherscan.io/tx/${batch.blockchain_tx_hash}" target="_blank" style="color:#10b981; text-decoration:none; font-size:0.8rem; font-weight:bold;">🔗 Etherscan</a>
                ${scanBtn}
            </div>
        </div>
    `;
}

// --- 4. MARKET DATA ---
async function fetchMarketData() {
    const container = document.getElementById("price-grid");
    if(!container) return;
    try {
        const res = await fetch(`${API_BASE}/market-metrics/`);
        const data = await res.json();
        container.innerHTML = data.commodities.map(c => `
            <div class="price-card" style="border-left: 4px solid ${c.trend === 'up' ? '#ef4444' : '#10b981'};">
                <div style="font-weight:bold; color:#f8fafc;">${getEmoji(c.commodity)} ${c.commodity}</div>
                <div style="font-size:1.4rem; font-weight:800; color:#f8fafc; margin:5px 0;">₹${c.modal_price}</div>
                <div style="font-size:0.8rem; color:#94a3b8;">Stock: ${c.city_stock_kg}kg</div>
            </div>
        `).join('');
    } catch(e) { console.log("Market Data Offline"); }
}

// Helpers
function getEmoji(name) { return { 'Tomatoes':'🍅', 'Onions':'🧅', 'Wheat':'🌾', 'Mustard':'🌼' }[name] || '📦'; }
function getColor(risk) { return risk > 70 ? '#ef4444' : risk > 40 ? '#f59e0b' : '#10b981'; }

// Sim
async function runSimulation() {
    await fetch(`${API_BASE}/batches/refresh_risks/`, { method: 'POST' });
    fetchData();
}
"""

with open('script.js', 'w') as f:
    f.write(script_content.strip())

print("✅ script.js has been fixed to target 'feed-container'")
