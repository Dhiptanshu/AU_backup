// 1. CESIUM SETUP
// Token from .env
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNjFjNDkyOS1hZmZlLTQ0YmUtODViOS1lZDUxMDExYWIwZTciLCJpZCI6MzQ2Mjc4LCJpYXQiOjE3NTkzMTY3NDd9.awxOsdnDLokLuS9p-NWVaIJSGk8u5r46bjxz1jh2pi8';

let viewer = null;
const API_BASE = 'http://127.0.0.1:8000/api';

function initCesium() {
    if (viewer) return;
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        timeline: false,
        animation: false
    });

    // Fly to New Delhi
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(77.2090, 28.6139, 5000),
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-45.0),
        }
    });

    // Add Zone Entities from API
    fetchZonesForMap();
}

async function fetchZonesForMap() {
    try {
        const res = await fetch(`${API_BASE}/planner/`);
        const zones = await res.json();
        zones.forEach(z => {
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(z.longitude, z.latitude),
                point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#0d9488') },
                label: {
                    text: z.name,
                    font: '14px sans-serif',
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                }
            });
        });
    } catch (e) { console.error("Map Data Error", e); }
}

// 2. TAB LOGIC
function switchTab(tabId) {
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    // Note: 'event' is deprecated/global in some contexts, strictly we should pass it, but for simple DOM it works.
    // Better practice: allow the caller to pass 'this' or use event listener. 
    // For now we assume inline onclick passes event implicitly or we find the element by other means.
    // We'll update the inline HTML to pass 'this'.
}

// 3. HEALTH DATA
async function loadHealthData() {
    try {
        const [hosp, epi, deserts] = await Promise.all([
            fetch(`${API_BASE}/health/`).then(r => r.json()),
            fetch(`${API_BASE}/health/epidemiology/`).then(r => r.json()),
            fetch(`${API_BASE}/health/health_deserts/`).then(r => r.json())
        ]);

        // Render Hospitals
        let icu = 0, icuT = 0, gen = 0, genT = 0, oxy = 0;
        let hHtml = '';
        hosp.forEach(h => {
            icu += h.occupied_beds_icu; icuT += h.total_beds_icu;
            gen += h.occupied_beds_general; genT += h.total_beds_general;
            oxy += h.oxygen_supply_level;
            hHtml += `<tr><td>${h.name}</td><td>${h.zone_name}</td>
                <td>${h.occupied_beds_icu}/${h.total_beds_icu}</td>
                <td><span class="badge ${h.occupied_beds_icu / h.total_beds_icu > 0.8 ? 'bg-danger' : 'bg-success'}">${h.occupied_beds_icu / h.total_beds_icu > 0.8 ? 'CRITICAL' : 'STABLE'}</span></td></tr>`;
        });
        document.getElementById('hospital-table').innerHTML = hHtml;
        document.getElementById('icu-total').innerText = `${icu}/${icuT}`;
        document.getElementById('general-total').innerText = `${gen}/${genT}`;
        document.getElementById('oxygen-avg').innerText = Math.round(oxy / hosp.length || 0) + '%';

        // Render Epi
        document.getElementById('epi-list').innerHTML = epi.map(e => `
            <div style="padding:0.8rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                <strong>${e.zone_name}</strong>
                <span style="color:${e.resp_cases > 50 ? 'red' : 'orange'}">Cases: ${e.resp_cases} (AQI ${e.aqi})</span>
            </div>`).join('');

        // Render Deserts
        const dElem = document.getElementById('desert-alerts');
        if (deserts.length === 0) dElem.innerHTML = '<div style="padding:1rem;color:green;">No Health Deserts</div>';
        else dElem.innerHTML = deserts.map(d => `<div style="padding:0.8rem; background:#fff1f2; margin-bottom:0.5rem; border-left:3px solid red;">
            <strong>Health Desert: ${d.name}</strong><br><small>High Vulnerability Zone</small></div>`).join('');
    } catch (e) { console.error("Health Data Error", e); }
}

// 4. AGRI DATA
async function loadAgriData() {
    try {
        const res = await fetch(`${API_BASE}/farmer/`);
        const crops = await res.json();

        document.getElementById('agri-count').innerText = crops.length;
        const riskCount = crops.filter(c => c.spoilage_risk_score > 50).length;
        document.getElementById('spoilage-risk').innerText = riskCount;

        document.getElementById('agri-table').innerHTML = crops.map(c => `
            <tr>
                <td>${c.crop_type}</td>
                <td>${c.farmer_name}</td>
                <td>${c.origin_zone_name}</td>
                <td>${c.quantity_kg}kg</td>
                <td><span class="badge ${c.spoilage_risk_score > 50 ? 'bg-danger' : 'bg-success'}">${c.spoilage_risk_score}%</span></td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

// 5. CITIZEN DATA
async function loadCitizenData() {
    try {
        const res = await fetch(`${API_BASE}/citizen/`);
        const reports = await res.json();

        const cElem = document.getElementById('citizen-reports');
        if (reports.length === 0) cElem.innerHTML = '<div style="padding:1rem;color:#666;">No recent reports in your area.</div>';
        else cElem.innerHTML = reports.map(r => `
            <div style="padding:0.8rem; border-bottom:1px solid #eee;">
                <span class="badge bg-warning">${r.report_type}</span>
                <div style="margin-top:0.4rem; font-weight:500;">${r.description}</div>
                <div style="font-size:0.8rem; color:#888;">${new Date(r.timestamp).toLocaleDateString()} • ${r.zone_name}</div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }

    // Load AQI Hotspots
    loadAQIHotspots();
}

// 6. AQI HOTSPOTS
async function loadAQIHotspots() {
    try {
        const res = await fetch(`${API_BASE}/get_stations`);
        const stations = await res.json();

        // Filter stations that have AQI/Pollutant data
        const withData = stations.filter(s => s.aqi || s.co2_estimated);

        // Sort by AQI descending (use aqi property or fallback to estimated co2 as proxy if needed, or just 0)
        // Note: aqi is string in some feeds, ensure parsing
        withData.sort((a, b) => {
            let vA = parseFloat(a.aqi) || 0;
            let vB = parseFloat(b.aqi) || 0;
            return vB - vA;
        });

        const top5 = withData.slice(0, 5);

        const listElem = document.getElementById('aqi-hotspots-list');
        if (top5.length === 0) {
            listElem.innerHTML = '<div style="padding:1rem;color:#666;">No real-time AQI data available.</div>';
            return;
        }

        listElem.innerHTML = top5.map(s => {
            let val = parseFloat(s.aqi) || 0;
            let cls = 'aqi-good';
            if (val > 50) cls = 'aqi-satisfactory';
            if (val > 100) cls = 'aqi-moderate';
            if (val > 200) cls = 'aqi-poor';
            if (val > 300) cls = 'aqi-very-poor';
            if (val > 400) cls = 'aqi-severe';

            return `
            <div class="hotspot-item" onclick="openStationModal('${s.name}')">
                <div>
                    <div style="font-weight:600;">${s.city}</div>
                    <div style="font-size:0.8rem; color:#666;">${s.name}</div>
                </div>
                <div class="badge ${cls}" style="font-size:0.9rem;">AQI ${val}</div>
            </div>
            `;
        }).join('');

        // Store for modal lookup
        window.allStations = stations;

    } catch (e) { console.error("AQI Load Error", e); }
}

function openStationModal(stationName) {
    const s = (window.allStations || []).find(x => x.name === stationName);
    if (!s) return;

    document.getElementById('modal-station-name').innerText = s.name;
    document.getElementById('modal-station-location').innerText = `${s.city}, ${s.state}`;
    document.getElementById('modal-aqi').innerText = s.aqi || '--';
    document.getElementById('modal-predominant').innerText = s.predominant_parameter || '--';
    document.getElementById('modal-updated').innerText = 'Last Update: ' + (s.live_ts || 'N/A');

    const pGrid = document.getElementById('modal-pollutants');
    if (s.pollutants && s.pollutants.length > 0) {
        pGrid.innerHTML = s.pollutants.map(p => `
            <div class="pollutant-card">
                <div class="p-label">${p.id}</div>
                <div class="p-val">${p.avg || '--'}</div>
                <div style="font-size:0.7rem; color:#666; margin-top:4px;">Min ${p.min} / Max ${p.max}</div>
            </div>
        `).join('');
    } else {
        pGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#666;">No detailed pollutant data.</div>';
    }

    document.getElementById('station-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('station-modal').classList.remove('active');
}

// 7. URBAN CONTROL CENTER LOGIC
function switchUrbanTab(tabId, el) {
    document.querySelectorAll('.uc-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.uc-content').forEach(c => c.classList.remove('active'));

    el.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

async function loadUrbanData() {
    // Reuse existing endpoints to populate the mini-lists in Control Center
    // 1. AQI
    try {
        const stations = await fetch(`${API_BASE}/get_stations`).then(r => r.json());
        const hot = stations.filter(s => s.aqi).sort((a, b) => b.aqi - a.aqi).slice(0, 5);
        document.getElementById('uc-aqi-list').innerHTML = hot.map(s => `
            <div style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem;">${s.name.substring(0, 20)}...</span>
                <span class="badge ${getAQIClass(s.aqi)}">${s.aqi}</span>
            </div>
        `).join('');
    } catch (e) { console.error(e); }

    // 2. Market
    try {
        const crops = await fetch(`${API_BASE}/farmer/`).then(r => r.json());
        // Show top 5 by quantity
        document.getElementById('uc-market-list').innerHTML = crops.slice(0, 5).map(c => `
             <div style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                <span style="font-size:0.8rem;">${c.crop_type} (${c.origin_zone_name})</span>
                <span style="font-weight:600; font-size:0.8rem;">${c.quantity_kg}kg</span>
            </div>
        `).join('');
    } catch (e) { console.error(e); }

    // 3. Health
    try {
        const hosp = await fetch(`${API_BASE}/health/`).then(r => r.json());
        document.getElementById('uc-health-list').innerHTML = hosp.slice(0, 5).map(h => `
             <div style="padding:0.5rem; border-bottom:1px solid #eee;">
                <div style="font-size:0.8rem; font-weight:600;">${h.name}</div>
                <div style="font-size:0.75rem; color:#666;">
                    ICU: ${h.occupied_beds_icu}/${h.total_beds_icu} • Oxy: ${h.oxygen_supply_level}%
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

function getAQIClass(val) {
    if (val > 400) return 'aqi-severe';
    if (val > 300) return 'aqi-very-poor';
    if (val > 200) return 'aqi-poor';
    if (val > 100) return 'aqi-moderate';
    if (val > 50) return 'aqi-satisfactory';
    return 'aqi-good';
}

function runSimulation(type) {
    const resEl = document.getElementById(`res-${type}`);
    resEl.style.display = 'block';
    resEl.innerHTML = '<span style="color:#666;">Calculating impact...</span>';

    setTimeout(() => {
        let html = '';
        if (type === 'weather') {
            const val = document.getElementById('sim-weather-type').value;
            if (val === 'clear') {
                html = '<strong style="color:green">No Adverse Impact.</strong><br>Traffic Flow: Optimal<br>Logistics Delay: 0 min';
            } else if (val === 'rain') {
                html = '<strong>⚠️ Heavy Rain Impact:</strong><br>• Traffic Congestion: High (+45%)<br>• Logistics Delay: +25 mins<br>• Spoilage Risk: Moderate';
            } else if (val === 'heat') {
                html = '<strong>🔥 Heatwave Alert:</strong><br>• Power Grid Strain: High<br>• Health Advisory: Avoid Outdoors<br>• Cold Chain Load: +40%';
            } else {
                html = '<strong>⚠️ Storm Warning:</strong><br>• Visibility: Low<br>• Accident Risk: High<br>• Operations Halted';
            }
        }
        else if (type === 'aqi') {
            const val = document.getElementById('sim-aqi-slider').value;
            if (val < 100) html = '<strong style="color:green">Air Quality Acceptable.</strong><br>No restrictions.';
            else if (val < 200) html = '<strong>⚠️ Moderate Health Risk:</strong><br>• Sensitive groups should mask up.<br>• School outdoor activities limited.';
            else if (val < 350) html = '<strong>⛔ High Health Risk:</strong><br>• Respiratory cases predicted to rise +15%.<br>• Construction ban suggested.';
            else html = '<strong>☠️ SEVERE HAZARD:</strong><br>• Public Health Emergency.<br>• Lock-down recommended.<br>• Emergency Ward Load: +25%';
        }
        else if (type === 'market') {
            const val = document.getElementById('sim-market-event').value;
            if (val === 'normal') html = '<strong style="color:green">Market Stable.</strong><br>Prices within standard deviation.';
            else if (val === 'blockade') html = '<strong>📉 Supply Shock:</strong><br>• Arrivals: -40%<br>• Price Surge: +150% (Tomato/Onion)<br>• Hoarding Risk: High';
            else html = '<strong>⚠️ Mass Spoilage:</strong><br>• Waste Estimates: 2.5 Tons<br>• Financial Loss: ₹12 Lakhs<br>• Insurance Claims: Rising';
        }
        else if (type === 'health') {
            const val = document.getElementById('sim-health-event').value;
            if (val === 'normal') html = '<strong style="color:green">Network Stable.</strong><br>Bed availability > 20%.';
            else if (val === 'surge') html = '<strong>🚨 Epidemic Surge:</strong><br>• ICU Occupancy: 98% (Critical)<br>• Ambulance Wait: +45 mins<br>• Resource Diversion Required';
            else html = '<strong>🚑 Mass Casualty:</strong><br>• Trauma Centers: Full<br>• Cross-zone referrals active<br>• Blood Bank Stocks: Low';
        }

        resEl.innerHTML = html;
    }, 600); // Artificial delay for effect
}
