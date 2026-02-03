import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BACKGROUND_COLOR = '#ffffff';

const waitForCharts = async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise((resolve) => setTimeout(resolve, 250));
};

const formatTimestamp = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(
    date.getMinutes()
  )}`;
};

const sliceCanvas = (canvas: HTMLCanvasElement, pageHeightPx: number) => {
  const slices: HTMLCanvasElement[] = [];
  let offsetY = 0;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const context = pageCanvas.getContext('2d');
    if (context) {
      context.fillStyle = BACKGROUND_COLOR;
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    }

    slices.push(pageCanvas);
    offsetY += sliceHeight;
  }

  return slices;
};

export const exportResultsToPdf = async (element: HTMLElement) => {
  await waitForCharts();

  const canvas = await html2canvas(element, {
    backgroundColor: BACKGROUND_COLOR,
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true
  });

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageHeightPx = Math.floor((pageHeight * canvas.width) / pageWidth);
  const slices = sliceCanvas(canvas, pageHeightPx);

  slices.forEach((slice, index) => {
    const imgData = slice.toDataURL('image/png');
    const imgHeight = (slice.height * pageWidth) / slice.width;
    if (index > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  });

  const filename = `SampleKPI_results_${formatTimestamp(new Date())}.pdf`;
  pdf.save(filename);
};
