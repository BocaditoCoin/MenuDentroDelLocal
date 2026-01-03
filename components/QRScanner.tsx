import React, { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
}

// Declaration for the global Html5Qrcode library
declare const Html5Qrcode: any;

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure, onClose }) => {
  const scannerRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // ID del elemento HTML donde se renderizará el video
    const elementId = "reader";
    const readerElement = document.getElementById(elementId);
    
    if (!readerElement) return;

    let html5QrCode: any = null;

    const startScanner = async () => {
      try {
        // Usamos la clase Core (Html5Qrcode) en lugar de Scanner para tener control total
        // y evitar la UI en inglés "Start Scanning".
        html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        // Preferir la cámara trasera ("environment")
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText: string) => {
                // Detener escaneo al tener éxito para evitar lecturas múltiples
                if (scannerRef.current) {
                    scannerRef.current.pause(); 
                }
                onScanSuccess(decodedText);
            },
            (errorMessage: any) => {
                // Errores de parseo son comunes mientras se enfoca, los ignoramos o pasamos al callback opcional
                if (onScanFailure) onScanFailure(errorMessage);
            }
        );
        
        setIsScanning(true);
        setErrorMsg(null);

      } catch (err: any) {
        console.error("Error iniciando cámara:", err);
        setIsScanning(false);
        // Traducir errores comunes
        if (typeof err === 'string' || err instanceof String) {
            if (err.includes("Permission")) {
                setErrorMsg("Permiso de cámara denegado. Por favor, permítelo en tu navegador.");
            } else if (err.includes("NotFound")) {
                setErrorMsg("No se encontró ninguna cámara en este dispositivo.");
            } else {
                setErrorMsg("No se pudo iniciar la cámara. Asegúrate de estar en HTTPS.");
            }
        } else {
             setErrorMsg("Error al acceder a la cámara.");
        }
      }
    };

    // Pequeño timeout para asegurar que el DOM está listo y la animación de apertura terminó
    const timer = setTimeout(() => {
        startScanner();
    }, 500);

    // Cleanup function
    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current.clear();
            }).catch((err: any) => {
                console.error("Error stopping scanner", err);
            });
        }
    };
  }, []); 

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
        
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[350px] w-full overflow-hidden">
             
             {/* Área de video */}
             <div id="reader" className="w-full h-full object-cover"></div>

             {/* Overlay de carga o error */}
             {!isScanning && !errorMsg && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                     <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
             )}

             {errorMsg && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-6 text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                     <p className="text-white font-bold mb-2">Error de Cámara</p>
                     <p className="text-slate-400 text-sm">{errorMsg}</p>
                     <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-700 rounded text-white text-sm">Cerrar</button>
                 </div>
             )}
             
             {/* UI Informativa inferior */}
             <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent text-center z-10 pointer-events-none">
                 <p className="text-cyan-400 font-bold text-sm mb-1 drop-shadow-md">
                     📷 Enfoca el código con tu cámara
                 </p>
                 <p className="text-white/80 text-xs drop-shadow-md">
                     Detectando automáticamente...
                 </p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;