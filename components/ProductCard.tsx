import React, { useState } from 'react';
import { Product, Extra, CartItem } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (item: CartItem) => void;
  availableExtras: Extra[]; // Now receiving extras from parent
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd, availableExtras }) => {
  const [quantity, setQuantity] = useState(1);
  const [showExtras, setShowExtras] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'sauces'>('ingredients');
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);

  // Check if this product is an Offer to display the Day (stored in type)
  const isOffer = product.section.toLowerCase().includes('oferta');

  // Helper to safely get image URL whether it's a string or a database file array
  const getImageUrl = (img: string | { url: string }[]) => {
    if (Array.isArray(img)) {
      return img.length > 0 ? img[0].url : 'https://via.placeholder.com/600x400?text=Sin+Imagen';
    }
    return img || 'https://via.placeholder.com/600x400?text=Sin+Imagen';
  };

  const handleAdd = (variant: 'Normal' | 'XL') => {
    const price = variant === 'XL' && product.priceXL ? product.priceXL : product.priceNormal;
    const item: CartItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      variant,
      price,
      quantity,
      selectedExtras
    };
    onAdd(item);
    // Reset state after adding
    setQuantity(1);
    setSelectedExtras([]);
    setShowExtras(false);
  };

  const toggleExtra = (extra: Extra) => {
    if (selectedExtras.some(e => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  // Filter available extras based on the category assigned in menuService
  const saucesList = availableExtras.filter(e => e.category === 'sauce');
  const ingredientsList = availableExtras.filter(e => e.category === 'ingredient');

  return (
    <div className={`bg-slate-800 rounded-xl overflow-hidden shadow-lg border mb-6 flex flex-col md:flex-row ${isOffer ? 'border-yellow-500/50 shadow-yellow-900/20' : 'border-slate-700'}`}>
      {/* Image */}
      <div className="h-48 md:h-auto md:w-1/3 relative bg-slate-700">
        <img 
          src={getImageUrl(product.image)} 
          alt={product.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=Imagen+No+Disponible';
          }}
        />
        <div className="absolute top-2 right-2 bg-slate-900/80 text-cyan-400 text-xs font-bold px-2 py-1 rounded backdrop-blur-sm">
          {product.points} Pts
        </div>
        {isOffer && (
            <div className="absolute top-2 left-2 bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg animate-pulse">
                OFERTA
            </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-white">{product.name}</h3>
            {/* Display Day/Type for Offers */}
            {isOffer && (
                <span className="bg-yellow-900/40 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded border border-yellow-500/50 flex items-center gap-1">
                    📅 {product.type}
                </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2 md:line-clamp-none">
            {product.ingredients}
          </p>
        </div>

        {/* Extras Tabs (Accordion Style) */}
        {product.extrasAllowed && (
          <div className="mb-4">
             <button 
                onClick={() => setShowExtras(!showExtras)}
                className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-all ${
                  showExtras 
                    ? 'bg-slate-900 text-cyan-400 rounded-t-xl border border-slate-700 border-b-0' 
                    : 'bg-slate-700/30 text-cyan-500 rounded-xl mb-2 hover:bg-slate-700/50 border border-transparent'
                }`}
             >
                <span>Personalizar (Ingredientes y Salsas)</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${showExtras ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
             </button>

             {showExtras && (
               <div className="bg-slate-900/50 border border-slate-700 border-t-0 rounded-b-xl overflow-hidden animate-fadeIn">
                  {/* Tabs Header */}
                  <div className="flex border-b border-slate-700">
                     <button 
                       onClick={() => setActiveTab('ingredients')}
                       className={`flex-1 py-3 text-xs font-bold transition-colors ${
                         activeTab === 'ingredients' 
                           ? 'bg-slate-800/80 text-cyan-400 border-b-2 border-cyan-500' 
                           : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                       }`}
                     >
                       Ingredientes
                     </button>
                     <button 
                       onClick={() => setActiveTab('sauces')}
                       className={`flex-1 py-3 text-xs font-bold transition-colors ${
                         activeTab === 'sauces' 
                           ? 'bg-slate-800/80 text-cyan-400 border-b-2 border-cyan-500' 
                           : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                       }`}
                     >
                       Salsas
                     </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4 bg-slate-900/30">
                     {activeTab === 'ingredients' && (
                        <div className="flex flex-wrap gap-2">
                           {ingredientsList.length > 0 ? ingredientsList.map(extra => {
                              const isSelected = selectedExtras.some(e => e.id === extra.id);
                              return (
                                <button
                                  key={extra.id}
                                  onClick={() => toggleExtra(extra)}
                                  className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${
                                    isSelected 
                                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/50' 
                                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-750'
                                  }`}
                                >
                                  {extra.name} (+{extra.price.toFixed(2)}€)
                                </button>
                              );
                           }) : (
                             <p className="text-slate-500 text-xs italic w-full text-center py-2">No hay ingredientes extra disponibles.</p>
                           )}
                        </div>
                     )}

                     {activeTab === 'sauces' && (
                        <div className="flex flex-wrap gap-2">
                           {saucesList.length > 0 ? saucesList.map(extra => {
                              const isSelected = selectedExtras.some(e => e.id === extra.id);
                              return (
                                <button
                                  key={extra.id}
                                  onClick={() => toggleExtra(extra)}
                                  className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${
                                    isSelected 
                                      ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/50' 
                                      : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-750'
                                  }`}
                                >
                                  {extra.name} (+{extra.price.toFixed(2)}€)
                                </button>
                              );
                           }) : (
                             <p className="text-slate-500 text-xs italic w-full text-center py-2">No hay salsas extra disponibles.</p>
                           )}
                        </div>
                     )}
                  </div>
               </div>
             )}
             
             {/* Selected Display (Always visible if items selected) */}
             {selectedExtras.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedExtras.map(ex => (
                    <span key={ex.id} className="text-[10px] text-cyan-200 bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-900/50 flex items-center gap-1">
                      <span>+ {ex.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleExtra(ex); }}
                        className="hover:text-white text-cyan-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
             )}
          </div>
        )}

        {/* Controls */}
        <div className="pt-3 border-t border-slate-700/50">
          {/* Prices Separated Left to Right */}
          <div className="flex justify-between items-end mb-3">
             <span className={`text-xl font-bold ${isOffer ? 'text-yellow-400' : 'text-cyan-400'}`}>{product.priceNormal.toFixed(2)}€</span>
             {product.priceXL && (
               <span className="text-sm font-semibold text-slate-400 bg-slate-700/30 px-2 py-1 rounded">XL: {product.priceXL.toFixed(2)}€</span>
             )}
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Quantity */}
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
               <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 flex items-center justify-center text-white transition-colors"
               >
                 -
               </button>
               <span className="font-mono text-sm w-8 text-center">{quantity}</span>
               <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 flex items-center justify-center text-white transition-colors"
               >
                 +
               </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 flex-1 justify-end">
              <button 
                onClick={() => handleAdd('Normal')}
                className={`flex-1 px-3 py-2 text-white text-xs font-semibold rounded-lg transition-colors border ${
                    isOffer 
                    ? 'bg-yellow-700 hover:bg-yellow-600 border-yellow-600' 
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                }`}
              >
                Añadir Normal
              </button>
              {product.priceXL && (
                <button 
                  onClick={() => handleAdd('XL')}
                  className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-cyan-900/20"
                >
                  Añadir XL
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;