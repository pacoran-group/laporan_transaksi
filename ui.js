import Chart from 'chart.js/auto';

const isMobile = window.innerWidth <= 768;
Chart.defaults.font.size = isMobile ? 10 : 12;
Chart.defaults.plugins.legend.labels.boxWidth = isMobile ? 12 : 40;
Chart.defaults.plugins.legend.labels.padding = isMobile ? 8 : 10;

let charts = {};

export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export function formatDuration(ms) {
  if (!ms) return '-';
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}j ${mins}m`;
  return `${mins}m`;
}

export function updateSummaryKPIs(kpis) {
  document.getElementById('kpi-total-revenue').innerText = formatCurrency(kpis.totalRevenue);
  document.getElementById('kpi-total-trx').innerText = kpis.totalTrx.toLocaleString('id-ID');
  document.getElementById('kpi-avg-revenue').innerText = formatCurrency(kpis.avgRev);
  
  const growthEl = document.getElementById('kpi-mgt-growth');
  growthEl.innerText = `${kpis.growth > 0 ? '+' : ''}${kpis.growth.toFixed(1)}%`;
  
  const mgtLabel = document.getElementById('kpi-mgt-label');
  if (kpis.growth >= 0) {
    growthEl.parentElement.style.borderLeftColor = 'var(--color-success)';
    mgtLabel.className = 'kpi-trend trend-up';
  } else {
    growthEl.parentElement.style.borderLeftColor = 'var(--color-danger)';
    mgtLabel.className = 'kpi-trend trend-down';
  }
  
  // Karaoke specific KPIs
  const karaokeCards = document.querySelectorAll('.karaoke-only');
  if (kpis.isKaraokeView) {
    document.getElementById('kpi-total-fnb-paket').innerText = formatCurrency(kpis.totalFnb);
    document.getElementById('kpi-total-cash-payment').innerText = formatCurrency(kpis.totalPaid);
    karaokeCards.forEach(card => card.style.display = 'block');
  } else {
    karaokeCards.forEach(card => card.style.display = 'none');
  }
}

export function renderRevenueOverlayChart(aggregatedData) {
  const ctx = document.getElementById('chart-revenue-overlay');
  if (charts.overlay) charts.overlay.destroy();
  
  const labels = Object.keys(aggregatedData.results).sort();
  const datasets = aggregatedData.units.map((unit, index) => {
    const colors = ['#0EA5E9', '#10B981', '#F59E0B', '#6366F1'];
    return {
      label: unit,
      data: labels.map(label => aggregatedData.results[label][unit] ? aggregatedData.results[label][unit].revenue : 0),
      borderColor: colors[index % colors.length],
      tension: 0.3,
      fill: false
    };
  });
  
  charts.overlay = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: isMobile ? 'bottom' : 'top',
          labels: { font: { size: isMobile ? 9 : 12 } }
        },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              xMin: '2026-03',
              xMax: '2026-03',
              borderColor: 'red',
              borderWidth: 2,
              borderDash: [5, 5]
            }
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: isMobile ? 9 : 11 } } },
        y: { ticks: { font: { size: isMobile ? 9 : 11 }, callback: (val) => 'Rp ' + (val/1000000).toFixed(0) + 'M' } }
      }
    }
  });
}

export function renderContributionChart(aggregatedData) {
  const ctx = document.getElementById('chart-revenue-contribution');
  if (charts.contribution) charts.contribution.destroy();
  
  const unitTotals = {};
  Object.values(aggregatedData.results).forEach(monthData => {
    Object.keys(monthData).forEach(unit => {
      if (!unitTotals[unit]) unitTotals[unit] = 0;
      unitTotals[unit] += monthData[unit].revenue;
    });
  });
  
  charts.contribution = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(unitTotals),
      datasets: [{
        data: Object.values(unitTotals),
        backgroundColor: ['#0EA5E9', '#10B981', '#F59E0B', '#6366F1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

export function renderAnomalyTable(anomalies) {
  const tbody = document.querySelector('#anomaly-table tbody');
  tbody.innerHTML = anomalies.slice(0, 50).map(a => `
    <tr>
      <td>${a.unit}</td>
      <td>${a.date.toLocaleString('id-ID')}</td>
      <td>${a.cust || '-'}</td>
      <td>Room ${a.room}</td>
      <td>${a.value}</td>
      <td><span class="badge badge-${a.severity}">${a.type}</span></td>
    </tr>
  `).join('');
  
  // Count anomalies
  const zeroAnomalies = anomalies.filter(a => a.type === 'Transaksi Rp 0 (Non-Test)');
  const countZero = zeroAnomalies.length;
  const estLossZero = zeroAnomalies.reduce((sum, a) => sum + (a.estLoss || 0), 0);
  
  document.getElementById('kpi-anomaly-zero').innerText = countZero.toLocaleString('id-ID');
  const lossEl = document.getElementById('kpi-anomaly-zero-loss');
  if (lossEl) lossEl.innerText = formatCurrency(estLossZero);
}

export function renderRawTable(data) {
  const tbody = document.querySelector('#raw-table tbody');
  const recent = data.filter(d => !d.isTest).sort((a,b) => b.start_time - a.start_time).slice(0, 100);
  
  tbody.innerHTML = recent.map(r => `
    <tr>
      <td>${r.trans_id}</td>
      <td>${r.unit}</td>
      <td>${r.start_time ? r.start_time.toLocaleString('id-ID') : '-'}</td>
      <td>${r.cust_name || '-'}</td>
      <td>${r.room_id || '-'}</td>
      <td>${formatCurrency(r.total_price)}</td>
    </tr>
  `).join('');
}

export function renderMonthlyGrowthChart(aggregatedData) {
  const ctx = document.getElementById('chart-monthly-growth');
  if (!ctx) return;
  if (charts.growth) charts.growth.destroy();
  
  const labels = Object.keys(aggregatedData.results).sort();
  const revenueData = labels.map(label => {
    return Object.values(aggregatedData.results[label]).reduce((sum, u) => sum + (u.revenue || 0), 0);
  });
  const trxData = labels.map(label => {
    return Object.values(aggregatedData.results[label]).reduce((sum, u) => sum + (u.trx || 0), 0);
  });
  
  charts.growth = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Transaksi',
          data: trxData,
          backgroundColor: '#0EA5E9',
          yAxisID: 'y-trx',
          borderRadius: 4
        },
        {
          label: 'Total Revenue',
          data: revenueData,
          type: 'line',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y-rev',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: isMobile ? 'bottom' : 'top', labels: { font: { size: isMobile ? 9 : 12 } } }
      },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: isMobile ? 9 : 11 } } },
        'y-trx': { type: 'linear', position: 'left', title: { display: !isMobile, text: 'Jumlah Transaksi' }, ticks: { font: { size: isMobile ? 9 : 11 } } },
        'y-rev': { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: isMobile ? 9 : 11 }, callback: (val) => 'Rp ' + (val/1000000).toFixed(0) + 'M' } }
      }
    }
  });
}

export function renderUnitRooms(data, unitFilter) {
  const ctx = document.getElementById('chart-unit-rooms');
  if (!ctx) return;
  if (charts.unitRooms) charts.unitRooms.destroy();
  
  const roomRevs = {};
  data.forEach(row => {
    if (row.isTest) return;
    if (unitFilter === 'all' || row.unit.toLowerCase().includes(unitFilter.replace('-', ' '))) {
      const room = row.room_id || 'Unknown';
      roomRevs[room] = (roomRevs[room] || 0) + row.total_price;
    }
  });
  
  const sorted = Object.entries(roomRevs).sort((a,b) => b[1] - a[1]).slice(0, 10);
  
  charts.unitRooms = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => 'Room ' + s[0]),
      datasets: [{
        label: 'Revenue',
        data: sorted.map(s => s[1]),
        backgroundColor: '#6366F1',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: (val) => 'Rp ' + (val/1000000).toFixed(1) + 'M' } }
      }
    }
  });
}

export function renderUnitHours(data, unitFilter) {
  const ctx = document.getElementById('chart-unit-hours');
  if (!ctx) return;
  if (charts.unitHours) charts.unitHours.destroy();
  
  const hours = Array(24).fill(0);
  data.forEach(row => {
    if (row.isTest || !row.start_time) return;
    if (unitFilter === 'all' || row.unit.toLowerCase().includes(unitFilter.replace('-', ' '))) {
      hours[row.start_time.getHours()]++;
    }
  });
  
  charts.unitHours = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(24).fill(0).map((_,i) => `${i}:00`),
      datasets: [{
        label: 'Volume Transaksi',
        data: hours,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

export function renderUnitHeatmap(containerId, data, unitFilter, isTest = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const heatmap = Array(7).fill(0).map(() => Array(24).fill(0));
  let maxVal = 0;
  
  data.forEach(row => {
    if ((isTest && !row.isTest) || (!isTest && row.isTest)) return;
    if (!row.start_time) return;
    if (unitFilter === 'all' || row.unit.toLowerCase().includes(unitFilter.replace('-', ' '))) {
      const day = row.start_time.getDay();
      const hour = row.start_time.getHours();
      heatmap[day][hour]++;
      if (heatmap[day][hour] > maxVal) maxVal = heatmap[day][hour];
    }
  });
  
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  let html = '<div class="heatmap-container">';
  
  // Header row
  html += '<div class="heatmap-header"><div class="heatmap-label"></div>';
  for (let h=0; h<24; h++) html += `<div class="heatmap-header-cell">${h}</div>`;
  html += '</div>';
  
  // Body rows
  for (let d=0; d<7; d++) {
    html += `<div class="heatmap-row"><div class="heatmap-label">${days[d]}</div>`;
    for (let h=0; h<24; h++) {
      const val = heatmap[d][h];
      const intensity = maxVal > 0 ? val / maxVal : 0;
      const hue = isTest ? 0 : 200; // Red for tests, blue for normal
      const lightness = 95 - (intensity * 50);
      const bg = val === 0 ? 'var(--color-border)' : `hsl(${hue}, 80%, ${lightness}%)`;
      html += `<div class="heatmap-cell" style="background-color: ${bg};" title="${days[d]} ${h}:00 - ${val} trx"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
}

export function renderAuditSection(auditData) {
  document.getElementById('kpi-audit-test-count').innerText = auditData.totalTestCount.toLocaleString('id-ID');
  document.getElementById('kpi-audit-test-monetized').innerText = formatCurrency(auditData.totalTestMonetized);
  document.getElementById('kpi-audit-overprint-count').innerText = auditData.totalOverprints.toLocaleString('id-ID');
  
  // Duration Ranges Table
  const durationTbody = document.querySelector('#audit-duration-ranges-table tbody');
  if (durationTbody) {
    durationTbody.innerHTML = auditData.durationRanges.map(r => `
      <tr>
        <td><strong>${r.label}</strong></td>
        <td>${r.old} kali</td>
        <td>${r.new} kali</td>
        <td><strong>${r.total} kali</strong></td>
      </tr>
    `).join('');
  }

  // Type Monetization Table
  const typeTbody = document.querySelector('#audit-type-monetization-table tbody');
  if (typeTbody) {
    typeTbody.innerHTML = auditData.typeMonetization.map(t => `
      <tr>
        <td><strong>${t.type}</strong></td>
        <td><span class="badge badge-warning">${t.count}</span></td>
        <td>${formatDuration(t.count > 0 ? t.durationMs / t.count : 0)}</td>
        <td>${formatCurrency(t.value)}</td>
      </tr>
    `).join('');
  }
  
  // Top Tested Table
  const topTestTbody = document.querySelector('#audit-top-tested-table tbody');
  if (topTestTbody) {
    topTestTbody.innerHTML = auditData.topTestedRooms.map(r => `
      <tr>
        <td>${r.unit}</td>
        <td><strong>Room ${r.room}</strong></td>
        <td>${r.type}</td>
        <td><span class="badge badge-warning">${r.count}</span></td>
        <td>${formatDuration(r.count > 0 ? r.durationMs / r.count : 0)}</td>
        <td>${formatCurrency(r.estValue)}</td>
      </tr>
    `).join('');
  }
  
  // Room Overprint Table
  const roomTbody = document.querySelector('#audit-overprint-table tbody');
  if (roomTbody) {
    roomTbody.innerHTML = auditData.topOverprintRooms.map(r => `
      <tr>
        <td>${r.unit}</td>
        <td><strong>Room ${r.room}</strong></td>
        <td><span class="badge badge-danger">${r.trxCount}x (${r.count} struk)</span></td>
        <td>${formatCurrency(r.avgNominal)}</td>
      </tr>
    `).join('');
  }
}

