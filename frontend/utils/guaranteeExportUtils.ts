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
    'Nama Jaminan',
    'Tipe Jaminan',
    'No Jaminan',
    'Tgl Input',
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
      0: { cellWidth: 30, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 60 },
      3: { cellWidth: 90 },
      4: { cellWidth: 90 },
      5: { cellWidth: 70 },
      6: { cellWidth: 70 },
      7: { cellWidth: 70 },
      8: { cellWidth: 60, halign: 'center' },
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
    'Nama Jaminan',
    'Tipe Jaminan',
    'No Jaminan',
    'Tanggal Input',
    'Status',
    'Lokasi File',
  ];

  const tableData = data.map((item, index) => [
    index + 1,
    item.spk_number,
    item.cif_number,
    item.spk_name,
    item.guarantee_name,
    item.guarantee_type,
    item.guarantee_number,
    formatDate(item.input_date),
    getStatusLabel(item.status),
    item.file_location || '',
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
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
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
    'Nama Jaminan',
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
    'Nama Jaminan',
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
    'Nama Jaminan',
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
    'Nama Jaminan',
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
