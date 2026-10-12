'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Scale, TrendingUp } from 'lucide-react';
import axios from 'axios';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('trial-balance'); // 'trial-balance' | 'profit-loss'
  const [trialBalanceData, setTrialBalanceData] = useState(null);
  const [profitLossData, setProfitLossData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'trial-balance') {
        const res = await axios.get('http://127.0.0.1:8000/reports/trial-balance');
        setTrialBalanceData(res.data);
      } else if (activeTab === 'profit-loss') {
        const res = await axios.get('http://127.0.0.1:8000/reports/profit-loss');
        setProfitLossData(res.data);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <a href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5" /> ड्यासबोर्डमा फर्कनुहोस्
          </a>
          <h2 className="text-2xl font-bold text-slate-800">वित्तीय रिपोर्टहरू (Financial Reports)</h2>
        </div>

        {/* Tabs & Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('trial-balance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition ${
                activeTab === 'trial-balance'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-4 h-4" /> Trial Balance
            </button>
            <button
              onClick={() => setActiveTab('profit-loss')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition ${
                activeTab === 'profit-loss'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Profit & Loss
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">रिपोर्ट लोड हुँदैछ...</div>
        ) : (
          <>
            {/* 1. Trial Balance Tab */}
            {activeTab === 'trial-balance' && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Scale className="text-emerald-600" /> सन्तुलन परीक्षण (Trial Balance)
                </h3>
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase border-b">
                      <th className="p-3 text-left border-r">कोड</th>
                      <th className="p-3 text-left border-r">खाताको नाम (Account Name)</th>
                      <th className="p-3 text-right border-r">Debit (रु)</th>
                      <th className="p-3 text-right">Credit (रु)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {trialBalanceData?.trial_balance?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-600 border-r">{row.code}</td>
                        <td className="p-3 text-slate-800 border-r">{row.name}</td>
                        <td className="p-3 text-right font-medium border-r">{row.debit > 0 ? row.debit.toFixed(2) : '-'}</td>
                        <td className="p-3 text-right font-medium">{row.credit > 0 ? row.credit.toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-sm border-t-2 border-slate-300">
                      <td colSpan="2" className="p-3 text-right border-r">जम्मा (Total):</td>
                      <td className="p-3 text-right border-r text-emerald-700">
                        रु. {trialBalanceData?.total_debit?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-3 text-right text-emerald-700">
                        रु. {trialBalanceData?.total_credit?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 2. Profit & Loss Tab */}
            {activeTab === 'profit-loss' && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="text-emerald-600" /> नाफा-नोक्सान हिसाब (Profit & Loss Statement)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income Side */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h4 className="font-bold text-emerald-800 mb-3 border-b pb-2">आम्दानी (Incomes)</h4>
                    <ul className="space-y-2 text-sm">
                      {profitLossData?.incomes?.map((inc, i) => (
                        <li key={i} className="flex justify-between border-b pb-1">
                          <span className="text-slate-700">{inc.name}</span>
                          <span className="font-semibold text-slate-900">रु. {inc.amount.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between font-bold text-slate-900 mt-4 pt-2 border-t text-sm">
                      <span>कुल आम्दानी (Total Income):</span>
                      <span className="text-emerald-700">रु. {profitLossData?.total_income?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>

                  {/* Expense Side */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <h4 className="font-bold text-rose-800 mb-3 border-b pb-2">खर्च (Expenses)</h4>
                    <ul className="space-y-2 text-sm">
                      {profitLossData?.expenses?.map((exp, i) => (
                        <li key={i} className="flex justify-between border-b pb-1">
                          <span className="text-slate-700">{exp.name}</span>
                          <span className="font-semibold text-slate-900">रु. {exp.amount.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between font-bold text-slate-900 mt-4 pt-2 border-t text-sm">
                      <span>कुल खर्च (Total Expenses):</span>
                      <span className="text-rose-700">रु. {profitLossData?.total_expense?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit Summary Card */}
                <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-lg">खुद नाफा / (नोक्सान) [Net Profit]:</span>
                  <span className="text-2xl font-black text-emerald-700">
                    रु. {profitLossData?.net_profit?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}