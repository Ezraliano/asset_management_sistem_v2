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
    // Buat PDF dalam format landscape dengan ukuran 842 × 595 pt (A4 landscape dalam points)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt', // Ubah ke points
        format: [842, 595] // Ukuran 842 × 595 pt untuk landscape
    });
    
    // Margin untuk landscape dalam points
    const margin = { left: 40, right: 40, top: 50, bottom: 40 };
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin.left, margin.top);
    
    // Add current date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('id-ID')}`, margin.left, margin.top + 20);

    // Konfigurasi column styles yang dinamis berdasarkan jumlah kolom
    const getColumnStyles = (columnCount: number) => {
        const columnStyles: { [key: string]: any } = {};
        
        if (columnCount === 11) { // Full Asset Report
            const availableWidth = pageWidth - margin.left - margin.right - 20;
            columnStyles[0] = { cellWidth: 40 };  // ID
            columnStyles[1] = { cellWidth: 80 };  // Name
            columnStyles[2] = { cellWidth: 70 };  // Category
            columnStyles[3] = { cellWidth: 80 };  // Location
            columnStyles[4] = { cellWidth: 90 };  // Nilai Asset Awal
            columnStyles[5] = { cellWidth: 70 };  // Purchase Date
            columnStyles[6] = { cellWidth: 70 };  // Useful Life
            columnStyles[7] = { cellWidth: 60 };  // Status
            columnStyles[8] = { cellWidth: 90 };  // Monthly Depreciation
            columnStyles[9] = { cellWidth: 100 }; // Accumulated Depreciation
            columnStyles[10] = { cellWidth: 80 }; // Current Value
        } else if (columnCount === 5) { // Maintenance Report
            const availableWidth = pageWidth - margin.left - margin.right - 20;
            columnStyles[0] = { cellWidth: 60 };  // Asset ID
            columnStyles[1] = { cellWidth: 120 }; // Asset Name
            columnStyles[2] = { cellWidth: 80 };  // Date
            columnStyles[3] = { cellWidth: 200 }; // Description
            columnStyles[4] = { cellWidth: 80 };  // Status
        } else if (columnCount === 6) { // Damage/Loss Report
            const availableWidth = pageWidth - margin.left - margin.right - 20;
            columnStyles[0] = { cellWidth: 60 };  // Type
            columnStyles[1] = { cellWidth: 60 };  // Asset ID
            columnStyles[2] = { cellWidth: 120 }; // Asset Name
            columnStyles[3] = { cellWidth: 200 }; // Description
            columnStyles[4] = { cellWidth: 80 };  // Date
            columnStyles[5] = { cellWidth: 80 };  // Status
        } else {
            // Default: bagi rata lebar kolom
            const columnWidth = (pageWidth - margin.left - margin.right - 20) / columnCount;
            for (let i = 0; i < columnCount; i++) {
                columnStyles[i] = { cellWidth: columnWidth };
            }
        }
        
        return columnStyles;
    };

    // AutoTable configuration untuk landscape
    (doc as any).autoTable({
        head: [headers],
        body: data,
        startY: margin.top + 30,
        styles: {
            fontSize: 8,
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            textColor: [40, 40, 40],
            font: 'helvetica'
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
        columnStyles: getColumnStyles(headers.length),
        margin: { 
            left: margin.left, 
            right: margin.right,
            top: margin.top + 30,
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
                pageHeight - 20,
                { align: 'center' }
            );
            
            // Add border untuk halaman (opsional)
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(
                margin.left - 10, 
                margin.top - 10, 
                pageWidth - (margin.left + margin.right) + 20, 
                pageHeight - (margin.top + margin.bottom) + 20
            );
        },
        // Optimasi untuk menghindari pemotongan
        willDrawCell: (data: any) => {
            // Pastikan teks tidak terpotong
            if (data.section === 'body') {
                data.cell.text = data.cell.text.map((text: string) => 
                    text.length > 50 ? text.substring(0, 47) + '...' : text
                );
            }
        }
    });

    doc.save(filename);
};