// chart.js
// Uses Chart.js to prepare pie and bar charts
// We'll load Chart.js from CDN in dashboard.html dynamically

export function preparePieChart(canvasId, labels, data) {
    loadChartJs(() => {
      const ctx = document.getElementById(canvasId).getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: generateColors(data.length),
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
        }
      });
    });
  }
  
  export function prepareBarChart(canvasId, labels, data) {
    loadChartJs(() => {
      const ctx = document.getElementById(canvasId).getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Income',
            data,
            backgroundColor: '#FFAFCC',
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            }
          }
        }
      });
    });
  }
  
  function loadChartJs(callback) {
    if (window.Chart) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = callback;
    document.head.appendChild(script);
  }
  
  function generateColors(n) {
    const baseColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#BDE0FE', '#FFAFCC',
      '#FFC8DD', '#A2D2FF', '#FF4C4C', '#0A74DA', '#FF91B8'
    ];
    const colors = [];
    for (let i = 0; i < n; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }  