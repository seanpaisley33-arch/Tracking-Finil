'use client';

import React, { useState, useRef } from 'react';
import { FileText, Plus, Trash2, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CustomInvoiceGenerator() {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(Math.random() * 1000000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [terms, setTerms] = useState('Due on Receipt');
  
  const [shipperName, setShipperName] = useState('GlobalTrack Logistics');
  const [shipperAddress, setShipperAddress] = useState("123 Logistics Way\nSuite 100\nAtlanta, GA 30301");
  
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeAddress, setConsigneeAddress] = useState('');

  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Standard Ground Shipping', quantity: 1, unitPrice: 25.00 }
  ]);

  const [taxRate, setTaxRate] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    
    try {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'letter');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF invoice.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-8rem)]">
      
      {/* LEFT SIDE: FORM CONTROLS */}
      <div className="w-full xl:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center border-b pb-4">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Invoice Details
        </h2>

        <div className="space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Terms</label>
              <input type="text" value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Parties */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Shipper / Billed From</label>
            <input type="text" value={shipperName} onChange={(e) => setShipperName(e.target.value)} placeholder="Company Name" className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2" />
            <textarea value={shipperAddress} onChange={(e) => setShipperAddress(e.target.value)} placeholder="Address" rows={3} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consignee / Billed To</label>
            <input type="text" value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} placeholder="Customer Name" className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2" />
            <textarea value={consigneeAddress} onChange={(e) => setConsigneeAddress(e.target.value)} placeholder="Address" rows={3} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
          </div>

          <hr className="border-slate-100" />

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">Line Items</label>
              <button onClick={addItem} className="text-xs text-blue-600 font-medium hover:text-blue-800 flex items-center">
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm" />
                    <div className="flex space-x-2">
                      <div className="w-1/3">
                        <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-full p-1.5 border border-slate-300 rounded text-sm" />
                      </div>
                      <div className="w-2/3 flex items-center space-x-1">
                        <span className="text-slate-500">$</span>
                        <input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-full p-1.5 border border-slate-300 rounded text-sm" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Totals & Export */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-6" />

            <button 
              onClick={generatePDF} 
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex justify-center items-center"
            >
              <Download className="h-5 w-5 mr-2" />
              {isGenerating ? 'Rendering PDF...' : 'Download Invoice PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: LIVE PREVIEW CONTAINER */}
      <div className="w-full xl:w-2/3 bg-slate-200 rounded-2xl shadow-inner border border-slate-300 p-8 overflow-y-auto flex justify-center items-start">
        
        {/* The actual A4 size Invoice Document */}
        <div 
          ref={invoiceRef}
          className="bg-white shadow-2xl shrink-0 p-12 text-slate-900 font-sans" 
          style={{ width: '800px', minHeight: '1000px' }}
        >
          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b-4 border-blue-900 pb-8 mb-10">
            <div>
              <h1 className="text-5xl font-black text-blue-900 tracking-tighter mb-4">INVOICE</h1>
              <p className="font-bold text-lg mb-1">{shipperName}</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{shipperAddress}</p>
            </div>
            <div className="text-right">
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Number</p>
                <p className="text-xl font-mono font-bold text-slate-900">{invoiceNumber}</p>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</p>
                <p className="text-base font-bold text-slate-700">{date}</p>
              </div>
              {dueDate && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
                  <p className="text-base font-bold text-slate-700">{dueDate}</p>
                </div>
              )}
            </div>
          </div>

          {/* Billed To */}
          <div className="mb-10">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-3">Billed To / Consignee</p>
            <p className="font-bold text-lg text-slate-900">{consigneeName || 'Client Name'}</p>
            <p className="text-sm text-slate-600 whitespace-pre-line mt-1">{consigneeAddress || 'Client Address'}</p>
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-10">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300">
                <th className="py-3 px-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Description</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">Qty</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider w-32">Unit Price</th>
                <th className="py-3 px-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100">
                  <td className="py-4 px-4 text-sm font-medium text-slate-900">{item.description || '-'}</td>
                  <td className="py-4 px-4 text-sm text-center text-slate-700">{item.quantity}</td>
                  <td className="py-4 px-4 text-sm text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-4 px-4 text-sm text-right font-bold text-slate-900">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">No line items added.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Financials & Terms */}
          <div className="flex justify-between items-start">
            <div className="w-1/2 pr-8">
              <p className="text-xs font-bold text-blue-900 uppercase tracking-widest border-b-2 border-slate-100 pb-2 mb-3">Terms & Conditions</p>
              <p className="text-sm text-slate-600">{terms}</p>
              
              <div className="mt-12 border-t-2 border-slate-200 pt-10">
                 <p className="text-center font-handwriting text-2xl text-blue-900 mb-1">Approved</p>
                 <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Authorized Signature</p>
              </div>
            </div>
            
            <div className="w-1/2 bg-slate-50 p-6 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-600 font-medium">Subtotal</span>
                <span className="text-sm font-bold text-slate-900">${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                <span className="text-sm text-slate-600 font-medium">Tax ({taxRate}%)</span>
                <span className="text-sm font-bold text-slate-900">${calculateTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-blue-900 uppercase tracking-wider">Total Due</span>
                <span className="text-2xl font-black text-blue-900">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
