import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToCsv = (filename: string, headers: string[], data: any[][]) => {
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            row.map(field => 
                `"${String(field || '').replace(/"/g, '""')}"`
            ).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToPdf = (filename: string, title: string, headers: string[], data: any[][]) => {
    // Buat PDF dalam format landscape
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    // Margin untuk landscape
    const margin = { left: 15, right: 15, top: 20, bottom: 20 };
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin.left, margin.top);
    
    // Add current date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('id-ID')}`, margin.left, margin.top + 8);

    // Configure column styles untuk layout landscape yang lebih baik
    const columnStyles: { [key: string]: any } = {
        0: { cellWidth: 20, fontStyle: 'bold' }, // ID
        1: { cellWidth: 40 }, // Name
        2: { cellWidth: 35 }, // Category
        3: { cellWidth: 40 }, // Location
        4: { cellWidth: 35 }, // Value
        5: { cellWidth: 30 }, // Purchase Date
        6: { cellWidth: 30 }, // Useful Life
        7: { cellWidth: 25 }, // Status
        8: { cellWidth: 35 }, // Monthly Depreciation
        9: { cellWidth: 40 }, // Accumulated Depreciation
        10: { cellWidth: 35 } // Current Value
    };

    // Untuk laporan dengan kolom lebih sedikit, sesuaikan lebar kolom
    if (headers.length <= 6) {
        // Reset column styles untuk laporan dengan kolom lebih sedikit
        Object.keys(columnStyles).forEach(key => {
            columnStyles[key] = { cellWidth: 'auto' };
        });
    }

    // AutoTable configuration untuk landscape
    (doc as any).autoTable({
        head: [headers],
        body: data,
        startY: margin.top + 15,
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            textColor: [40, 40, 40]
        },
        headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
            lineWidth: 0.1,
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248]
        },
        columnStyles: columnStyles,
        margin: { 
            left: margin.left, 
            right: margin.right,
            top: margin.top + 15,
            bottom: margin.bottom
        },
        tableWidth: 'auto',
        showHead: 'everyPage',
        theme: 'grid',
        didDrawPage: (data: any) => {
            // Add footer dengan page number di setiap halaman
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Page ${data.pageNumber} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
            
            // Add border untuk halaman
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(
                margin.left - 5, 
                margin.top - 5, 
                pageWidth - (margin.left + margin.right) + 10, 
                pageHeight - (margin.top + margin.bottom) + 10
            );
        }
    });

    doc.save(filename);
};