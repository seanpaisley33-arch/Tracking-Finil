'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function BarcodeScannerPage() {
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/admin/login');
    });

    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 100 }, formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      /* verbose= */ false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [router]);

  const onScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (scannedResult === decodedText) return; // Prevent multiple rapid scans of same code
    setScannedResult(decodedText);
    setStatus(`Scanned: ${decodedText}. Looking up shipment...`);

    try {
      const { data: shipment, error: fetchErr } = await supabase
        .from('shipments')
        .select('id, tracking_number')
        .eq('tracking_number', decodedText)
        .single();

      if (fetchErr || !shipment) {
        setStatus(`Error: Shipment ${decodedText} not found.`);
        return;
      }

      setStatus(`Found shipment! Updating status to "SCANNED_AT_FACILITY"...`);

      const { error: insertErr } = await supabase.from('shipment_checkpoints').insert({
        shipment_id: shipment.id,
        status: 'SCANNED_AT_FACILITY',
        status_description: 'Package scanned automatically via Barcode Utility',
        location_name: 'Local Facility',
      });

      if (insertErr) throw insertErr;

      await supabase.from('shipments').update({ current_status: 'SCANNED_AT_FACILITY' }).eq('id', shipment.id);
      
      setStatus(`Success! Shipment ${decodedText} updated.`);
      
      // Reset scan after 3 seconds
      setTimeout(() => {
        setScannedResult(null);
        setStatus('');
      }, 3000);

    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const onScanFailure = (error: any) => {
    // handle scan failure, usually better to ignore and keep scanning
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 flex flex-col p-4 md:p-8">
      <div className="max-w-3xl mx-auto w-full">
        <button onClick={() => router.push('/admin')} className="flex items-center text-slate-300 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Dashboard
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Barcode Scanner Utility</h2>
            <p className="text-slate-500 text-sm mt-1">Scan 1D/2D barcodes to automatically update tracking status.</p>
          </div>
          
          <div className="p-6">
            <div id="reader" className="w-full max-w-lg mx-auto bg-slate-100 rounded-xl overflow-hidden border border-slate-300"></div>
            
            {status && (
              <div className={`mt-6 p-4 rounded-xl flex items-center space-x-3 ${status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {status.includes('Success') && <CheckCircle2 className="h-6 w-6 shrink-0" />}
                <span className="font-medium">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
