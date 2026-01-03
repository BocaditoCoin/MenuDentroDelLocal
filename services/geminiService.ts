import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { Product, Extra } from "../types";

// Function Declaration stays constant
const suggestDishDeclaration: FunctionDeclaration = {
  name: 'suggestDish',
  description: 'Suggest a dish to be added to the users selection list. Call this when the user agrees to a recommendation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: 'The ID of the product to suggest.',
      },
      variant: {
        type: Type.STRING,
        description: 'The variant of the product (Normal or XL). Default to Normal if not specified.',
        enum: ['Normal', 'XL']
      }
    },
    required: ['productId'],
  },
};

const tools: Tool[] = [
  {
    functionDeclarations: [suggestDishDeclaration],
  },
];

let client: GoogleGenAI | null = null;

const getClient = () => {
    if (!client) {
        // API Key must be obtained exclusively from process.env.API_KEY
        client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return client;
}

// Helper to simulate user history since we don't have the orders table
const getSimulatedUserHistory = (userName: string, userId: string): string => {
    if (userName === "Invitado" || !userId) return "";
    
    // Simple mock logic: Even IDs like Meat, Odd IDs like Healthy food
    const isEven = userId.charCodeAt(userId.length - 1) % 2 === 0;
    
    if (isEven) {
        return `HISTORIAL DE ${userName}: Suele pedir Hamburguesas XL y Patatas Bravas. Le gusta la carne y los sabores intensos.`;
    } else {
        return `HISTORIAL DE ${userName}: Suele pedir Ensaladas y Sandwiches Vegetales. Prefiere opciones ligeras y saludables.`;
    }
}

// Now accepts products AND extras as arguments to ensure data is fresh/auto-updated
// Also accepts userName to personalize the chat
export const createChatSession = (products: Product[], extras: Extra[], userName: string = "Invitado", userId: string = "") => {
  const ai = getClient();
  
  // Prepare the menu context dynamically based on the passed products
  const menuContext = products.map(p => 
    `- ${p.name} (${p.section}): ${p.ingredients}. Precio: ${p.priceNormal}€`
  ).join('\n');

  const historyContext = getSimulatedUserHistory(userName, userId);

  const systemInstruction = `
Eres el MAITRE VIRTUAL del restaurante "Bocadito". Tu trabajo no es solo tomar nota, sino ASESORAR para crear una experiencia gastronómica perfecta.

**CONTEXTO DEL USUARIO:**
Nombre: ${userName}
${historyContext ? `\n**INFORMACIÓN VALIOSA (ÚSALA):**\n${historyContext}\n` : '\n**ESTADO:** Cliente NO identificado (Invitado).\n'}

**TUS INSTRUCCIONES DE COMPORTAMIENTO (CRÍTICO):**

1. **SI EL USUARIO ES "INVITADO" (No hay historial):**
   - TU PRIMERA PREGUNTA DEBE SER OBLIGATORIAMENTE: "¿Para cuántas personas es la mesa hoy?"
   - Una vez te digan el número, RECOMIENDA CANTIDADES ADECUADAS.
     * Regla general: 1 Entrante para compartir cada 2-3 personas + 1 Principal (Hamburguesa/Bocadillo) por persona.
   - NO recomiendes platos sueltos sin saber cuántos son.

2. **SI EL USUARIO ESTÁ REGISTRADO (Hay historial):**
   - Saluda por su nombre.
   - USA SU HISTORIAL: "Hola ${userName}, ¿te apetece repetir tu clásica hamburguesa o probamos algo nuevo hoy?"
   - Intenta vender complementos que encajen con su perfil.

3. **GESTIÓN DEL MENÚ:**
   - Tienes la lista de productos abajo.
   - Si piden "algo de beber", enumera las opciones.
   - Si piden "algo para picar", sugiere los Entrantes.

4. **HERRAMIENTA 'suggestDish':**
   - Si el cliente dice "sí", "me apetece", "ponme eso" o confirma un plato, USA LA HERRAMIENTA INMEDIATAMENTE para que aparezca el botón en pantalla.

**MENÚ DISPONIBLE:**
${menuContext}
`;

  return ai.chats.create({
    model: 'gemini-2.5-flash', 
    config: {
      systemInstruction: systemInstruction,
      tools: tools,
    },
  });
};