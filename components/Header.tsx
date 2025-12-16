import React from 'react';
import { Activity, LogOut } from 'lucide-react';

const Header: React.FC = () => {
  const userEmail = 'reporter@medai.com';

  return (
    <header className="bg-gradient-to-r from-[#0f4c9b] to-[#0b2e52] text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-2xl shadow-lg">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">D-WAVE / OsteoAge</p>
            <p className="text-sm text-white/80">골연령 · 성장 예측 스위트</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="text-white/80">{userEmail}</span>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full bg-white/20 px-4 py-2 hover:bg-white/30 transition"
          >
            로그아웃
            <LogOut className="h-4 w-4 text-white/80" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
