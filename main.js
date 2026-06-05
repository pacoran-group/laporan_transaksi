import { loadAllData } from './dataLoader.js';
import { calculateKPIs, aggregateByMonthAndUnit, detectAnomalies, generateAuditData } from './analytics.js';
import { updateSummaryKPIs, renderRevenueOverlayChart, renderContributionChart, renderAnomalyTable, renderRawTable, renderMonthlyGrowthChart, renderUnitRooms, renderUnitHours, renderUnitHeatmap, renderAuditSection } from './ui.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

let globalData = [];

async function init() {
  const loader = document.getElementById('loader');
  try {
    globalData = await loadAllData();
    loader.style.display = 'none';
    
    // Process initial view (all data)
    processDashboard();
    
    // Setup event listeners
    setupNavigation();
    setupFilters();
    setupExport();
    
  } catch (error) {
    console.error("Initialization failed:", error);
    loader.style.display = 'flex';
    document.getElementById('loader-progress').innerHTML = `<span style="color:red">Error: ${error.message}</span><br/><pre style="text-align:left;font-size:10px;margin-top:10px;">${error.stack}</pre>`;
  }
}

function processDashboard() {
  const periodFilter = document.getElementById('filter-period').value;
  const typeFilter = document.getElementById('filter-type').value;

  let filteredData = globalData;
  const mgtDate = new Date(2026, 2, 1);
  
  // Apply period filter
  if (periodFilter === '2025') {
    filteredData = filteredData.filter(d => d.start_time && d.start_time.getFullYear() === 2025);
  } else if (periodFilter === '2026') {
    filteredData = filteredData.filter(d => d.start_time && d.start_time.getFullYear() === 2026);
  } else if (periodFilter === 'pre-new-mgt') {
    filteredData = filteredData.filter(d => d.start_time && d.start_time < mgtDate);
  } else if (periodFilter === 'post-new-mgt') {
    filteredData = filteredData.filter(d => d.start_time && d.start_time >= mgtDate);
  }

  // Apply type/unit filter
  let isKaraokeView = false;
  
  if (typeFilter === 'hotel') {
    filteredData = filteredData.filter(d => d.unit.includes('Hotel'));
  } else if (typeFilter === 'karaoke') {
    filteredData = filteredData.filter(d => d.unit.includes('Karaoke'));
    isKaraokeView = true;
  } else if (typeFilter !== 'all') {
    // Exact match for specific unit
    filteredData = filteredData.filter(d => d.unit === typeFilter);
    if (typeFilter.includes('Karaoke')) isKaraokeView = true;
  }

  const kpis = calculateKPIs(filteredData);
  kpis.isKaraokeView = isKaraokeView;
  updateSummaryKPIs(kpis);
  
  const aggregated = aggregateByMonthAndUnit(filteredData);
  renderRevenueOverlayChart(aggregated);
  renderContributionChart(aggregated);
  renderMonthlyGrowthChart(aggregated);
  
  const anomalies = detectAnomalies(filteredData);
  renderAnomalyTable(anomalies);
  
  renderRawTable(filteredData);
  
  // Render Unit Dashboards using the filtered data
  renderUnitRooms(filteredData, 'all');
  renderUnitHours(filteredData, 'all');
  renderUnitHeatmap('unit-heatmap-container', filteredData, 'all', false);
  
  // Render Audit Dashboards using the filtered data
  const auditData = generateAuditData(filteredData);
  renderAuditSection(auditData);
  renderUnitHeatmap('audit-test-heatmap-container', filteredData, 'all', true);
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.dashboard-section');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      const targetId = item.getAttribute('data-target');
      sections.forEach(sec => {
        if (sec.id === targetId) sec.classList.add('active');
        else sec.classList.remove('active');
      });
    });
  });
}

function setupFilters() {
  document.getElementById('filter-period').addEventListener('change', processDashboard);
  document.getElementById('filter-type').addEventListener('change', processDashboard);
}

function setupExport() {
  document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    const btn = document.getElementById('btn-export-pdf');
    btn.innerText = "Generating PDF...";
    
    const container = document.getElementById('export-container');
    const canvas = await html2canvas(container, { scale: 2 });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('Laporan_Transaksi_Pancoran_Group.pdf');
    
    btn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Export Laporan PDF';
  });
}

document.addEventListener('DOMContentLoaded', init);
