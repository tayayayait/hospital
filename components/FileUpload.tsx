import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { MAX_FILE_SIZE_MB, SUPPORTED_FILE_TYPES } from '../constants';
import Button from './Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, disabledMessage }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    // Check size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_FILE_SIZE_MB}MB를 초과할 수 없습니다.`);
      return false;
    }

    // Check type (JPG/PNG only)
    const isValidType = Object.values(SUPPORTED_FILE_TYPES)
      .flat()
      .some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      setError('지원하지 않는 파일 형식입니다. JPG 또는 PNG 파일을 업로드해주세요.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragOver(false);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12">
      <div 
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-out cursor-pointer
          ${isDragOver ? 'border-blue-500 bg-blue-50/50 scale-[1.02] shadow-xl' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50 hover:shadow-lg'}
          ${error ? 'border-red-300 bg-red-50' : ''}
          ${disabled ? 'opacity-70 pointer-events-none cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (disabled) return;
          fileInputRef.current?.click();
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden"
          accept=".jpg,.jpeg,.png"
          onChange={handleFileInput}
        />
        
        <div className="flex flex-col items-center justify-center space-y-5">
          <div className={`p-5 rounded-full transition-colors duration-300 ${isDragOver ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <UploadCloud className={`h-12 w-12 ${isDragOver ? 'text-blue-600' : 'text-slate-400'}`} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              의료 이미지 업로드
            </h3>
            <p className="text-slate-500 font-medium">
              파일을 드래그하거나 클릭하여 선택하세요
            </p>
          </div>
          
          <div className="flex gap-3 text-xs text-slate-400 uppercase tracking-widest font-semibold pt-2">
            <span className="bg-slate-100 px-2 py-1 rounded">PNG</span>
            <span className="bg-slate-100 px-2 py-1 rounded">JPG</span>
          </div>

          <Button 
            variant="primary" 
            className="mt-4 pointer-events-none" // Button is visual only as container is clickable
            onClick={(e) => { e.preventDefault(); }} 
          >
            파일 선택하기
          </Button>
        </div>

        {error && (
          <div className="absolute -bottom-16 left-0 right-0 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {disabled && disabledMessage && (
          <div className="absolute inset-x-6 bottom-6 text-center text-xs text-slate-500">
            {disabledMessage}
          </div>
        )}
      </div>
      
      <div className="mt-10 text-center">
        <p className="text-xs text-slate-400 max-w-sm mx-auto flex items-center justify-center gap-1">
          <ShieldCheckIcon />
          안내: 분석을 위해 이미지가 AI API로 전송될 수 있습니다.
        </p>
      </div>
    </div>
  );
};

// Small helper icon
const ShieldCheckIcon = () => (
  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default FileUpload;
