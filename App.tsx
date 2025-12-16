import React, { useState } from 'react';
import Header from './components/Header';
import SubHeader from './components/SubHeader';
import PatientForm from './components/PatientForm';
import FileUpload from './components/FileUpload';
import ImageViewer from './components/ImageViewer';
import AnalysisResults from './components/AnalysisResults';
import { UploadedFile, AnalysisResult, AppState, PatientInfo } from './types';
import { analyzeImage, generateViralImage } from './services/analysisService';
import Button from './components/Button';
import { ArrowLeft, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    sex: 'Female',
    birthDate: '',
    heightCm: 142,
    weightKg: 38,
    examDate: today,
  });

  const isPatientFormComplete =
    Boolean(patientInfo.birthDate) &&
    Boolean(patientInfo.examDate) &&
    Boolean(patientInfo.heightCm) &&
    Boolean(patientInfo.weightKg);

  const handlePatientInfoChange = (changes: Partial<PatientInfo>) => {
    setPatientInfo((prev) => ({ ...prev, ...changes }));
  };

  const showSubHeader = appState !== AppState.IDLE;

  const handleFileSelect = (file: File) => {
    if (!isPatientFormComplete) {
      alert('분석에 앞서 환자 정보를 먼저 입력해주세요.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const uploadedFile: UploadedFile = {
      file,
      previewUrl,
      type: 'image',
    };

    setCurrentFile(uploadedFile);
    startAnalysis(uploadedFile);
  };

  const startAnalysis = async (file: UploadedFile) => {
    setAnalysisError(null);
    setAppState(AppState.ANALYZING);

    try {
      const data = await analyzeImage(file);
      setResult(data);
      setAppState(AppState.RESULTS);
    } catch (error) {
      console.error('Analysis failed', error);
      setAppState(AppState.IDLE);
      setCurrentFile(null);
      const message =
        error instanceof Error ? error.message : '분석에 실패했습니다. 다시 시도해주세요.';
      setAnalysisError(message);
      alert(message);
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setAnalysisError(null);
    if (currentFile?.previewUrl) {
      URL.revokeObjectURL(currentFile.previewUrl);
    }
    setCurrentFile(null);
  };

  const handleDownloadReport = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!result || !currentFile) return;

    const imgElement = document.getElementById('analysis-target-image') as HTMLImageElement;
    if (imgElement) {
      try {
        const dataUrl = await generateViralImage(imgElement, result);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `MedAI-Result-${result.id.slice(0, 6)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error('Failed to generate image', e);
        alert('이미지를 생성할 수 없습니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      {showSubHeader && (
        <SubHeader patientInfo={patientInfo} onBack={resetApp} onEdit={resetApp} />
      )}

      <main className="flex-1 container mx-auto px-4 py-8 space-y-10">
        {appState === AppState.IDLE && (
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">골연령 / 성장 스튜디오</p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                손목 X-ray를 통한 실시간 뼈 성장 분석
              </h1>
              <p className="text-base md:text-lg text-slate-500">
                환자 기본 정보를 먼저 입력하면 AI가 분석 결과를 세부적으로 정리하고, 성장 시뮬레이션까지 제공합니다.
              </p>
            </div>

            <PatientForm patientInfo={patientInfo} onChange={handlePatientInfoChange} />

            <div className="mx-auto w-full max-w-4xl">
              <FileUpload
                onFileSelect={handleFileSelect}
                disabled={!isPatientFormComplete}
                disabledMessage="환자 정보를 모두 입력한 후 이미지를 업로드해주세요."
              />

              {analysisError && (
                <div className="mt-6 px-5 py-4 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm space-y-1">
                  <p className="font-semibold tracking-tight">분석을 시작할 수 없습니다.</p>
                  <p>{analysisError}</p>
                  <p className="text-xs text-rose-600 opacity-80">
                    OPENAI_API_KEY를 <code className="rounded bg-white px-1 py-px border border-rose-200">.env.local</code>에 정확히 입력하고 개발 서버를 재시작해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="h-24 w-24 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 h-24 w-24 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">이미지 정밀 분석 중...</h2>
            <p className="text-slate-500 mt-2 font-medium">
              탐지 모델을 실행하고 있습니다: <span className="text-slate-700">{currentFile?.file.name}</span>
            </p>

            <div className="w-80 mt-8 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-blue-600 animate-progress origin-left"
                style={{ animation: 'progress 2s ease-in-out infinite' }}
              ></div>
            </div>
            <div className="mt-4 flex gap-8 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>Preprocessing</span>
              <span className="text-blue-600">Inference</span>
              <span>Generating Report</span>
            </div>
            <style>{`
              @keyframes progress {
                0% { width: 0%; transform: translateX(-100%); }
                50% { width: 50%; transform: translateX(0%); }
                100% { width: 100%; transform: translateX(100%); }
              }
            `}</style>
          </div>
        )}

        {appState === AppState.RESULTS && currentFile && result && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
              <Button variant="ghost" onClick={resetApp} className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <ArrowLeft className="h-4 w-4 mr-2" />
                새 이미지 업로드
              </Button>
              <span className="text-sm font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                세션 ID: {result.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[60vh] print:block">
              <div className="lg:col-span-3 h-full flex flex-col">
                <ImageViewer
                  uploadedFile={currentFile}
                  boundingBoxes={result.boundingBoxes}
                  showOverlay={true}
                  examDate={patientInfo.examDate}
                />
              </div>
              <div className="lg:col-span-2 flex flex-col">
                <AnalysisResults
                  result={result}
                  patientInfo={patientInfo}
                  onDownloadReport={handleDownloadReport}
                  onDownloadImage={handleDownloadImage}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleDownloadReport}
                className="px-10 py-3 text-lg shadow-lg ring-1 ring-blue-200"
              >
                분석결과 Report
              </Button>
            </div>

            <div className="hidden print-only fixed top-0 left-0 w-full p-10 border-b-2 border-slate-900 mb-8 bg-white z-[100]">
              <div className="flex justify-between items-end mb-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">MedAI 분석 보고서</h1>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Generated by MedAI-Reporter</p>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-600 bg-slate-50 p-4 rounded border border-slate-200">
                <span className="font-semibold">환자 ID: {result.patientId}</span>
                <span>분석 일시: {new Date().toLocaleString('ko-KR')}</span>
              </div>
            </div>

            <div className="hidden print-only fixed bottom-0 left-0 w-full p-6 border-t border-slate-200 mt-8 bg-white text-center text-xs text-slate-400 font-medium">
              MedAI-Reporter MVP | 본 결과는 연구용이며 의학적 진단을 대체할 수 없습니다. | Page 1 of 1
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
