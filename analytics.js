export function calculateKPIs(data) {
  let totalRevenue = 0;
  let totalTrx = 0;
  let totalFnb = 0;
  let totalPaid = 0;
  
  let preMgtRevenue = 0;
  let preMgtMonths = new Set();
  
  let postMgtRevenue = 0;
  let postMgtMonths = new Set();

  const mgtDate = new Date(2026, 2, 1); // March 1, 2026

  data.forEach(row => {
    if (row.isTest) return; // Skip test transactions

    const val = row.total_price || 0;
    totalRevenue += val;
    totalFnb += row.total_fnb || 0;
    totalPaid += (row.cash_payment || 0) + (row.cc_payment || 0) + (row.db_payment || 0);
    totalTrx++;
    
    if (row.start_time) {
      const monthKey = `${row.start_time.getFullYear()}-${row.start_time.getMonth()}`;
      if (row.start_time < mgtDate) {
        preMgtRevenue += val;
        preMgtMonths.add(monthKey);
      } else {
        postMgtRevenue += val;
        postMgtMonths.add(monthKey);
      }
    }
  });

  const avgRev = totalTrx > 0 ? totalRevenue / totalTrx : 0;
  
  // Calculate average monthly revenue before and after
  const avgMonthlyPre = preMgtMonths.size > 0 ? preMgtRevenue / preMgtMonths.size : 0;
  const avgMonthlyPost = postMgtMonths.size > 0 ? postMgtRevenue / postMgtMonths.size : 0;
  
  let growth = 0;
  if (avgMonthlyPre > 0) {
    growth = ((avgMonthlyPost - avgMonthlyPre) / avgMonthlyPre) * 100;
  }

  return {
    totalRevenue,
    totalTrx,
    avgRev,
    totalFnb,
    totalPaid,
    growth,
    preMgtRevenue,
    postMgtRevenue
  };
}

export function detectAnomalies(data) {
  const anomalies = [];

  // Calculate average hourly rate for zero-price estimation
  const roomTotalRevenue = {};
  const roomTotalDurationMs = {};
  data.forEach(row => {
    if (row.isTest) return;
    const key = `${row.unit}_${row.room_id}`;
    if (!roomTotalRevenue[key]) {
      roomTotalRevenue[key] = 0;
      roomTotalDurationMs[key] = 0;
    }
    const durMs = parseDurationToMs(row.total_hour);
    if (row.total_price > 0 && durMs > 0) {
      roomTotalRevenue[key] += row.total_price;
      roomTotalDurationMs[key] += durMs;
    }
  });

  const finalRoomHourlyRate = {};
  Object.keys(roomTotalRevenue).forEach(key => {
    const durHours = roomTotalDurationMs[key] / 3600000;
    finalRoomHourlyRate[key] = durHours > 0 ? roomTotalRevenue[key] / durHours : 150000;
  });

  data.forEach(row => {
    if (row.isTest) return;
    
    // 1. Zero price but non-zero duration (only for karaoke typically)
    if (row.total_price === 0 && row.total_hour && row.total_hour !== '00:00:00') {
      const durMs = parseDurationToMs(row.total_hour);
      const durHours = durMs / 3600000;
      const key = `${row.unit}_${row.room_id}`;
      const rate = finalRoomHourlyRate[key] || 150000;
      const estLoss = durHours > 0 ? durHours * rate : rate;

      anomalies.push({
        unit: row.unit,
        date: row.start_time,
        cust: row.cust_name,
        room: row.room_id,
        value: `Durasi: ${row.total_hour}`,
        type: 'Transaksi Rp 0 (Non-Test)',
        severity: 'danger',
        estLoss: estLoss
      });
    }
  });

  return anomalies;
}

export function aggregateByMonthAndUnit(data) {
  const results = {}; 
  const units = new Set();
  
  data.forEach(row => {
    if (row.isTest || !row.start_time) return;
    
    const year = row.start_time.getFullYear();
    const month = String(row.start_time.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    
    if (!results[key]) results[key] = {};
    if (!results[key][row.unit]) {
      results[key][row.unit] = { revenue: 0, trx: 0, fnb: 0 };
    }
    
    results[key][row.unit].revenue += row.total_price;
    results[key][row.unit].trx += 1;
    results[key][row.unit].fnb += row.total_fnb_paket || 0;
    units.add(row.unit);
  });
  
  return { results, units: Array.from(units) };
}

function parseDurationToMs(dur) {
  if (!dur) return 0;
  if (typeof dur === 'number') return dur * 24 * 60 * 60 * 1000;
  if (typeof dur === 'string') {
    const parts = dur.split(':');
    if (parts.length === 3) {
      return (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * 1000;
    }
  }
  return 0;
}

function guessRoomType(hourlyRate, rawType) {
  if (rawType) {
    const t = rawType.toUpperCase();
    if (t.includes('VIP') || t.includes('VVIP') || t.includes('PRESIDENT')) return 'VIP';
    if (t.includes('BIG') || t.includes('LARGE') || t.includes('SUPER')) return 'BIG';
    if (t.includes('MEDIUM') || t.includes('MED')) return 'MEDIUM';
    if (t.includes('SMALL') || t.includes('SML')) return 'SMALL';
  }
  if (hourlyRate >= 250000) return 'VIP';
  if (hourlyRate >= 180000) return 'BIG';
  if (hourlyRate >= 100000) return 'MEDIUM';
  return 'SMALL';
}

export function generateAuditData(data) {
  const roomTestHeatmap = Array(7).fill(0).map(() => Array(24).fill(0));
  const testRoomDetails = {};
  let totalTestCount = 0;
  let totalTestMonetized = 0;
  
  // Calculate average non-test room hourly rate for monetization estimation
  const roomTotalRevenue = {};
  const roomTotalDurationMs = {};
  const roomTypes = {};
  
  data.forEach(row => {
    if (row.isTest) return;
    const key = `${row.unit}_${row.room_id}`;
    if (!roomTotalRevenue[key]) {
      roomTotalRevenue[key] = 0;
      roomTotalDurationMs[key] = 0;
      roomTypes[key] = {};
    }
    const durMs = parseDurationToMs(row.total_hour);
    if (row.total_price > 0 && durMs > 0) {
      roomTotalRevenue[key] += row.total_price;
      roomTotalDurationMs[key] += durMs;
    }
    if (row.nama_paket) {
      roomTypes[key][row.nama_paket] = (roomTypes[key][row.nama_paket] || 0) + 1;
    }
  });

  const finalRoomHourlyRate = {};
  const finalRoomType = {};
  Object.keys(roomTotalRevenue).forEach(key => {
    const durHours = roomTotalDurationMs[key] / 3600000;
    const hourlyRate = durHours > 0 ? roomTotalRevenue[key] / durHours : 150000;
    finalRoomHourlyRate[key] = hourlyRate;
    const sortedTypes = Object.entries(roomTypes[key]).sort((a,b) => b[1] - a[1]);
    const rawType = sortedTypes.length > 0 ? sortedTypes[0][0] : null;
    finalRoomType[key] = guessRoomType(hourlyRate, rawType);
  });

  // Room Test Analysis
  const mgtDate = new Date(2026, 2, 1);
  const durationRanges = [
    { label: '0 - 15 Menit', maxMs: 15 * 60000, old: 0, new: 0, total: 0 },
    { label: '16 - 30 Menit', maxMs: 30 * 60000, old: 0, new: 0, total: 0 },
    { label: '31 - 60 Menit', maxMs: 60 * 60000, old: 0, new: 0, total: 0 },
    { label: '1 - 2 Jam', maxMs: 120 * 60000, old: 0, new: 0, total: 0 },
    { label: '2 - 3 Jam', maxMs: 180 * 60000, old: 0, new: 0, total: 0 },
    { label: 'Lebih dari 3 Jam', maxMs: Infinity, old: 0, new: 0, total: 0 }
  ];

  data.forEach(row => {
    if (!row.isTest) return;
    totalTestCount++;
    
    if (row.start_time) {
      const day = row.start_time.getDay();
      const hour = row.start_time.getHours();
      roomTestHeatmap[day][hour]++;
    }
    
    const key = `${row.unit}_${row.room_id}`;
    const hourlyRate = finalRoomHourlyRate[key] || 150000;
    const type = finalRoomType[key] || 'UNKNOWN';
    const durMs = parseDurationToMs(row.total_hour);
    const durHours = durMs / 3600000;
    // If a test doesn't have duration, fallback to assuming 1 hour
    const estVal = durHours > 0 ? durHours * hourlyRate : hourlyRate;
    
    totalTestMonetized += estVal;
    
    if (!testRoomDetails[key]) {
      testRoomDetails[key] = { unit: row.unit, room: row.room_id, type, count: 0, estValue: 0, durationMs: 0 };
    }
    testRoomDetails[key].count++;
    testRoomDetails[key].estValue += estVal;
    testRoomDetails[key].durationMs += durMs;
    
    // Group into ranges
    const isNew = row.start_time && row.start_time >= mgtDate;
    for (let range of durationRanges) {
      if (durMs <= range.maxMs || range.maxMs === Infinity) {
        range.total++;
        if (isNew) range.new++;
        else range.old++;
        break;
      }
    }
  });

  const topTestedRooms = Object.values(testRoomDetails).sort((a,b) => b.estValue - a.estValue).slice(0, 20);
  const typeMonetization = {};
  Object.values(testRoomDetails).forEach(info => {
    if (!typeMonetization[info.type]) typeMonetization[info.type] = { count: 0, value: 0, durationMs: 0 };
    typeMonetization[info.type].count += info.count;
    typeMonetization[info.type].value += info.estValue;
    typeMonetization[info.type].durationMs += info.durationMs;
  });

  // Overprint Analysis
  let totalOverprints = 0;
  const roomOverprints = {};
  
  data.forEach(row => {
    if (row.print_receipt > 3) {
      totalOverprints++;
      const key = `${row.unit}_${row.room_id}`;
      if (!roomOverprints[key]) {
        roomOverprints[key] = { unit: row.unit, room: row.room_id, count: 0, trxCount: 0, nominal: 0 };
      }
      roomOverprints[key].count += row.print_receipt;
      roomOverprints[key].trxCount++;
      roomOverprints[key].nominal += (row.total_price || 0);
    }
  });
  
  const topOverprintRooms = Object.values(roomOverprints)
    .map(r => ({ ...r, avgNominal: r.trxCount > 0 ? r.nominal / r.trxCount : 0 }))
    .sort((a,b) => b.avgNominal - a.avgNominal)
    .slice(0, 50);

  return {
    roomTestHeatmap,
    totalTestCount,
    totalTestMonetized,
    durationRanges,
    topTestedRooms,
    typeMonetization: Object.entries(typeMonetization).sort((a,b) => b[1].value - a[1].value).map(([type, stats]) => ({ type, ...stats })),
    totalOverprints,
    topOverprintRooms
  };
}
