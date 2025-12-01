import React, { useEffect, useRef } from 'react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

// Declaration for the global Html5QrcodeScanner added via script tag in index.html
declare const Html5QrcodeScanner: any;

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    // Initialize scanner
    const readerElement = document.getElementById("reader");
    if (!readerElement) return;

    try {
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            videoConstraints: {
                facingMode: "environment" // Force rear camera on mobile
            }
        };
        
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "reader", 
            config, 
            /* verbose= */ false
        );

        scannerRef.current = html5QrcodeScanner;

        html5QrcodeScanner.render(
            (decodedText: string) => {
                onScanSuccess(decodedText);
            }, 
            (error: any) => {
                if (onScanFailure) onScanFailure(error);
            }
        );
    } catch (e) {
        console.error("Error initializing QR scanner", e);
    }

    return () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch((err: any) => console.error("Failed to clear scanner", err));
        }
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex flex-col relative shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h3 className="text-white font-bold text-lg">Escanear Código QR</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        <div className="p-4 bg-black flex flex-col items-center justify-center min-h-[350px]">
             {/* Container for the library */}
             <div id="reader" className="w-full h-auto text-white"></div>
             
             <div className="mt-4 px-4 text-center space-y-2">
                 <p className="text-cyan-400 font-bold text-sm">
                     📷 Enfoca el código con tu cámara
                 </p>
                 <p className="text-slate-400 text-xs">
                     Sirve para identificar tu mesa, añadir platos automáticos o sumar puntos de recompensa.
                 </p>
                 <p className="text-slate-500 text-[10px] italic">
                     Si el navegador solicita permisos, por favor acepta para continuar.
                 </p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;