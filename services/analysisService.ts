import { AnalysisResult, UploadedFile } from '../types';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

/**
 * Calls the local OpenAI proxy (Vite middleware) to analyze an uploaded image.
 * The API key stays server-side (do not expose it to the browser).
 */
const extractApiError = (text: string, status: number): string => {
  if (!text) return `Analyze failed (${status})`;
  try {
    const payload = JSON.parse(text);
    const message =
      (payload?.message && String(payload.message)) ||
      (payload?.error && (typeof payload.error === 'string' ? payload.error : payload.error.message)) ||
      text;
    return message;
  } catch {
    return text;
  }
};

export const analyzeImage = async (uploadedFile: UploadedFile): Promise<AnalysisResult> => {
  const imageDataUrl = await fileToDataUrl(uploadedFile.file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl,
      fileName: uploadedFile.file.name,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const message = extractApiError(text, response.status);
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as AnalysisResult;
};

/**
 * Generates a high-res viral image with watermark.
 */
export const generateViralImage = async (
  imageElement: HTMLImageElement,
  result: AnalysisResult
): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  // Set canvas size to original image size for high res
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;

  // Draw original image
  ctx.drawImage(imageElement, 0, 0);

  // Draw overlays (optional for viral image, but requested in PRD)
  ctx.strokeStyle = '#ef4444'; // Red-500
  ctx.lineWidth = Math.max(4, canvas.width * 0.005); // Scale line width
  
  result.boundingBoxes.forEach(box => {
    const x = box.x * canvas.width;
    const y = box.y * canvas.height;
    const w = box.width * canvas.width;
    const h = box.height * canvas.height;
    
    ctx.strokeRect(x, y, w, h);
    
    // Draw Label background
    ctx.fillStyle = '#ef4444';
    const fontSize = Math.max(24, canvas.width * 0.03);
    ctx.font = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
    const pct = Math.round(result.probability * 100);
    const text = `감지됨: ${box.label || result.finding} (${pct}%)`;
    const textMetrics = ctx.measureText(text);
    const padding = fontSize * 0.5;
    
    ctx.fillRect(x, y - fontSize - padding, textMetrics.width + padding * 2, fontSize + padding);
    
    // Draw Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + padding, y - padding/2);
  });

  // Draw Watermark
  const watermarkText = "Analyzed by MedAI-Reporter";
  const wmFontSize = Math.max(20, canvas.width * 0.025);
  ctx.font = `500 ${wmFontSize}px "Noto Sans KR", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 8;
  
  const margin = wmFontSize;
  ctx.fillText(watermarkText, canvas.width - margin, canvas.height - margin);

  return canvas.toDataURL('image/png');
};
