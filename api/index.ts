import express from 'express';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';

// Default seeding data for fresh setups
const INITIAL_CATEGORIES = [
  { id: 'cat_01', name: 'Classic & Single Flavor Puffs', sortOrder: 1, isActive: true },
  { id: 'cat_02', name: 'Flavored Combo Puffs', sortOrder: 2, isActive: true },
  { id: 'cat_03', name: 'Chatni, Tandoori & Loaded Puffs', sortOrder: 3, isActive: true },
  { id: 'cat_04', name: 'Supreme Garlic & Double Cheese Puffs', sortOrder: 4, isActive: true },
  { id: 'cat_05', name: 'Company Signature Specials', sortOrder: 5, isActive: true }
];

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

// Ephemeral in-memory fallback cache (NO local disk file dependencies)
const memoryStore = {
  menu: [...INITIAL_MENU_ITEMS],
  categories: [...INITIAL_CATEGORIES],
  inventory: [...INITIAL_INGREDIENTS],
  orders: [] as any[],
  customers: {} as Record<string, any>,
  settings: null as any,
  spreadsheetId: process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || ''
};

// Sheet configuration contracts
const SHEET_NAMES = {
  ORDERS: 'Orders_Bills',
  KOT: 'KOT_Status',
  MENU: 'Menu_Items',
  CATEGORIES: 'Categories',
  INVENTORY: 'Inventory',
  CUSTOMERS: 'Customers',
  SETTINGS: 'Settings_Config',
};

// Initialize Express App
export const app = express();

// Resilient body parsing (supports both local Express and Vercel pre-parsed bodies)
app.use((req, res, next) => {
  if (req.body !== undefined && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, (err) => {
    if (err) {
      console.warn('Body parser non-fatal warning:', err.message);
      return next();
    }
    next();
  });
});
app.use(cookieParser());

// Normalize URL across all Vercel serverless rewrites and subpath prefixes
app.use((req, res, next) => {
  const incoming = req.originalUrl || req.url;

  // In local development / container preview, non-API requests must pass straight to Vite / static files
  const isApi = incoming.startsWith('/api') || 
                incoming.startsWith('/TPC-The-Puff-Company/api') ||
                Boolean(process.env.VERCEL || process.env.NOW_REGION);

  if (!isApi) {
    return next();
  }

  let clean = incoming.replace(/^\/TPC-The-Puff-Company/, '');
  if ((clean === '/' || clean === '/api' || clean === '') && req.originalUrl && req.originalUrl !== '/' && req.originalUrl !== '/api') {
    clean = req.originalUrl.replace(/^\/TPC-The-Puff-Company/, '');
  }

  if (!clean.startsWith('/api')) {
    clean = '/api' + (clean.startsWith('/') ? clean : '/' + clean);
  }

  req.url = clean;
  next();
});

// Helper to extract spreadsheet ID from URL or raw string
function cleanSpreadsheetId(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  const match = cleaned.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return cleaned;
}

// Helper to sanitize Google Service Account private keys across all deployment formats
function cleanPrivateKey(key: string): string {
  let cleaned = (key || '').trim();
  // Handle case where user pasted the entire JSON credentials file into the private key variable
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.private_key) {
        cleaned = parsed.private_key;
      }
    } catch {
      // not JSON
    }
  }
  // Handle base64 encoded private keys (common deployment pattern for multi-line env vars)
  if (!cleaned.includes('BEGIN') && cleaned.length > 500) {
    try {
      const decoded = Buffer.from(cleaned, 'base64').toString('utf8');
      if (decoded.includes('BEGIN PRIVATE KEY') || decoded.includes('BEGIN RSA PRIVATE KEY')) {
        cleaned = decoded;
      }
    } catch {
      // not base64
    }
  }
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// Helper to sanitize Google Service Account emails
function cleanServiceAccountEmail(email: string): string {
  let cleaned = (email || '').trim();
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.client_email) {
        return parsed.client_email;
      }
    } catch {
      // not JSON
    }
  }
  return cleaned.replace(/^["']|["']$/g, '').trim();
}

// API Health & Status Check
app.get(['/api/health', '/api/status', '/health', '/status'], (req, res) => {
  const saEmail = cleanServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || '');
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_KEY || '';
  const cleanedKey = cleanPrivateKey(rawKey);
  const rawSheetId = process.env.SPREADSHEET_ID || memoryStore.spreadsheetId || '';
  const cleanedSheetId = cleanSpreadsheetId(rawSheetId);

  const keyHasPemHeader = cleanedKey.includes('-----BEGIN PRIVATE KEY-----') || cleanedKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  const keyHasPemFooter = cleanedKey.includes('-----END PRIVATE KEY-----') || cleanedKey.includes('-----END RSA PRIVATE KEY-----');

  res.json({
    status: 'ok',
    serviceAccountConfigured: Boolean(saEmail && rawKey),
    serviceAccountEmail: saEmail || null,
    spreadsheetId: cleanedSheetId || null,
    keyFormattedCorrectly: Boolean(keyHasPemHeader && keyHasPemFooter),
    timestamp: new Date().toISOString()
  });
});

// Dedicated Diagnostics Endpoint for debugging Google Cloud & Sheets integration
app.get('/api/sheets/diagnostics', async (req, res) => {
  const results: any = {
    step1_env_variables: { status: 'pending' },
    step2_private_key_format: { status: 'pending' },
    step3_token_exchange: { status: 'pending' },
    step4_sheet_api_call: { status: 'pending' },
    overall_status: 'unknown'
  };

  const saEmail = cleanServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || '');
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_KEY || '';
  const cleanedKey = cleanPrivateKey(rawKey);
  const spreadsheetId = resolveSpreadsheetId(req);

  // Step 1: Check presence of environment variables
  results.step1_env_variables = {
    status: saEmail && rawKey ? 'passed' : 'failed',
    serviceAccountEmail: saEmail || 'MISSING (GOOGLE_SERVICE_ACCOUNT_EMAIL)',
    privateKeyPresent: Boolean(rawKey),
    spreadsheetId: spreadsheetId || 'MISSING (SPREADSHEET_ID)'
  };

  if (!saEmail || !rawKey) {
    results.overall_status = 'failed';
    results.error_summary = 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in Vercel Environment Variables. Remember to redeploy in Vercel after adding variables.';
    return res.status(500).json(results);
  }

  // Step 2: Validate Private Key format
  const hasHeader = cleanedKey.includes('-----BEGIN PRIVATE KEY-----') || cleanedKey.includes('-----BEGIN RSA PRIVATE KEY-----');
  const hasFooter = cleanedKey.includes('-----END PRIVATE KEY-----') || cleanedKey.includes('-----END RSA PRIVATE KEY-----');
  const lineCount = cleanedKey.split('\n').length;

  results.step2_private_key_format = {
    status: hasHeader && hasFooter && lineCount > 3 ? 'passed' : 'failed',
    hasPemHeader: hasHeader,
    hasPemFooter: hasFooter,
    totalLines: lineCount
  };

  if (!hasHeader || !hasFooter) {
    results.overall_status = 'failed';
    results.error_summary = 'GOOGLE_PRIVATE_KEY does not contain valid PEM delimiters (-----BEGIN PRIVATE KEY-----). Check for extra quotes or escaped newlines.';
    return res.status(500).json(results);
  }

  // Step 3: Test JWT Token Acquisition from Google OAuth servers
  try {
    const auth = new google.auth.JWT({
      email: saEmail,
      key: cleanedKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
    const token = await auth.getAccessToken();
    results.step3_token_exchange = {
      status: token?.token ? 'passed' : 'failed',
      tokenAcquired: Boolean(token?.token)
    };
  } catch (tokenErr: any) {
    results.step3_token_exchange = {
      status: 'failed',
      error: tokenErr?.message || String(tokenErr)
    };
    results.overall_status = 'failed';
    results.error_summary = `Google authentication failed: ${tokenErr?.message}. Ensure the Service Account exists and private key matches.`;
    return res.status(500).json(results);
  }

  // Step 4: Test Google Sheets API Call
  if (!spreadsheetId) {
    results.step4_sheet_api_call = {
      status: 'skipped',
      message: 'No SPREADSHEET_ID provided to test access.'
    };
    results.overall_status = 'partial_success';
    results.message = 'Service Account authentication passed, but no SPREADSHEET_ID is configured.';
    return res.json(results);
  }

  try {
    const auth = new google.auth.JWT({
      email: saEmail,
      key: cleanedKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = (meta.data.sheets || []).map((s: any) => s.properties?.title);

    results.step4_sheet_api_call = {
      status: 'passed',
      spreadsheetTitle: meta.data.properties?.title,
      sheetsFound: sheetTitles
    };
    results.overall_status = 'success';
    results.message = 'All 4 diagnostics steps PASSED! POS is successfully connected to Google Sheets.';
    return res.json(results);
  } catch (sheetErr: any) {
    const msg = sheetErr?.message || String(sheetErr);
    results.step4_sheet_api_call = {
      status: 'failed',
      code: sheetErr?.code || sheetErr?.status || 500,
      error: msg
    };
    results.overall_status = 'failed';

    if (msg.includes('Google Sheets API has not been used in project') || msg.includes('disabled')) {
      results.error_summary = 'CRITICAL: Google Sheets API is not enabled in your Google Cloud Project. Go to Google Cloud Console > APIs & Services > Library > search "Google Sheets API" and click ENABLE.';
    } else if (sheetErr?.code === 403 || sheetErr?.status === 403 || msg.includes('caller does not have permission')) {
      results.error_summary = `PERMISSION ERROR (403): The Google Sheet is not shared with '${saEmail}'. Open the sheet in your browser, click 'Share', add '${saEmail}' as an 'Editor', and uncheck notify if desired.`;
    } else if (sheetErr?.code === 404 || sheetErr?.status === 404) {
      results.error_summary = `NOT FOUND (404): Spreadsheet ID '${spreadsheetId}' was not found. Please verify the ID or ensure the sheet is shared with '${saEmail}'.`;
    } else {
      results.error_summary = `Google Sheets API call failed: ${msg}`;
    }

    return res.status(500).json(results);
  }
});

// --- GOOGLE AUTHENTICATION HELPERS ---
function getGoogleAuthClient(req?: express.Request): any {
  try {
    // 1. Google Service Account (Recommended for 24/7 Cloud Sync, no user OAuth needed)
    const saEmail = cleanServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || '');
    const rawKey = process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_KEY || '';
    if (saEmail && rawKey) {
      const saKey = cleanPrivateKey(rawKey);
      return new google.auth.JWT({
        email: saEmail,
        key: saKey,
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file'
        ]
      });
    }

    // 2. OAuth Refresh Token via Environment
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    if (refreshToken && clientId && clientSecret) {
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oAuth2Client.setCredentials({ refresh_token: refreshToken });
      return oAuth2Client;
    }

    // 3. User OAuth via Cookie or Authorization Header (Fallback)
    if (req) {
      const tokensCookie = req.cookies?.google_tokens;
      let tokens = null;
      if (tokensCookie) {
        try {
          tokens = typeof tokensCookie === 'string' ? JSON.parse(tokensCookie) : tokensCookie;
        } catch {
          tokens = null;
        }
      }

      if (tokens && (tokens.access_token || tokens.refresh_token)) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const redirectUri = `${appUrl}/api/auth/google/callback`;
        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oAuth2Client.setCredentials(tokens);
        return oAuth2Client;
      }
    }
  } catch (err: any) {
    console.error('Error creating Google Auth client:', err?.message || err);
    return null;
  }

  return null;
}

function resolveSpreadsheetId(req?: express.Request): string {
  const queryId = req?.query?.spreadsheetId as string;
  const bodyId = req?.body?.spreadsheetId as string;
  const envId = process.env.SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const raw = queryId || bodyId || memoryStore.spreadsheetId || envId || '';
  const cleaned = cleanSpreadsheetId(raw);
  if (cleaned && !memoryStore.spreadsheetId) {
    memoryStore.spreadsheetId = cleaned;
  }
  return cleaned;
}

// Ensure all 7 tabs exist in Google Spreadsheet
async function ensureSpreadsheetStructure(sheets: any, spreadsheetId: string) {
  const saEmail = cleanServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || 'your service account email');
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = new Set((meta.data.sheets || []).map((s: any) => s.properties?.title));

    const sheetsToAdd: any[] = [];
    Object.values(SHEET_NAMES).forEach((sheetName) => {
      if (!existingSheets.has(sheetName)) {
        sheetsToAdd.push({ addSheet: { properties: { title: sheetName } } });
      }
    });

    if (sheetsToAdd.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: sheetsToAdd }
      });
    }

    // Set initial headers for all sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${SHEET_NAMES.MENU}!A1:I1`,
            values: [['ID', 'Name', 'Category', 'Price', 'IsVeg', 'Description', 'IsAvailable', 'Image', 'RecipeJSON']]
          },
          {
            range: `${SHEET_NAMES.CATEGORIES}!A1:D1`,
            values: [['ID', 'Name', 'Sort_Order', 'Is_Active']]
          },
          {
            range: `${SHEET_NAMES.INVENTORY}!A1:G1`,
            values: [['ID', 'Name', 'Unit', 'CurrentStock', 'MinStockAlert', 'CostPerUnit', 'Category']]
          },
          {
            range: `${SHEET_NAMES.ORDERS}!A1:R1`,
            values: [['Order_ID', 'Invoice_No', 'Token_No', 'Order_Type', 'Customer_Name', 'Customer_Mobile', 'Subtotal', 'GST_Amount', 'Discount', 'Total', 'Payment_Mode', 'Status', 'Customer_Notes', 'Staff_Name', 'Device_Type', 'Created_At', 'Cancelled_At', 'Items_JSON']]
          },
          {
            range: `${SHEET_NAMES.KOT}!A1:H1`,
            values: [['Order_ID', 'Token_No', 'Order_Type', 'Table_or_Name', 'Customer_Name', 'Status', 'Items_Summary', 'Updated_At']]
          },
          {
            range: `${SHEET_NAMES.CUSTOMERS}!A1:G1`,
            values: [['Mobile', 'Name', 'Total_Orders', 'Total_Spent', 'Last_Visit', 'First_Visit', 'Notes']]
          },
          {
            range: `${SHEET_NAMES.SETTINGS}!A1:C1`,
            values: [['Key', 'Value', 'Updated_At']]
          }
        ]
      }
    });

    return true;
  } catch (err: any) {
    const rawMsg = err?.message || '';
    if (rawMsg.includes('Google Sheets API has not been used in project') || rawMsg.includes('disabled') || rawMsg.includes('has not been enabled')) {
      throw new Error(`Google Sheets API is DISABLED in your Google Cloud Project. Please visit Google Cloud Console > APIs & Services > Library, search for "Google Sheets API", and click "ENABLE".`);
    }
    if (err?.code === 403 || err?.status === 403 || rawMsg.includes('caller does not have permission')) {
      throw new Error(`Permission denied (403): The Service Account does not have Editor access to this Google Sheet. Please open your Google Sheet in a browser, click 'Share', and invite '${saEmail}' as an 'Editor'. (Detail: ${rawMsg})`);
    }
    if (err?.code === 404 || err?.status === 404) {
      throw new Error(`Spreadsheet not found (404): Please check your SPREADSHEET_ID ('${spreadsheetId}') and ensure the spreadsheet is shared with '${saEmail}'.`);
    }
    console.error('Error ensuring spreadsheet structure:', rawMsg || err);
    throw err;
  }
}

// --- AUTH & STATUS ENDPOINTS ---

app.get('/api/auth/google', (req, res) => {
  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(400).json({ error: 'OAuth Client ID not configured. Use Service Account or set CLIENT_ID.' });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
    const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 24 * 60 * 60 * 1000 // 60 days
    });
    res.redirect('/?oauth_success=1');
  } catch (error: any) {
    console.error('Error exchanging OAuth code:', error);
    res.redirect('/?error=oauth_failed');
  }
});

app.get('/api/auth/google/status', async (req, res) => {
  const hasServiceAccount = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (hasServiceAccount) {
    return res.json({
      authenticated: true,
      mode: 'service_account',
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      spreadsheetId: spreadsheetId || null,
      spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null
    });
  }

  if (!auth) {
    return res.json({
      authenticated: false,
      mode: 'unauthenticated',
      spreadsheetId: spreadsheetId || null
    });
  }

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth });
    const userInfo = await oauth2.userinfo.get();
    return res.json({
      authenticated: true,
      mode: 'oauth_user',
      email: userInfo.data.email,
      spreadsheetId: spreadsheetId || null,
      spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null
    });
  } catch (e) {
    return res.json({
      authenticated: true,
      mode: 'authenticated',
      spreadsheetId: spreadsheetId || null,
      spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null
    });
  }
});

app.post('/api/auth/google/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

// --- GOOGLE SHEETS PRIMARY DATABASE APIS ---

// 1. Initialize or Connect Google Spreadsheet
app.post('/api/sheets/init', async (req, res) => {
  try {
    let spreadsheetId = resolveSpreadsheetId(req);
    const auth = getGoogleAuthClient(req);

    if (!auth) {
      const saEmail = cleanServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || '');
      const hasKey = Boolean(process.env.GOOGLE_PRIVATE_KEY || process.env.SERVICE_ACCOUNT_KEY);
      return res.status(400).json({
        success: false,
        authenticated: false,
        spreadsheetId: spreadsheetId || null,
        error: !saEmail && !hasKey
          ? 'Google Service Account credentials not found. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your Vercel Environment Variables.'
          : 'Invalid Google Service Account credentials. Please verify your GOOGLE_PRIVATE_KEY is formatted correctly starting with -----BEGIN PRIVATE KEY-----.'
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    if (!spreadsheetId) {
      // Create new master spreadsheet on Google Drive
      try {
        const createRes = await sheets.spreadsheets.create({
          requestBody: {
            properties: {
              title: 'THE PUFF COMPANY - POS Master Database (Cloud)'
            },
            sheets: Object.values(SHEET_NAMES).map((title) => ({ properties: { title } }))
          }
        });

        spreadsheetId = createRes.data.spreadsheetId!;
        memoryStore.spreadsheetId = spreadsheetId;
      } catch (createErr: any) {
        const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.SERVICE_ACCOUNT_EMAIL || 'your service account email';
        return res.status(400).json({
          success: false,
          error: `Service accounts cannot create files directly in personal Google Drives without domain delegation: ${createErr.message}. ` +
                 `Please create a blank Google Sheet in your Google Drive, click 'Share', add '${saEmail}' as 'Editor', and set SPREADSHEET_ID in your environment variables or paste its link into the Link Sheet field.`
        });
      }
    }

    memoryStore.spreadsheetId = spreadsheetId;
    await ensureSpreadsheetStructure(sheets, spreadsheetId);

    // Check if Menu_Items has data; if empty, seed default menu, categories, and inventory
    try {
      const menuCheck = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.MENU}!A2:B2`
      });
      const hasMenuData = menuCheck.data.values && menuCheck.data.values.length > 0;
      if (!hasMenuData) {
        // Seed initial menu
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
          spreadsheetId,
          range: `${SHEET_NAMES.MENU}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: menuRows }
        });

        // Seed initial categories
        const catRows = INITIAL_CATEGORIES.map((cat) => [
          cat.id,
          cat.name,
          cat.sortOrder,
          cat.isActive ? 'TRUE' : 'FALSE'
        ]);
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.CATEGORIES}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: catRows }
        });

        // Seed initial inventory
        const invRows = INITIAL_INGREDIENTS.map((ing) => [
          ing.id,
          ing.name,
          ing.unit,
          ing.currentStock,
          ing.minStockAlert,
          ing.costPerUnit,
          ing.category
        ]);
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.INVENTORY}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: invRows }
        });
      }
    } catch (seedErr) {
      console.warn('Notice while checking/seeding menu items in sheet:', seedErr);
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return res.json({
      success: true,
      authenticated: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Master Google Sheets database connected and synchronized successfully via Service Account.'
    });
  } catch (error: any) {
    console.error('Google Sheets Init Error:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to initialize Google Sheets database.'
    });
  }
});

// 2. UNIFIED HYDRATION ENDPOINT: Fetch All State from Google Sheets
app.get('/api/sheets/all', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({
      success: true,
      source: 'memory_cache',
      menu: memoryStore.menu,
      categories: memoryStore.categories,
      inventory: memoryStore.inventory,
      orders: memoryStore.orders,
      customers: memoryStore.customers,
      settings: memoryStore.settings,
      spreadsheetId: memoryStore.spreadsheetId || null
    });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });

    // Parallel fetch across all sheets
    const [menuRes, catRes, invRes, ordersRes, custRes, setRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.MENU}!A2:I` }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.CATEGORIES}!A2:D` }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.INVENTORY}!A2:G` }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.ORDERS}!A2:R` }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.CUSTOMERS}!A2:G` }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAMES.SETTINGS}!A2:C` }).catch(() => ({ data: { values: [] } }))
    ]);

    // Parse Menu
    const menu = (menuRes.data.values || []).map((row: any[]) => ({
      id: row[0] || 'p_' + Math.random().toString(36).substring(2, 7),
      name: row[1] || 'Item',
      category: row[2] || 'Classic & Single Flavor Puffs',
      price: parseFloat(row[3]) || 0,
      isVeg: row[4] !== 'FALSE',
      description: row[5] || '',
      isAvailable: row[6] !== 'FALSE',
      image: row[7] || puffImg,
      recipe: row[8] ? JSON.parse(row[8]) : []
    }));

    // Parse Categories
    const categories = (catRes.data.values || []).map((row: any[]) => ({
      id: row[0] || 'cat_' + Math.random().toString(36).substring(2, 7),
      name: row[1] || 'Category',
      sortOrder: parseInt(row[2], 10) || 1,
      isActive: row[3] !== 'FALSE'
    }));

    // Parse Inventory
    const inventory = (invRes.data.values || []).map((row: any[]) => ({
      id: row[0] || 'ing_' + Math.random().toString(36).substring(2, 7),
      name: row[1] || 'Material',
      unit: row[2] || 'grams',
      currentStock: parseFloat(row[3]) || 0,
      minStockAlert: parseFloat(row[4]) || 50,
      costPerUnit: parseFloat(row[5]) || 0.1,
      category: row[6] || 'Raw Materials'
    }));

    // Parse Orders
    const orders = (ordersRes.data.values || []).map((row: any[]) => ({
      id: row[0],
      invoiceNo: row[1] || undefined,
      tokenNo: parseInt(row[2], 10) || 101,
      orderType: row[3] || 'Dine In',
      customerName: row[4] || '',
      customerMobile: row[5] || '',
      subtotal: parseFloat(row[6]) || 0,
      gstAmount: parseFloat(row[7]) || 0,
      discount: parseFloat(row[8]) || 0,
      total: parseFloat(row[9]) || 0,
      paymentMode: row[10] || 'CASH',
      status: row[11] || 'COMPLETED',
      customerNotes: row[12] || '',
      staffName: row[13] || 'Cashier',
      deviceType: row[14] || 'mobile',
      createdAt: row[15] || new Date().toISOString(),
      cancelledAt: row[16] || undefined,
      items: row[17] ? JSON.parse(row[17]) : []
    })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Parse Customers
    const customersMap: Record<string, any> = {};
    (custRes.data.values || []).forEach((row: any[]) => {
      const mobile = (row[0] || '').trim();
      if (mobile) {
        customersMap[mobile] = {
          mobileNumber: mobile,
          customerName: row[1] || '',
          totalOrders: parseInt(row[2], 10) || 0,
          totalSpent: parseFloat(row[3]) || 0,
          lastVisit: row[4] || '',
          firstVisit: row[5] || '',
          notes: row[6] || ''
        };
      }
    });

    // Parse Settings
    let settings: any = null;
    (setRes.data.values || []).forEach((row: any[]) => {
      if (row[0] === 'APP_MASTER_SETTINGS' && row[1]) {
        try {
          settings = JSON.parse(row[1]);
        } catch (e) {
          // ignore
        }
      }
    });

    // Update in-memory cache
    if (menu.length > 0) memoryStore.menu = menu;
    if (categories.length > 0) memoryStore.categories = categories;
    if (inventory.length > 0) memoryStore.inventory = inventory;
    if (orders.length > 0) memoryStore.orders = orders;
    if (Object.keys(customersMap).length > 0) memoryStore.customers = customersMap;
    if (settings) memoryStore.settings = settings;

    return res.json({
      success: true,
      source: 'google_sheets_master',
      menu: memoryStore.menu,
      categories: memoryStore.categories,
      inventory: memoryStore.inventory,
      orders: memoryStore.orders,
      customers: memoryStore.customers,
      settings: memoryStore.settings,
      spreadsheetId
    });
  } catch (error: any) {
    console.error('Error fetching all sheets data:', error?.message || error);
    return res.json({
      success: true,
      source: 'memory_fallback',
      menu: memoryStore.menu,
      categories: memoryStore.categories,
      inventory: memoryStore.inventory,
      orders: memoryStore.orders,
      customers: memoryStore.customers,
      settings: memoryStore.settings,
      spreadsheetId: memoryStore.spreadsheetId || null,
      error: error?.message
    });
  }
});

// 3. ORDERS API (Bills & KOT)
app.get('/api/sheets/orders', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ orders: memoryStore.orders, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.ORDERS}!A2:R`
    });

    const rows = response.data.values || [];
    const orders = rows
      .filter((row) => row && row[0])
      .map((row) => {
        const rawStatus = (row[11] || 'PENDING').toString().trim().toUpperCase();
        const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'PENDING';
        return {
          id: row[0],
          invoiceNo: row[1] || undefined,
          tokenNo: parseInt(row[2], 10) || 101,
          orderType: row[3] || 'Dine In',
          customerName: row[4] || '',
          customerMobile: row[5] || '',
          subtotal: parseFloat(row[6]) || 0,
          gstAmount: parseFloat(row[7]) || 0,
          discount: parseFloat(row[8]) || 0,
          total: parseFloat(row[9]) || 0,
          paymentMode: row[10] || 'CASH',
          status,
          customerNotes: row[12] || '',
          staffName: row[13] || 'Cashier',
          deviceType: row[14] || 'mobile',
          createdAt: row[15] || new Date().toISOString(),
          cancelledAt: row[16] || undefined,
          items: row[17] ? JSON.parse(row[17]) : []
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    memoryStore.orders = orders;
    return res.json({ orders, source: 'google_sheets' });
  } catch (err: any) {
    return res.json({ orders: memoryStore.orders, source: 'memory_fallback', error: err?.message });
  }
});

// GET Active Kitchen KOTs
app.get('/api/sheets/kot', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  // Active status whitelist
  const ACTIVE_STATUSES = new Set(['PENDING', 'PREPARING', 'READY']);

  if (!auth || !spreadsheetId) {
    const activeMemory = memoryStore.orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    return res.json({ success: true, kot: activeMemory, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    // Prefer Orders sheet as source of truth for items & details
    const ordersRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.ORDERS}!A2:R`
    });

    const rows = ordersRes.data.values || [];
    const activeOrders = rows
      .filter((row) => row && row[0])
      .map((row) => {
        const rawStatus = (row[11] || 'PENDING').toString().trim().toUpperCase();
        return {
          id: row[0],
          invoiceNo: row[1] || undefined,
          tokenNo: parseInt(row[2], 10) || 101,
          orderType: row[3] || 'Dine In',
          customerName: row[4] || '',
          customerMobile: row[5] || '',
          subtotal: parseFloat(row[6]) || 0,
          gstAmount: parseFloat(row[7]) || 0,
          discount: parseFloat(row[8]) || 0,
          total: parseFloat(row[9]) || 0,
          paymentMode: row[10] || 'CASH',
          status: rawStatus,
          customerNotes: row[12] || '',
          staffName: row[13] || 'Cashier',
          deviceType: row[14] || 'mobile',
          createdAt: row[15] || new Date().toISOString(),
          cancelledAt: row[16] || undefined,
          items: row[17] ? JSON.parse(row[17]) : []
        };
      })
      .filter((o) => ACTIVE_STATUSES.has(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Deduplicate by Order ID
    const uniqueMap = new Map<string, any>();
    activeOrders.forEach((o) => {
      if (!uniqueMap.has(o.id)) {
        uniqueMap.set(o.id, o);
      }
    });

    return res.json({ success: true, kot: Array.from(uniqueMap.values()), source: 'google_sheets' });
  } catch (err: any) {
    const activeMemory = memoryStore.orders.filter((o) => ACTIVE_STATUSES.has(o.status));
    return res.json({ success: true, kot: activeMemory, source: 'memory_fallback', error: err?.message });
  }
});

app.post('/api/sheets/orders', async (req, res) => {
  const { order } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!order || !order.id) {
    return res.status(400).json({ error: 'Order data is required' });
  }

  // Prevent duplicate order in-memory
  const existingIdx = memoryStore.orders.findIndex((o) => o.id === order.id);
  if (existingIdx !== -1) {
    console.warn(`[Sync Warning] Duplicate order POST received for ID ${order.id}. Updating existing record.`);
    memoryStore.orders[existingIdx] = { ...memoryStore.orders[existingIdx], ...order };
  } else {
    memoryStore.orders.unshift(order);
  }

  // Auto-record customer in memory
  if (order.customerMobile) {
    const mob = order.customerMobile.trim();
    const current = memoryStore.customers[mob] || {
      mobileNumber: mob,
      customerName: order.customerName || '',
      totalOrders: 0,
      totalSpent: 0,
      firstVisit: order.createdAt,
      lastVisit: order.createdAt,
      notes: ''
    };
    current.customerName = order.customerName || current.customerName;
    current.totalOrders += 1;
    current.totalSpent += (order.total || 0);
    current.lastVisit = order.createdAt;
    memoryStore.customers[mob] = current;
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });

      // Format Items summary for quick visual scan in Sheets
      const itemsSummary = (order.items || [])
        .map((i: any) => `${i.quantity}x ${i.itemName}`)
        .join(', ');

      const orderRow = [
        order.id,
        order.invoiceNo || '',
        order.tokenNo,
        order.orderType,
        order.customerName || '',
        order.customerMobile || '',
        order.subtotal,
        order.gstAmount,
        order.discount || 0,
        order.total,
        order.paymentMode,
        order.status,
        order.customerNotes || '',
        order.staffName || '',
        order.deviceType || 'mobile',
        order.createdAt,
        order.cancelledAt || '',
        JSON.stringify(order.items || [])
      ];

      // 1. Check if Order already exists in Orders_Bills sheet (Idempotent upsert)
      const existingOrdersRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ORDERS}!A2:A`
      });
      const orderIds = (existingOrdersRes.data.values || []).map((r) => r[0]);
      const existingRowIndex = orderIds.indexOf(order.id);

      if (existingRowIndex !== -1) {
        // Update existing row
        const rowNum = existingRowIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.ORDERS}!A${rowNum}:R${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [orderRow] }
        });
        console.log(`[Google Sheets Sync] Updated existing Order ${order.id} at row ${rowNum} in Orders sheet.`);
      } else {
        // Append new Order to Orders_Bills sheet
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.ORDERS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [orderRow] }
        });
        console.log(`[Google Sheets Sync] Appended new Order ${order.id} to Orders sheet.`);
      }

      // 2. Manage KOT_Active sheet (Idempotent upsert)
      const existingKotRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.KOT}!A2:A`
      });
      const kotIds = (existingKotRes.data.values || []).map((r) => r[0]);
      const existingKotIndex = kotIds.indexOf(order.id);

      const kotRow = [
        order.id,
        order.tokenNo,
        order.orderType,
        order.tableOrName || '',
        order.customerName || '',
        order.status,
        itemsSummary,
        new Date().toISOString()
      ];

      if (existingKotIndex !== -1) {
        const kotRowNum = existingKotIndex + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.KOT}!A${kotRowNum}:H${kotRowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [kotRow] }
        });
        console.log(`[Google Sheets Sync] Updated existing KOT ${order.id} at row ${kotRowNum} in KOT_Active sheet.`);
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.KOT}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [kotRow] }
        });
        console.log(`[Google Sheets Sync] Appended new KOT ${order.id} to KOT_Active sheet.`);
      }

      // 3. Upsert Customer row in Customers sheet if phone provided
      if (order.customerMobile) {
        const cust = memoryStore.customers[order.customerMobile.trim()];
        if (cust) {
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${SHEET_NAMES.CUSTOMERS}!A2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                cust.mobileNumber,
                cust.customerName,
                cust.totalOrders,
                cust.totalSpent,
                cust.lastVisit,
                cust.firstVisit,
                cust.notes || ''
              ]]
            }
          });
        }
      }
    } catch (e) {
      console.error('Error writing Order to Google Sheets:', e);
    }
  }

  return res.json({ success: true, order });
});

// Update Order Status (Completion, Kitchen Status, Cancellation, Refund)
app.put('/api/sheets/orders/status', async (req, res) => {
  const { orderId, status, cancellationReason, cancelledBy } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  const idx = memoryStore.orders.findIndex((o) => o.id === orderId);
  const now = new Date().toISOString();
  if (idx !== -1) {
    memoryStore.orders[idx].status = status;
    if (cancellationReason) memoryStore.orders[idx].cancellationReason = cancellationReason;
    if (cancelledBy) memoryStore.orders[idx].cancelledBy = cancelledBy;
    if (status === 'CANCELLED' || status === 'REFUNDED') {
      memoryStore.orders[idx].cancelledAt = now;
    }
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });

      // 1. UPDATE ORDERS SHEET (Column L is Status, Column Q is Cancelled_At)
      const ordersRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ORDERS}!A2:A`
      });
      const orderIds = (ordersRes.data.values || []).map((r) => r[0]);
      const orderIndex = orderIds.indexOf(orderId);

      if (orderIndex !== -1) {
        const rowNum = orderIndex + 2;
        // Update Status in Column L
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.ORDERS}!L${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[status]] }
        });

        // If Cancelled or Refunded, update Cancelled_At in Column Q
        if (status === 'CANCELLED' || status === 'REFUNDED') {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAMES.ORDERS}!Q${rowNum}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[now]] }
          });
        }
        console.log(`[Google Sheets Sync] Order ${orderId} status successfully updated to '${status}' at row ${rowNum} in Orders sheet.`);
      } else {
        console.warn(`[Google Sheets Sync] Order ${orderId} not found in Orders sheet for status update.`);
      }

      // 2. UPDATE KOT_ACTIVE SHEET (Column F is Status, Column H is Updated_At)
      const kotRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.KOT}!A2:A`
      });
      const kotIds = (kotRes.data.values || []).map((r) => r[0]);
      
      // Find all rows matching orderId (in case duplicates were previously added)
      const matchingRowIndices: number[] = [];
      kotIds.forEach((id, idx) => {
        if (id === orderId) matchingRowIndices.push(idx + 2);
      });

      if (matchingRowIndices.length > 0) {
        for (const rowNum of matchingRowIndices) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEET_NAMES.KOT}!F${rowNum}:H${rowNum}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                status,
                `Status: ${status}${cancellationReason ? ` (${cancellationReason})` : ''}`,
                now
              ]]
            }
          });
        }
        console.log(`[Google Sheets Sync] KOT ${orderId} status successfully updated to '${status}' in KOT_Active sheet (rows: ${matchingRowIndices.join(', ')}).`);
      } else if (status === 'PENDING' || status === 'PREPARING' || status === 'READY') {
        // If not present and active, append it
        const currentOrder = memoryStore.orders[idx];
        const itemsSummary = (currentOrder?.items || []).map((i: any) => `${i.quantity}x ${i.itemName}`).join(', ');
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.KOT}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              orderId,
              currentOrder?.tokenNo || '',
              currentOrder?.orderType || '',
              currentOrder?.tableOrName || '',
              currentOrder?.customerName || '',
              status,
              itemsSummary || `Status: ${status}`,
              now
            ]]
          }
        });
        console.log(`[Google Sheets Sync] Appended active KOT ${orderId} (${status}) to KOT_Active sheet.`);
      }
    } catch (e: any) {
      console.error('Error recording status update in Google Sheets:', e?.message || e);
    }
  }

  return res.json({ success: true, orderId, status });
});

// 4. CUSTOMERS API
app.get('/api/sheets/customers', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ customers: memoryStore.customers, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.CUSTOMERS}!A2:G`
    });

    const rows = response.data.values || [];
    const customersMap: Record<string, any> = {};
    rows.forEach((row) => {
      const mobile = (row[0] || '').trim();
      if (mobile) {
        customersMap[mobile] = {
          mobileNumber: mobile,
          customerName: row[1] || '',
          totalOrders: parseInt(row[2], 10) || 0,
          totalSpent: parseFloat(row[3]) || 0,
          lastVisit: row[4] || '',
          firstVisit: row[5] || '',
          notes: row[6] || ''
        };
      }
    });

    memoryStore.customers = customersMap;
    return res.json({ customers: customersMap, source: 'google_sheets' });
  } catch (err: any) {
    return res.json({ customers: memoryStore.customers, source: 'memory_fallback', error: err?.message });
  }
});

app.post('/api/sheets/customers', async (req, res) => {
  const { customer, customers } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (customers && typeof customers === 'object') {
    memoryStore.customers = { ...memoryStore.customers, ...customers };
  } else if (customer && customer.mobileNumber) {
    memoryStore.customers[customer.mobileNumber.trim()] = customer;
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const targetCustomer = customer || (customers ? Object.values(customers)[0] : null);
      if (targetCustomer && targetCustomer.mobileNumber) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${SHEET_NAMES.CUSTOMERS}!A2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              targetCustomer.mobileNumber,
              targetCustomer.customerName || '',
              targetCustomer.totalOrders || 1,
              targetCustomer.totalSpent || 0,
              targetCustomer.lastVisit || new Date().toISOString(),
              targetCustomer.firstVisit || new Date().toISOString(),
              targetCustomer.notes || ''
            ]]
          }
        });
      }
    } catch (e) {
      console.error('Error saving Customer to Google Sheets:', e);
    }
  }

  return res.json({ success: true, customers: memoryStore.customers });
});

// 5. INVENTORY API
app.get('/api/sheets/inventory', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ inventory: memoryStore.inventory, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.INVENTORY}!A2:G`
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

    if (inventory.length > 0) memoryStore.inventory = inventory;
    return res.json({ inventory: memoryStore.inventory, source: 'google_sheets' });
  } catch (e: any) {
    return res.json({ inventory: memoryStore.inventory, source: 'memory_fallback', error: e?.message });
  }
});

app.post('/api/sheets/inventory', async (req, res) => {
  const { item, inventory, action } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (Array.isArray(inventory) && inventory.length > 0) {
    memoryStore.inventory = inventory;
  } else if (item) {
    if (action === 'delete') {
      memoryStore.inventory = memoryStore.inventory.filter((ing) => ing.id !== item.id);
    } else {
      const idx = memoryStore.inventory.findIndex((ing) => ing.id === item.id);
      if (idx !== -1) {
        memoryStore.inventory[idx] = { ...memoryStore.inventory[idx], ...item };
      } else {
        memoryStore.inventory.push(item);
      }
    }
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      // Overwrite full inventory tab for total synchronization
      const rows = memoryStore.inventory.map((ing) => [
        ing.id,
        ing.name,
        ing.unit,
        ing.currentStock,
        ing.minStockAlert,
        ing.costPerUnit,
        ing.category
      ]);
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAMES.INVENTORY}!A2:G` });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.INVENTORY}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
    } catch (e) {
      console.error('Error updating Google Sheets Inventory:', e);
    }
  }

  return res.json({ success: true, inventory: memoryStore.inventory });
});

// 6. CATEGORIES API
app.get('/api/sheets/categories', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ categories: memoryStore.categories, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.CATEGORIES}!A2:D`
    });

    const rows = response.data.values || [];
    const categories = rows.map((row) => ({
      id: row[0] || 'cat_' + Math.random().toString(36).substring(2, 7),
      name: row[1] || 'Category',
      sortOrder: parseInt(row[2], 10) || 1,
      isActive: row[3] !== 'FALSE'
    }));

    if (categories.length > 0) memoryStore.categories = categories;
    return res.json({ categories: memoryStore.categories, source: 'google_sheets' });
  } catch (e: any) {
    return res.json({ categories: memoryStore.categories, source: 'memory_fallback', error: e?.message });
  }
});

app.post('/api/sheets/categories', async (req, res) => {
  const { categories, category, action } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (Array.isArray(categories)) {
    memoryStore.categories = categories;
  } else if (category) {
    if (action === 'delete') {
      memoryStore.categories = memoryStore.categories.filter((c) => c.id !== category.id && c.name !== category.name);
    } else {
      const idx = memoryStore.categories.findIndex((c) => c.id === category.id || c.name === category.name);
      if (idx !== -1) {
        memoryStore.categories[idx] = { ...memoryStore.categories[idx], ...category };
      } else {
        memoryStore.categories.push(category);
      }
    }
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const rows = memoryStore.categories.map((c) => [
        c.id,
        c.name,
        c.sortOrder || 1,
        c.isActive ? 'TRUE' : 'FALSE'
      ]);
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAMES.CATEGORIES}!A2:D` });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.CATEGORIES}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
    } catch (e) {
      console.error('Error saving categories to Google Sheets:', e);
    }
  }

  return res.json({ success: true, categories: memoryStore.categories });
});

// 7. MENU ITEMS API
app.get('/api/sheets/menu', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ menu: memoryStore.menu, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.MENU}!A2:I`
    });

    const rows = response.data.values || [];
    const menu = rows.map((row) => ({
      id: row[0] || 'p_' + Math.random().toString(36).substring(2, 7),
      name: row[1] || 'Item',
      category: row[2] || 'Classic & Single Flavor Puffs',
      price: parseFloat(row[3]) || 0,
      isVeg: row[4] !== 'FALSE',
      description: row[5] || '',
      isAvailable: row[6] !== 'FALSE',
      image: row[7] || puffImg,
      recipe: row[8] ? JSON.parse(row[8]) : []
    }));

    if (menu.length > 0) memoryStore.menu = menu;
    return res.json({ menu: memoryStore.menu, source: 'google_sheets' });
  } catch (e: any) {
    return res.json({ menu: memoryStore.menu, source: 'memory_fallback', error: e?.message });
  }
});

app.post('/api/sheets/menu', async (req, res) => {
  const { item, menu, action } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (Array.isArray(menu)) {
    memoryStore.menu = menu;
  } else if (item) {
    if (action === 'delete') {
      memoryStore.menu = memoryStore.menu.filter((m) => m.id !== item.id);
    } else {
      const idx = memoryStore.menu.findIndex((m) => m.id === item.id);
      if (idx !== -1) {
        memoryStore.menu[idx] = { ...memoryStore.menu[idx], ...item };
      } else {
        memoryStore.menu.push(item);
      }
    }
  }

  if (spreadsheetId && auth) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const rows = memoryStore.menu.map((m) => [
        m.id,
        m.name,
        m.category,
        m.price,
        m.isVeg ? 'TRUE' : 'FALSE',
        m.description || '',
        m.isAvailable ? 'TRUE' : 'FALSE',
        m.image || puffImg,
        JSON.stringify(m.recipe || [])
      ]);
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAMES.MENU}!A2:I` });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAMES.MENU}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
    } catch (e) {
      console.error('Error saving Menu to Google Sheets:', e);
    }
  }

  return res.json({ success: true, menu: memoryStore.menu });
});

// 8. SETTINGS CONFIG API
app.get('/api/sheets/settings', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (!auth || !spreadsheetId) {
    return res.json({ settings: memoryStore.settings, source: 'memory_cache' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.SETTINGS}!A2:C`
    });

    const rows = response.data.values || [];
    let settings: any = null;
    rows.forEach((row) => {
      if (row[0] === 'APP_MASTER_SETTINGS' && row[1]) {
        try { settings = JSON.parse(row[1]); } catch (e) {}
      }
    });

    if (settings) memoryStore.settings = settings;
    return res.json({ settings: memoryStore.settings, source: 'google_sheets' });
  } catch (e: any) {
    return res.json({ settings: memoryStore.settings, source: 'memory_fallback', error: e?.message });
  }
});

app.post('/api/sheets/settings', async (req, res) => {
  const { settings } = req.body;
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);

  if (settings) {
    memoryStore.settings = settings;
  }

  if (spreadsheetId && auth && settings) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${SHEET_NAMES.SETTINGS}!A2:C` });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${SHEET_NAMES.SETTINGS}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'APP_MASTER_SETTINGS',
            JSON.stringify(settings),
            new Date().toISOString()
          ]]
        }
      });
    } catch (e) {
      console.error('Error saving settings to Google Sheets:', e);
    }
  }

  return res.json({ success: true, settings: memoryStore.settings });
});

// 9. REPORTS & ANALYTICS API (Aggregated directly from Google Sheets Orders Ledger)
app.get('/api/sheets/reports', async (req, res) => {
  const spreadsheetId = resolveSpreadsheetId(req);
  const auth = getGoogleAuthClient(req);
  const targetDate = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  let ordersList = memoryStore.orders;

  if (auth && spreadsheetId) {
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEET_NAMES.ORDERS}!A2:R`
      });
      const rows = response.data.values || [];
      ordersList = rows.map((row) => ({
        id: row[0],
        invoiceNo: row[1],
        tokenNo: parseInt(row[2], 10) || 101,
        orderType: row[3],
        customerName: row[4],
        customerMobile: row[5],
        subtotal: parseFloat(row[6]) || 0,
        gstAmount: parseFloat(row[7]) || 0,
        discount: parseFloat(row[8]) || 0,
        total: parseFloat(row[9]) || 0,
        paymentMode: row[10] || 'CASH',
        status: row[11] || 'COMPLETED',
        createdAt: row[15] || new Date().toISOString(),
        items: row[17] ? JSON.parse(row[17]) : []
      }));
      memoryStore.orders = ordersList;
    } catch (e) {
      console.warn('Calculating reports using cached orders:', e);
    }
  }

  // Filter for Target Date
  const dayOrders = ordersList.filter((o: any) => (o.createdAt || '').slice(0, 10) === targetDate);
  const validOrders = dayOrders.filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
  const cancelledOrders = dayOrders.filter((o: any) => o.status === 'CANCELLED' || o.status === 'REFUNDED');

  const totalRevenue = validOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const totalSubtotal = validOrders.reduce((sum: number, o: any) => sum + (o.subtotal || 0), 0);
  const totalGst = validOrders.reduce((sum: number, o: any) => sum + (o.gstAmount || 0), 0);
  const totalDiscount = validOrders.reduce((sum: number, o: any) => sum + (o.discount || 0), 0);
  const cancelledRevenueTotal = cancelledOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  // Payment Breakdown
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  validOrders.forEach((o: any) => {
    if (o.paymentMode === 'CASH') cashTotal += o.total;
    else if (o.paymentMode === 'UPI') upiTotal += o.total;
    else if (o.paymentMode === 'CARD') cardTotal += o.total;
    else if (o.paymentMode === 'SPLIT' && o.splitDetails) {
      cashTotal += (o.splitDetails.cash || 0);
      upiTotal += (o.splitDetails.upi || 0);
      cardTotal += (o.splitDetails.card || 0);
    }
  });

  // Top Selling Items
  const itemMap: Record<string, { name: string; count: number; revenue: number }> = {};
  validOrders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const name = item.itemName || 'Unknown';
      if (!itemMap[name]) itemMap[name] = { name, count: 0, revenue: 0 };
      itemMap[name].count += item.quantity;
      itemMap[name].revenue += (item.quantity * item.price);
    });
  });

  const topSellingItems = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 10);

  return res.json({
    success: true,
    date: targetDate,
    source: 'google_sheets_analytics',
    metrics: {
      totalRevenue,
      totalOrders: validOrders.length,
      avgOrderValue: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
      totalSubtotal,
      totalGst,
      totalDiscount,
      cashTotal,
      upiTotal,
      cardTotal,
      cancelledOrdersCount: cancelledOrders.length,
      cancelledRevenueTotal,
      topSellingItems
    }
  });
});

// Backward-Compatible Store Endpoints (Routes to in-memory store without touching disk)
app.get('/api/store/all', (req, res) => {
  return res.json({
    success: true,
    menu: memoryStore.menu,
    categories: memoryStore.categories,
    inventory: memoryStore.inventory,
    orders: memoryStore.orders,
    customers: memoryStore.customers,
    settings: memoryStore.settings,
    spreadsheetId: memoryStore.spreadsheetId,
    orderCount: memoryStore.orders.length,
    lastSavedAt: new Date().toISOString()
  });
});

app.post('/api/store/sync', (req, res) => {
  try {
    const { orders, inventory, menu, customers, settings, spreadsheetId } = req.body;

    if (spreadsheetId && typeof spreadsheetId === 'string') {
      memoryStore.spreadsheetId = spreadsheetId;
    }

    if (Array.isArray(orders) && orders.length > 0) {
      const orderMap = new Map<string, any>();
      memoryStore.orders.forEach((o) => { if (o?.id) orderMap.set(o.id, o); });
      orders.forEach((incoming: any) => {
        if (!incoming?.id) return;
        if (!orderMap.has(incoming.id)) {
          orderMap.set(incoming.id, incoming);
        } else {
          const existing = orderMap.get(incoming.id);
          if (incoming.status !== existing.status || incoming.cancelledAt || incoming.invoiceNo) {
            orderMap.set(incoming.id, { ...existing, ...incoming });
          }
        }
      });
      memoryStore.orders = Array.from(orderMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (Array.isArray(inventory) && inventory.length > 0) memoryStore.inventory = inventory;
    if (Array.isArray(menu) && menu.length > 0) memoryStore.menu = menu;
    if (customers && typeof customers === 'object') memoryStore.customers = { ...memoryStore.customers, ...customers };
    if (settings && typeof settings === 'object') memoryStore.settings = { ...(memoryStore.settings || {}), ...settings };

    return res.json({
      success: true,
      orders: memoryStore.orders,
      inventory: memoryStore.inventory,
      menu: memoryStore.menu,
      customers: memoryStore.customers,
      settings: memoryStore.settings,
      spreadsheetId: memoryStore.spreadsheetId,
      message: 'Store state successfully synchronized.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Sync failed' });
  }
});

app.post('/api/store/settings', (req, res) => {
  if (req.body.settings) memoryStore.settings = req.body.settings;
  return res.json({ success: true, settings: memoryStore.settings });
});

app.post('/api/store/customers', (req, res) => {
  if (req.body.customers) memoryStore.customers = { ...memoryStore.customers, ...req.body.customers };
  return res.json({ success: true, customers: memoryStore.customers });
});

// Catch-all 404 handler for API routes to guarantee JSON response
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`
  });
});

// Global API error handler ensuring JSON response
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Server Error'
  });
});

export default app;
