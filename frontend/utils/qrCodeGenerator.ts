/**
 * QR Code Generator with Custom Layout
 * Generates QR codes with header, asset ID, and unit information
 */

interface QRLayoutOptions {
  sourceCanvas: HTMLCanvasElement;
  assetTag: string;
  unitName?: string;
  layout?: 'horizontal' | 'vertical';
}

/**
 * Generate custom QR code layout with:
 * - Header showing inventory unit name
 * - Asset ID on the left side
 * - QR Code on the right side
 */
export const generateCustomQRLayout = (options: QRLayoutOptions): string => {
  const {
    sourceCanvas,
    assetTag,
    unitName = 'Inventaris',
    layout = 'horizontal'
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (layout === 'horizontal') {
    return generateHorizontalLayout(ctx, sourceCanvas, assetTag, unitName);
  } else {
    return generateVerticalLayout(ctx, sourceCanvas, assetTag, unitName);
  }
};

/**
 * Generate horizontal layout:
 * - Header at top with inventory name
 * - Asset ID on left side
 * - QR Code on right side
 */
const generateHorizontalLayout = (
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  assetTag: string,
  unitName: string
): string => {
  const qrSize = 200;
  const padding = 20;
  const headerHeight = 60;
  const assetIdWidth = 140;
  const gap = 20;

  // Calculate canvas dimensions
  const totalWidth = assetIdWidth + gap + qrSize + padding * 2;
  const totalHeight = headerHeight + qrSize + padding * 2;

  const canvas = ctx.canvas;
  canvas.width = totalWidth;
  canvas.height = totalHeight;

  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw header background with gradient
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(0, 0, canvas.width, headerHeight);

  // Draw header text (Inventaris [Unit Name])
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const headerText = `Inventaris ${unitName}`;
  ctx.fillText(headerText, canvas.width / 2, headerHeight / 2);

  // Calculate positions
  const contentStartY = headerHeight + padding;

  // Draw Asset ID section on the left
  const assetIdX = padding;
  const assetIdY = contentStartY + qrSize / 2;

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ID Asset:', assetIdX, assetIdY - 20);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Word wrap asset tag if too long
  const assetLines = wrapText(assetTag, assetIdWidth - 10, ctx);
  let lineY = assetIdY;
  assetLines.forEach((line, index) => {
    ctx.fillText(line, assetIdX + 5, lineY + (index * 35));
  });

  // Draw border around asset ID section
  ctx.strokeStyle = '#D1D5DB';
  ctx.lineWidth = 2;
  ctx.strokeRect(assetIdX, contentStartY - 10, assetIdWidth, qrSize + 20);

  // Draw QR code on the right
  const qrX = assetIdX + assetIdWidth + gap;
  const qrY = contentStartY;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, qrX, qrY, qrSize, qrSize);

  // Draw border around QR code
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

  // Return PNG as data URL
  return canvas.toDataURL('image/png');
};

/**
 * Generate vertical layout:
 * - Header at top
 * - QR Code in middle
 * - Asset ID at bottom
 */
const generateVerticalLayout = (
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  assetTag: string,
  unitName: string
): string => {
  const qrSize = 220;
  const padding = 20;
  const headerHeight = 55;
  const footerHeight = 80;

  const canvas = ctx.canvas;
  canvas.width = qrSize + padding * 2;
  canvas.height = headerHeight + qrSize + footerHeight + padding * 2;

  // Draw white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw header
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(0, 0, canvas.width, headerHeight);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Inventaris ${unitName}`, canvas.width / 2, headerHeight / 2);

  // Draw QR code in the middle
  const qrX = padding;
  const qrY = headerHeight + padding;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceCanvas, qrX, qrY, qrSize, qrSize);

  // Draw border around QR code
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

  // Draw Asset ID at the bottom
  const footerY = headerHeight + qrSize + padding + 10;

  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('ID Asset:', canvas.width / 2, footerY);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(assetTag, canvas.width / 2, footerY + 20);

  return canvas.toDataURL('image/png');
};

/**
 * Wrap text to fit within a specified width
 */
const wrapText = (text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] => {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
};

/**
 * Download a canvas as PNG file
 */
export const downloadCanvasAsPNG = (
  canvas: HTMLCanvasElement,
  filename: string
): void => {
  const pngUrl = canvas
    .toDataURL('image/png')
    .replace('image/png', 'image/octet-stream');

  const downloadLink = document.createElement('a');
  downloadLink.href = pngUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

/**
 * Create canvas from data URL
 */
export const canvasFromDataUrl = (dataUrl: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;

  return canvas;
};
