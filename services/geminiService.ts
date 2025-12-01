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
        // API Key integrada directamente para despliegue inmediato
        client = new GoogleGenAI({ apiKey: "AIzaSyDYKBhwcg41tCa8Xiu0kwWYIaBY-FYAMRg" });
    }
    return client;
}

// Now accepts products AND extras as arguments to ensure data is fresh/auto-updated
// Also accepts userName to personalize the chat
export const createChatSession = (products: Product[], extras: Extra[], userName: string = "Cliente") => {
  const ai = getClient();
  
  // Prepare the menu context dynamically based on the passed products
  const menuContext = products.map(p => 
    `${p.name} (ID: ${p.id}, Section: ${p.section}): ${p.ingredients}. Precio: ${p.priceNormal}€${p.priceXL ? ` / XL: ${p.priceXL}€` : ''}.`
  ).join('\n');

  const extrasContext = extras.map(e => `${e.name} (${e.price}€)`).join(', ');

  const systemInstruction = `
Eres "Bocadito", un asistente virtual experto y amable del restaurante Bocadito.
Tu objetivo es ayudar al cliente (${userName}) a elegir qué comer y recomendar platos basándote en sus gustos si los menciona, o en los platos populares del menú actual.

**REGLAS DE ORO:**
1. NO es un sistema de pedidos automáticos. El cliente hace una lista para enseñar al camarero.
2. NUNCA respondas a insultos. Sé educado e ignora la hostilidad.
3. PROTEGE la privacidad. Nunca reveles datos de otros usuarios.
4. UPSELLING: Intenta subir el ticket medio discretamente. Si piden una hamburguesa, sugiere patatas o bebida.
5. Si el usuario parece decidido por un plato, usa la herramienta "suggestDish" para mostrarle un botón de añadir.

**DATOS:**
Usuario: ${userName}.
Menú Actualizado (Base de Datos):
${menuContext}

Extras disponibles (Salsas e Ingredientes): 
${extrasContext}

Si recomiendas algo y el usuario acepta, LLAMA A LA FUNCIÓN 'suggestDish' con el ID del producto y la variante (Normal/XL).
`;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemInstruction,
      tools: tools,
    },
  });
};