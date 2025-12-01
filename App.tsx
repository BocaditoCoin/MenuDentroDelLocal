import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from './components/ProductCard';
import Chatbot from './components/Chatbot';
import QRScanner from './components/QRScanner';
import { CartItem, Product, Extra, User } from './types';
import { fetchMenuData, getCategoriesFromProducts, loginUser, registerUser, updateUser } from './services/menuService';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auth & Cart State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
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

  // Fetch Menu Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
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

  // Clear errors when opening modal or switching modes
  useEffect(() => {
      setAuthError(null);
  }, [isProfileOpen, authMode]);

  // --- AUTH Handlers ---

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
        if (!loginEmail || !loginPass) throw new Error("Por favor, introduce email y contraseña.");
        const loggedUser = await loginUser(loginEmail, loginPass);
        setUser(loggedUser);
        setIsProfileOpen(false);
        setLoginEmail('');
        setLoginPass('');
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

          const newUser = await registerUser(registerData);
          setUser(newUser);
          setIsProfileOpen(false);
          setAuthMode('login'); 
          setRegisterData({ name: '', email: '', phone: '', address: '', password: '' });
          // No alert needed, visual feedback is the modal closing and user logged in
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
      setAuthError(null);
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

  const handleScanSuccess = (decodedText: string) => {
      let scannedTableId = decodedText;
      try {
          if (decodedText.startsWith('http')) {
              const url = new URL(decodedText);
              const tId = url.searchParams.get('table');
              if (tId) scannedTableId = tId;
          } 
      } catch (e) {
          console.log("Not a URL, using raw text");
      }
      setTableId(scannedTableId);
      setIsQRScannerOpen(false);
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
    <div className="min-h-screen pb-24 relative bg-slate-900">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex flex-col">
            <h1 className="text-xl font-bold text-white tracking-tight">
            BOCAD<span className="text-cyan-500">I</span>TO
            </h1>
            {tableId ? (
                <span className="text-[10px] text-green-400 font-mono tracking-widest border border-green-900/50 bg-green-900/20 px-1 rounded w-fit animate-pulse">
                    MESA {tableId}
                </span>
            ) : (
                <span className="text-[10px] text-slate-500 font-mono tracking-widest">
                    SIN MESA
                </span>
            )}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsQRScannerOpen(true)} 
            className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 bg-cyan-900/10 rounded-lg hover:bg-cyan-900/20"
            title="Escanear Mesa"
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
      <main className="max-w-4xl mx-auto p-4">
        <div className="mb-6 text-center">
             <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider mb-1">
                 {tableId ? `Estás en la Mesa ${tableId}` : 'Bienvenido a Bocadito'}
             </p>
             <h2 className="text-2xl font-bold text-white">Consulta nuestra Carta</h2>
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
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category} className="bg-slate-800/40 rounded-xl overflow-hidden border border-slate-700/50 backdrop-blur-sm">
                <button
                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                  className={`w-full px-6 py-4 flex justify-between items-center text-left transition-all ${activeCategory === category ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 text-cyan-50'}`}
                >
                  <span className="text-lg font-bold">{category}</span>
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
                                    ) : 'Entrar'}
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
                                    ) : 'Crear Cuenta'}
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
      {!isSelectionOpen && cart.length > 0 && !isProfileOpen && !isQRScannerOpen && (
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

      <Chatbot onAddProduct={addToCart} products={products} extras={extras} userName={user?.name} />
    </div>
  );
}

export default App;
