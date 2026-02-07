import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from './components/ProductCard';
import QRScanner from './components/QRScanner';
import { CartItem, Product, Extra, User } from './types';
import { fetchMenuData, getCategoriesFromProducts, loginUser, registerUser, updateUser, addPointsToUser, fetchAppLogo } from './services/menuService';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Auth & Cart State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New state to store points from QR while user logs in
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Layout State
  const [tableId, setTableId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // --- Auth UI States ---
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: ''
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // Fetch Menu Data & Logo
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Cargar logo en paralelo
        fetchAppLogo().then(url => {
            if (url) setLogoUrl(url);
        });

        const { products: fetchedProducts, extras: fetchedExtras } = await fetchMenuData();
        setProducts(fetchedProducts);
        setExtras(fetchedExtras);
        const fetchedCategories = getCategoriesFromProducts(fetchedProducts);
        setCategories(fetchedCategories);
        if (fetchedCategories.length > 0 && !activeCategory) {
          setActiveCategory(fetchedCategories[0]);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle URL Parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
        setTableId(tableParam);
    }
  }, []);

  // Notification Timer
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Clear errors when opening modal or switching modes
  useEffect(() => {
      setAuthError(null);
  }, [isProfileOpen, authMode]);

  // --- HELPER: Process Pending Points ---
  const processPendingPoints = async (userId: string, currentPoints: number) => {
      if (pendingPoints !== null) {
          try {
              const newTotal = await addPointsToUser(userId, pendingPoints);
              setNotification({ message: `¡Has reclamado tus ${pendingPoints} puntos con éxito!`, type: 'success' });
              setPendingPoints(null); // Clear pending
              return newTotal;
          } catch (e) {
              console.error("Error claiming pending points", e);
              setNotification({ message: "Error al sumar los puntos pendientes.", type: 'error' });
              return currentPoints;
          }
      }
      return currentPoints;
  };

  // --- AUTH Handlers ---

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
        if (!loginEmail || !loginPass) throw new Error("Por favor, introduce email y contraseña.");
        let loggedUser = await loginUser(loginEmail, loginPass);
        
        // Check for pending points from QR
        if (pendingPoints !== null) {
            const updatedPoints = await processPendingPoints(loggedUser.id, loggedUser.points);
            loggedUser = { ...loggedUser, points: updatedPoints };
        }

        setUser(loggedUser);
        setIsProfileOpen(false);
        setLoginEmail('');
        setLoginPass('');
        if (!pendingPoints) setNotification({ message: `¡Bienvenido, ${loggedUser.name}!`, type: 'success' });
    } catch (err: any) {
        setAuthError(err.message || "Error al iniciar sesión.");
    } finally {
        setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
      setAuthError(null);
      setAuthLoading(true);
      try {
          // Validaciones básicas
          if (!registerData.name || !registerData.email || !registerData.password) {
              throw new Error("El nombre, email y la contraseña son obligatorios.");
          }
          if (registerData.password.length < 4) {
              throw new Error("La contraseña debe tener al menos 4 caracteres.");
          }

          let newUser = await registerUser(registerData);
          
          // Check for pending points from QR
          if (pendingPoints !== null) {
              const updatedPoints = await processPendingPoints(newUser.id, newUser.points);
              newUser = { ...newUser, points: updatedPoints };
          }

          setUser(newUser);
          setIsProfileOpen(false);
          setAuthMode('login'); 
          setRegisterData({ name: '', email: '', phone: '', address: '', password: '' });
          if (!pendingPoints) setNotification({ message: "¡Cuenta creada con éxito!", type: 'success' });
      } catch (err: any) {
          setAuthError(err.message || "Error al registrarse.");
      } finally {
          setAuthLoading(false);
      }
  };

  const handleUpdateProfile = async () => {
      if (user) {
          setAuthError(null);
          setAuthLoading(true);
          try {
              const updatedUser = await updateUser(user.id, editData);
              setUser(updatedUser);
              setIsEditingProfile(false);
              setNotification({ message: "Perfil actualizado.", type: 'success' });
          } catch (err: any) {
              setAuthError(err.message || "Error al actualizar perfil.");
          } finally {
              setAuthLoading(false);
          }
      }
  };

  const handleChangePassword = async () => {
      if (!passwordForm.new || !passwordForm.confirm) {
          setAuthError("Por favor rellena ambos campos.");
          return;
      }
      if (passwordForm.new !== passwordForm.confirm) {
          setAuthError("Las contraseñas no coinciden.");
          return;
      }
      if (passwordForm.new.length < 4) {
          setAuthError("La contraseña debe tener al menos 4 caracteres.");
          return;
      }
      
      if (user) {
          setAuthError(null);
          setAuthLoading(true);
          try {
              const updatedUser = await updateUser(user.id, { password: passwordForm.new });
              setUser(updatedUser);
              setIsChangingPassword(false);
              setPasswordForm({ new: '', confirm: '' });
              setNotification({ message: "Contraseña cambiada.", type: 'success' });
          } catch (err: any) {
              setAuthError(err.message || "Error al cambiar la contraseña.");
          } finally {
              setAuthLoading(false);
          }
      }
  };

  const handleLogout = () => {
      setUser(null);
      setIsProfileOpen(false);
      setIsEditingProfile(false);
      setIsChangingPassword(false);
      setPendingPoints(null); // Clear pending points on logout
      setAuthError(null);
      setNotification({ message: "Sesión cerrada.", type: 'success' });
  };

  // --- Cart Handlers ---

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  // --- QR SCANNER LOGIC ---

  const handleScanSuccess = async (decodedText: string) => {
      setIsQRScannerOpen(false);

      // Attempt to parse as JSON (Special Promo QR)
      try {
          const qrData = JSON.parse(decodedText);
          
          if (typeof qrData === 'object' && qrData !== null) {
              let message = "";
              
              if (qrData.points && typeof qrData.points === 'number') {
                  if (user) {
                      try {
                          const newTotal = await addPointsToUser(user.id, qrData.points);
                          setUser(prev => prev ? { ...prev, points: newTotal } : null);
                          message += `¡Has ganado ${qrData.points} puntos! `;
                      } catch (e) {
                          console.error("Error adding points", e);
                          message += "Error sumando puntos (servidor). ";
                      }
                  } else {
                      setPendingPoints(qrData.points);
                      setIsProfileOpen(true);
                      setNotification({ 
                          message: `¡QR de ${qrData.points} PUNTOS detectado! Inicia sesión para guardarlos.`, 
                          type: 'success' 
                      });
                      return; // Stop execution here to focus on auth
                  }
              }

              if (Array.isArray(qrData.products)) {
                  let addedCount = 0;
                  qrData.products.forEach((prodId: string) => {
                      const productFound = products.find(p => p.id === prodId || p.id.endsWith(prodId));
                      if (productFound) {
                           const newItem: CartItem = {
                              id: crypto.randomUUID(),
                              productId: productFound.id,
                              name: productFound.name,
                              variant: 'Normal',
                              price: productFound.priceNormal,
                              quantity: 1,
                              selectedExtras: []
                           };
                           addToCart(newItem);
                           addedCount++;
                      }
                  });
                  if (addedCount > 0) {
                      message += `Se han añadido ${addedCount} platos a tu lista. `;
                  }
              }

              if (message) {
                  setNotification({ message, type: 'success' });
                  return;
              }
          }
      } catch (e) {
          // Not JSON
      }

      let scannedTableId = decodedText;
      try {
          if (decodedText.startsWith('http')) {
              const url = new URL(decodedText);
              const tId = url.searchParams.get('table');
              if (tId) scannedTableId = tId;
          } 
      } catch (e) {
          // Raw text
      }
      setTableId(scannedTableId);
      setNotification({ message: `¡Mesa ${scannedTableId} identificada!`, type: 'success' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const extrasTotal = item.selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
    return acc + ((item.price + extrasTotal) * item.quantity);
  }, 0);

  const filteredProducts = useMemo(() => {
    return activeCategory 
      ? products.filter(p => p.section.toLowerCase() === activeCategory.toLowerCase()) 
      : [];
  }, [activeCategory, products]);

  return (
    <div className="min-h-screen pb-0 relative bg-slate-900 flex flex-col">
      
      {/* Toast Notification */}
      {notification && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounceIn ${notification.type === 'success' ? 'bg-cyan-600 text-white' : 'bg-red-600 text-white'}`}>
              <span className="text-xl">{notification.type === 'success' ? '🎉' : '⚠️'}</span>
              <span className="font-bold text-sm">{notification.message}</span>
          </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex flex-col justify-center">
            {logoUrl ? (
                <img src={logoUrl} alt="Bocadito" className="h-10 object-contain w-auto max-w-[150px]" />
            ) : (
                <h1 className="text-xl font-bold text-white tracking-tight">
                    BOCAD<span className="text-cyan-500">I</span>TO
                </h1>
            )}
            {tableId ? (
                <span className="text-[10px] text-green-400 font-mono tracking-widest border border-green-900/50 bg-green-900/20 px-1 rounded w-fit animate-pulse mt-1">
                    MESA {tableId}
                </span>
            ) : null}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsQRScannerOpen(true)} 
            className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 bg-cyan-900/10 rounded-lg hover:bg-cyan-900/20"
            title="Escanear Mesa o Promo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          <button onClick={() => {
              // Prepare edit data when opening profile
              if (user) {
                  setEditData(user);
                  setIsEditingProfile(false); // Siempre abrir en modo lectura
                  setIsChangingPassword(false);
              }
              setIsProfileOpen(true);
          }} className={`transition-colors p-2 rounded-lg ${user ? 'text-cyan-400 bg-cyan-900/20' : 'text-slate-300 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          
          <div className="relative">
             <button onClick={() => setIsSelectionOpen(true)} className="text-slate-300 hover:text-white transition-colors p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
             </button>
             {totalItems > 0 && (
                 <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                     {totalItems}
                 </span>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 pb-20">
        <div className="mb-6 text-center">
             <h2 className="text-2xl font-bold text-white mt-4">Consulta nuestra Carta</h2>
             <p className="text-slate-400 text-xs mt-2">
                 {user ? `Hola, ${user.name}` : 'La identificación es opcional. Regístrate para acumular puntos.'}
             </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm animate-pulse">Cargando carta...</p>
          </div>
        ) : (
          /* Categories Accordion */
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category} className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 backdrop-blur-sm">
                <button
                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                  className={`w-full px-4 py-3 flex justify-between items-center text-left transition-all ${activeCategory === category ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 text-cyan-50'}`}
                >
                  <span className="text-base font-bold">{category}</span>
                  <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 text-cyan-500 transform transition-transform duration-300 ${activeCategory === category ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Products List within Category */}
                {activeCategory === category && (
                  <div className="p-4 space-y-4 bg-slate-900/30 animate-fadeIn">
                      {filteredProducts.map(product => (
                          <ProductCard 
                            key={product.id} 
                            product={product} 
                            onAdd={addToCart} 
                            availableExtras={extras} 
                          />
                      ))}
                      {filteredProducts.length === 0 && (
                        <p className="text-slate-500 text-center text-sm py-4">No hay productos disponibles en esta categoría.</p>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER - Replicating Image Design */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
         <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-800/30 rounded-2xl p-4 border border-slate-700">
               {/* Mapa / Info Izquierda */}
               <div className="flex flex-col gap-4">
                  <div className="rounded-xl overflow-hidden border border-slate-600 h-48 relative bg-slate-800 group cursor-pointer">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }}
                        src="https://maps.google.com/maps?q=Pl.+de+la+Alameda,+22,+29100+Co%C3%ADn,+M%C3%A1laga&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                        title="Ubicación Bocadito"
                        loading="lazy"
                      ></iframe>
                      
                      {/* Overlay Card - keeping it as it adds style and the click action on the iframe might be captured by the map interaction */}
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=Pl.+de+la+Alameda,+22,+29100+Co%C3%ADn,+M%C3%A1laga" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute top-4 left-4 bg-white text-slate-900 p-3 rounded shadow-lg max-w-[200px] z-10 hover:bg-slate-50 transition-colors"
                      >
                        <p className="font-bold text-sm">Pl. de la Alameda, 22</p>
                        <p className="text-xs text-slate-600">29100 Coín, Málaga</p>
                        <p className="text-xs text-blue-600 mt-1 hover:underline">Ampliar el mapa</p>
                     </a>
                  </div>
               </div>

               {/* Horarios Derecha */}
               <div className="flex flex-col justify-center text-slate-300 text-sm">
                   <h3 className="font-bold text-white text-lg mb-2">En la Plaza Alameda Nº22 de Coín, junto al ayuntamiento.</h3>
                   <p className="text-cyan-400 font-semibold mb-4">¡También tenemos reparto a domicilio todos los días!</p>
                   
                   <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                       <h4 className="text-cyan-500 font-bold mb-3 uppercase text-xs tracking-wider">Nuestro Horario</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                           <div>
                               <p className="font-bold text-white mb-1">Horario Verano</p>
                               <div className="flex justify-between"><span className="text-slate-400">Lunes-Jueves:</span> <span>20:00-23:30</span></div>
                               <div className="flex justify-between"><span className="text-slate-400">Viernes-Domingo:</span> <span>20:00-24:00</span></div>
                           </div>
                           <div>
                               <p className="font-bold text-white mb-1">Horario Invierno</p>
                               <div className="flex justify-between"><span className="text-slate-400">Lunes-Jueves:</span> <span>20:00-23:00</span></div>
                               <div className="flex justify-between"><span className="text-slate-400">Viernes-Domingo:</span> <span>20:00-23:30</span></div>
                           </div>
                       </div>
                       <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                           <span className="font-bold text-white text-xs">Horario Reparto:</span>
                           <div className="text-right">
                               <p className="text-cyan-400 font-bold text-xs">Todos los Días</p>
                               <p className="text-white text-xs">20:00 a 23:00</p>
                           </div>
                       </div>
                   </div>
                   <p className="mt-4 text-xs italic text-slate-500">Irresistibles roscas, jugosas hamburguesas, y frescas ensaladas, hasta nuestras increíbles salsas caseras como la brava.</p>
               </div>
            </div>

            {/* Links Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="https://sites.google.com/view/coin-bocadito/pasi%C3%B3n-por-los-bocadillos?authuser=0" target="_blank" rel="noopener noreferrer" className="block text-center border border-slate-600 hover:border-cyan-500 hover:text-cyan-400 text-white py-3 rounded-lg transition-colors font-medium">
                    Inicio
                </a>
                <a href="https://www.instagram.com/coin.bocadito?utm_source=qr" target="_blank" rel="noopener noreferrer" className="block text-center border border-slate-600 hover:border-pink-500 hover:text-pink-400 text-white py-3 rounded-lg transition-colors font-medium">
                    Instagram
                </a>
                <a href="https://www.facebook.com/p/Bocadito-61572216308073/" target="_blank" rel="noopener noreferrer" className="block text-center border border-slate-600 hover:border-blue-500 hover:text-blue-400 text-white py-3 rounded-lg transition-colors font-medium">
                    Facebook
                </a>
                <a href="https://share.google/ewigyqIE1WoZ6ER5a" target="_blank" rel="noopener noreferrer" className="block text-center border border-slate-600 hover:border-green-500 hover:text-green-400 text-white py-3 rounded-lg transition-colors font-medium">
                    Google
                </a>
            </div>

            <div className="mt-8 text-center border-t border-slate-800 pt-6 flex flex-col items-center gap-2">
                 <button 
                    onClick={() => setIsPrivacyOpen(true)}
                    className="text-cyan-600 hover:text-cyan-400 text-sm font-semibold underline decoration-cyan-900 underline-offset-4"
                 >
                     Consulta la política completa aquí
                 </button>
                 <p className="text-[10px] text-slate-600">
                     En Bocadito solo recogemos los datos necesarios (nombre, email, teléfono y dirección) cuando haces un pedido o nos contactas.
                 </p>
            </div>
         </div>
      </footer>

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setIsQRScannerOpen(false)} 
          />
      )}

      {/* Auth / Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700">
                <h3 className="text-lg font-bold text-cyan-400">
                    {user ? 'Mi Perfil' : 'Acceso Cliente'}
                </h3>
                <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-6">
                {/* Pending Points Banner */}
                {pendingPoints !== null && !user && (
                    <div className="mb-6 bg-yellow-900/30 border border-yellow-600/50 text-yellow-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                        <div className="text-3xl">🎁</div>
                        <div className="text-sm">
                            <p className="font-bold text-yellow-400">¡Tienes {pendingPoints} puntos esperando!</p>
                            <p className="text-slate-300">Inicia sesión o regístrate ahora para añadirlos a tu cuenta.</p>
                        </div>
                    </div>
                )}

                {/* Visual Error Message */}
                {authError && (
                    <div className="mb-4 bg-red-900/30 border border-red-900/50 text-red-200 px-3 py-2 rounded text-xs flex items-center gap-2 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {authError}
                    </div>
                )}

                {!user ? (
                    // --- GUEST STATE: LOGIN / REGISTER ---
                    <>
                        <div className="flex border-b border-slate-700 mb-6">
                             <button 
                                onClick={() => setAuthMode('login')}
                                className={`flex-1 pb-3 text-sm font-bold transition-colors ${authMode === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}
                             >
                                 Iniciar Sesión
                             </button>
                             <button 
                                onClick={() => setAuthMode('register')}
                                className={`flex-1 pb-3 text-sm font-bold transition-colors ${authMode === 'register' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500'}`}
                             >
                                 Registrarse
                             </button>
                        </div>

                        {authMode === 'login' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                                    <input 
                                        type="email" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                        value={loginEmail}
                                        onChange={e => setLoginEmail(e.target.value)}
                                        placeholder="ejemplo@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
                                    <input 
                                        type="password" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                        value={loginPass}
                                        onChange={e => setLoginPass(e.target.value)}
                                    />
                                </div>
                                
                                <button 
                                    onClick={handleLogin}
                                    disabled={authLoading}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50"
                                >
                                    {authLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (pendingPoints ? 'Entrar y Reclamar' : 'Entrar')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-400 mb-2">Introduce tus datos para registrarte en la base de datos de clientes.</p>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Nombre Completo *</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                        value={registerData.name}
                                        onChange={e => setRegisterData({...registerData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Email *</label>
                                    <input 
                                        type="email" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                        value={registerData.email}
                                        onChange={e => setRegisterData({...registerData, email: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                                    <input 
                                        type="tel" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                        value={registerData.phone}
                                        onChange={e => setRegisterData({...registerData, phone: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Dirección (opcional)</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                        value={registerData.address}
                                        onChange={e => setRegisterData({...registerData, address: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-cyan-400 mb-1 font-bold">Contraseña *</label>
                                    <input 
                                        type="password" 
                                        className="w-full bg-slate-800 border border-cyan-900 rounded p-2 text-white text-sm focus:border-cyan-500"
                                        value={registerData.password}
                                        onChange={e => setRegisterData({...registerData, password: e.target.value})}
                                        placeholder="Crea tu contraseña"
                                    />
                                </div>
                                <button 
                                    onClick={handleRegister}
                                    disabled={authLoading}
                                    className="w-full mt-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50"
                                >
                                    {authLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (pendingPoints ? 'Crear y Reclamar' : 'Crear Cuenta')}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // --- USER LOGGED IN STATE ---
                    <div className="space-y-5">
                        <div className="flex justify-between items-start">
                             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full text-center">
                                <span className="text-xs text-slate-400 uppercase tracking-wide">Puntos Acumulados</span>
                                <div className="text-2xl font-bold text-cyan-400 mt-1">{user.points}</div>
                            </div>
                        </div>

                        {/* User Data Section */}
                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-white">Datos Personales</h4>
                                {!isEditingProfile && !isChangingPassword && (
                                    <button 
                                        onClick={() => {
                                            setEditData(user);
                                            setIsEditingProfile(true);
                                        }}
                                        className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-cyan-600 hover:text-white px-2 py-1 rounded transition-colors text-cyan-400"
                                        title="Modificar datos"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        <span>Editar</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* Name Field */}
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase">Nombre</label>
                                    {isEditingProfile ? (
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                            value={editData.name || ''}
                                            onChange={e => setEditData({...editData, name: e.target.value})}
                                        />
                                    ) : (
                                        <p className="text-white font-medium">{user.name}</p>
                                    )}
                                </div>

                                {/* Email Field (Read Only) */}
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase">Email</label>
                                    <p className="text-slate-300 text-sm bg-slate-800/50 px-2 py-1 rounded">{user.email}</p>
                                </div>

                                {/* Phone Field */}
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase">Teléfono</label>
                                    {isEditingProfile ? (
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                            value={editData.phone || ''}
                                            onChange={e => setEditData({...editData, phone: e.target.value})}
                                        />
                                    ) : (
                                        <p className="text-white font-medium">{user.phone}</p>
                                    )}
                                </div>

                                {/* Address Field */}
                                <div>
                                    <label className="block text-xs text-slate-500 uppercase">Dirección</label>
                                    {isEditingProfile ? (
                                        <input 
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                            value={editData.address || ''}
                                            onChange={e => setEditData({...editData, address: e.target.value})}
                                        />
                                    ) : (
                                        <p className="text-white font-medium">{user.address}</p>
                                    )}
                                </div>

                                {/* Edit Actions */}
                                {isEditingProfile && (
                                    <div className="flex gap-2 mt-4 pt-2 border-t border-slate-700">
                                        <button onClick={() => { setIsEditingProfile(false); setAuthError(null); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded">Cancelar</button>
                                        <button 
                                            onClick={handleUpdateProfile} 
                                            disabled={authLoading}
                                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-2 rounded font-bold flex justify-center"
                                        >
                                            {authLoading ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Actions Section (only if not editing profile) */}
                        {!isEditingProfile && (
                            <>
                                {isChangingPassword ? (
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 animate-fadeIn">
                                        <h4 className="text-sm font-bold text-cyan-400 mb-2">Cambiar Contraseña</h4>
                                        <p className="text-[10px] text-slate-400 mb-3">Introduce tu nueva contraseña dos veces para confirmar.</p>
                                        
                                        <div className="space-y-3">
                                            <input 
                                                type="password"
                                                placeholder="Nueva Contraseña"
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                                value={passwordForm.new}
                                                onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                                            />
                                            <input 
                                                type="password"
                                                placeholder="Confirmar Contraseña"
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                                value={passwordForm.confirm}
                                                onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                                            />
                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={() => { setIsChangingPassword(false); setPasswordForm({new:'', confirm:''}); setAuthError(null); }} 
                                                    className="flex-1 bg-slate-700 text-xs py-2 rounded text-white"
                                                >
                                                    Cancelar
                                                </button>
                                                <button 
                                                    onClick={handleChangePassword}
                                                    disabled={authLoading} 
                                                    className="flex-1 bg-green-600 hover:bg-green-500 text-xs py-2 rounded text-white font-bold flex justify-center"
                                                >
                                                    {authLoading ? '...' : 'Confirmar'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsChangingPassword(true)}
                                        className="w-full border border-slate-600 hover:bg-slate-800 text-slate-300 py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Cambiar Contraseña
                                    </button>
                                )}

                                <div className="pt-4 border-t border-slate-800">
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-200 font-bold py-3 rounded-xl transition-colors"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* PRIVACY POLICY MODAL */}
      {isPrivacyOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
                  <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">Política de Privacidad</h3>
                    <button onClick={() => setIsPrivacyOpen(false)} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto text-slate-300 text-sm leading-relaxed space-y-4">
                      <p><strong>Nuestra Política de Privacidad de datos</strong></p>
                      <p>En Bocadito (Coín, Málaga) nos comprometemos a proteger la privacidad de nuestros clientes. La presente política describe cómo recogemos, utilizamos y protegemos los datos personales de los usuarios de nuestra web, de acuerdo con el Reglamento General de Protección de Datos (RGPD) de la UE. Para cualquier consulta sobre privacidad puede contactar en pasionporlosbocadillos@gmail.com.</p>
                      
                      <h4 className="font-bold text-white mt-4">Responsable del tratamiento</h4>
                      <p>El responsable del tratamiento de los datos es Bocadito, con domicilio en Coín (Málaga). Puede contactar con nosotros en el correo electrónico pasionporlosbocadillos@gmail.com o por teléfono. Somos la persona jurídica que decide los fines y medios del tratamiento de sus datos, y garantizamos el cumplimiento de la normativa de protección de datos.</p>

                      <h4 className="font-bold text-white mt-4">Datos personales que se recogen</h4>
                      <p>Recogemos los siguientes datos personales de los usuarios, proporcionados directamente por ellos al usar nuestros servicios o contactar con nosotros:</p>
                      <ul className="list-disc pl-5 space-y-1">
                          <li>Datos de identificación y contacto: nombre y apellidos, dirección de email, número de teléfono.</li>
                          <li>Dirección: domicilio o localización para entrega de pedidos (calle, número, CP, población).</li>
                          <li>Otros datos: cualquier información adicional que el usuario proporcione en mensajes, llamadas o formularios (p.ej. pedidos, preferencias).</li>
                      </ul>
                      <p>Estos datos se obtienen a través de distintos medios: el formulario de contacto/pedidos en la web (creado con Google Forms), correos electrónicos, mensajes (por ejemplo WhatsApp) o llamadas telefónicas de clientes. En todos los casos los datos son facilitados voluntariamente por el usuario.</p>

                      <h4 className="font-bold text-white mt-4">Finalidad del tratamiento</h4>
                      <ul className="list-disc pl-5 space-y-1">
                          <li>Gestionar pedidos y reservas: procesar las solicitudes de comida para llevar o entrega a domicilio, gestionar la facturación y logística necesaria.</li>
                          <li>Atención al cliente: responder a consultas y solicitudes de información, quejas o sugerencias recibidas por correo, teléfono o redes sociales.</li>
                          <li>Comunicaciones comerciales: enviar información sobre nuestros productos, ofertas o promociones solo si el usuario ha dado su consentimiento expreso.</li>
                          <li>Cumplimiento legal: atender obligaciones fiscales, contables o administrativas derivadas de la actividad del negocio (por ejemplo, emitir facturas).</li>
                      </ul>

                      <h4 className="font-bold text-white mt-4">Legitimación del tratamiento</h4>
                      <p>La base legal para tratar sus datos personales se apoya en el artículo 6.1 del RGPD:</p>
                      <ul className="list-disc pl-5 space-y-1">
                          <li>Ejecución de contrato (Art.6.1.b): gestionamos sus datos para tramitar pedidos y prestar servicios contratados.</li>
                          <li>Cumplimiento de obligación legal (Art.6.1.c): podemos tratar datos para cumplir la legislación fiscal y contable.</li>
                          <li>Consentimiento del interesado (Art.6.1.a): solicitamos su consentimiento explícito para enviar comunicaciones comerciales.</li>
                          <li>Interés legítimo (Art.6.1.f): en algunos casos legítimos actuamos bajo un interés legítimo de la empresa.</li>
                      </ul>

                      <h4 className="font-bold text-white mt-4">Destinatarios y transferencias de datos</h4>
                      <p>Sus datos personales no serán cedidos a terceros ajenos salvo obligación legal. Los principales destinatarios son encargados de tratamiento (proveedores tecnológicos como Google LLC) y autoridades públicas en caso de requerimiento legal.</p>

                      <h4 className="font-bold text-white mt-4">Derechos de los usuarios</h4>
                      <p>Usted puede ejercer, de manera gratuita, los derechos de acceso, rectificación, supresión, limitación del tratamiento, oposición, portabilidad y retirar el consentimiento. Puede dirigir una solicitud a Bocadito usando el correo pasionporlosbocadillos@gmail.com.</p>

                      <h4 className="font-bold text-white mt-4">Conservación de datos</h4>
                      <p>Conservaremos sus datos personales solo durante el tiempo necesario para las finalidades indicadas y para cumplir obligaciones legales (p.ej. 5 años para obligaciones tributarias).</p>

                      <h4 className="font-bold text-white mt-4">Seguridad de la información</h4>
                      <p>Aplicamos medidas técnicas y organizativas adecuadas para proteger sus datos personales de accesos no autorizados, alteraciones o pérdidas, conforme exige el artículo 32 del RGPD (cifrado, contraseñas seguras, etc.).</p>

                      <h4 className="font-bold text-white mt-4">Uso de cookies y herramientas de terceros</h4>
                      <p>Nuestra web utiliza cookies propias de sesión y de terceros (Google Analytics) para mejorar la experiencia. Al navegar por nuestro sitio, el usuario puede aceptar o rechazar las cookies mediante las opciones de configuración del navegador.</p>

                      <div className="mt-6 pt-4 border-t border-slate-700 text-xs text-slate-500">
                          <p>Última actualización: mayo 2025.</p>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
                      <button onClick={() => setIsPrivacyOpen(false)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Selection Modal (Cart) */}
      {isSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4 animate-fadeIn">
             <div className="bg-slate-900 w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
                <div className="p-4 bg-slate-800 flex justify-between items-center border-b border-slate-700 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-white">Mi Selección</h3>
                        <p className="text-xs text-orange-400 font-semibold">⚠️ No es un pedido a cocina</p>
                    </div>
                    <button onClick={() => setIsSelectionOpen(false)} className="text-slate-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <p className="mb-2 text-4xl">🍽️</p>
                            <p>Tu lista está vacía.</p>
                            <p className="text-sm">Añade platos desde la carta.</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-start border border-slate-700">
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="font-bold text-white">{item.name}</h4>
                                        <span className="text-[10px] text-cyan-400 bg-cyan-900/30 px-1.5 rounded uppercase tracking-wide border border-cyan-900">{item.variant}</span>
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        {item.price.toFixed(2)}€ x {item.quantity} = <span className="text-white font-mono">{(item.price * item.quantity).toFixed(2)}€</span>
                                    </div>
                                    {item.selectedExtras.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1 pl-2 border-l-2 border-slate-600">
                                            {item.selectedExtras.map(ex => (
                                                <div key={ex.id}>+ {ex.name} ({ex.price.toFixed(2)}€)</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2 ml-4">
                                     <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-300 hover:text-white p-1 bg-slate-700 rounded-full hover:bg-slate-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                     </button>
                                     <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-300 hover:text-white p-1 bg-slate-700 rounded-full hover:bg-slate-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                        </svg>
                                     </button>
                                     <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 p-1 mt-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                     </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
                    <div className="flex justify-between items-center mb-4 text-xl font-bold">
                        <span className="text-white">Total Estimado:</span>
                        <span className="text-cyan-400">{totalPrice.toFixed(2)}€</span>
                    </div>
                    {tableId ? (
                        <div className="mb-3 text-center">
                            <span className="text-sm text-green-400 font-mono border border-green-800 bg-green-900/30 px-3 py-1 rounded-full">
                                ✅ Mesa Asignada: {tableId}
                            </span>
                        </div>
                    ) : (
                         <div className="mb-3 text-center">
                            <span className="text-sm text-red-400 font-mono border border-red-800 bg-red-900/30 px-3 py-1 rounded-full">
                                ❌ Sin Mesa Asignada
                            </span>
                        </div>
                    )}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                        <p className="text-orange-400 text-sm text-center">
                            Esta lista no se envía a cocina. Muéstrasela al camarero para que tome nota.
                        </p>
                    </div>
                    <button 
                        disabled={cart.length === 0}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
                    >
                        Mostrar al Camarero
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Floating Action Button */}
      {!isSelectionOpen && cart.length > 0 && !isProfileOpen && !isQRScannerOpen && !isPrivacyOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:w-96 md:left-auto md:right-24 animate-slideUp">
            <button 
                onClick={() => setIsSelectionOpen(true)}
                className="w-full bg-slate-800 border border-slate-600 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center hover:bg-slate-750 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                        {totalItems}
                    </div>
                    <span className="font-semibold text-sm sm:text-base">Ver mi selección</span>
                </div>
                <span className="font-bold text-cyan-400">{totalPrice.toFixed(2)}€</span>
            </button>
        </div>
      )}
    </div>
  );
}

export default App;