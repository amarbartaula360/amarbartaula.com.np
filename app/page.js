'use client';

import { useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';

export default function Dashboard() {
  const [stats] = useState({
    totalSales: 'Rs. 1,45,000',
    totalExpenses: 'Rs. 42,500',
    cashBalance: 'Rs. 1,02,500',
    nepaliDate: '२०८३-०६-२६'
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <header className="bg-emerald-700 text-white p-4 shadow-md flex justify-between items-center px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">नेपाली लेखा प्रणाली</h1>
          <p className="text-xs text-emerald-100">Advanced Accounting & Billing System</p>
        </div>
        <div className="bg-emerald-800 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-600">
          आजको मिति: <span className="text-amber-300 ml-1">{stats.nepaliDate} B.S.</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">कुल बिक्री (Total Sales)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalSales}</h3>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">कुल खर्च (Total Expenses)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalExpenses}</h3>
            </div>
            <div className="p-3 bg-rose-100 text-rose-700 rounded-lg">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">नगद मोजदात (Cash Balance)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.cashBalance}</h3>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex gap-4 mb-8">
          <a href="/invoice" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition">
            <Plus className="w-5 h-5" /> नयाँ बिल काट्नुहोस् (Create Invoice)
          </a>
          <a href="/journal" className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-5 py-2.5 rounded-lg font-medium shadow-sm transition">
            <FileText className="w-5 h-5" /> Journal Entry हाल्नुहोस्
          </a>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-slate-800 text-lg">भर्खरैका कारोबारहरू (Recent Journal Entries)</h2>
            <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-semibold">Live Data</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-sm font-semibold">
                <th className="p-4 border-b">मिति (B.S.)</th>
                <th className="p-4 border-b">भौचर नं.</th>
                <th className="p-4 border-b">विवरण (Narration)</th>
                <th className="p-4 border-b text-right">रकम (Amount)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-700">२०८३-०६-२६</td>
                <td className="p-4 text-emerald-700 font-semibold">JV-2083-001</td>
                <td className="p-4 text-slate-600">बैंक खातामा नगद जम्मा गरिएको</td>
                <td className="p-4 text-right font-bold text-slate-800">Rs. ५,०००.००</td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-700">२०८३-०६-२५</td>
                <td className="p-4 text-emerald-700 font-semibold">INV-2083-042</td>
                <td className="p-4 text-slate-600">राम किराना पसललाई सामान बिक्री</td>
                <td className="p-4 text-right font-bold text-slate-800">Rs. १२,४५०.००</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}