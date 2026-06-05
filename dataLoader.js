import * as XLSX from 'xlsx';

// Utility to parse Excel serial date or string date
export function parseDate(value) {
  if (!value) return null;
  
  // If it's a number, it's likely an Excel serial date
  if (typeof value === 'number') {
    // Excel epoch starts at 1900-01-01. But there's a leap year bug in 1900.
    // 25569 is the difference in days between 1900-01-01 and 1970-01-01.
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  
  // If string (DD/MM/YYYY HH:mm)
  if (typeof value === 'string') {
    const parts = value.split(' ');
    if (parts.length > 0) {
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        let hours = 0, mins = 0;
        if (parts.length > 1) {
          const timeParts = parts[1].split(':');
          if (timeParts.length >= 2) {
            hours = parseInt(timeParts[0], 10);
            mins = parseInt(timeParts[1], 10);
          }
        }
        const d = new Date(year, month, day, hours, mins);
        return isNaN(d) ? null : d;
      }
    }
  }
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

// Function to fetch and read an excel file
async function loadExcelFile(url, unitName) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Assume first sheet contains the data
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    // Process and normalize data
    return data.map(row => {
      const startTime = parseDate(row['start_time']);
      
      let cash = parseFloat(row['cash_payment'] || 0);
      let cc = parseFloat(row['cc_payment'] || 0);
      let db = parseFloat(row['db_payment'] || 0);
      let fnbPaket = parseFloat(row['total_fnb_paket'] || 0);
      
      // Revenue Bug Fix: For Karaoke, use actual payments instead of the 0 total_price column
      let isKaraoke = unitName.includes('Karaoke');
      let totalPrice = isKaraoke ? (cash + cc + db) : parseFloat(row['total_price'] || 0);
      let totalFnb = isKaraoke ? fnbPaket : parseFloat(row['total_fnb'] || 0);

      return {
        unit: unitName,
        trans_id: row['trans_id'],
        room_id: row['room_id'],
        cust_name: row['cust_name'],
        start_time: startTime,
        total_price: totalPrice,
        total_fnb: totalFnb,
        total_fnb_paket: fnbPaket,
        cash_payment: cash,
        cc_payment: cc,
        db_payment: db,
        total_hour: row['total_hour'], 
        room_disc: parseFloat(row['room_disc'] || 0),
        print_receipt: parseInt(row['print_receipt'] || 0),
        nama_paket: row['nama_paket'] || null,
        user_id: row['user_id'] || null,
        isTest: String(row['trans_id']).startsWith('T') || row['cust_name'] === 'ROOM TEST',
        isBar: (unitName === 'Karaoke Ashika' && row['room_id'] == 28) || (unitName === 'Karaoke Grand Royal' && row['room_id'] == 33)
      };
    });
  } catch (error) {
    console.error(`Error loading ${url}:`, error);
    return [];
  }
}

export async function loadAllData() {
  const ashikaData = await loadExcelFile('/data/Transaksi Karaoke Ashika.xlsx', 'Karaoke Ashika');
  const grandRoyalData = await loadExcelFile('/data/Transaksi Karaoke Grand Royal.xls', 'Karaoke Grand Royal');
  const pancoranData = await loadExcelFile('/data/Transaksi Hotel Pancoran.xls', 'Hotel Pancoran');
  const royalInnData = await loadExcelFile('/data/Transaksi Hotel Royal Inn.xls', 'Hotel Royal Inn');
  
  return [...ashikaData, ...grandRoyalData, ...pancoranData, ...royalInnData];
}
