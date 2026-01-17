// API endpoint
const API_URL = '/api/traffic/';

// DOM elements
const fetchBtn = document.getElementById('fetchBtn');
const autoRefreshBtn = document.getElementById('autoRefreshBtn');
const latInput = document.getElementById('latitude');
const lonInput = document.getElementById('longitude');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');

// Auto-refresh state
let autoRefreshInterval = null;
let isAutoRefreshEnabled = false;
let previousData = null;
const POLL_INTERVAL = 10000; // Check every 10 seconds

// Event listeners
fetchBtn.addEventListener('click', () => fetchTrafficData(true));
autoRefreshBtn.addEventListener('click', toggleAutoRefresh);

// Allow Enter key to trigger fetch
latInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchTrafficData(true);
});
lonInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchTrafficData(true);
});

// Fetch traffic data
async function fetchTrafficData(showLoading = false) {
    const lat = latInput.value.trim();
    const lon = lonInput.value.trim();
    
    if (!lat || !lon) {
        showError('Please enter both latitude and longitude');
        return;
    }
    
    // Only show loading spinner on manual fetch
    if (showLoading) {
        loading.classList.remove('hidden');
        error.classList.add('hidden');
        results.classList.add('hidden');
    }
    
    try {
        const response = await fetch(`${API_URL}?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Check if data has changed
            if (hasDataChanged(data)) {
                displayTrafficData(data, !showLoading);
                previousData = data;
            }
        } else {
            showError(data.message || 'Failed to fetch traffic data');
        }
    } catch (err) {
        if (showLoading) {
            showError('Network error: ' + err.message);
        }
    } finally {
        if (showLoading) {
            loading.classList.add('hidden');
        }
    }
}

// Check if traffic data has changed
function hasDataChanged(newData) {
    if (!previousData) return true;
    
    const oldTraffic = previousData.traffic;
    const newTraffic = newData.traffic;
    
    // Compare key traffic metrics
    return (
        oldTraffic.currentSpeed !== newTraffic.currentSpeed ||
        oldTraffic.freeFlowSpeed !== newTraffic.freeFlowSpeed ||
        oldTraffic.currentTravelTime !== newTraffic.currentTravelTime ||
        oldTraffic.congestionScore !== newTraffic.congestionScore ||
        oldTraffic.roadClosure !== newTraffic.roadClosure
    );
}

// Display traffic data
function displayTrafficData(data, isAutoUpdate = false) {
    const traffic = data.traffic;
    const location = data.location;
    
    // Show data change notification if auto-updated
    if (isAutoUpdate) {
        showUpdateNotification();
    }
    
    // Congestion score and level
    const congestionScore = traffic.congestionScore;
    const congestionLevel = getCongestionLevel(congestionScore);
    
    document.getElementById('congestionScore').textContent = congestionScore + '%';
    document.getElementById('congestionLabel').textContent = congestionLevel.label;
    
    // Apply color class
    const congestionCard = document.querySelector('.congestion-card');
    congestionCard.className = 'card congestion-card ' + congestionLevel.class;
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = congestionScore + '%';
    
    // Speed stats
    document.getElementById('currentSpeed').textContent = traffic.currentSpeed + ' km/h';
    document.getElementById('freeFlowSpeed').textContent = traffic.freeFlowSpeed + ' km/h';
    
    // Time stats
    document.getElementById('currentTime').textContent = formatTime(traffic.currentTravelTime);
    document.getElementById('normalTime').textContent = formatTime(traffic.freeFlowTravelTime);
    
    // Road information
    document.getElementById('roadClass').textContent = traffic.roadClass;
    document.getElementById('roadClosure').textContent = traffic.roadClosure ? 
        '⚠️ Yes' : '✅ No';
    document.getElementById('confidence').textContent = traffic.confidence + '%';
    
    // Location
    document.getElementById('locLat').textContent = location.latitude;
    document.getElementById('locLon').textContent = location.longitude;
    document.getElementById('coordCount').textContent = 
        data.coordinates.length + ' points';
    
    // Update last updated time
    updateLastRefreshTime();
    
    // Show results
    results.classList.remove('hidden');
}

// Toggle auto-refresh
function toggleAutoRefresh() {
    isAutoRefreshEnabled = !isAutoRefreshEnabled;
    
    if (isAutoRefreshEnabled) {
        autoRefreshBtn.textContent = '🔄 Monitoring: ON';
        autoRefreshBtn.classList.add('active');
        // Fetch immediately
        fetchTrafficData(true);
        // Then start polling for changes
        autoRefreshInterval = setInterval(() => fetchTrafficData(false), POLL_INTERVAL);
    } else {
        autoRefreshBtn.textContent = '🔄 Monitoring: OFF';
        autoRefreshBtn.classList.remove('active');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        previousData = null;
    }
}

// Show update notification
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = '✨ Traffic data updated!';
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Update last refresh time
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const statusText = isAutoRefreshEnabled ? 'Monitoring - Last changed' : 'Last updated';
    const existingDiv = document.getElementById('lastUpdated');
    
    if (existingDiv) {
        existingDiv.textContent = `${statusText}: ${timeString}`;
    } else {
        const div = document.createElement('div');
        div.id = 'lastUpdated';
        div.className = 'last-updated';
        div.textContent = `${statusText}: ${timeString}`;
        results.insertBefore(div, results.firstChild);
    }
}

// Get congestion level based on score
function getCongestionLevel(score) {
    if (score < 20) {
        return { label: 'Low Traffic', class: 'level-low' };
    } else if (score < 40) {
        return { label: 'Moderate Traffic', class: 'level-moderate' };
    } else if (score < 60) {
        return { label: 'High Congestion', class: 'level-high' };
    } else {
        return { label: 'Severe Congestion', class: 'level-severe' };
    }
}

// Format time from seconds to readable format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

// Show error message
function showError(message) {
    error.textContent = '❌ ' + message;
    error.classList.remove('hidden');
    results.classList.add('hidden');
}

// Load data on page load
window.addEventListener('load', () => {
    fetchTrafficData();
});
