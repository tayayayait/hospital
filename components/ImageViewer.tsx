import React, { useRef, useEffect, useState } from 'react';
import { UploadedFile, BoundingBox } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { formatDateKR } from '@/utils/age';

interface ImageViewerProps {
  uploadedFile: UploadedFile;
  boundingBoxes?: BoundingBox[];
  showOverlay?: boolean;
  examDate?: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  uploadedFile, 
  boundingBoxes = [], 
  showOverlay = false,
  examDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);

  // Reset scale when file changes
  useEffect(() => {
    setScale(1);
  }, [uploadedFile]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleResetZoom = () => setScale(1);

  const formattedExamDate = examDate ? formatDateKR(examDate) : null;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ring-1 ring-slate-900/5">
      {/* Toolbar */}
      <div className="h-14 bg-slate-800 flex items-center justify-between px-5 border-b border-slate-700 no-print">
        <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
           <span className="bg-slate-700/50 px-2 py-1 rounded text-slate-300 border border-slate-600">
            이미지 보기
           </span>
           <span className="truncate max-w-[200px] text-slate-300">{uploadedFile.file.name}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
          <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title="축소">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-400 w-10 text-center font-medium tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title="확대">
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button onClick={handleResetZoom} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title="초기화">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-black cursor-move group"
      >
        {formattedExamDate && (
          <div className="absolute top-4 left-4 z-10 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold tracking-wide text-white border border-white/20 shadow-lg">
            검사일 {formattedExamDate}
          </div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 to-transparent pointer-events-none"></div>
        
        <div 
          className="relative transition-transform duration-200 ease-out origin-center will-change-transform"
          style={{ transform: `scale(${scale})` }}
        >
          <img 
            ref={imgRef}
            src={uploadedFile.previewUrl} 
            alt="분석 대상 이미지" 
            className="max-h-[500px] md:max-h-[600px] w-auto object-contain select-none pointer-events-none shadow-2xl"
            id="analysis-target-image"
          />

          {/* Overlays */}
          {showOverlay && boundingBoxes.map((box, idx) => (
            <div
              key={idx}
              className="absolute border-2 border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-in fade-in duration-700"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
            >
              <div className="absolute -top-7 left-0 bg-red-600 text-white text-[11px] px-2 py-1 rounded shadow-md whitespace-nowrap font-bold tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                {box.label || '감지됨'}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-slate-950 px-5 py-2.5 text-[10px] text-slate-500 flex justify-between border-t border-slate-900 font-mono">
         <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            렌더링: WebGL-Sim (동작 중)
         </span>
         <span>윈도우: 256/128 • 확대: {scale.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default ImageViewer;
