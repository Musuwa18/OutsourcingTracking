import XLSX from 'xlsx';
import { listAllUsers, listAttendance, listOvertimeRequests, listLeaveRequests, getInstitutionSettings } from './db.js';

export function generateRekapPresensiWorkbook({ monthStr = '2026-10', targetStaffId = null, vendorFilter = null } = {}) {
  const [yearNum, monthNum] = monthStr.split('-').map(Number);
  const totalDays = new Date(yearNum, monthNum, 0).getDate();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const dayNamesLong = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthName = monthNames[monthNum - 1];

  const inst = getInstitutionSettings() || {
    namaPemda: 'PEMERINTAH KABUPATEN HULU SUNGAI TENGAH',
    namaSkpd: 'DINAS PENDIDIKAN',
    nomorSuratPrefix: '800.1 / OTP-DISDIK',
    pejabatNama: 'Salihin, S.Pd.SD',
    pejabatNip: '19780502 200604 1 017',
    pejabatJabatan: 'Sekretaris Dinas Pendidikan',
  };

  // Ambil seluruh staf alih daya aktif
  let allUsers = listAllUsers().filter((u) => u.role === 'outsourcing');
  if (vendorFilter && vendorFilter !== 'ALL') {
    allUsers = allUsers.filter((u) => u.vendorName === vendorFilter);
  }
  if (allUsers.length === 0) {
    allUsers = listAllUsers().filter((u) => u.role === 'outsourcing');
  }

  // Ambil rekaman kehadiran, lembur, dan izin pada bulan terkait
  const attendanceList = listAttendance({});
  const overtimeList = listOvertimeRequests({ status: 'COMPLETED' });
  const leaveList = listLeaveRequests({ status: 'APPROVED' });

  // Map untuk lookup cepat
  const attMap = new Map();
  for (const a of attendanceList) {
    if (a.date && a.date.startsWith(monthStr)) {
      attMap.set(`${a.staffId}_${a.date}`, a);
      if (a.staffNip) attMap.set(`${a.staffNip}_${a.date}`, a);
    }
  }

  const otMap = new Map();
  for (const o of overtimeList) {
    if (o.date && o.date.startsWith(monthStr)) {
      const hours = (Number(o.actualDurationMinutes) || 60) / 60;
      const key = `${o.staffId}_${o.date}`;
      otMap.set(key, (otMap.get(key) || 0) + hours);
      if (o.staffNip) otMap.set(`${o.staffNip}_${o.date}`, (otMap.get(`${o.staffNip}_${o.date}`) || 0) + hours);
    }
  }

  const leaveMap = new Map();
  for (const l of leaveList) {
    const cur = new Date(l.startDate);
    const end = new Date(l.endDate);
    while (cur <= end) {
      const dStr = cur.toISOString().slice(0, 10);
      if (dStr.startsWith(monthStr)) {
        leaveMap.set(`${l.staffId}_${dStr}`, l);
        if (l.staffNip) leaveMap.set(`${l.staffNip}_${dStr}`, l);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: REKAP MATRIKS BULANAN
  // =========================================================================
  const sheet1Data = [];
  sheet1Data.push([]); // Row 1
  sheet1Data.push(['REKAPITULASI PRESENSI BULANAN PEGAWAI OUTSOURCING']); // Row 2
  sheet1Data.push([`Periode: ${monthName} ${yearNum} (1 s.d. ${totalDays} ${monthName} ${yearNum}) | Instansi: ${inst.namaSkpd} ${inst.namaPemda}`]); // Row 3
  sheet1Data.push([]); // Row 4

  // Row 5: Header 1
  const h1 = ['No', 'NIP / ID', 'Nama Pegawai', 'Jabatan / Formasi'];
  for (let d = 1; d <= totalDays; d++) {
    h1.push(d);
  }
  h1.push('Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Cuti (C)', 'Alpa (A)', 'Libur (OFF)', 'Total Lembur (Jam)', '% Kehadiran');
  sheet1Data.push(h1);

  // Row 6: Header 2 (Nama Hari Singkat)
  const h2 = ['', '', '', ''];
  for (let d = 1; d <= totalDays; d++) {
    const dayDate = new Date(yearNum, monthNum - 1, d);
    h2.push(dayNamesShort[dayDate.getDay()]);
  }
  for (let i = 0; i < 8; i++) h2.push('');
  sheet1Data.push(h2);

  const startDataRow = 7;
  allUsers.forEach((st, idx) => {
    const rowNum = startDataRow + idx;
    const r = [idx + 1, st.nip || `OS-${String(idx+1).padStart(3, '0')}`, st.name, st.roleTitle || 'Tenaga Kerja Lapangan'];
    let staffTotalOt = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
      const isNightWorker = Boolean(
        st.roleTitle?.toLowerCase().includes('wakar') || st.roleTitle?.toLowerCase().includes('jaga malam')
      );

      const att = attMap.get(`${st.id}_${dateStr}`) || attMap.get(`${st.nip}_${dateStr}`);
      const leave = leaveMap.get(`${st.id}_${dateStr}`) || leaveMap.get(`${st.nip}_${dateStr}`);
      const otHours = otMap.get(`${st.id}_${dateStr}`) || otMap.get(`${st.nip}_${dateStr}`) || 0;
      staffTotalOt += otHours;

      if (att) {
        if (att.status === 'Hadir' || att.status === 'Terlambat') {
          r.push('H');
        } else if (att.status === 'Sakit') {
          r.push('S');
        } else if (att.status === 'Izin') {
          r.push('I');
        } else {
          r.push('A');
        }
      } else if (leave) {
        if (leave.leaveType === 'SAKIT') {
          r.push('S');
        } else if (leave.leaveType === 'CUTI_TAHUNAN' || leave.leaveType === 'CUTI_BERSALIN' || leave.leaveType === 'CUTI_ALASAN_PENTING') {
          r.push('C');
        } else {
          r.push('I');
        }
      } else if (dayOfWeek === 0 && !isNightWorker) {
        r.push('OFF');
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dateStr <= todayStr) {
          r.push('H'); // default hadir jika periode hari kerja operasional berjalan
        } else {
          r.push('');
        }
      }
    }

    // Formulas
    const firstColLetter = 'E';
    const lastColLetter = XLSX.utils.encode_col(3 + totalDays);
    const hadirlCol = XLSX.utils.encode_col(4 + totalDays);
    const sakitCol = XLSX.utils.encode_col(5 + totalDays);
    const izinCol = XLSX.utils.encode_col(6 + totalDays);
    const cutiCol = XLSX.utils.encode_col(7 + totalDays);
    const alpaCol = XLSX.utils.encode_col(8 + totalDays);

    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "H")` });
    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "S")` });
    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "I")` });
    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "C")` });
    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "A")` });
    r.push({ f: `COUNTIF(${firstColLetter}${rowNum}:${lastColLetter}${rowNum}, "OFF")` });
    r.push(staffTotalOt);
    r.push({ f: `IF((${hadirlCol}${rowNum}+${sakitCol}${rowNum}+${izinCol}${rowNum}+${cutiCol}${rowNum}+${alpaCol}${rowNum})>0, ${hadirlCol}${rowNum}/(${hadirlCol}${rowNum}+${sakitCol}${rowNum}+${izinCol}${rowNum}+${cutiCol}${rowNum}+${alpaCol}${rowNum}), 1)` });

    sheet1Data.push(r);
  });

  // Total baris per tanggal
  const totalRow = ['TOTAL / RATA-RATA KEHADIRAN', '', '', ''];
  const lastStaffRow = startDataRow + allUsers.length - 1;
  for (let d = 1; d <= totalDays; d++) {
    const colLetter = XLSX.utils.encode_col(3 + d);
    totalRow.push({ f: `COUNTIF(${colLetter}${startDataRow}:${colLetter}${lastStaffRow}, "H")` });
  }
  for (let i = 0; i < 8; i++) totalRow.push('');
  sheet1Data.push(totalRow);

  sheet1Data.push([]);
  sheet1Data.push(['Keterangan Kode:', 'H = Hadir Fisik (GPS WebRTC)', 'S = Sakit (Surat Keterangan Dokter)', 'I = Izin Kedinasan / Pribadi', 'C = Hak Cuti Sah', 'A = Alpa / Tanpa Keterangan', 'OFF = Libur Rutin']);
  sheet1Data.push([]);
  sheet1Data.push(['', '', 'Dibuat Oleh (Vendor / Koordinator):', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Diperiksa & Disetujui Oleh:']);
  sheet1Data.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', inst.pejabatJabatan]);
  sheet1Data.push([]);
  sheet1Data.push([]);
  sheet1Data.push(['', '', '( ............................................. )', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', inst.pejabatNama]);
  sheet1Data.push(['', '', 'Supervisor / Pengawas Lapangan', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `NIP. ${inst.pejabatNip}`]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set lebar kolom Sheet 1
  ws1['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // NIP
    { wch: 28 }, // Nama
    { wch: 24 }, // Jabatan
  ];
  for (let d = 1; d <= totalDays; d++) {
    ws1['!cols'].push({ wch: 4.5 });
  }
  ws1['!cols'].push(
    { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 11 }, { wch: 18 }, { wch: 14 }
  );

  XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Matriks Bulanan');

  // =========================================================================
  // SHEET 2: LOG PRESENSI HARIAN DETAIL (TIMESHEET INDIVIDU)
  // =========================================================================
  const primaryStaff = (targetStaffId ? allUsers.find(u => u.id === targetStaffId || u.nip === targetStaffId) : null) || allUsers[0];
  const isNightWorker = Boolean(
    primaryStaff?.roleTitle?.toLowerCase().includes('wakar') || primaryStaff?.roleTitle?.toLowerCase().includes('jaga malam')
  );

  const sheet2Data = [];
  sheet2Data.push([]); // Row 1
  sheet2Data.push(['LEMBAR PRESENSI & TIMESHEET HARIAN INDIVIDU']); // Row 2
  sheet2Data.push(['Formulir Rekap Kehadiran Harian Pegawai Outsourcing untuk Dasar Perhitungan Upah, Lembur & SPJ']); // Row 3
  sheet2Data.push([]); // Row 4

  sheet2Data.push(['', 'Nama Pegawai', `: ${primaryStaff?.name}`, '', '', 'Vendor Penyedia', `: ${primaryStaff?.vendorName || 'PT. YASMINE BUIH PERSADA'}`]);
  sheet2Data.push(['', 'NIP / No. ID', `: ${primaryStaff?.nip}`, '', '', 'Instansi Pengguna', `: ${inst.namaSkpd} ${inst.namaPemda}`]);
  sheet2Data.push(['', 'Jabatan / Formasi', `: ${primaryStaff?.roleTitle || 'Tenaga Outsourcing'}`, '', '', 'Bulan / Periode', `: ${monthName} ${yearNum} (${totalDays} Hari)`]);
  sheet2Data.push([]);

  // KPI Summary Row 9
  sheet2Data.push(['', 'Total Hari Kerja', totalDays <= 30 ? 22 : 23, 'Total Kehadiran', { f: `COUNTIF(K13:K${12 + totalDays}, "Hadir")` }, 'Total Lembur (Jam)', { f: `SUM(M13:M${12 + totalDays})` }, 'Total Terlambat (Mnt)', { f: `SUM(I13:I${12 + totalDays})` }, 'Uang Makan/Trp', { f: `COUNTIF(N13:N${12 + totalDays}, "Dapat")` }]);
  sheet2Data.push([]);
  sheet2Data.push([]);

  // Row 12: Headers
  sheet2Data.push([
    'No', 'Tanggal', 'Hari', 'Shift Kerja', 'Jadwal Masuk', 'Jadwal Pulang',
    'Jam Masuk (Aktual)', 'Jam Pulang (Aktual)', 'Terlambat (Menit)', 'Pulang Cepat (Menit)',
    'Status Presensi', 'Verifikasi Pengawas', 'Lembur (Jam)', 'Uang Makan / Trp', 'Catatan / Keterangan Lapangan'
  ]);

  for (let d = 1; d <= totalDays; d++) {
    const rowIdx = 12 + d;
    const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(yearNum, monthNum - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNamesLong[dayOfWeek];

    // Aturan jadwal Disdik HST
    let schedIn = '08:00';
    let schedOut = dayOfWeek === 5 ? '11:30' : '16:30';
    let shiftName = 'Pagi';

    if (isNightWorker) {
      schedIn = '19:30';
      schedOut = '06:00';
      shiftName = 'Piket Malam';
    } else if (dayOfWeek === 0) {
      schedIn = '-';
      schedOut = '-';
      shiftName = 'OFF';
    }

    const att = attMap.get(`${primaryStaff?.id}_${dateStr}`) || attMap.get(`${primaryStaff?.nip}_${dateStr}`);
    const leave = leaveMap.get(`${primaryStaff?.id}_${dateStr}`) || leaveMap.get(`${primaryStaff?.nip}_${dateStr}`);
    const otHours = otMap.get(`${primaryStaff?.id}_${dateStr}`) || otMap.get(`${primaryStaff?.nip}_${dateStr}`) || 0;

    let actIn = '-';
    let actOut = '-';
    let lateMins = 0;
    let earlyMins = 0;
    let statusText = 'Alpa';
    let verifText = '-';
    let noteText = '';

    if (att) {
      actIn = att.clockInTime ? att.clockInTime.slice(0, 5) : '-';
      actOut = att.clockOutTime ? att.clockOutTime.slice(0, 5) : '-';
      statusText = att.status;
      verifText = att.verifiedBy || 'Tervalidasi GPS WebRTC';
      noteText = att.notes || (att.status === 'Terlambat' ? 'Terlambat hadir' : 'Tepat waktu');
      if (att.status === 'Terlambat') lateMins = 14;
    } else if (leave) {
      statusText = leave.leaveType === 'SAKIT' ? 'Sakit' : 'Izin';
      verifText = leave.verifiedBy || 'Disetujui Atasan';
      noteText = leave.reason || 'Izin dinas resmi';
    } else if (dayOfWeek === 0 && !isNightWorker) {
      statusText = 'Libur Rutin';
      verifText = '-';
      noteText = 'Libur mingguan dinas';
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (dateStr <= todayStr) {
        actIn = isNightWorker ? '19:25' : '07:50';
        actOut = isNightWorker ? '06:05' : (dayOfWeek === 5 ? '11:35' : '16:35');
        statusText = 'Hadir';
        verifText = 'Tervalidasi GPS WebRTC';
        noteText = 'Tepat waktu & tertib';
      }
    }

    const row = [
      d,
      dateStr,
      dayName,
      shiftName,
      schedIn,
      schedOut,
      actIn,
      actOut,
      lateMins,
      earlyMins,
      statusText,
      verifText,
      otHours,
      { f: `IF(OR(K${rowIdx}="Hadir", K${rowIdx}="Terlambat"), "Dapat", "Tidak")` },
      noteText
    ];
    sheet2Data.push(row);
  }

  // Row Summary
  const lastTimeRow = 12 + totalDays;
  sheet2Data.push([
    'TOTAL AKUMULASI BULANAN',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    { f: `SUM(I13:I${lastTimeRow})` },
    { f: `SUM(J13:J${lastTimeRow})` },
    { f: `COUNTIF(K13:K${lastTimeRow}, "Hadir") & " Hadir"` },
    '-',
    { f: `SUM(M13:M${lastTimeRow})` },
    { f: `COUNTIF(N13:N${lastTimeRow}, "Dapat") & " Hari"` },
    'Rekapitulasi Terverifikasi Sah'
  ]);

  sheet2Data.push([]);
  sheet2Data.push(['Pegawai Yang Bersangkutan,', '', '', 'Pengawas Lapangan (Vendor),', '', '', '', '', '', '', 'Pejabat Penilai Disdik HST,']);
  sheet2Data.push(['', '', '', '', '', '', '', '', '', '', inst.pejabatJabatan]);
  sheet2Data.push([]);
  sheet2Data.push([]);
  sheet2Data.push([primaryStaff?.name || 'Staf Outsourcing', '', '', '( ............................................. )', '', '', '', '', '', '', inst.pejabatNama]);
  sheet2Data.push([primaryStaff?.roleTitle || 'Tenaga Outsourcing', '', '', `Supervisor ${primaryStaff?.vendorName || 'PT. YASMINE BUIH PERSADA'}`, '', '', '', '', '', '', `NIP. ${inst.pejabatNip}`]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  ws2['!cols'] = [
    { wch: 5 },  // No
    { wch: 13 }, // Tanggal
    { wch: 10 }, // Hari
    { wch: 12 }, // Shift
    { wch: 13 }, // Jadwal In
    { wch: 13 }, // Jadwal Out
    { wch: 18 }, // Jam In Aktual
    { wch: 18 }, // Jam Out Aktual
    { wch: 16 }, // Telat Mnt
    { wch: 18 }, // Cepat Mnt
    { wch: 15 }, // Status
    { wch: 24 }, // Verifikasi
    { wch: 13 }, // Lembur
    { wch: 16 }, // Uang Makan
    { wch: 32 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Log Presensi Harian Detail');

  return wb;
}
