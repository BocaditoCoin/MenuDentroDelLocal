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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true); // Estado visual de carga
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [manualMode, setManualMode] = useState(false); // Si falla la cámara, pasamos a modo manual

  const startScanner = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setManualMode(false);

    const elementId = "reader";
    const readerElement = document.getElementById(elementId);
    
    // Check global library
    if (!readerElement || !(window as any).Html5Qrcode) {
        setErrorMsg("Librería de escaneo no cargada.");
        setManualMode(true);
        setIsScanning(false);
        return;
    }

    try {
        // Limpiar instancia previa si existe
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) {
                // Ignorar error si no estaba corriendo
            }
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        // Intentar iniciar cámara trasera
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText: string) => {
                handleSuccess(decodedText);
            },
            (errorMessage: any) => {
                // Errores de frame (normales mientras busca)
            }
        );
        
        setPermissionGranted(true);
        setIsScanning(false); // Ya inició, quitamos loader

    } catch (err: any) {
        console.error("Error iniciando cámara:", err);
        setIsScanning(false);
        setManualMode(true); // Activar modo manual/archivo automáticamente
        
        let msg = "No se pudo acceder a la cámara automáticamente.";
        // Mensajes amigables pero informativos
        if (err?.name === "NotAllowedError" || err?.toString().includes("Permission")) {
            msg = "El navegador bloqueó el acceso a la cámara.";
        } else if (err?.name === "NotFoundError") {
            msg = "No se encontró una cámara en este dispositivo.";
        } else if (err?.toString().includes("OverconstrainedError")) {
            msg = "Tu cámara no es compatible con el modo automático.";
        } else if (window.location.protocol !== 'https:') {
            msg = "Por seguridad, la cámara requiere una conexión HTTPS.";
        }
        
        setErrorMsg(msg);
    }
  };

  const handleSuccess = (decodedText: string) => {
      // Pausar y limpiar
      if (scannerRef.current) {
          try {
            scannerRef.current.pause();
            scannerRef.current.clear(); 
          } catch(e) {}
      }
      onScanSuccess(decodedText);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];
      setIsProcessingFile(true);
      setErrorMsg(null);

      try {
          // Si la instancia no existe, crearla (para modo solo archivo)
          if (!scannerRef.current) {
              const html5QrCode = new Html5Qrcode("reader");
              scannerRef.current = html5QrCode;
          }

          // Escanear el archivo
          const result = await scannerRef.current.scanFile(file, true);
          handleSuccess(result);
      } catch (err) {
          console.error("Error leyendo archivo:", err);
          setErrorMsg("No se detectó ningún código QR en la imagen seleccionada. Intenta que el QR esté centrado y bien iluminado.");
          setIsProcessingFile(false);
      }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  };

  useEffect(() => {
    // Intentar iniciar automáticamente al montar
    const timer = setTimeout(() => {
        startScanner();
    }, 500);

    return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
             // Intentar cerrar recursos al desmontar
            try {
                if (scannerRef.current.isScanning) {
                     scannerRef.current.stop().then(() => scannerRef.current.clear());
                } else {
                    scannerRef.current.clear();
                }
            } catch (e) { console.log(e); }
        }
    };
  }, []); 

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden flex flex-col relative shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h3 className="text-white font-bold text-lg">Escanear Código QR</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        
        {/* Main Content Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[400px] w-full overflow-hidden">
             
             {/* Hidden Input for File Upload */}
             <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
             />

             {/* Video Container (Reused for file preview internally by library, or empty) */}
             <div id="reader" className={`${manualMode ? 'hidden' : 'block'} w-full h-full min-h-[350px]`}></div>

             {/* LOADING SPINNER (Initial or File Processing) */}
             {(isScanning || isProcessingFile) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30">
                     <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-cyan-400 font-semibold animate-pulse">
                         {isProcessingFile ? "Analizando imagen..." : "Iniciando cámara..."}
                     </p>
                 </div>
             )}

             {/* MANUAL MODE / ERROR STATE UI */}
             {manualMode && !isProcessingFile && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-20 p-6 text-center animate-fadeIn">
                     
                     <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                     </div>

                     <h4 className="text-white font-bold text-xl mb-2">Problemas con la cámara</h4>
                     <p className="text-slate-400 text-sm mb-6 max-w-xs">
                         {errorMsg || "No pudimos iniciar el escáner automático. Es posible que tu móvil o navegador no sea compatible."}
                     </p>
                     
                     <div className="space-y-3 w-full max-w-xs">
                        <button 
                            onClick={triggerFileInput} 
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Subir Foto o Tomar Foto
                        </button>

                        <button 
                            onClick={startScanner} 
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 px-4 rounded-xl border border-slate-700 transition-colors text-sm"
                        >
                            Reintentar Automático
                        </button>
                     </div>
                 </div>
             )}
             
             {/* OVERLAY for Successful Live Feed */}
             {permissionGranted && !manualMode && !isProcessingFile && (
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
                    <div className="bg-black/50 h-16 w-full backdrop-blur-sm"></div>
                    <div className="flex-1 flex w-full">
                        <div className="bg-black/50 w-8 h-full backdrop-blur-sm"></div>
                        <div className="flex-1 border-2 border-cyan-400/70 relative">
                             {/* Corner accents */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400"></div>
                            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 animate-pulse"></div>
                        </div>
                        <div className="bg-black/50 w-8 h-full backdrop-blur-sm"></div>
                    </div>
                    <div className="bg-black/50 h-24 w-full backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                         <button 
                             onClick={triggerFileInput}
                             className="text-white text-xs flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                         >
                             <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                             </div>
                             Subir Imagen
                         </button>
                    </div>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;