import React from 'react';
import { PatientInfo, PatientSex } from '../types';

interface PatientFormProps {
  patientInfo: PatientInfo;
  onChange: (changes: Partial<PatientInfo>) => void;
}

const sexOptions: { label: string; value: PatientSex }[] = [
  { label: '여(여성)', value: 'Female' },
  { label: '남(남성)', value: 'Male' },
];

const PatientForm: React.FC<PatientFormProps> = ({ patientInfo, onChange }) => {
  const handleInputChange = (field: keyof PatientInfo, value: string | number) => {
    onChange({ [field]: value } as Partial<PatientInfo>);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">환자 기본 정보</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-2">분석에 필요한 환자 정보를 입력하세요</h3>
        <p className="text-sm text-slate-500 mt-1">
          입력한 정보는 분석 보고서 상단에 반영되며, 결과를 더 직관적으로 제공합니다.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1">
          환자 이름 (선택)
          <input
            type="text"
            value={patientInfo.name ?? ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-150 outline-none transition"
            placeholder="(예: 김서연)"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1">
          성별
          <div className="flex gap-3">
            {sexOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleInputChange('sex', option.value)}
                className={`flex-1 px-3 py-2 rounded-2xl border ${
                  patientInfo.sex === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600'
                } font-semibold transition`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1">
          생년월일
          <input
            type="date"
            max={today}
            value={patientInfo.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-150 transition outline-none"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1">
          키 (cm)
          <input
            type="number"
            min={80}
            max={220}
            value={patientInfo.heightCm}
            onChange={(e) => handleInputChange('heightCm', Number(e.target.value))}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-150 transition outline-none"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1">
          체중 (kg)
          <input
            type="number"
            min={10}
            max={150}
            value={patientInfo.weightKg}
            onChange={(e) => handleInputChange('weightKg', Number(e.target.value))}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-150 transition outline-none"
          />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm font-semibold text-slate-600 space-y-1 md:col-span-2">
          검사일
          <input
            type="date"
            max={today}
            value={patientInfo.examDate}
            onChange={(e) => handleInputChange('examDate', e.target.value)}
            className="border border-slate-200 rounded-2xl px-4 py-3 text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-150 transition outline-none"
          />
        </label>
      </div>
    </section>
  );
};

export default PatientForm;
