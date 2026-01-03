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
  const [permissionGranted, setPermissionGranted] = useState(false);

  const startScanner = async () => {
    setIsScanning(true);
    setErrorMsg(null);

    const elementId = "reader";
    const readerElement = document.getElementById(elementId);
    
    // Fix: Cast window to any to access Html5Qrcode property
    if (!readerElement || !(window as any).Html5Qrcode) {
        setErrorMsg("Librería de cámara no cargada o error de DOM.");
        return;
    }

    try {
        // Limpieza previa si existe
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                // Ignorar error de stop si no estaba corriendo
            }
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        // Configuración más permisiva para evitar errores de hardware
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        // Intentar iniciar
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText: string) => {
                if (scannerRef.current) {
                    scannerRef.current.pause(); 
                }
                onScanSuccess(decodedText);
            },
            (errorMessage: any) => {
                // Ignorar errores de "no QR found" en cada frame
            }
        );
        
        setPermissionGranted(true);
        setIsScanning(true);

    } catch (err: any) {
        console.error("Error iniciando cámara:", err);
        setIsScanning(false);
        
        let msg = "No se pudo acceder a la cámara.";
        if (err?.name === "NotAllowedError" || err?.toString().includes("Permission")) {
            msg = "Permiso denegado. Revisa la configuración del navegador.";
        } else if (err?.name === "NotFoundError" || err?.toString().includes("NotFound")) {
            msg = "No se detectó ninguna cámara.";
        } else if (err?.name === "NotReadableError") {
            msg = "La cámara está siendo usada por otra aplicación o hay un error de hardware.";
        } else if (err?.toString().includes("OverconstrainedError")) {
            msg = "La configuración de cámara no es compatible con este dispositivo.";
        }
        
        setErrorMsg(msg);
    }
  };

  useEffect(() => {
    // Retraso intencional para permitir renderizado del DOM y animaciones
    const timer = setTimeout(() => {
        startScanner();
    }, 300);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                try {
                   scannerRef.current.clear();
                } catch(e) { console.log(e); }
            }).catch((err: any) => {
                console.warn("Error stopping scanner on unmount", err);
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
             
             {/* Contenedor del video: Importante darle tamaño explícito o relativo */}
             <div id="reader" className="w-full h-full min-h-[350px]"></div>

             {/* Loader */}
             {isScanning && !permissionGranted && !errorMsg && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                     <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                     <p className="text-cyan-400 text-sm font-semibold">Iniciando cámara...</p>
                 </div>
             )}

             {/* Error & Retry UI */}
             {errorMsg && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-6 text-center">
                     <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                     </div>
                     <p className="text-white font-bold text-lg mb-2">Error de Acceso</p>
                     <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">{errorMsg}</p>
                     
                     <div className="flex gap-3 w-full justify-center">
                        <button onClick={onClose} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-medium transition-colors">
                            Cancelar
                        </button>
                        <button onClick={() => startScanner()} className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm font-bold transition-colors shadow-lg shadow-cyan-900/20">
                            Reintentar
                        </button>
                     </div>
                 </div>
             )}
             
             {/* Overlay visual de escaneo (solo si funciona) */}
             {permissionGranted && !errorMsg && (
                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50 z-10">
                    <div className="w-full h-full border-2 border-cyan-400/50 relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1"></div>
                        
                        {/* Línea de escaneo animada */}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-scan"></div>
                    </div>
                </div>
             )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 text-center">
             <p className="text-slate-400 text-xs">
                 Coloca el código QR dentro del marco
             </p>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
            animation: scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;