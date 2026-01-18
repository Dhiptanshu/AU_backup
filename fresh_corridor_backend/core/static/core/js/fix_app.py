
import os

file_path = r'c:\Users\dhipt\AU_Dir\fresh_corridor_backend\core\static\core\js\app.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Truncate after line 1851 (index 1852 in slice)
# Line 1851 is the closing brace '}' for analyzeCitizenRouteTraffic
valid_lines = lines[:1852]

new_code = """

// Helper: Get Congestion Level Object
function getTrafficCongestionLevel(score) {
    if (score < 25) return { label: 'Low', class: 'level-low' };
    if (score < 50) return { label: 'Moderate', class: 'level-moderate' };
    if (score < 75) return { label: 'High', class: 'level-high' };
    return { label: 'Severe', class: 'level-severe' };
}

function showTrafficUpdateNotification() {
    if (window.showToast) window.showToast("Traffic data updated", "info");
}

function switchUrbanTab(tabId, btn) {
    // Hide all tab content
    document.querySelectorAll('.uc-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    // Remove active class from all buttons
    document.querySelectorAll('.uc-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
    }

    // Set active button
    if (btn) {
        btn.classList.add('active');
    }
}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(valid_lines)
    f.write(new_code)

print("Successfully fixed app.js")
