import { MENU_DATA, EXTRAS as STATIC_EXTRAS } from '../constants';
import { Product, Extra, User } from '../types';

// Configuración de la API de Baserow
const BASEROW_TOKEN = "vZlkbz5gL9rL8J0eeuOZVDedcQ9oik3M";
const TABLE_CARTA_ID = "420254";
const TABLE_BEBIDAS_ID = "736213";
const TABLE_CLIENTES_ID = "420235";
const BASE_URL = "https://api.baserow.io/api/database/rows/table/";

interface BaserowCartaRow {
  id: number;
  field_3224509: string; // Nombre
  field_3224510: string; // Tipo
  field_3224515: string; // Ingredientes
  field_3224516: string; // Precio normal
  field_3224517: string; // Precio XL
  field_3224641: string; // Puntos
  field_6187512: string; // Sección
  field_6187597: { url: string }[]; // Imagen
}

interface BaserowBebidaRow {
  id: number;
  field_6195903: string; // Nombre
  field_6195904: string; // Precio
  field_6195905: { url: string }[]; // Imagen
}

interface MenuResponse {
  products: Product[];
  extras: Extra[];
}

/**
 * --- AUTHENTICATION SERVICES (REAL DB) ---
 */

// Helper to check response
const handleResponse = async (response: Response, errorMessage: string) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(errorMessage);
    }
    return response.json();
};

export const loginUser = async (email: string, password: string): Promise<User> => {
    // Buscar usuario por email
    const url = `${BASE_URL}${TABLE_CLIENTES_ID}/?user_field_names=false&filter__field_3224473__equal=${encodeURIComponent(email)}`;
    
    try {
        const response = await fetch(url, {
            headers: { Authorization: `Token ${BASEROW_TOKEN}` }
        });
        
        const data = await handleResponse(response, "Error al conectar con el servidor.");

        if (data.results.length === 0) {
            throw new Error("El correo electrónico no está registrado.");
        }

        const userRow = data.results[0];
        
        // Verificar contraseña (field_3224275)
        if (userRow.field_3224275 !== password) {
            throw new Error("La contraseña es incorrecta.");
        }

        return {
            id: userRow.id.toString(),
            name: userRow.field_3224265,
            email: userRow.field_3224473,
            phone: userRow.field_3224268 || '',
            address: userRow.field_3224273 || '',
            points: parseInt(userRow.field_3224318) || 0,
            password: userRow.field_3224275
        };
    } catch (error: any) {
        throw error;
    }
};

export const registerUser = async (userData: { name: string, email: string, password: string, phone: string, address: string }): Promise<User> => {
    // 1. Verificar si ya existe
    const checkUrl = `${BASE_URL}${TABLE_CLIENTES_ID}/?user_field_names=false&filter__field_3224473__equal=${encodeURIComponent(userData.email)}`;
    const checkResponse = await fetch(checkUrl, { headers: { Authorization: `Token ${BASEROW_TOKEN}` } });
    const checkData = await checkResponse.json();

    if (checkData.results && checkData.results.length > 0) {
        throw new Error("Este correo electrónico ya está registrado.");
    }

    // 2. Crear usuario
    const createUrl = `${BASE_URL}${TABLE_CLIENTES_ID}/?user_field_names=false`;
    const body = {
        "field_3224473": userData.email, // Email
        "field_3224265": userData.name,  // Nombre
        "field_3224275": userData.password, // Contraseña
        "field_3224268": userData.phone, // Teléfono
        "field_3224273": userData.address, // Dirección
        "field_3224318": 0 // Puntos iniciales
    };

    const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const userRow = await handleResponse(response, "Error al crear el usuario.");

    return {
        id: userRow.id.toString(),
        name: userRow.field_3224265,
        email: userRow.field_3224473,
        phone: userRow.field_3224268 || '',
        address: userRow.field_3224273 || '',
        points: 0,
        password: userRow.field_3224275
    };
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<User> => {
    const updateUrl = `${BASE_URL}${TABLE_CLIENTES_ID}/${userId}/?user_field_names=false`;
    
    // Mapear campos de User a IDs de Baserow
    const body: any = {};
    if (data.name !== undefined) body["field_3224265"] = data.name;
    if (data.phone !== undefined) body["field_3224268"] = data.phone;
    if (data.address !== undefined) body["field_3224273"] = data.address;
    if (data.password !== undefined) body["field_3224275"] = data.password;
    
    // Nota: points no se actualizan aquí directamente, usar addPointsToUser

    const response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const userRow = await handleResponse(response, "Error al actualizar el perfil.");

    return {
        id: userRow.id.toString(),
        name: userRow.field_3224265,
        email: userRow.field_3224473,
        phone: userRow.field_3224268 || '',
        address: userRow.field_3224273 || '',
        points: parseInt(userRow.field_3224318) || 0,
        password: userRow.field_3224275
    };
};

export const addPointsToUser = async (userId: string, pointsToAdd: number): Promise<number> => {
    // 1. Obtener usuario actual para saber puntos base
    const getUrl = `${BASE_URL}${TABLE_CLIENTES_ID}/${userId}/?user_field_names=false`;
    const getResponse = await fetch(getUrl, { headers: { Authorization: `Token ${BASEROW_TOKEN}` } });
    const userData = await handleResponse(getResponse, "Error al obtener datos del usuario.");
    
    const currentPoints = parseInt(userData.field_3224318) || 0;
    const newTotal = currentPoints + pointsToAdd;

    // 2. Actualizar puntos
    const updateUrl = `${BASE_URL}${TABLE_CLIENTES_ID}/${userId}/?user_field_names=false`;
    const body = { "field_3224318": newTotal };

    const updateResponse = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    await handleResponse(updateResponse, "Error al actualizar los puntos.");
    
    return newTotal;
};


/**
 * --- MENU SERVICES ---
 */

export const fetchMenuData = async (): Promise<MenuResponse> => {
  try {
    // 1. Fetch Carta (Comida y Extras)
    const cartaPromise = fetch(`${BASE_URL}${TABLE_CARTA_ID}/?user_field_names=false&size=200`, {
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`
      }
    });

    // 2. Fetch Bebidas
    const bebidasPromise = fetch(`${BASE_URL}${TABLE_BEBIDAS_ID}/?user_field_names=false&size=200`, {
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`
      }
    });

    const [cartaResponse, bebidasResponse] = await Promise.all([cartaPromise, bebidasPromise]);

    if (!cartaResponse.ok || !bebidasResponse.ok) {
      throw new Error("Error fetching data from Baserow");
    }

    const cartaData = await cartaResponse.json();
    const bebidasData = await bebidasResponse.json();

    const products: Product[] = [];
    const extras: Extra[] = [];

    // 3. Procesar Carta
    cartaData.results.forEach((row: BaserowCartaRow) => {
      const section = row.field_6187512 || 'Otros';
      const sectionLower = section.toLowerCase().trim();
      const type = row.field_3224510 || '';
      
      // Filtros de exclusión explícitos
      if (section === 'Otros') return;

      // Detectar si es un Extra (por sección o tipo)
      const isExtraSection = 
          sectionLower.includes('extra') || 
          sectionLower === 'salsas' || 
          sectionLower === 'ingredientes';
      
      if (isExtraSection) {
        // Mapear a Extra
        extras.push({
          id: `db_extra_${row.id}`,
          name: row.field_3224509 || 'Extra',
          price: parseFloat(row.field_3224516) || 0,
          category: (type.toLowerCase().includes('salsa') || sectionLower.includes('salsa')) ? 'sauce' : 'ingredient'
        });
      } else {
        // Mapear a Product
        products.push({
          id: `db_carta_${row.id}`,
          name: row.field_3224509 || 'Sin nombre',
          type: type || 'General',
          ingredients: row.field_3224515 || '',
          priceNormal: parseFloat(row.field_3224516) || 0,
          priceXL: row.field_3224517 ? parseFloat(row.field_3224517) : undefined,
          section: section, 
          image: row.field_6187597 || [],
          points: parseInt(row.field_3224641) || 0,
          extrasAllowed: true
        });
      }
    });

    // 4. Procesar Bebidas (Siempre son productos)
    bebidasData.results.forEach((row: BaserowBebidaRow) => {
      products.push({
        id: `db_bebida_${row.id}`,
        name: row.field_6195903 || 'Bebida',
        type: 'Bebida',
        ingredients: 'Bebida refrescante',
        priceNormal: parseFloat(row.field_6195904) || 0,
        priceXL: undefined,
        section: 'Bebidas',
        image: row.field_6195905 || [],
        points: 2,
        extrasAllowed: false
      });
    });

    console.log(`Cargados: ${products.length} productos y ${extras.length} extras.`);
    return { products, extras };

  } catch (error) {
    console.error("Fallo al conectar con la Base de Datos, usando respaldo local:", error);
    return { products: MENU_DATA, extras: STATIC_EXTRAS };
  }
};

export const getCategoriesFromProducts = (products: Product[]): string[] => {
  const priorityOrder = [
    'Ensaladas', 'Ensalada',
    'Entrantes', 'Entrante',
    'Camperos', 'Campero',
    'Bocadillos', 'Bocadillo',
    'Hamburguesas', 'Hamburguesa',
    'Roscas', 'Rosca',
    'Sandwiches', 'Sandwich',
    'Bebidas', 'Bebida',
    'Ofertas', 'Oferta'
  ];
  
  const allSections = Array.from(new Set(products.map(p => p.section)));
  
  const filteredSections = allSections.filter(s => {
      if (!s) return false;
      const lower = s.toLowerCase();
      return s !== 'Otros' &&
             !lower.includes('extra') && 
             lower !== 'salsas' && 
             lower !== 'ingredientes';
  });
  
  return filteredSections.sort((a, b) => {
    const indexA = priorityOrder.findIndex(p => p.toLowerCase() === a.trim().toLowerCase());
    const indexB = priorityOrder.findIndex(p => p.toLowerCase() === b.trim().toLowerCase());
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
};