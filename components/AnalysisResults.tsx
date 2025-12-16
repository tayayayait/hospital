import React, { useMemo, useState, useEffect } from 'react';
import { Info, Printer, Share2 } from 'lucide-react';
import Button from './Button';
import { AnalysisResult, PatientInfo } from '../types';
import { calculateAge, formatAgeKR, AgeResult } from '@/utils/age';

interface AnalysisResultsProps {
  result: AnalysisResult;
  patientInfo: PatientInfo;
  onDownloadReport: () => void;
  onDownloadImage: () => void;
}

const yearOptions = Array.from({ length: 21 }, (_, idx) => idx);
const monthOptions = Array.from({ length: 12 }, (_, idx) => idx);

type ViewMode = 'adjust' | 'trend';

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  result,
  patientInfo,
  onDownloadReport,
  onDownloadImage,
}) => {
  const chronologicalAge = useMemo(
    () => calculateAge(patientInfo.birthDate, patientInfo.examDate),
    [patientInfo.birthDate, patientInfo.examDate]
  );
  const [boneAge, setBoneAge] = useState<AgeResult>(chronologicalAge);
  const [viewMode, setViewMode] = useState<ViewMode>('adjust');

  useEffect(() => {
    setBoneAge(chronologicalAge);
  }, [chronologicalAge]);

  const predictedHeight = useMemo(() => {
    const base = patientInfo.heightCm || 140;
    const delta = (result.probability - 0.5) * 12;
    return Math.round(base + 10 + delta);
  }, [patientInfo.heightCm, result.probability]);

  const predictedRange = useMemo(
    () => ({ min: Math.max(120, predictedHeight - 4), max: predictedHeight + 3 }),
    [predictedHeight]
  );

  const sliderParameters = useMemo(() => {
    const base = 60 + result.probability * 25;
    return [
      {
        id: 'nutrition',
        label: '영양/식이',
        value: Math.round(Math.min(100, base + 5)),
        min: 40,
        max: 100,
        unit: '%',
      },
      {
        id: 'hormone',
        label: '호르몬 상태',
        value: Math.round(Math.min(100, base - 6)),
        min: 30,
        max: 100,
        unit: '%',
      },
      {
        id: 'activity',
        label: '운동/수면',
        value: Math.round(Math.min(100, base + 2)),
        min: 20,
        max: 100,
        unit: '%',
      },
    ];
  }, [result.probability]);

  const graphPoints = useMemo(() => {
    const baseHeight = patientInfo.heightCm || 140;
    const startAge = Math.max(4, chronologicalAge.years - 2);
    const totalPoints = 8;
    const heightDiff = predictedHeight - baseHeight;
    return Array.from({ length: totalPoints }, (_, idx) => ({
      age: startAge + idx,
      height: baseHeight + (heightDiff / Math.max(1, totalPoints - 1)) * idx,
    }));
  }, [patientInfo.heightCm, chronologicalAge, predictedHeight]);

  const graphMeta = useMemo(() => {
    if (!graphPoints.length) return null;
    const width = 320;
    const height = 160;
    const padding = 28;
    const heights = graphPoints.map((point) => point.height);
    const minHeight = Math.max(110, Math.min(...heights) - 4);
    const maxHeight = Math.max(...heights) + 6;
    const range = Math.max(1, maxHeight - minHeight);

    const normalized = graphPoints.map((point, index) => {
      const x = padded(width - padding * 2, index, graphPoints.length) + padding;
      const y = padding + (1 - (point.height - minHeight) / range) * (height - padding * 2);
      return { ...point, x, y };
    });

    const path = normalized
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const currentDecimalAge = chronologicalAge.years + chronologicalAge.months / 12;
    const currentPoint =
      normalized.reduce((closest, next) => {
        if (!closest) return next;
        return Math.abs(next.age - currentDecimalAge) < Math.abs(closest.age - currentDecimalAge)
          ? next
          : closest;
      }, normalized[0]) || normalized[0];

    return {
      width,
      height,
      normalized,
      path,
      currentPoint,
      minAge: normalized[0].age,
      maxAge: normalized[normalized.length - 1].age,
    };
  }, [graphPoints, chronologicalAge]);

  const summaryText =
    result.summary ||
    `AI 모델이 ${result.finding} 패턴을 약 ${Math.round(result.probability * 100)}% 신뢰도로 감지했습니다. 수정된 뼈 나이를 반영하면 성장 곡선이 보다 안정적으로 예측됩니다.`;

  const osteoAgeScore = Math.round(Math.min(100, Math.max(55, 45 + result.probability * 50)));
  const severityClass =
    result.severity === 'High'
      ? 'text-rose-600 border-rose-200 bg-rose-50/70'
      : result.severity === 'Medium'
        ? 'text-amber-600 border-amber-200 bg-amber-50/70'
        : 'text-emerald-600 border-emerald-200 bg-emerald-50/70';

  const confidencePercent = Math.round(result.probability * 100);

  function padded(maxWidth: number, index: number, total: number) {
    if (total <= 1) return maxWidth / 2;
    return (index / (total - 1)) * maxWidth;
  }

  return (
    <div className="flex-1 flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400 flex items-center gap-1">
              <Info className="h-3 w-3" /> 주요 예측 결과
            </p>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.3em] px-3 py-1 rounded-2xl border ${severityClass}`}>
              {result.severity}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-700">{result.finding}</p>
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 shadow-lg overflow-hidden relative">
            <div className="text-[11px] uppercase tracking-[0.5em] text-blue-200">예측 성장 완료 키</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black">{predictedHeight}</span>
              <span className="text-2xl font-semibold">cm</span>
            </div>
            <p className="text-sm text-blue-100/80 mt-2">범위 {predictedRange.min} ~ {predictedRange.max} cm</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">만 나이</p>
            <p className="text-sm font-semibold text-slate-900">{formatAgeKR(chronologicalAge)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.4em] text-slate-400">뼈 나이 (수정)</div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={boneAge.years}
                onChange={(event) => setBoneAge((prev) => ({ ...prev, years: Number(event.target.value) }))}
              >
                {yearOptions.map((value) => (
                  <option key={`year-${value}`} value={value}>
                    {value}세
                  </option>
                ))}
              </select>
              <select
                className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={boneAge.months}
                onChange={(event) => setBoneAge((prev) => ({ ...prev, months: Number(event.target.value) }))}
              >
                {monthOptions.map((value) => (
                  <option key={`month-${value}`} value={value}>
                    {value}개월
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed">{summaryText}</p>
          <div className="flex flex-wrap gap-2">
            <button className="text-[11px] font-semibold uppercase tracking-[0.4em] px-3 py-1 rounded-full border border-slate-300 bg-white transition hover:border-blue-300">
              표준 환자 보기
            </button>
            <button className="text-[11px] font-semibold uppercase tracking-[0.4em] px-3 py-1 rounded-full border border-slate-300 bg-white transition hover:border-blue-300">
              기준 설명
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">인터랙션</p>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
              <button
                type="button"
                onClick={() => setViewMode('adjust')}
                className={`px-3 py-1 rounded-full ${viewMode === 'adjust' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                슬라이더
              </button>
              <button
                type="button"
                onClick={() => setViewMode('trend')}
                className={`px-3 py-1 rounded-full ${viewMode === 'trend' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                성장곡선
              </button>
            </div>
          </div>

          {viewMode === 'adjust' ? (
            <div className="space-y-4">
              {sliderParameters.map((slider) => (
                <div key={slider.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>{slider.label}</span>
                    <span>{slider.value}{slider.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    value={slider.value}
                    readOnly
                    className="w-full h-1 rounded-full appearance-none bg-slate-200"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{slider.min}{slider.unit}</span>
                    <span>{slider.max}{slider.unit}</span>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">-1.2 cm 변화</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1">+0.9 cm 상승</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 p-4 text-white">
                {graphMeta && (
                  <svg viewBox={`0 0 ${graphMeta.width} ${graphMeta.height}`} className="w-full h-36">
                    <path
                      d={graphMeta.path}
                      stroke="url(#gradient)"
                      strokeWidth={3}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#a5b4fc" />
                      </linearGradient>
                    </defs>
                    <line
                      x1={graphMeta.currentPoint.x}
                      y1={graphMeta.currentPoint.y}
                      x2={graphMeta.currentPoint.x}
                      y2={graphMeta.height - 10}
                      stroke="rgba(255,255,255,0.25)"
                      strokeDasharray="4"
                    />
                    <circle
                      cx={graphMeta.currentPoint.x}
                      cy={graphMeta.currentPoint.y}
                      r={5}
                      fill="#facc15"
                      stroke="#18181b"
                      strokeWidth={2}
                    />
                  </svg>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-[0.4em]">
                <span>{graphMeta?.minAge ?? 0}세</span>
                <span>{graphMeta?.maxAge ?? 0}세</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400" /> 현재 위치
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" /> 예측 곡선
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 p-6 space-y-4 no-print">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-300">OsteoAge Score</p>
            <p className="text-4xl font-black">
              {osteoAgeScore}
              <span className="text-lg font-semibold"> / 100</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-300">신뢰도</p>
            <p className="text-3xl font-bold">{confidencePercent}%</p>
          </div>
        </div>
        <div className="space-y-3">
          <Button onClick={onDownloadReport} className="w-full justify-between h-12 shadow-md hover:shadow-lg">
            <span className="font-semibold">PDF 보고서 다운로드</span>
            <Printer className="h-5 w-5 opacity-80" />
          </Button>
          <Button
            variant="outline"
            onClick={onDownloadImage}
            className="w-full justify-between h-12 bg-white hover:bg-slate-50 border-slate-300 hover:border-slate-400"
          >
            <span className="font-semibold">공유용 이미지 저장 (Viral)</span>
            <Share2 className="h-5 w-5 opacity-80 text-blue-600" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
