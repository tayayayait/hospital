import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PatientInfo } from '../types';
import { calculateAge, formatAgeKR, formatDateKR } from '@/utils/age';

interface SubHeaderProps {
  patientInfo: PatientInfo;
  onBack: () => void;
  onEdit: () => void;
}

const examOptions = [
  '골연령/성장(키) 분석',
  '표준 X-ray 탐지',
  '추적 관찰 세션',
];

const SubHeader: React.FC<SubHeaderProps> = ({ patientInfo, onBack, onEdit }) => {
  const [selectedExam, setSelectedExam] = useState(examOptions[0]);
  const age = useMemo(
    () => calculateAge(patientInfo.birthDate, patientInfo.examDate),
    [patientInfo.birthDate, patientInfo.examDate]
  );

  return (
    <div className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              환자 목록
            </button>
            <label className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-2xl border border-white/10 text-xs uppercase tracking-[0.4em]">
              <span className="font-semibold">검사 선택</span>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="bg-transparent text-white text-sm focus:outline-none"
              >
                {examOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 self-start rounded-full border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition"
          >
            <Pencil className="h-4 w-4" />
            정보 수정
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold tracking-wide uppercase text-white/70">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px]">성별</p>
            <p className="text-lg text-white">{patientInfo.sex === 'Male' ? '남성' : '여성'}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px]">만 나이</p>
            <p className="text-lg text-white">{formatAgeKR(age)}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px]">키 / 체중</p>
            <p className="text-lg text-white">{`${patientInfo.heightCm} cm · ${patientInfo.weightKg} kg`}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <p className="text-[11px]">검사일</p>
            <p className="text-lg text-white">{formatDateKR(patientInfo.examDate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubHeader;
