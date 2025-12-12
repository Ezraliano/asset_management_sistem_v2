import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface GuaranteeExportData {
  id: number;
  spk_number: string;
  cif_number: string;
  spk_name: string;
  guarantee_name: string;
  guarantee_type: string;
  guarantee_number: string;
  input_date: string;
  status: string;
  file_location?: string;
}

interface GuaranteeLoanExportData {
  id: number;
  guarantee_id: number;
  spk_number: string;
  cif_number: string;
  guarantee_name: string;
  borrower_name: string;
  borrower_contact: string;
  reason: string;
  loan_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string;
  // Guarantee relationship data
  guarantee?: {
    guarantee_name: string;
    status: string;
  };
}

interface GuaranteeSettlementExportData {
  id: number;
  guarantee_id: number;
  settlement_date: string;
  settlement_notes?: string;
  settlement_status: string;
  settled_by?: string;
  settlement_remarks?: string;
  // Data jaminan akan di-join saat export
  guarantee?: {
    spk_number: string;
    cif_number: string;
    guarantee_name: string;
  };
}

/**
 * Format date untuk display
 */
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Export data Jaminan Masuk ke PDF
 */
export const exportGuaranteeIncomeToPdf = (
  filename: string,
  data: GuaranteeExportData[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [842, 595],
  });

  const margin = { left: 40, right: 40, top: 80, bottom: 40 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN JAMINAN ASET MASUK', margin.left, 40);

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, margin.left, 60);

  // Prepare table data
  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama SPK',
    'Atas Nama Jaminan',
    'Tipe Jaminan',
    'No Jaminan',
    'Lokasi Jaminan',
    'Tgl Input Jaminan Masuk',
    'Status',
  ];

  const tableData = data.map((item, index) => [
    (index + 1).toString(),
    item.spk_number,
    item.cif_number,
    item.spk_name,
    item.guarantee_name,
    item.guarantee_type,
    item.guarantee_number,
    item.file_location || '',
    formatDate(item.input_date),
    getStatusLabel(item.status),
  ]);

  // AutoTable
  (doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: margin.top,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [40, 40, 40],
      font: 'helvetica',
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 50 },
      3: { cellWidth: 70 },
      4: { cellWidth: 70 },
      5: { cellWidth: 60 },
      6: { cellWidth: 60 },
      7: { cellWidth: 65 },
      8: { cellWidth: 60 },
      9: { cellWidth: 50, halign: 'center' },
    },
    margin: {
      left: margin.left,
      right: margin.right,
      top: margin.top,
      bottom: margin.bottom,
    },
    showHead: 'everyPage',
    theme: 'grid',
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    },
  });

  doc.save(filename);
};

/**
 * Export data Jaminan Masuk ke Excel
 */
export const exportGuaranteeIncomeToExcel = (
  filename: string,
  data: GuaranteeExportData[]
) => {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama SPK',
    'Atas Nama Jaminan',
    'Tipe Jaminan',
    'No Jaminan',
    'Lokasi Jaminan',
    'Tgl Input Jaminan Masuk',
    'Status',
  ];

  const tableData = data.map((item, index) => [
    index + 1,
    item.spk_number,
    item.cif_number,
    item.spk_name,
    item.guarantee_name,
    item.guarantee_type,
    item.guarantee_number,
    item.file_location || '',
    formatDate(item.input_date),
    getStatusLabel(item.status),
  ]);

  const worksheetData = [headers, ...tableData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = [
    { wch: 5 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
  ];
  worksheet['!cols'] = columnWidths;
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jaminan Masuk');
  XLSX.writeFile(workbook, filename);
};

/**
 * Export data Jaminan Dipinjam ke PDF
 */
export const exportGuaranteeLoanToPdf = (
  filename: string,
  data: GuaranteeLoanExportData[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [842, 595],
  });

  const margin = { left: 40, right: 40, top: 80, bottom: 40 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN JAMINAN DIPINJAM', margin.left, 40);

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, margin.left, 60);

  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama Jaminan',
    'Nama Peminjam',
    'Kontak',
    'Alasan Peminjaman',
    'Tgl Peminjaman',
    'Tgl Kembali Ekspektasi',
    'Status',
  ];

  const tableData = data.map((item, index) => [
    (index + 1).toString(),
    item.spk_number,
    item.cif_number,
    item.guarantee?.guarantee_name || item.guarantee_name || '',
    item.borrower_name,
    item.borrower_contact,
    item.reason,
    formatDate(item.loan_date),
    formatDate(item.expected_return_date),
    getGuaranteeStatusFromLoan(item),
  ]);

  (doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: margin.top,
    styles: {
      fontSize: 7,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [40, 40, 40],
      font: 'helvetica',
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [230, 126, 34],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 60 },
      3: { cellWidth: 80 },
      4: { cellWidth: 70 },
      5: { cellWidth: 70 },
      6: { cellWidth: 80 },
      7: { cellWidth: 70 },
      8: { cellWidth: 70 },
      9: { cellWidth: 60, halign: 'center' },
    },
    margin: {
      left: margin.left,
      right: margin.right,
      top: margin.top,
      bottom: margin.bottom,
    },
    showHead: 'everyPage',
    theme: 'grid',
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    },
  });

  doc.save(filename);
};

/**
 * Export data Jaminan Dipinjam ke Excel
 */
export const exportGuaranteeLoanToExcel = (
  filename: string,
  data: GuaranteeLoanExportData[]
) => {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama Jaminan',
    'Nama Peminjam',
    'Kontak Peminjam',
    'Alasan Peminjaman',
    'Tanggal Peminjaman',
    'Tanggal Kembali Ekspektasi',
    'Tanggal Kembali Aktual',
    'Status',
  ];

  const tableData = data.map((item, index) => [
    index + 1,
    item.spk_number,
    item.cif_number,
    item.guarantee?.guarantee_name || item.guarantee_name || '',
    item.borrower_name,
    item.borrower_contact,
    item.reason,
    formatDate(item.loan_date),
    formatDate(item.expected_return_date),
    formatDate(item.actual_return_date),
    getGuaranteeStatusFromLoan(item),
  ]);

  const worksheetData = [headers, ...tableData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const columnWidths = [
    { wch: 5 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
  ];
  worksheet['!cols'] = columnWidths;
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jaminan Dipinjam');
  XLSX.writeFile(workbook, filename);
};

/**
 * Export data Jaminan Lunas ke PDF
 */
export const exportGuaranteeSettlementToPdf = (
  filename: string,
  data: GuaranteeSettlementExportData[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [842, 595],
  });

  const margin = { left: 40, right: 40, top: 80, bottom: 40 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN JAMINAN LUNAS', margin.left, 40);

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, margin.left, 60);

  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama Jaminan',
    'Tgl Pelunasan',
    'Status Pelunasan',
    'Validator',
    'Catatan',
  ];

  const tableData = data.map((item, index) => [
    (index + 1).toString(),
    item.guarantee?.spk_number || '',
    item.guarantee?.cif_number || '',
    item.guarantee?.guarantee_name || '',
    formatDate(item.settlement_date),
    getSettlementStatusLabel(item.settlement_status),
    item.settled_by || '',
    item.settlement_notes || '',
  ]);

  (doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY: margin.top,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [40, 40, 40],
      font: 'helvetica',
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [46, 204, 113],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 70 },
      3: { cellWidth: 90 },
      4: { cellWidth: 80 },
      5: { cellWidth: 80 },
      6: { cellWidth: 80 },
      7: { cellWidth: 100 },
    },
    margin: {
      left: margin.left,
      right: margin.right,
      top: margin.top,
      bottom: margin.bottom,
    },
    showHead: 'everyPage',
    theme: 'grid',
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    },
  });

  doc.save(filename);
};

/**
 * Export data Jaminan Lunas ke Excel
 */
export const exportGuaranteeSettlementToExcel = (
  filename: string,
  data: GuaranteeSettlementExportData[]
) => {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'No',
    'No SPK',
    'No CIF',
    'Atas Nama Jaminan',
    'Tanggal Pelunasan',
    'Status Pelunasan',
    'Validator',
    'Catatan Pelunasan',
    'Keterangan Validasi',
  ];

  const tableData = data.map((item, index) => [
    index + 1,
    item.guarantee?.spk_number || '',
    item.guarantee?.cif_number || '',
    item.guarantee?.guarantee_name || '',
    formatDate(item.settlement_date),
    getSettlementStatusLabel(item.settlement_status),
    item.settled_by || '',
    item.settlement_notes || '',
    item.settlement_remarks || '',
  ]);

  const worksheetData = [headers, ...tableData];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  const columnWidths = [
    { wch: 5 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 },
    { wch: 25 },
  ];
  worksheet['!cols'] = columnWidths;
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jaminan Lunas');
  XLSX.writeFile(workbook, filename);
};

/**
 * Helper functions untuk label status
 */
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    available: 'Tersedia',
    dipinjam: 'Dipinjam',
    lunas: 'Lunas',
  };
  return labels[status] || status;
};

/**
 * Get guarantee status label from loan data
 * Shows guarantee status (Dipinjam/Dikembalikan) instead of loan status
 */
const getGuaranteeStatusFromLoan = (item: GuaranteeLoanExportData): string => {
  const guaranteeStatus = item.guarantee?.status?.toLowerCase();

  // If guarantee status is available from relationship, use it
  if (guaranteeStatus === 'dipinjam') {
    return 'Dipinjam';
  } else if (guaranteeStatus === 'available') {
    return 'Tersedia';
  } else if (guaranteeStatus === 'lunas') {
    return 'Lunas';
  }

  // Fallback to loan status if guarantee status not available
  const labels: Record<string, string> = {
    active: 'Dipinjam',
    returned: 'Dikembalikan',
  };
  return labels[item.status] || item.status;
};

const getSettlementStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  };
  return labels[status] || status;
};

/**
 * Interface untuk Detail Jaminan dengan Settlement dan Loan
 */
interface GuaranteeDetailForPdf {
  id: number;
  spk_number: string;
  cif_number: string;
  spk_name: string;
  credit_period: string;
  guarantee_name: string;
  guarantee_type: string;
  guarantee_number: string;
  file_location: string;
  input_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  settlements?: Array<{
    id: number;
    settlement_date: string;
    settlement_status: string;
    settlement_notes?: string;
    settled_by?: string;
    settlement_remarks?: string;
    bukti_pelunasan?: string;
  }>;
  loans?: Array<{
    id: number;
    guarantee_id: number;
    borrower_name: string;
    borrower_contact: string;
    reason: string;
    loan_date: string;
    expected_return_date?: string | null;
    actual_return_date?: string | null;
    status: string;
    created_at: string;
  }>;
}

/**
 * Export Detail Jaminan ke PDF
 * Menampilkan:
 * - Informasi lengkap jaminan
 * - Informasi peminjaman (jika status = "dipinjam")
 * - Informasi pelunasan dan bukti pelunasan (jika status = "lunas")
 */
export const exportGuaranteeDetailToPdf = async (
  filename: string,
  guarantee: GuaranteeDetailForPdf
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPosition = 15;
  const margin = { left: 15, right: 15, top: 15, bottom: 15 };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.setFont('Helvetica', 'bold');
  doc.text('DETAIL JAMINAN ASET', margin.left, yPosition);
  yPosition += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, margin.left, yPosition);
  yPosition += 8;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin.left, yPosition, pageWidth - margin.right, yPosition);
  yPosition += 6;

  // Section 1: Informasi SPK
  doc.setFontSize(12);
  doc.setTextColor(41, 128, 185);
  doc.setFont('Helvetica', 'bold');
  doc.text('Informasi SPK', margin.left, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.setFont('Helvetica', 'normal');

  const spkInfo = [
    ['No SPK', guarantee.spk_number],
    ['No CIF', guarantee.cif_number],
    ['Atas Nama SPK', guarantee.spk_name],
    ['Jangka Kredit', guarantee.credit_period],
  ];

  spkInfo.forEach((info) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(info[0] + ':', margin.left, yPosition);
    doc.setFont('Helvetica', 'normal');
    doc.text(info[1], margin.left + 50, yPosition);
    yPosition += 6;
  });

  yPosition += 4;

  // Section 2: Informasi Jaminan
  doc.setFontSize(12);
  doc.setTextColor(41, 128, 185);
  doc.setFont('Helvetica', 'bold');
  doc.text('Informasi Jaminan', margin.left, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.setFont('Helvetica', 'normal');

  const guaranteeInfo = [
    ['Atas Nama Jaminan', guarantee.guarantee_name],
    ['Tipe Jaminan', guarantee.guarantee_type],
    ['No Jaminan', guarantee.guarantee_number],
    ['Lokasi File', guarantee.file_location],
  ];

  guaranteeInfo.forEach((info) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(info[0] + ':', margin.left, yPosition);
    doc.setFont('Helvetica', 'normal');
    const wrappedText = doc.splitTextToSize(info[1], pageWidth - margin.left - margin.right - 50);
    doc.text(wrappedText, margin.left + 50, yPosition);
    yPosition += 6;
  });

  yPosition += 4;

  // Section 3: Status dan Tanggal
  doc.setFontSize(12);
  doc.setTextColor(41, 128, 185);
  doc.setFont('Helvetica', 'bold');
  doc.text('Status dan Tanggal', margin.left, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.setFont('Helvetica', 'normal');

  const statusInfo = [
    ['Status', getStatusLabel(guarantee.status)],
    ['Tanggal Input', formatDate(guarantee.input_date)],
  ];

  statusInfo.forEach((info) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(info[0] + ':', margin.left, yPosition);
    doc.setFont('Helvetica', 'normal');
    doc.text(info[1], margin.left + 50, yPosition);
    yPosition += 6;
  });

  // Check if guarantee has loan history (display for all statuses)
  if (guarantee.loans && guarantee.loans.length > 0) {
    yPosition += 4;

    // Section: Riwayat Peminjaman
    doc.setFontSize(12);
    doc.setTextColor(230, 126, 34);
    doc.setFont('Helvetica', 'bold');
    doc.text('Riwayat Peminjaman', margin.left, yPosition);
    yPosition += 10;

    // Create table headers for loan history
    const loanTableHeaders = [
      'Nama Peminjam',
      'Kontak Peminjam',
      'Tgl Peminjaman',
      'Tgl Ekspektasi Kembali',
      'Tgl Pengembalian',
      'Lokasi Jaminan',
      'Alasan Peminjaman'
    ];

    // Create table data from all loans (active and returned)
    const loanTableData = guarantee.loans.map((loan: any) => [
      loan.borrower_name || 'N/A',
      loan.borrower_contact || 'N/A',
      formatDate(loan.loan_date),
      loan.expected_return_date ? formatDate(loan.expected_return_date) : 'Belum ditentukan',
      loan.actual_return_date ? formatDate(loan.actual_return_date) : 'Belum dikembalikan',
      guarantee.file_location || 'N/A',
      loan.reason || 'N/A'
    ]);

    // Create table using autoTable with portrait orientation
    (doc as any).autoTable({
      head: [loanTableHeaders],
      body: loanTableData,
      startY: yPosition,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: [40, 40, 40],
        font: 'helvetica',
        halign: 'left',
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [230, 126, 34],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 25 },
      },
      margin: {
        left: margin.left,
        right: margin.right,
        top: 0,
        bottom: 0,
      },
      showHead: 'firstPage',
      theme: 'grid',
      didDrawPage: (data: any) => {
        // Handle page breaks if needed
        if (data.pageNumber > 1) {
          yPosition = margin.top;
        }
      },
    });

    // Update yPosition after table
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 30;
    yPosition = finalY + 5;
  }

  // Check if guarantee is "lunas" and has settlements with bukti_pelunasan
  if (guarantee.status === 'lunas' && guarantee.settlements && guarantee.settlements.length > 0) {
    const approvedSettlement = guarantee.settlements.find(s => s.settlement_status === 'approved');

    if (approvedSettlement) {
      yPosition += 4;

      // Section 4: Informasi Pelunasan
      doc.setFontSize(12);
      doc.setTextColor(46, 204, 113);
      doc.setFont('Helvetica', 'bold');
      doc.text('Informasi Pelunasan', margin.left, yPosition);
      yPosition += 7;

      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont('Helvetica', 'normal');

      const settlementInfo = [
        ['Tanggal Pelunasan', formatDate(approvedSettlement.settlement_date)],
        ['Status Pelunasan', getSettlementStatusLabel(approvedSettlement.settlement_status)],
        ['Validator', approvedSettlement.settled_by || 'N/A'],
      ];

      settlementInfo.forEach((info) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(info[0] + ':', margin.left, yPosition);
        doc.setFont('Helvetica', 'normal');
        doc.text(info[1], margin.left + 50, yPosition);
        yPosition += 6;
      });

      if (approvedSettlement.settlement_notes) {
        doc.setFont('Helvetica', 'bold');
        doc.text('Catatan Pelunasan:', margin.left, yPosition);
        yPosition += 5;
        doc.setFont('Helvetica', 'normal');
        const wrappedNotes = doc.splitTextToSize(
          approvedSettlement.settlement_notes,
          pageWidth - margin.left - margin.right - 5
        );
        doc.text(wrappedNotes, margin.left + 3, yPosition);
        yPosition += wrappedNotes.length * 5 + 3;
      }

      if (approvedSettlement.settlement_remarks) {
        doc.setFont('Helvetica', 'bold');
        doc.text('Keterangan Validasi:', margin.left, yPosition);
        yPosition += 5;
        doc.setFont('Helvetica', 'normal');
        const wrappedRemarks = doc.splitTextToSize(
          approvedSettlement.settlement_remarks,
          pageWidth - margin.left - margin.right - 5
        );
        doc.text(wrappedRemarks, margin.left + 3, yPosition);
        yPosition += wrappedRemarks.length * 5 + 3;
      }

      // Add bukti pelunasan image if exists
      if (approvedSettlement.bukti_pelunasan) {
        yPosition += 3;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Bukti Pelunasan:', margin.left, yPosition);
        yPosition += 8;

        try {
          // Convert image URL to base64 for embedding in PDF
          const imageUrl = `http://127.0.0.1:8000/api/storage/${approvedSettlement.bukti_pelunasan}`;
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();

          return new Promise<void>((resolve) => {
            reader.onloadend = () => {
              const imageData = reader.result as string;

              // Check if we need to add a new page for the image
              const maxImageHeight = pageHeight - yPosition - margin.bottom;

              if (maxImageHeight > 50) {
                // Image fits on current page
                const imageWidth = 60;
                const imageHeight = 60;
                doc.addImage(imageData, 'JPEG', margin.left, yPosition, imageWidth, imageHeight);
              } else {
                // Add new page for image
                doc.addPage();
                const imageWidth = 100;
                const imageHeight = 100;
                doc.addImage(imageData, 'JPEG', margin.left, 20, imageWidth, imageHeight);
              }

              // Add footer with page numbers
              const pageCount = (doc as any).internal.getNumberOfPages();
              for (let i = 1; i <= pageCount; i++) {
                (doc as any).setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                  `Halaman ${i} dari ${pageCount}`,
                  pageWidth / 2,
                  pageHeight - 10,
                  { align: 'center' }
                );
              }

              doc.save(filename);
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading bukti pelunasan image:', error);
          // Continue without image if there's an error
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(200, 0, 0);
          doc.text('(Gambar bukti pelunasan tidak dapat dimuat)', margin.left, yPosition);

          // Add footer with page numbers
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            (doc as any).setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
              `Halaman ${i} dari ${pageCount}`,
              pageWidth / 2,
              pageHeight - 10,
              { align: 'center' }
            );
          }

          doc.save(filename);
        }
      } else {
        // Add footer with page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          (doc as any).setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Halaman ${i} dari ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        }

        doc.save(filename);
      }
    } else {
      // Add footer with page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        (doc as any).setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save(filename);
    }
  } else {
    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      (doc as any).setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Halaman ${i} dari ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    doc.save(filename);
  }
};
