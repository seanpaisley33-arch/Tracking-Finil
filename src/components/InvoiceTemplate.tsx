import React from 'react';
import { Package, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';
import Barcode from 'react-barcode';

interface InvoiceTemplateProps {
  shipment: any;
  checkpoints: any[];
}

export default React.forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ shipment, checkpoints }, ref) => {
    const today = new Date().toLocaleDateString();

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 font-sans p-10 mx-auto"
        style={{ width: '800px', minHeight: '1100px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}
      >
        {/* Top Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-blue-900 mb-2 uppercase">Official Waybill</h1>
            <p className="text-slate-500 font-medium text-sm">Document Generation Date: {today}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black tracking-tight">{shipment.carrier} LOGISTICS</h2>
            <p className="text-sm font-bold text-slate-600">TRACKING NUMBER</p>
            <p className="text-lg font-mono font-bold text-slate-900">{shipment.tracking_number}</p>
          </div>
        </div>

        {/* Barcode Strip */}
        <div className="w-full flex justify-center mb-8 bg-slate-50 py-4 border border-slate-200">
           <Barcode value={shipment.tracking_number} width={2} height={60} fontSize={16} margin={0} background="transparent" />
        </div>

        {/* Sender / Receiver Info */}
        <div className="grid grid-cols-2 gap-12 mb-10">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">Shipper / Origin</p>
            <p className="font-bold text-lg">{shipment.sender_name || 'N/A'}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-line">{shipment.sender_address || 'Address Not Provided'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">Consignee / Destination</p>
            <p className="font-bold text-lg">{shipment.receiver_name}</p>
            <p className="text-slate-600 mt-1 whitespace-pre-line">{shipment.destination_address}</p>
          </div>
        </div>



          {/* STAMPS SECTION - Replaced Financial Summary */}
        <div className="relative h-64 border-2 border-dashed border-slate-300 mb-10 bg-slate-50/50 p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest absolute top-2 left-2">Official Customs & Security Endorsements</p>
          
          {/* TSA Security Stamp */}
          {shipment.stamp_tsa !== false && (
            <div className="absolute top-12 left-10 transform -rotate-12 border-4 border-blue-800 rounded-full w-40 h-40 flex flex-col items-center justify-center opacity-80 mix-blend-multiply">
              <ShieldCheck className="h-8 w-8 text-blue-800 mb-1" />
              <span className="font-black text-blue-800 text-lg tracking-tighter leading-none text-center">TSA<br/>APPROVED</span>
              <span className="text-[10px] font-bold text-blue-800 mt-1 uppercase text-center border-t border-blue-800 pt-1">Cargo Screened<br/>Facility #8492</span>
            </div>
          )}

          {/* US Customs Stamp */}
          {shipment.stamp_customs !== false && (
            <div className="absolute top-20 right-16 transform rotate-6 border-[3px] border-red-700 p-2 opacity-85 mix-blend-multiply">
              <div className="border border-red-700 p-3 text-center">
                <p className="text-red-700 font-black text-xl uppercase tracking-widest leading-none mb-1">U.S. CUSTOMS</p>
                <p className="text-red-700 font-bold text-sm leading-none border-b border-red-700 pb-1 mb-1">& BORDER PROTECTION</p>
                <p className="text-red-700 font-black text-2xl tracking-tighter">CLEARED</p>
                <p className="text-red-700 font-mono text-[10px] mt-1">PORT: JFK-0041</p>
              </div>
            </div>
          )}

          {/* Postage Paid Stamp */}
          {shipment.stamp_postage !== false && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 rotate-2 border-2 border-slate-800 rounded-lg p-2 opacity-70">
              <div className="flex flex-col items-center">
                 <p className="font-black text-slate-800 text-xl tracking-tighter">POSTAGE PAID</p>
                 <p className="text-slate-800 font-bold text-xs uppercase mt-1">COMMERCIAL BASE PRICING</p>
                 <Barcode value={shipment.tracking_number.substring(0, 8)} width={1} height={20} displayValue={false} margin={2} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-10 left-10 right-10 border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-500 text-center leading-relaxed font-medium">
            This waybill constitutes a non-negotiable receipt for the cargo described above. All shipments are subject to the carrier's standard terms and conditions of carriage. Liability is limited to the declared value indicated on this document.
          </p>
        </div>
      </div>
    );
  }
);
