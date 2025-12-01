import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/geminiService';
import { ChatMessage, Product, CartItem, Extra } from '../types';

interface ChatbotProps {
  onAddProduct: (item: CartItem) => void;
  products: Product[]; // Receive products from parent to ensure sync with DB
  extras: Extra[]; // Receive extras from parent
  userName?: string; // Optional user name
  userId?: string; // Added userId to fetch history
}

const Chatbot: React.FC<ChatbotProps> = ({ onAddProduct, products, extras, userName, userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      text: userName 
        ? `¡Hola de nuevo ${userName}! Soy Bocadito. ¿Te ayudo a preparar tu pedido basándome en tus gustos?`
        : '¡Hola! Soy Bocadito, tu asistente virtual. ¿Para cuántas personas queréis comer hoy?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to store the chat session instance
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    // Re-initialize chat if products/extras change or chat opens
    if (isOpen && products.length > 0) {
        try {
            // Pass the current products AND extras AND userName/ID to the AI service
            chatSessionRef.current = createChatSession(
                products, 
                extras, 
                userName || "Invitado",
                userId || ""
            );
        } catch (e) {
            console.error("Failed to initialize chat session", e);
        }
    }
  }, [isOpen, products, extras, userName, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getImageUrl = (img: string | { url: string }[]) => {
    if (Array.isArray(img)) {
      return img.length > 0 ? img[0].url : 'https://via.placeholder.com/150';
    }
    return img || 'https://via.placeholder.com/150';
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // FIX: New SDK requires an object with 'message' property
      const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      
      // FIX: Access response text via property getter, not function call
      let responseText = response.text || "Lo siento, no he entendido eso.";

      // Check for function calls
      // The SDK might return function calls in candidates or top level depending on version, 
      // but usually available via helper or direct property check on the response object wrapper
      // Assuming 'functionCalls' is a helper method on the returned object wrapper provided by GoogleGenAI class
      const functionCalls = response.functionCalls ? response.functionCalls() : [];
      let suggestedAction = undefined;

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'suggestDish') {
           const { productId, variant } = call.args as any;
           // Look up product in the passed props, not static file
           const product = products.find(p => p.id === productId);
           
           if (product) {
             suggestedAction = {
               product,
               variant: (variant || 'Normal') as 'Normal' | 'XL'
             };
             
             // Send tool response back to model to acknowledge
             // Note: In a real "loop", we would send the function response back. 
             // For this simple UI, we just display the button and let the model know via a follow-up if needed,
             // or just display the text generated alongside the function call.
             
             if (!responseText) {
                 responseText = `¡Oído cocina! Aquí tienes el botón para añadir ${product.name}.`;
             }
           }
        }
      }

      const modelMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'model',
        text: responseText,
        suggestedAction
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        text: 'Lo siento, he tenido un pequeño corte en la conexión con cocina. ¿Podrías repetirmelo?'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = (action: { product: Product, variant: 'Normal' | 'XL' }) => {
    const price = action.variant === 'XL' && action.product.priceXL 
        ? action.product.priceXL 
        : action.product.priceNormal;

    const item: CartItem = {
        id: crypto.randomUUID(),
        productId: action.product.id,
        name: action.product.name,
        variant: action.variant,
        price: price,
        quantity: 1,
        selectedExtras: []
    };
    onAddProduct(item);
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'model',
        text: `✅ Marchando una de ${action.product.name} (${action.variant}). ¿Algo más?`
    }]);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 md:right-8 w-14 h-14 bg-cyan-600 hover:bg-cyan-500 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-105 z-40 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-24 md:right-8 w-full md:w-96 h-[80vh] md:h-[600px] bg-slate-900 border border-slate-700 md:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
          
          {/* Header */}
          <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
            <div>
              <h3 className="text-white font-bold text-lg">Maitre Bocadito</h3>
              <p className="text-xs text-cyan-400">
                  {userName ? `Atendiendo a: ${userName}` : 'Asistente de Pedidos'}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-cyan-700 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
                
                {/* Suggested Action Button (Upsell/Add) */}
                {msg.suggestedAction && (
                    <div className="mt-2 animate-fadeIn">
                        <button
                            onClick={() => msg.suggestedAction && handleQuickAdd(msg.suggestedAction)}
                            className="flex items-center gap-2 bg-cyan-900/50 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                           <img src={getImageUrl(msg.suggestedAction.product.image)} className="w-8 h-8 rounded object-cover" alt="" />
                           <span>Añadir {msg.suggestedAction.product.name}</span>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6-8H4" />
                           </svg>
                        </button>
                    </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                 <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700">
                    <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe aquí..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-slate-700 hover:bg-cyan-600 text-white p-2 rounded-full transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

        </div>
      )}
    </>
  );
};

export default Chatbot;