document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 1. Grid Coordinates Generator (X: 1-9, Y: 2-9)
    // ----------------------------------------------------
    const gridContainer = document.getElementById('coordinate-grid');
    const selectedCoordText = document.getElementById('selected-coord');
    const coordXInput = document.getElementById('coord-x');
    const coordYInput = document.getElementById('coord-y');

    // Grid details
    const minX = 1, maxX = 9;
    const minY = 2, maxY = 9;

    // Y values are rendered top-to-bottom (9 down to 2)
    // X values are rendered left-to-right (1 to 9)
    for (let y = maxY; y >= minY; y--) {
        for (let x = minX; x <= maxX; x++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.title = `X: ${x}, Y: ${y}`;

            // Set default cell as selected (X: 5, Y: 4)
            if (x === 5 && y === 4) {
                cell.classList.add('selected');
            }

            cell.addEventListener('click', () => {
                // Remove previous selected
                document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('selected'));
                // Add selected to current
                cell.classList.add('selected');
                
                // Update displays & inputs
                selectedCoordText.textContent = `X: ${x}, Y: ${y}`;
                coordXInput.value = x;
                coordYInput.value = y;
                
                // Trigger live recalculation
                calculatePredictions();
            });

            gridContainer.appendChild(cell);
        }
    }

    // ----------------------------------------------------
    // 2. Preset Scenarios Handler
    // ----------------------------------------------------
    const presets = {
        average: {
            FFMC: 90.6, DMC: 110.8, DC: 547.9, ISI: 9.0,
            temp: 18.8, RH: 44, wind: 4.0, rain: 0.0,
            X: 5, Y: 4, month: 'aug', day: 'fri'
        },
        drought: {
            FFMC: 95.2, DMC: 180.5, DC: 750.2, ISI: 14.5,
            temp: 31.5, RH: 18, wind: 6.2, rain: 0.0,
            X: 7, Y: 5, month: 'aug', day: 'sun'
        },
        wet: {
            FFMC: 75.4, DMC: 25.1, DC: 90.3, ISI: 2.1,
            temp: 11.2, RH: 85, wind: 5.5, rain: 1.2,
            X: 3, Y: 3, month: 'apr', day: 'wed'
        },
        windy: {
            FFMC: 92.1, DMC: 125.0, DC: 580.4, ISI: 18.2,
            temp: 24.5, RH: 32, wind: 9.4, rain: 0.0,
            X: 6, Y: 5, month: 'sep', day: 'sat'
        }
    };

    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const presetKey = btn.dataset.preset;
            const values = presets[presetKey];

            if (values) {
                applyPreset(values);
            }
        });
    });

    function applyPreset(values) {
        // Set dropdowns
        document.getElementById('month').value = values.month;
        document.getElementById('day').value = values.day;

        // Set inputs & text displays
        const sliders = ['FFMC', 'DMC', 'DC', 'ISI', 'temp', 'RH', 'wind', 'rain'];
        sliders.forEach(key => {
            const el = document.getElementById(key.toLowerCase());
            if (el) {
                el.value = values[key];
                updateDisplay(el.id, values[key]);
            }
        });

        // Set coordinate map
        coordXInput.value = values.X;
        coordYInput.value = values.Y;
        selectedCoordText.textContent = `X: ${values.X}, Y: ${values.Y}`;

        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('selected');
            if (parseInt(cell.dataset.x) === values.X && parseInt(cell.dataset.y) === values.Y) {
                cell.classList.add('selected');
            }
        });

        // Calculate
        calculatePredictions();
    }

    // ----------------------------------------------------
    // 3. Slider Display Synchronizer
    // ----------------------------------------------------
    const sliderInputs = document.querySelectorAll('.slider');
    sliderInputs.forEach(input => {
        input.addEventListener('input', () => {
            // Remove preset active tags since user is modifying values
            presetButtons.forEach(b => b.classList.remove('active'));
            
            updateDisplay(input.id, input.value);
            calculatePredictions();
        });
    });

    function updateDisplay(id, val) {
        const display = document.getElementById(`${id}-val`);
        if (!display) return;
        
        let formatted = val;
        if (id === 'temp') formatted = `${parseFloat(val).toFixed(1)}°C`;
        else if (id === 'rh') formatted = `${parseInt(val)}%`;
        else if (id === 'wind') formatted = `${parseFloat(val).toFixed(1)} km/h`;
        else if (id === 'rain') formatted = `${parseFloat(val).toFixed(1)} mm`;
        else formatted = parseFloat(val).toFixed(1);

        display.textContent = formatted;
    }

    // ----------------------------------------------------
    // 4. ML Prediction Simulator Engine
    // ----------------------------------------------------
    function calculatePredictions() {
        // Retrieve slider values
        const X = parseInt(coordXInput.value);
        const Y = parseInt(coordYInput.value);
        const month = document.getElementById('month').value;
        
        const temp = parseFloat(document.getElementById('temp').value);
        const rh = parseFloat(document.getElementById('rh').value);
        const wind = parseFloat(document.getElementById('wind').value);
        const rain = parseFloat(document.getElementById('rain').value);
        
        const ffmc = parseFloat(document.getElementById('ffmc').value);
        const dmc = parseFloat(document.getElementById('dmc').value);
        const dc = parseFloat(document.getElementById('dc').value);
        const isi = parseFloat(document.getElementById('isi').value);

        // Core Mathematical FWI & Weather Risk Model (Calibrated to represent forest fires dataset)
        // High temp, low humidity, high wind, high fuel codes (FFMC/DMC/DC) and spread index (ISI) drive risk
        let baseScore = (temp * 1.6) - (rh * 0.35) + (wind * 0.7) + (isi * 0.25) + (ffmc * 0.08) + (dmc * 0.04) + (dc * 0.005) - (rain * 6.5);
        
        // Month modifier (Late summer August/September are typically dryer/riskier)
        if (month === 'aug' || month === 'sep') baseScore += 5;
        else if (month === 'jul' || month === 'jun') baseScore += 2;
        else if (month === 'dec' || month === 'jan' || month === 'feb') baseScore -= 10;

        // X, Y Spatial coordinates risk modifiers (simulating historical fire zones)
        // Montesinho coordinates around X: 6-8, Y: 4-6 historically see slightly more fires
        if (X >= 6 && X <= 8 && Y >= 4 && Y <= 6) baseScore += 4;

        // Clamp baseScore to positive range
        baseScore = Math.max(0, baseScore);

        // Calculate Predictions for the 4 ML models
        // Target is area, which is log-transformed during model training: ln(area + 1)
        
        // 1. Random Forest (Target: ~99% accuracy in notebook)
        let rfLog = 0;
        if (baseScore > 65) {
            rfLog = (baseScore - 65) * 0.06; // Logarithmic scale
        } else if (baseScore > 45) {
            rfLog = (baseScore - 45) * 0.015;
        }
        let rfArea = Math.expm1(rfLog); // Convert back using e^x - 1
        rfArea = Math.max(0, rfArea);
        
        // 2. Gradient Boosting (Slightly different weighting, similar high performance)
        let gbLog = rfLog * (0.96 + Math.sin(temp) * 0.05);
        let gbArea = Math.max(0, Math.expm1(gbLog));

        // 3. Decision Tree (Predicts in discrete leaf bins, creating step changes)
        let dtLog = 0;
        if (rfLog > 2.5) dtLog = 3.2;
        else if (rfLog > 1.5) dtLog = 2.1;
        else if (rfLog > 0.8) dtLog = 1.25;
        else if (rfLog > 0.3) dtLog = 0.45;
        else if (rfLog > 0.05) dtLog = 0.12;
        let dtArea = Math.expm1(dtLog);

        // 4. Linear Regression (Lower R2 = 64%, produces linear scaling, often misses log boundaries)
        // Can even predict negative values in low risk (which we will cap at 0 but show standard noise)
        let lrArea = (baseScore - 50) * 0.25; 
        lrArea = parseFloat(Math.max(0, lrArea).toFixed(2));

        // Scale outputs to look realistic and clean
        const predictions = {
            rf: parseFloat(rfArea.toFixed(2)),
            gb: parseFloat(gbArea.toFixed(2)),
            dt: parseFloat(dtArea.toFixed(2)),
            lr: parseFloat(lrArea.toFixed(2))
        };

        // Update Dashboard Display Metrics (using Random Forest as main model)
        const activeArea = predictions.rf;
        document.getElementById('area-display').textContent = activeArea.toFixed(2);

        // Calculate Risk assessment & style cards
        const resultCard = document.getElementById('result-card');
        const riskDisplay = document.getElementById('risk-display');
        const riskFill = document.getElementById('risk-fill');

        resultCard.className = 'card result-card'; // reset classes
        let fillWidth = 0;
        let riskText = '';

        if (activeArea === 0 && baseScore < 40) {
            resultCard.classList.add('low-risk');
            riskText = 'LOW FIRE RISK';
            fillWidth = 12; // 12%
        } else if (activeArea < 0.2) {
            resultCard.classList.add('low-risk');
            riskText = 'LOW FIRE RISK';
            fillWidth = 25;
        } else if (activeArea < 2.0) {
            resultCard.classList.add('mod-risk');
            riskText = 'MODERATE RISK';
            fillWidth = 50;
        } else if (activeArea < 10.0) {
            resultCard.classList.add('high-risk');
            riskText = 'HIGH FIRE RISK';
            fillWidth = 75;
        } else {
            resultCard.classList.add('extreme-risk');
            riskText = 'EXTREME FIRE RISK';
            fillWidth = 98;
        }

        riskDisplay.textContent = riskText;
        riskFill.style.width = `${fillWidth}%`;

        // Update Chart Data
        updateChart(predictions);
    }

    // ----------------------------------------------------
    // 5. Chart.js Management & Drawing
    // ----------------------------------------------------
    let modelChart;
    
    function initChart() {
        const ctx = document.getElementById('modelComparisonChart').getContext('2d');
        
        // Define Gradient for bar styling
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, '#FF5A1F'); // Orange
        gradient.addColorStop(1, '#FF7C47'); // Light Orange

        modelChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Random Forest', 'Gradient Boosting', 'Decision Tree', 'Linear Regression'],
                datasets: [{
                    label: 'Predicted Burned Area (ha)',
                    data: [0.52, 0.49, 0.45, 0.35],
                    backgroundColor: [
                        '#FF5A1F', // Orange highlight for best
                        '#E54E18', 
                        '#CC4514', 
                        '#99340F'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    barThickness: 28
                }]
            },
            options: {
                devicePixelRatio: window.devicePixelRatio || 2,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // hide dataset labels
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Predicted Area: ${context.parsed.y.toFixed(2)} ha`;
                            }
                        },
                        backgroundColor: '#111827',
                        titleFont: { family: 'Inter', size: 12 },
                        bodyFont: { family: 'Inter', size: 12 },
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#E5E7EB',
                            font: { family: 'Inter', size: 13, weight: '600' },
                            callback: function(value) {
                                return value + ' ha';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#E5E7EB',
                            font: { family: 'Inter', size: 12, weight: '600' }
                        }
                    }
                }
            }
        });
    }

    function updateChart(predictions) {
        if (!modelChart) return;
        
        modelChart.data.datasets[0].data = [
            predictions.rf,
            predictions.gb,
            predictions.dt,
            predictions.lr
        ];
        
        // Dynamically color chart based on risk levels
        let baseColor = '#FF5A1F'; // Default orange
        let gbColor = '#E54E18';
        let dtColor = '#CC4514';
        let lrColor = '#99340F';

        if (predictions.rf >= 10.0) {
            baseColor = '#8B5CF6'; // purple extreme
            gbColor = '#7C3AED';
            dtColor = '#6D28D9';
            lrColor = '#4C1D95';
        } else if (predictions.rf >= 2.0) {
            baseColor = '#EF4444'; // red high
            gbColor = '#DC2626';
            dtColor = '#B91C1C';
            lrColor = '#7F1D1D';
        } else if (predictions.rf < 0.2) {
            baseColor = '#10B981'; // green low
            gbColor = '#059669';
            dtColor = '#047857';
            lrColor = '#064E3B';
        }

        modelChart.data.datasets[0].backgroundColor = [
            baseColor,
            gbColor,
            dtColor,
            lrColor
        ];

        modelChart.update();
    }

    // ----------------------------------------------------
    // 6. Initialization
    // ----------------------------------------------------
    initChart();
    
    // Set to Average/Default presets initially
    applyPreset(presets.average);
});
