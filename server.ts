import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';

// Initial data for seeding fresh Google Sheets
const INITIAL_INGREDIENTS = [
  { id: 'ing_puff_sheet', name: 'Raw Puff Pastry Sheets', unit: 'pcs', currentStock: 500, minStockAlert: 50, costPerUnit: 8, category: 'Dry Goods' },
  { id: 'ing_amul_butter', name: 'Amul Salted Butter', unit: 'grams', currentStock: 5000, minStockAlert: 800, costPerUnit: 0.6, category: 'Dairy & Cheese' },
  { id: 'ing_mozz_cheese', name: 'Amul Mozzarella & Processed Cheese', unit: 'grams', currentStock: 8000, minStockAlert: 1000, costPerUnit: 0.8, category: 'Dairy & Cheese' },
  { id: 'ing_paneer', name: 'Fresh Malai Paneer Cubes', unit: 'grams', currentStock: 5000, minStockAlert: 600, costPerUnit: 0.45, category: 'Dairy & Cheese' },
  { id: 'ing_potato_masala', name: 'Spiced Potato Puff Filling', unit: 'grams', currentStock: 15000, minStockAlert: 2000, costPerUnit: 0.15, category: 'Produce' },
  { id: 'ing_schezwan_sauce', name: 'Hot Schezwan Garlic Sauce', unit: 'grams', currentStock: 3000, minStockAlert: 400, costPerUnit: 0.3, category: 'Sauces & Spices' },
  { id: 'ing_mayo', name: 'Creamy Eggless Mayonnaise', unit: 'grams', currentStock: 4000, minStockAlert: 500, costPerUnit: 0.2, category: 'Sauces & Spices' },
  { id: 'ing_sev', name: 'Ratlami Nylon Sev', unit: 'grams', currentStock: 3500, minStockAlert: 400, costPerUnit: 0.18, category: 'Dry Goods' },
  { id: 'ing_sing', name: 'Roasted Masala Peanuts (Sing)', unit: 'grams', currentStock: 3000, minStockAlert: 350, costPerUnit: 0.2, category: 'Dry Goods' },
  { id: 'ing_chatni', name: 'Spicy Green Mint Chatni', unit: 'grams', currentStock: 2500, minStockAlert: 300, costPerUnit: 0.22, category: 'Sauces & Spices' },
  { id: 'ing_garlic_sauce', name: 'Fiery Garlic Paste & Chutney', unit: 'grams', currentStock: 2500, minStockAlert: 300, costPerUnit: 0.25, category: 'Sauces & Spices' },
  { id: 'ing_tandoori_sauce', name: 'Smoky Tandoori Mayo Spread', unit: 'grams', currentStock: 3000, minStockAlert: 400, costPerUnit: 0.32, category: 'Sauces & Spices' },
  { id: 'ing_malai', name: 'Rich Malai Fresh Cream', unit: 'grams', currentStock: 2000, minStockAlert: 250, costPerUnit: 0.4, category: 'Dairy & Cheese' },
  { id: 'ing_onion', name: 'Finely Diced Fresh Onions', unit: 'grams', currentStock: 6000, minStockAlert: 800, costPerUnit: 0.08, category: 'Produce' },
  { id: 'ing_chaas', name: 'Fresh Spiced Buttermilk', unit: 'ml', currentStock: 10000, minStockAlert: 1500, costPerUnit: 0.03, category: 'Dairy & Cheese' }
];

const puffImg = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80';
const cheesyImg = 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&w=600&q=80';
const paneerImg = 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80';
const spicyImg = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80';
const specialImg = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80';
const drinkImg = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80';

const INITIAL_MENU_ITEMS = [
  { id: 'p_01', name: 'Regular Puff', category: 'Classic & Single Flavor Puffs', price: 30, isVeg: true, description: 'Crispy flaky golden pastry filled with authentic spiced potato masala.', isAvailable: true, image: puffImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 70 }] },
  { id: 'p_02', name: 'Chatni Puff', category: 'Classic & Single Flavor Puffs', price: 35, isVeg: true, description: 'Fresh baked puff with tangy green mint & coriander chatni.', isAvailable: true, image: puffImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 60 }, { ingredientId: 'ing_chatni', quantityNeeded: 15 }] },
  { id: 'p_03', name: 'Onion Puff', category: 'Classic & Single Flavor Puffs', price: 35, isVeg: true, description: 'Crunchy diced fresh onions stuffed with potato filling in warm puff.', isAvailable: true, image: puffImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 60 }, { ingredientId: 'ing_onion', quantityNeeded: 20 }] },
  { id: 'p_04', name: 'Schezwan Puff', category: 'Classic & Single Flavor Puffs', price: 35, isVeg: true, description: 'Hot Indo-Chinese Schezwan garlic sauce tossed inside flaky puff.', isAvailable: true, image: spicyImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 60 }, { ingredientId: 'ing_schezwan_sauce', quantityNeeded: 15 }] },
  { id: 'p_12', name: 'Cheese Puff', category: 'Classic & Single Flavor Puffs', price: 45, isVeg: true, description: 'Melted Amul process cheese blended into warm potato filling.', isAvailable: true, image: cheesyImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 55 }, { ingredientId: 'ing_mozz_cheese', quantityNeeded: 20 }] },
  { id: 'p_15', name: 'Paneer Puff', category: 'Classic & Single Flavor Puffs', price: 45, isVeg: true, description: 'Soft fresh paneer cubes seasoned with authentic spices.', isAvailable: true, image: paneerImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 50 }, { ingredientId: 'ing_paneer', quantityNeeded: 25 }] },
  { id: 'p_63', name: "Sp. Company's Puff", category: 'Company Signature Specials', price: 90, isVeg: true, description: "THE PUFF COMPANY Flagship Masterpiece: Jumbo puff loaded with Paneer, Double Cheese, Butter, Mayo, Schezwan, Garlic, Sev & Peanuts!", isAvailable: true, image: specialImg, recipe: [{ ingredientId: 'ing_puff_sheet', quantityNeeded: 1 }, { ingredientId: 'ing_potato_masala', quantityNeeded: 30 }, { ingredientId: 'ing_paneer', quantityNeeded: 25 }, { ingredientId: 'ing_mozz_cheese', quantityNeeded: 30 }, { ingredientId: 'ing_amul_butter', quantityNeeded: 15 }] },
  { id: 'b_01', name: 'Chilled Masala Gujarati Chaas (250ml)', category: 'Company Signature Specials', price: 20, isVeg: true, description: 'Refreshing digestive buttermilk spiced with roasted cumin and rock salt.', isAvailable: true, image: drinkImg, recipe: [{ ingredientId: 'ing_chaas', quantityNeeded: 250 }] }
];

// Memory fallback store when Google Sheets is connecting or syncing
let memoryStore = {
  menu: [...INITIAL_MENU_ITEMS],
  inventory: [...INITIAL_INGREDIENTS],
  orders: [] as any[],
  spreadsheetId: ''
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // OAuth Client Configuration
  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  function getOAuth2Client(tokens?: any) {
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    if (tokens) {
      oAuth2Client.setCredentials(tokens);
    }
    return oAuth2Client;
  }

  function getClientFromReq(req: express.Request) {
    const tokensCookie = req.cookies.google_tokens;
    let tokens = null;
    if (tokensCookie) {
      try {
        tokens = typeof tokensCookie === 'string' ? JSON.parse(tokensCookie) : tokensCookie;
      } catch (e) {
        tokens = null;
      }
    }
    if (!tokens || (typeof tokens === 'object' && !tokens.access_token && !tokens.refresh_token)) {
      return null;
    }
    return getOAuth2Client(tokens);
  }

  // --- AUTH ENDPOINTS ---

  app.get('/api/auth/google', (req, res) => {
    if (!clientId) {
      return res.status(400).json({ error: 'OAuth Client ID not configured yet.' });
    }
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });
    res.redirect(authUrl);
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect('/?error=no_code');
    }
    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      res.cookie('google_tokens', JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      res.redirect('/?oauth_success=1');
    } catch (error: any) {
      console.error('Error exchanging OAuth code:', error);
      res.redirect('/?error=oauth_failed');
    }
  });

  app.get('/api/auth/google/status', async (req, res) => {
    const auth = getClientFromReq(req);
    if (!auth) {
      return res.json({ authenticated: false, spreadsheetId: memoryStore.spreadsheetId || null });
    }
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const userInfo = await oauth2.userinfo.get();
      return res.json({
        authenticated: true,
        email: userInfo.data.email,
        spreadsheetId: memoryStore.spreadsheetId || null
      });
    } catch (e) {
      return res.json({ authenticated: true, spreadsheetId: memoryStore.spreadsheetId || null });
    }
  });

  app.post('/api/auth/google/logout', (req, res) => {
    res.clearCookie('google_tokens');
    res.json({ success: true });
  });

  // --- GOOGLE SHEETS POS DATA ENDPOINTS ---

  // Initialize or Attach Google Spreadsheet
  app.post('/api/sheets/init', async (req, res) => {
    const customSpreadsheetId = req.body.spreadsheetId;
    const auth = getClientFromReq(req);

    if (!auth) {
      if (customSpreadsheetId) {
        memoryStore.spreadsheetId = customSpreadsheetId;
      }
      return res.json({
        success: false,
        authenticated: false,
        spreadsheetId: memoryStore.spreadsheetId || null,
        error: 'Google Account not authorized yet. Click "Authorize Google Account (OAuth)" in the Google Sheets panel to grant access.',
        fallback: 'Using memory store until Google Account is connected.'
      });
    }

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      let spreadsheetId = customSpreadsheetId || memoryStore.spreadsheetId;

      if (!spreadsheetId) {
        // Create new spreadsheet
        const createRes = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'THE PUFF COMPANY - POS & Inventory Database'
            },
            sheets: [
              { properties: { title: 'Menu' } },
              { properties: { title: 'Inventory' } },
              { properties: { title: 'Orders_Bills' } },
              { properties: { title: 'KOT_Status' } }
            ]
          }
        });
        spreadsheetId = createRes.data.spreadsheetId;
        memoryStore.spreadsheetId = spreadsheetId!;

        // Seed headers and initial data
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: spreadsheetId!,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: 'Menu!A1:I1',
                values: [['ID', 'Name', 'Category', 'Price', 'IsVeg', 'Description', 'IsAvailable', 'Image', 'RecipeJSON']]
              },
              {
                range: 'Inventory!A1:G1',
                values: [['ID', 'Name', 'Unit', 'CurrentStock', 'MinStockAlert', 'CostPerUnit', 'Category']]
              },
              {
                range: 'Orders_Bills!A1:O1',
                values: [['Order_ID', 'Token_No', 'Order_Type', 'Table_or_Name', 'Subtotal', 'GST_Amount', 'Discount', 'Total', 'Payment_Mode', 'Status', 'Customer_Notes', 'Staff_Name', 'Device_Type', 'Created_At', 'Items_JSON']]
              },
              {
                range: 'KOT_Status!A1:E1',
                values: [['Order_ID', 'Token_No', 'Table_or_Name', 'Status', 'Updated_At']]
              }
            ]
          }
        });

        // Seed initial menu rows
        const menuRows = INITIAL_MENU_ITEMS.map((item) => [
          item.id,
          item.name,
          item.category,
          item.price,
          item.isVeg ? 'TRUE' : 'FALSE',
          item.description,
          item.isAvailable ? 'TRUE' : 'FALSE',
          item.image,
          JSON.stringify(item.recipe || [])
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: spreadsheetId!,
          range: 'Menu!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: menuRows }
        });

        // Seed initial inventory rows
        const inventoryRows = INITIAL_INGREDIENTS.map((ing) => [
          ing.id,
          ing.name,
          ing.unit,
          ing.currentStock,
          ing.minStockAlert,
          ing.costPerUnit,
          ing.category
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: spreadsheetId!,
          range: 'Inventory!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: inventoryRows }
        });
      } else {
        memoryStore.spreadsheetId = spreadsheetId;
      }

      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      return res.json({
        success: true,
        authenticated: true,
        spreadsheetId,
        spreadsheetUrl,
        message: 'Successfully connected to Google Sheet!'
      });
    } catch (error: any) {
      console.error('Google Sheets Init Error:', error?.message || error);
      if (customSpreadsheetId) {
        memoryStore.spreadsheetId = customSpreadsheetId;
      }
      return res.json({
        success: false,
        spreadsheetId: memoryStore.spreadsheetId,
        error: error?.message || 'Failed to communicate with Google Sheets API.',
        fallback: 'Using memory store until Google Sheet credentials are confirmed.'
      });
    }
  });

  // GET Menu
  app.get('/api/sheets/menu', async (req, res) => {
    const spreadsheetId = req.query.spreadsheetId as string || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);
    if (!auth || !spreadsheetId) {
      return res.json({ menu: memoryStore.menu, source: 'memory' });
    }
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Menu!A2:I'
      });
      const rows = response.data.values || [];
      const menu = rows.map((row) => ({
        id: row[0] || 'p_' + Math.random().toString(36).substring(2, 7),
        name: row[1] || 'Item',
        category: row[2] || 'Puffs',
        price: parseFloat(row[3]) || 0,
        isVeg: row[4] === 'TRUE',
        description: row[5] || '',
        isAvailable: row[6] !== 'FALSE',
        image: row[7] || puffImg,
        recipe: row[8] ? JSON.parse(row[8]) : []
      }));
      memoryStore.menu = menu;
      return res.json({ menu, source: 'google_sheets' });
    } catch (e: any) {
      return res.json({ menu: memoryStore.menu, source: 'memory_fallback', error: e.message });
    }
  });

  // POST/PUT Menu Item
  app.post('/api/sheets/menu', async (req, res) => {
    const { item, action } = req.body;
    const spreadsheetId = req.body.spreadsheetId || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);

    if (action === 'add') {
      memoryStore.menu.push(item);
    } else if (action === 'update') {
      const idx = memoryStore.menu.findIndex((m) => m.id === item.id);
      if (idx !== -1) memoryStore.menu[idx] = { ...memoryStore.menu[idx], ...item };
    } else if (action === 'delete') {
      memoryStore.menu = memoryStore.menu.filter((m) => m.id !== item.id);
    }

    if (spreadsheetId && auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        if (action === 'add') {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Menu!A2',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                item.id,
                item.name,
                item.category,
                item.price,
                item.isVeg ? 'TRUE' : 'FALSE',
                item.description || '',
                item.isAvailable ? 'TRUE' : 'FALSE',
                item.image || puffImg,
                JSON.stringify(item.recipe || [])
              ]]
            }
          });
        }
      } catch (e) {
        console.error('Error updating Google Sheets Menu:', e);
      }
    }
    return res.json({ success: true, menu: memoryStore.menu });
  });

  // GET Inventory
  app.get('/api/sheets/inventory', async (req, res) => {
    const spreadsheetId = req.query.spreadsheetId as string || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);
    if (!auth || !spreadsheetId) {
      return res.json({ inventory: memoryStore.inventory, source: 'memory' });
    }
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Inventory!A2:G'
      });
      const rows = response.data.values || [];
      const inventory = rows.map((row) => ({
        id: row[0] || 'ing_' + Math.random().toString(36).substring(2, 7),
        name: row[1] || 'Material',
        unit: row[2] || 'grams',
        currentStock: parseFloat(row[3]) || 0,
        minStockAlert: parseFloat(row[4]) || 50,
        costPerUnit: parseFloat(row[5]) || 0.1,
        category: row[6] || 'Raw Materials'
      }));
      memoryStore.inventory = inventory;
      return res.json({ inventory, source: 'google_sheets' });
    } catch (e: any) {
      return res.json({ inventory: memoryStore.inventory, source: 'memory_fallback', error: e.message });
    }
  });

  // POST/PUT/DELETE Inventory Item
  app.post('/api/sheets/inventory', async (req, res) => {
    const { item, action } = req.body;
    const spreadsheetId = req.body.spreadsheetId || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);

    if (item) {
      if (action === 'add') {
        const existingIdx = memoryStore.inventory.findIndex((ing) => ing.id === item.id);
        if (existingIdx !== -1) {
          memoryStore.inventory[existingIdx] = item;
        } else {
          memoryStore.inventory.push(item);
        }
      } else if (action === 'update') {
        const idx = memoryStore.inventory.findIndex((ing) => ing.id === item.id);
        if (idx !== -1) {
          memoryStore.inventory[idx] = { ...memoryStore.inventory[idx], ...item };
        } else {
          memoryStore.inventory.push(item);
        }
      } else if (action === 'delete') {
        memoryStore.inventory = memoryStore.inventory.filter((ing) => ing.id !== item.id);
      }
    }

    if (spreadsheetId && auth && item) {
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        if (action === 'add') {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Inventory!A2',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                item.id,
                item.name,
                item.unit || 'grams',
                item.currentStock || 0,
                item.minStockAlert || 50,
                item.costPerUnit || 0.1,
                item.category || 'Raw Materials'
              ]]
            }
          });
        }
      } catch (e) {
        console.error('Error updating Google Sheets Inventory:', e);
      }
    }
    return res.json({ success: true, inventory: memoryStore.inventory });
  });

  // GET Orders (Bills & KOTs)
  app.get('/api/sheets/orders', async (req, res) => {
    const spreadsheetId = req.query.spreadsheetId as string || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);
    if (!auth || !spreadsheetId) {
      return res.json({ orders: memoryStore.orders, source: 'memory' });
    }
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Orders_Bills!A2:O'
      });
      const rows = response.data.values || [];
      const orders = rows.map((row) => ({
        id: row[0],
        tokenNo: parseInt(row[1], 10) || 101,
        orderType: row[2],
        tableOrName: row[3],
        subtotal: parseFloat(row[4]) || 0,
        gstAmount: parseFloat(row[5]) || 0,
        discount: parseFloat(row[6]) || 0,
        total: parseFloat(row[7]) || 0,
        paymentMode: row[8],
        status: row[9],
        customerNotes: row[10] || '',
        staffName: row[11] || 'POS Staff',
        deviceType: row[12] || 'mobile',
        createdAt: row[13] || new Date().toISOString(),
        items: row[14] ? JSON.parse(row[14]) : []
      }));
      memoryStore.orders = orders;
      return res.json({ orders, source: 'google_sheets' });
    } catch (e: any) {
      return res.json({ orders: memoryStore.orders, source: 'memory_fallback', error: e.message });
    }
  });

  // POST Order (Write Bill & KOT to Google Sheets)
  app.post('/api/sheets/orders', async (req, res) => {
    const { order } = req.body;
    const spreadsheetId = req.body.spreadsheetId || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);

    memoryStore.orders.unshift(order);

    if (spreadsheetId && auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        
        // Append to Orders_Bills Sheet
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Orders_Bills!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              order.id,
              order.tokenNo,
              order.orderType,
              order.tableOrName || (order.customerName ? (order.customerMobile ? `${order.customerName} (${order.customerMobile})` : order.customerName) : (order.customerMobile || 'Counter Order')),
              order.subtotal,
              order.gstAmount,
              order.discount,
              order.total,
              order.paymentMode,
              order.status,
              order.customerNotes || '',
              order.staffName || '',
              order.deviceType || 'mobile',
              order.createdAt,
              JSON.stringify(order.items || [])
            ]]
          }
        });

        // Append to KOT_Status Sheet
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'KOT_Status!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              order.id,
              order.tokenNo,
              order.tableOrName,
              order.status,
              new Date().toISOString()
            ]]
          }
        });
      } catch (e) {
        console.error('Error appending Order to Google Sheets:', e);
      }
    }

    return res.json({ success: true, order });
  });

  // PUT Order Status (Update KOT status in Google Sheets)
  app.put('/api/sheets/orders/status', async (req, res) => {
    const { orderId, status } = req.body;
    const spreadsheetId = req.body.spreadsheetId || memoryStore.spreadsheetId;
    const auth = getClientFromReq(req);

    const idx = memoryStore.orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      memoryStore.orders[idx].status = status;
    }

    if (spreadsheetId && auth) {
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'KOT_Status!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              orderId,
              memoryStore.orders[idx]?.tokenNo || '',
              memoryStore.orders[idx]?.tableOrName || '',
              status,
              new Date().toISOString()
            ]]
          }
        });
      } catch (e) {
        console.error('Error updating status in Google Sheets:', e);
      }
    }

    return res.json({ success: true, orderId, status });
  });

  // --- VITE MIDDLEWARE / SERVE DIST ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
