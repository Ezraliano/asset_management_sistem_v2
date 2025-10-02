import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Escapes a single value for CSV format. If the value contains a comma, double quote, or newline,
 * it wraps the value in double quotes and escapes any existing double quotes.
 * @param value The value to escape.
 * @returns The escaped string.
 */
const escapeCsvValue = (value: any): string => {
  const stringValue = String(value == null ? '' : value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * Converts an array of objects into a CSV string and triggers a download.
 * @param filename The name of the file to be downloaded (e.g., "report.csv").
 * @param headers An array of strings for the CSV header row.
 * @param data A 2D array of data, where each inner array represents a row.
 */
export const exportToCsv = (filename: string, headers: string[], data: any[][]): void => {
  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...data.map(row => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Converts an array of data into a PDF document with a table and triggers a download.
 * @param filename The name of the file to be downloaded (e.g., "report.pdf").
 * @param title The title to be displayed at the top of the PDF document.
 * @param headers An array of strings for the table header row.
 * @param data A 2D array of data, where each inner array represents a table row.
 */
export const exportToPdf = (filename: string, title: string, headers: string[], data: any[][]): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.text(title, 14, 16);
  
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 24,
    theme: 'grid',
    styles: {
        fontSize: 10,
        cellPadding: 2,
    },
    headStyles: {
        fillColor: [59, 130, 246], // primary color
        textColor: 255,
        fontStyle: 'bold',
    }
  });
  
  doc.save(filename);
};