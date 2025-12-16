export interface AgeResult {
  years: number;
  months: number;
}

const safeDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const calculateAge = (birthDate?: string, referenceDate?: string): AgeResult => {
  const birth = safeDate(birthDate) || new Date();
  const reference = safeDate(referenceDate) || new Date();

  let months = reference.getMonth() - birth.getMonth();
  let years = reference.getFullYear() - birth.getFullYear();

  if (reference.getDate() < birth.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) {
    years = 0;
    months = 0;
  }

  return { years, months };
};

export const formatDateKR = (value?: string): string => {
  const date = safeDate(value);
  if (!date) return '--';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const formatAgeKR = (age: AgeResult): string => `${age.years}세 ${age.months}개월`;
