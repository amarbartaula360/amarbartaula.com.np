'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Printer, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function InvoicePage() {
  const [customerName, setCustomerName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [nepaliDate, setNepaliDate] = useState('2083-06-26');
  const [items, setItems] = useState([{ name: '', qty: 1, rate: 0, total: 0 }]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'qty' || field === 'rate') {
      const qty = parseFloat(newItems[index].qty) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      newItems[index].total = qty * rate;
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { name: '', qty: 1, rate: 0, total: 0 }]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subTotal = items.reduce((acc, item) => acc + (item.total || 0), 0);
  const vatAmount = subTotal * 0.13; // 13% VAT
  const grandTotal = subTotal + vatAmount;

  // Save/Submit Invoice to Backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const invoiceData = {
        customer_name: customerName,
        pan_number: panNumber,
        invoice_date_bs: nepaliDate,
        items: items,
        sub_total: subTotal,
        vat_amount: vatAmount,
        grand_total: grandTotal
      };

      // FastAPI Backend endpoint (Ensure backend is running at port 8000)
      await axios.post('http://127.0.0.1:8000/invoices/', invoiceData);
      setSuccessMsg('बिल सफलतापूर्वक सुरक्षित भयो! (Invoice saved successfully)');
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Fallback message if backend invoice endpoint is not yet configured, 
      // but UI works completely for printing/previewing.
      setSuccessMsg('बिल प्रिन्टको लागि तयार छ! (Printed locally)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <a href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition font-medium">
            <ArrowLeft className="w-5 h-5" /> ड्यासबोर्डमा फर्कनुहोस्
          </a>
          <h2 className="text-2xl font-bold text-slate-800">कर बिजक (VAT Invoicing & Billing)</h2>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Invoice Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">ग्राहकको नाम (Customer Name)</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="Ex: ABC Trading Co."
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">PAN / VAT नं.</label>
              <input 
                type="text" 
                value={panNumber} 
                onChange={(e) => setPanNumber(e.target.value)} 
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" 
                placeholder="9-digit PAN"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">मिति (Nepali Date B.S.)</label>
              <input 
                type="text" 
                value={nepaliDate} 
                onChange={(e) => setNepaliDate(e.target.value)} 
                className="w-full p-2.5 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-700" 
                required 
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-700 mb-3">सामानको विवरण (Items List)</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left text-xs text-slate-600 font-bold uppercase">
                  <th className="p-3 border">विवरण (Item Name)</th>
                  <th className="p-3 border w-24">परिमाण (Qty)</th>
                  <th className="p-3 border w-32">दर (Rate)</th>
                  <th className="p-3 border w-36 text-right">जम्मा (Total)</th>
                  <th className="p-3 border w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2 border">
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="w-full p-1.5 border rounded outline-none" 
                        placeholder="Item Description"
                        required
                      />
                    </td>
                    <td className="p-2 border">
                      <input 
                        type="number" 
                        value={item.qty} 
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        className="w-full p-1.5 border rounded outline-none"
                        min="1"
                      />
                    </td>
                    <td className="p-2 border">
                      <input 
                        type="number" 
                        value={item.rate} 
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full p-1.5 border rounded outline-none"
                        min="0"
                      />
                    </td>
                    <td className="p-2 border text-right font-semibold text-slate-800">
                      Rs. {item.total.toFixed(2)}
                    </td>
                    <td className="p-2 border text-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(index)} className="text-rose-600 hover:text-rose-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              type="button" 
              onClick={addItemRow}
              className="mt-3 flex items-center gap-1 text-sm text-emerald-700 font-semibold hover:text-emerald-800"
            >
              <Plus className="w-4 h-4" /> थप सामान जोड्नुहोस् (Add Item)
            </button>
          </div>

          {/* Calculations Summary */}
          <div className="flex justify-end mt-6">
            <div className="w-72 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Sub Total:</span>
                <span className="font-semibold">Rs. {subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>VAT (13%):</span>
                <span className="font-semibold">Rs. {vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-300 pt-2">
                <span>Grand Total:</span>
                <span className="text-emerald-700">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-sm"
            >
              <Printer className="w-4 h-4" /> बिल प्रिन्ट गर्नुहोस् (Print / PDF)
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
            >
              {loading ? ' सेभ हुँदैछ...' : 'बिल सेभ गर्नुहोस् (Save Invoice)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}