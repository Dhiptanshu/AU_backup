// 1. CESIUM SETUP
// Token from .env
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNjFjNDkyOS1hZmZlLTQ0YmUtODViOS1lZDUxMDExYWIwZTciLCJpZCI6MzQ2Mjc4LCJpYXQiOjE3NTkzMTY3NDd9.awxOsdnDLokLuS9p-NWVaIJSGk8u5r46bjxz1jh2pi8';

let viewer = null;
const API_BASE = '/api'; // Relative path for Django

function initCesium() {
    if (viewer) return;
    viewer = new Cesium.Viewer('cesiumContainer', {
        // terrainProvider: Cesium.createWorldTerrain(), // REMOVED
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        timeline: false,
        animation: false
    });

    // Set View to New Delhi immediately
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(77.2090, 28.6139, 20000), // Higher altitude
        orientation: {
            heading: Cesium.Math.toRadians(0.0),
            pitch: Cesium.Math.toRadians(-90.0), // Top down
            roll: 0.0
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
let healthInterval = null;

function switchTab(tabId, el) { // Update signature to match index.html call
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Handle specific active class for nav-tab
    // (Assuming this function is called with 'this' from onclick)
    if (el) el.classList.add('active');
    else {
        // Fallback if 'el' not passed, try to find by text or index (simplified: just select based on ID mapping)
        const map = { 'urban': 0, 'health': 1, 'agri': 2, 'citizen': 3 };
        document.querySelectorAll('.nav-tab')[map[tabId]].classList.add('active');
    }

    // Stop polling if leaving health tab
    if (healthInterval) {
        clearInterval(healthInterval);
        healthInterval = null;
    }

    if (tabId === 'urban') setTimeout(initCesium, 100);

    if (tabId === 'health') {
        loadHealthData();
        // Poll every 3 seconds for live updates
        healthInterval = setInterval(loadHealthData, 3000);
    }

    if (tabId === 'agri') loadAgriData();
    if (tabId === 'citizen') loadCitizenData();
}

// 3. HEALTH DATA & MAP
let healthViewer = null;

function initHealthMap() {
    if (healthViewer) return;
    healthViewer = new Cesium.Viewer('healthMapContainer', {
        // terrainProvider: Cesium.createWorldTerrain(), // REMOVED
        baseLayerPicker: false,
        geocoder: false,
        timeline: false,
        animation: false,
        homeButton: false,
        navigationHelpButton: false,
        infoBox: true, // Enable info box for details
        selectionIndicator: true
    });
    // New Delhi View
    healthViewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(77.2090, 28.6139, 15000),
        orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-90.0),
            roll: 0.0
        }
    });
}

let cachedHospitals = [];
let cachedEpi = [];

function updateHealthMapPins(hospitals, epiData) {
    if (!healthViewer) return;

    // Cache data for slider updates
    if (hospitals) cachedHospitals = hospitals;
    if (epiData) cachedEpi = epiData;

    // Filter Logic
    const limit = parseInt(document.getElementById('hospital-scale') ? document.getElementById('hospital-scale').value : 50);
    const sortedHospitals = [...cachedHospitals].sort((a, b) => b.total_beds_general - a.total_beds_general);
    const topHospitals = new Set(sortedHospitals.slice(0, limit).map(h => 'hosp_' + h.name.replace(/\s+/g, '_')));

    // 1. Plot Hospitals
    const showHosp = document.getElementById('toggle-hospitals') ? document.getElementById('toggle-hospitals').checked : true;

    // First, hide ANY hospital not in top N or not toggled
    healthViewer.entities.values.forEach(e => {
        if (e.id.startsWith('hosp_')) {
            if (!showHosp || !topHospitals.has(e.id)) {
                e.show = false;
            }
        }
    });

    // Then, Add or Update valid ones
    sortedHospitals.slice(0, limit).forEach(h => {
        const id = 'hosp_' + h.name.replace(/\s+/g, '_');
        const isCritical = (h.occupied_beds_icu / h.total_beds_icu) > 0.8;
        let entity = healthViewer.entities.getById(id);

        if (entity) {
            // Update Existing
            entity.point.color = isCritical ? Cesium.Color.RED : Cesium.Color.GREEN;
            entity.show = showHosp; // It's in the list, so respect the toggle
            entity.description = `
                <h3>${h.name}</h3>
                <p>Status: <strong>${isCritical ? 'CRITICAL' : 'Stable'}</strong></p>
                <p>ICU: ${h.occupied_beds_icu}/${h.total_beds_icu}</p>
                <p>General: ${h.occupied_beds_general}/${h.total_beds_general}</p>
                <p>Oxygen: ${h.oxygen_supply_level}%</p>
            `;
        } else {
            // Add New
            healthViewer.entities.add({
                id: id,
                show: showHosp,
                position: Cesium.Cartesian3.fromDegrees(h.zone_name === 'Unknown' ? 77.2 : 77.2 + Math.random() * 0.1, 28.6 + Math.random() * 0.1),
                point: { pixelSize: 12, color: isCritical ? Cesium.Color.RED : Cesium.Color.GREEN, outlineWidth: 2, outlineColor: Cesium.Color.WHITE },
                label: { text: h.name, font: '10px sans-serif', verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, 10) },
                description: `
                    <h3>${h.name}</h3>
                    <p>Status: <strong>${isCritical ? 'CRITICAL' : 'Stable'}</strong></p>
                    <p>ICU: ${h.occupied_beds_icu}/${h.total_beds_icu}</p>
                    <p>General: ${h.occupied_beds_general}/${h.total_beds_general}</p>
                    <p>Oxygen: ${h.oxygen_supply_level}%</p>
                `
            });
        }
    });

    // 2. Plot AQI Stations (Zones/Real Stations)
    const showAqi = document.getElementById('toggle-aqi') ? document.getElementById('toggle-aqi').checked : true;
    (epiData || cachedEpi).forEach(z => {
        // Adapt fields
        const name = z.name || z.zone_name;
        const lat = z.lat || z.latitude;
        const lon = z.lon || z.longitude;
        const aqi = z.aqi || 0;

        const id = 'aqi_' + name.replace(/\s+/g, '_');
        let entity = healthViewer.entities.getById(id);

        if (entity) {
            // Update Existing
            entity.label.text = `${aqi} AQI`;
            entity.show = showAqi;
            entity.description = `
                <h3>${name}</h3>
                <p>City: ${z.city || z.area_type || 'Unknown'}</p>
                <p>AQI: ${aqi}</p>
                <p>${z.live_ts ? 'Live Update: ' + new Date(z.live_ts).toLocaleTimeString() : 'Simulated Data'}</p>
            `;
        } else {
            // Add New
            healthViewer.entities.add({
                id: id,
                show: showAqi,
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                point: { pixelSize: 15, color: Cesium.Color.ORANGE.withAlpha(0.7) },
                label: { text: `${aqi} AQI`, font: '12px monospace', style: Cesium.LabelStyle.FILL_AND_OUTLINE, fillColor: Cesium.Color.WHITE, outlineWidth: 2, outlineColor: Cesium.Color.BLACK },
                description: `
                    <h3>${name}</h3>
                    <p>City: ${z.city || z.area_type || 'Unknown'}</p>
                    <p>AQI: ${aqi}</p>
                    <p>${z.live_ts ? 'Live Update: ' + new Date(z.live_ts).toLocaleTimeString() : 'Simulated Data'}</p>
                `
            });
        }
    });

    // 3. Zoom ONLY ONE TIME (Initial Load) - Focus on HOSPITALS ONLY
    if (!window.hasZoomedHealthMap) {
        const hospEntities = healthViewer.entities.values.filter(e => e.id.startsWith('hosp_'));
        if (hospEntities.length > 0) {
            healthViewer.flyTo(hospEntities, {
                duration: 2.0,
                offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-90), 2000) // Lower offset for closer view
            });
            window.hasZoomedHealthMap = true;
        }
    }
}

function toggleMapLayer(layer) {
    // Just re-run the main update logic which reads the checkboxes and slider
    updateHealthMapPins(null, null);
}


async function loadHealthData() {
    try {
        const [hosp, epi, deserts, stations] = await Promise.all([
            fetch(`${API_BASE}/health/`).then(r => r.json()),
            fetch(`${API_BASE}/health/epidemiology/`).then(r => r.json()),
            fetch(`${API_BASE}/health/health_deserts/`).then(r => r.json()),
            fetch(`${API_BASE}/get_stations`).then(r => r.json())
        ]);

        // Init Map if needed
        initHealthMap();
        // Use Real Stations for AQI pins, fallback to epi if empty
        updateHealthMapPins(hosp, stations.length > 0 ? stations : epi);

        // Render Hospitals
        let icu = 0, icuT = 0, gen = 0, genT = 0, oxy = 0;
        let hHtml = '';
        hosp.forEach(h => {
            icu += h.occupied_beds_icu; icuT += h.total_beds_icu;
            gen += h.occupied_beds_general; genT += h.total_beds_general;
            oxy += h.oxygen_supply_level;
            hHtml += `<tr>
                <td><strong>${h.name}</strong><div style="font-size:0.75em;color:#666;">${h.zone_name}</div></td>
                <td><span style="font-size:0.85em;">${h.zone_name}</span></td>
                <td><div style="width:80px; background:#e2e8f0; border-radius:4px; height:8px; overflow:hidden;">
                        <div style="width:${(h.occupied_beds_icu / h.total_beds_icu) * 100}%; background:${h.occupied_beds_icu / h.total_beds_icu > 0.8 ? '#ef4444' : '#22c55e'}; height:100%;"></div>
                    </div><small>${h.occupied_beds_icu}/${h.total_beds_icu}</small></td>
                <td><span class="badge ${h.occupied_beds_icu / h.total_beds_icu > 0.8 ? 'bg-danger' : 'bg-success'}">${h.occupied_beds_icu / h.total_beds_icu > 0.8 ? 'CRITICAL' : 'STABLE'}</span></td>
            </tr>`;
        });
        document.getElementById('hospital-table').innerHTML = hHtml;
        document.getElementById('icu-total').innerText = `${icu}/${icuT}`;
        document.getElementById('general-total').innerText = `${gen}/${genT}`;
        document.getElementById('oxygen-avg').innerText = Math.round(oxy / hosp.length || 0) + '%';

        // Render Real AQI List (replacing Epi list)
        const aqiList = stations.length > 0 ? stations : epi;
        // Sort by AQI descending
        aqiList.sort((a, b) => (parseFloat(b.aqi) || 0) - (parseFloat(a.aqi) || 0));

        if (aqiList.length === 0) {
            document.getElementById('epi-list').innerHTML = '<div style="padding:1rem;">Fetching live data...</div>';
        } else {
            document.getElementById('epi-list').innerHTML = aqiList.slice(0, 5).map(e => {
                // Adapt fields: station has 'name', epi has 'zone_name'
                const name = e.name || e.zone_name;
                const aqi = e.aqi || 0;
                // If real station, add click handler
                const clickAttr = e.name ? `onclick="openStationModal('${e.name}')" style="cursor:pointer;"` : '';

                return `
                <div style="padding:0.8rem; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;" ${clickAttr}>
                    <div>
                        <div style="font-weight:600; color:#334155;">${name}</div>
                        <span class="badge" style="background:#e2e8f0; color:#475569; font-weight:500;">${e.city || e.area_type || 'Station'}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.1rem; font-weight:700; color:${getColorForAQI(aqi)}">${aqi} AQI</div>
                        <div style="font-size:0.8rem; color:#64748b;">${e.live_ts ? new Date(e.live_ts).toLocaleTimeString() : 'Simulated'}</div>
                    </div>
                </div>`;
            }).join('');
        }

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

function getColorForAQI(aqi) {
    if (aqi < 50) return '#22c55e'; // Green
    if (aqi < 100) return '#84cc16'; // Light Green
    if (aqi < 200) return '#eab308'; // Yellow
    if (aqi < 300) return '#f97316'; // Orange
    if (aqi < 400) return '#ef4444'; // Red
    return '#7f1d1d'; // Maroon
}

// 6. AQI HOTSPOTS
async function loadAQIHotspots() {
    try {
        const res = await fetch(`${API_BASE}/get_stations`);
        const stations = await res.json();

        // Filter stations that have AQI/Pollutant data
        const withData = stations.filter(s => s.aqi || s.co2_estimated);

        // Sort by AQI descending
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
