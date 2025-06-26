// Global variables
let currentTab = 'face';
let currentView = 'map';
let currentFrequency = 'daily';
let chartInstance = null;
let mapInstance = null;
let faceData = [];
let carData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadExcelData('face');
});

// Initialize tab switching
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.getAttribute('data-tab');
            
            // Reset view to map when switching tabs
            currentView = 'map';
            
            // Load data for the selected tab
            loadExcelData(currentTab);
        });
    });
}

// Load and parse Excel data
function loadExcelData(tabType) {
    const filePath = `data/${tabType}_detection.xlsx`;
    
    // Use fetch API to get the Excel file
    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            const data = parseExcel(buffer);
            
            // Store data based on tab type
            if (tabType === 'face') {
                faceData = data;
            } else {
                carData = data;
            }
            
            // Populate ID list and initialize map
            populateIdList(data);
            initializeMap(data);
        })
        .catch(error => {
            console.error("Error loading data:", error);
            // For demo purposes, load sample data if file not found
            const sampleData = generateSampleData(tabType);
            
            if (tabType === 'face') {
                faceData = sampleData;
            } else {
                carData = sampleData;
            }
            
            populateIdList(sampleData);
            initializeMap(sampleData);
        });
}

// Parse Excel data with SheetJS
function parseExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    
    // Convert to JSON
    return XLSX.utils.sheet_to_json(worksheet);
}

// Generate sample data for testing
function generateSampleData(type) {
    const data = [];
    const idPrefix = type === 'face' ? 'F' : 'C';
    
    // Generate 5 unique IDs
    for (let i = 1; i <= 5; i++) {
        const id = `${idPrefix}${i}`;
        
        // Generate 10-20 entries per ID
        const entryCount = Math.floor(Math.random() * 10) + 10;
        
        for (let j = 0; j < entryCount; j++) {
            // Random coordinates in Delhi region
            const x = 77 + (Math.random() * 0.5);
            const y = 28.5 + (Math.random() * 0.5);
            
            // Random timestamp in the last week
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 7));
            date.setHours(Math.floor(Math.random() * 24));
            
            data.push({
                id: id,
                x: x,
                y: y,
                timestamp: date.toISOString()
            });
        }
    }
    
    return data;
}

// Populate the ID list in the sidebar
function populateIdList(data) {
    const idList = document.getElementById('id-list');
    
    // Clear existing items except "Map"
    while (idList.children.length > 1) {
        idList.removeChild(idList.lastChild);
    }
    
    // Get unique IDs
    const uniqueIds = [...new Set(data.map(item => item.id))];
    
    // Add each unique ID to the list
    uniqueIds.forEach(id => {
        const listItem = document.createElement('li');
        listItem.textContent = id;
        listItem.setAttribute('data-id', id);
        
        listItem.addEventListener('click', () => {
            // Remove active class from all items
            document.querySelectorAll('#id-list li').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            listItem.classList.add('active');
            
            // Update current view
            currentView = id;
            
            // Show frequency controls
            document.querySelector('.frequency-controls').style.display = 'flex';
            
            // Display frequency chart for the selected ID
            displayFrequencyChart(id);
        });
        
        idList.appendChild(listItem);
    });
    
    // Add click handler for "Map" item
    const mapItem = idList.querySelector('li[data-id="map"]');
    mapItem.addEventListener('click', () => {
        // Remove active class from all items
        document.querySelectorAll('#id-list li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to Map item
        mapItem.classList.add('active');
        
        // Update current view
        currentView = 'map';
        
        // Hide frequency controls
        document.querySelector('.frequency-controls').style.display = 'none';
        
        // Show map, hide chart
        document.getElementById('map').style.display = 'block';
        document.getElementById('chart').style.display = 'none';
        
        // Initialize map with all data points
        const data = currentTab === 'face' ? faceData : carData;
        initializeMap(data);
    });
    
    // Initialize frequency buttons
    initializeFrequencyButtons();
}

// Initialize the map using Leaflet
// Initialize the map using Leaflet
function initializeMap(data) {
    // If map exists, remove it
    if (mapInstance) {
        mapInstance.remove();
    }

    // Create new map
    mapInstance = L.map('map').setView([28.7041, 77.1025], 11); // Delhi coordinates

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    // Get unique IDs for color assignment
    const uniqueIds = [...new Set(data.map(item => item.id))];

    // Define colors for each ID
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF33A8', 
                    '#33FFF5', '#F5FF33', '#FF8C33', '#8C33FF', '#33FFCE'];

    // Add markers for each ID with different colors
    uniqueIds.forEach((id, index) => {
        const color = colors[index % colors.length];
        const idData = data.filter(item => item.id === id);

        idData.forEach(point => {
            const marker = L.circleMarker([point.y, point.x], {
                radius: 6,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(mapInstance);

            // Bind tooltip with ID, timestamp, and location
            marker.bindTooltip(
                `<div style="background-color: black; color: white; padding: 5px; border-radius: 3px;">
                    <strong>ID:</strong> ${point.id}<br>
                    <strong>Timestamp:</strong> ${new Date(point.timestamp).toLocaleString()}<br>
                    <strong>Location:</strong> (${point.y.toFixed(4)}, ${point.x.toFixed(4)})
                </div>`, 
                { direction: 'top', offset: [0, -10] }
            );
        });
    });

    // Show map, hide chart
    document.getElementById('map').style.display = 'block';
    document.getElementById('chart').style.display = 'none';
}

// Initialize frequency button handlers
function initializeFrequencyButtons() {
    const buttons = document.querySelectorAll('.freq-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current frequency
            currentFrequency = button.getAttribute('data-freq');
            
            // Update chart if an ID is currently selected
            if (currentView !== 'map') {
                displayFrequencyChart(currentView);
            }
        });
    });
}

// Display frequency chart for the selected ID
function displayFrequencyChart(id) {
    // Get data for the current tab
    const data = currentTab === 'face' ? faceData : carData;
    
    // Filter data for the selected ID
    const idData = data.filter(item => item.id === id);
    
    // Group data by the selected frequency
    const frequencyData = groupByFrequency(idData, currentFrequency);
    
    // Destroy existing chart instance if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Get the canvas element
    const canvas = document.getElementById('chart');
    canvas.style.display = 'block';
    
    // Hide map
    document.getElementById('map').style.display = 'none';
    
    // Create new chart
    chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: frequencyData.labels,
            datasets: [{
                label: `Frequency (${currentFrequency})`,
                data: frequencyData.values,
                backgroundColor: 'rgba(0, 102, 204, 0.2)',
                borderColor: 'rgba(0, 102, 204, 1)',
                borderWidth: 2,
                pointRadius: 4,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Frequency for ID: ${id}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: getTimeUnitLabel(currentFrequency)
                    }
                }
            }
        }
    });
}

// Group data by the selected frequency
function groupByFrequency(data, frequency) {
    const grouped = {};
    
    data.forEach(item => {
        const date = new Date(item.timestamp);
        let key;
        
        switch (frequency) {
            case 'hourly':
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
                break;
            case 'daily':
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
                break;
            case 'weekly':
                // Get the first day of the week (Sunday)
                const firstDay = new Date(date);
                const day = date.getDay();
                firstDay.setDate(date.getDate() - day);
                key = `Week of ${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-${firstDay.getDate().toString().padStart(2, '0')}`;
                break;
            case 'monthly':
                key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                break;
        }
        
        if (!grouped[key]) {
            grouped[key] = 0;
        }
        
        grouped[key]++;
    });
    
    // Sort keys chronologically
    const sortedKeys = Object.keys(grouped).sort();
    
    return {
        labels: sortedKeys,
        values: sortedKeys.map(key => grouped[key])
    };
}

// Get label text for time unit based on frequency
function getTimeUnitLabel(frequency) {
    switch (frequency) {
        case 'hourly':
            return 'Hour';
        case 'daily':
            return 'Date';
        case 'weekly':
            return 'Week';
        case 'monthly':
            return 'Month';
        default:
            return 'Time';
    }
}
