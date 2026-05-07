const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || ROOT;
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const STOCK_FILE = path.join(DATA_DIR, "stock-items.json");
const SEED_STOCK_FILE = path.join(ROOT, "stock-items.json");
const REMOVED_DUPLICATE_STOCK_IDS = new Set([
  "square-smirnoff-vodka",
  "square-gordons-pink-gin",
  "square-gordons-dry-gin",
  "baby-budweiser-330",
  "baby-corona-330",
  "baby-desperados-330",
  "baby-doombar-500",
  "baby-guinness-zero",
  "baby-heineken-zero",
  "baby-newcastle-brown-550",
  "square-kp-dry-roasted-peanuts",
  "square-kp-salted-peanuts",
  "square-mini-cheddars-original",
  "square-coca-cola",
  "square-coke-zero",
  "baby-diet-7up-can",
  "baby-diet-coke-can",
  "baby-fanta-lemon-can",
  "baby-fanta-orange-can",
  "baby-j2o-orange-passion",
  "square-lemonade-postmix",
  "baby-pepsi-max-can",
  "square-pepsi-max-post-mix",
  "square-pepsi-post-mix",
  "baby-rwhites-lemonade",
  "baby-red-bull-250",
  "baby-schweppes-orange",
  "square-schweppes-slimline-tonic",
  "baby-schweppes-tonic",
  "square-soda",
  "square-soda-water",
  "sky-bear-star-chardonnay",
  "sky-bear-star-merlot",
  "baby-flowerhead-chardonnay",
  "sky-bear-star-zinfandel",
  "baby-flowerhead-pinot-blush"
]);

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ORDERS_DIR, { recursive: true });
seedDataFiles();
pruneRemovedDuplicateStockItems();

const defaultStockItems = [
  stock("sky-john-smiths-22gl", "22gl John Smiths Smooth", "Kegs", "Sky Wines", "Each", 201.76, 1),
  stock("sky-guinness-11gl", "11gl Guinness", "Kegs", "Sky Wines", "Each", 164.92, 2),
  stock("sky-strongbow-11gl", "11gl Strongbow", "Kegs", "Sky Wines", "Each", 104.5, 1),
  stock("sky-strongbow-dark-fruit-11gl", "11gl Strongbow Dark Fruit", "Kegs", "Sky Wines", "Each", 119.02, 1),
  stock("baby-carlsberg-11gl", "11gl Carlsberg Danish Pilsner", "Kegs", "Baby Bottles", "Each", 88.95, 3),
  stock("baby-madri-11gl", "11gl Madri", "Kegs", "Baby Bottles", "Each", 152.39, 1),
  stock("baby-carling-22gl", "22gl Carling", "Kegs", "Baby Bottles", "Each", 234.99, 5),
  stock("baby-coors-11gl", "11gl Coors", "Kegs", "Baby Bottles", "Each", 128.42, 1),
  stock("baby-fosters-11gl", "11gl Fosters", "Kegs", "Baby Bottles", "Each", 112, 1),
  stock("baby-dark-fruits-30lt", "30lt Strongbow Dark Fruits", "Kegs", "Baby Bottles", "Each", 82, 1),

  stock("baby-budweiser-330", "Budweiser 330ml", "Bottles", "Baby Bottles", "2 dozen", 23.45, 1),
  stock("baby-corona-330", "Corona 330ml", "Bottles", "Baby Bottles", "18 pack", 17.27, 2),
  stock("baby-desperados-330", "Desperados 330ml", "Bottles", "Baby Bottles", "2 dozen", 31.85, 1),
  stock("baby-newcastle-brown-550", "Newcastle Brown Ale 550ml", "Bottles", "Baby Bottles", "1 dozen", 21.43, 3),
  stock("baby-bulmers-500", "Bulmers 500ml", "Bottles", "Baby Bottles", "1 dozen", 15.6, 1),
  stock("baby-bulmers-red-berry", "Bulmers No17 Crushed Red Berry/Lime 500ml", "Bottles", "Baby Bottles", "1 dozen", 20.22, 1),
  stock("baby-kopparberg-mixed", "Kopparberg Mixed Fruit 500ml", "Bottles", "Baby Bottles", "15 bottles per case", 25.4, 1),
  stock("baby-kopparberg-strawberry", "Kopparberg Strawberry & Lime 500ml", "Bottles", "Baby Bottles", "15 bottles per case", 25.4, 1),
  stock("baby-kopparberg-af", "Kopparberg Mixed Fruit Alcohol Free 500ml", "Bottles", "Baby Bottles", "8 bottles per case", 11.31, 2),
  stock("baby-magners-568", "Magners 568ml", "Bottles", "Baby Bottles", "1 dozen", 16.99, 1),
  stock("baby-doombar-500", "Doom Bar 500ml", "Bottles", "Baby Bottles", "8 pack", 13.58, 1),
  stock("baby-heineken-zero", "Heineken 0.0 330ml", "Bottles", "Baby Bottles", "2 dozen", 19.25, 1),
  stock("baby-guinness-zero", "Guinness 0.0% Pint Cans 538ml", "Bottles", "Baby Bottles", "2 dozen", 38, 1),

  stock("baby-coke-can", "Coca Cola Can", "Soft Drinks", "Baby Bottles", "2 dozen", 10.99, 4),
  stock("baby-coke-zero-can", "Coke Zero Can", "Soft Drinks", "Baby Bottles", "2 dozen", 9.99, 3),
  stock("baby-diet-coke-can", "Diet Coke Can 330ml", "Soft Drinks", "Baby Bottles", "2 dozen", 9.99, 3),
  stock("baby-pepsi-max-can", "Pepsi Max Can", "Soft Drinks", "Baby Bottles", "2 dozen", 10.3, 2),
  stock("baby-fanta-orange-can", "Fanta Orange Can", "Soft Drinks", "Baby Bottles", "2 dozen", 9.64, 1),
  stock("baby-fanta-lemon-can", "Fanta Lemon Can", "Soft Drinks", "Baby Bottles", "2 dozen", 9.64, 1),
  stock("baby-diet-7up-can", "Diet 7UP Can", "Soft Drinks", "Baby Bottles", "2 dozen", 10.67, 1),
  stock("baby-rwhites-lemonade", "R Whites Lemonade Can", "Soft Drinks", "Baby Bottles", "2 dozen", 10.18, 2),
  stock("baby-red-bull-250", "Red Bull 250ml Can", "Soft Drinks", "Baby Bottles", "2 dozen", 21.24, 1),
  stock("baby-j2o-orange-passion", "J2O Orange & Passionfruit 275ml", "Soft Drinks", "Baby Bottles", "2 dozen", 17, 1),
  stock("baby-schweppes-tonic", "Schweppes Tonic 200ml", "Soft Drinks", "Baby Bottles", "2 dozen", 13.99, 1),
  stock("baby-schweppes-orange", "Schweppes Orange Juice 200ml", "Soft Drinks", "Baby Bottles", "2 dozen", 14.49, 1),
  stock("sky-wenlock-water-500", "Wenlock Still Water 500ml", "Soft Drinks", "Sky Wines", "2 dozen", 4.85, 1),
  stock("baby-white-rock-water-500", "White Rock Still Water 500ml", "Soft Drinks", "Baby Bottles", "2 dozen", 3.99, 1),

  stock("baby-bib-energy", "Empire Bag-in-box Energy Drink 10lt", "Bag-in-box", "Baby Bottles", "Each", 59.99, 1),
  stock("baby-bib-lemonade", "Empire Bag-in-box Lemonade 10lt", "Bag-in-box", "Baby Bottles", "Each", 34.99, 1),
  stock("baby-bib-pepsi", "Empire Bag-in-box Pepsi 10lt", "Bag-in-box", "Baby Bottles", "Each", 69.93, 1),
  stock("baby-bib-pepsi-zero", "Empire Bag-in-box Pepsi Zero 10lt", "Bag-in-box", "Baby Bottles", "Each", 52, 1),
  stock("sky-bib-lime-cordial", "Empire Bag-in-box Lime Cordial 10lt", "Bag-in-box", "Sky Wines", "Each", 19.08, 1),

  stock("baby-archers-15", "Archers Peach 1.5lt", "Spirits", "Baby Bottles", "Each", 24.44, 1),
  stock("baby-baileys-15", "Baileys 1.5lt", "Spirits", "Baby Bottles", "Each", 26.38, 1),
  stock("baby-gordons-15", "Gordons 1.5lt", "Spirits", "Baby Bottles", "Each", 28, 1),
  stock("baby-gordons-pink-15", "Gordons Pink Gin 1.5lt", "Spirits", "Baby Bottles", "Each", 29.32, 1),
  stock("baby-bacardi-15", "Bacardi 1.5lt", "Spirits", "Baby Bottles", "Each", 31.24, 2),
  stock("baby-captain-morgan-spiced-15", "Captain Morgan Spiced 1.5lt", "Spirits", "Baby Bottles", "Each", 27.99, 1),
  stock("baby-malibu-15", "Malibu 1.5lt", "Spirits", "Baby Bottles", "Each", 24.99, 1),
  stock("baby-smirnoff-red-15", "Smirnoff Red Label 1.5lt", "Spirits", "Baby Bottles", "Each", 26.48, 4),
  stock("baby-famous-grouse-15", "Famous Grouse 1.5lt", "Spirits", "Baby Bottles", "Each", 29.99, 1),
  stock("baby-jack-daniels-15", "Jack Daniels 1.5lt", "Spirits", "Baby Bottles", "Each", 38.64, 1),
  stock("baby-jameson-15", "Jameson 1.5lt", "Spirits", "Baby Bottles", "Each", 39.04, 1),
  stock("baby-martell-15", "Martell 1.5lt", "Spirits", "Baby Bottles", "Each", 47.33, 1),
  stock("sky-sourz-apple-70", "Apple Sourz 70cl", "Spirits", "Sky Wines", "Each", 7.75, 1),
  stock("sky-sourz-cherry-70", "Cherry Sourz 70cl", "Spirits", "Sky Wines", "Each", 7.75, 1),
  stock("sky-jose-cuervo-silver-70", "Jose Cuervo Especial Silver 70cl", "Spirits", "Sky Wines", "Each", 15.09, 1),

  stock("sky-bear-star-chardonnay", "Bear & Star Chardonnay 187ml", "Wine", "Sky Wines", "2 dozen", 39.33, 1),
  stock("sky-bear-star-merlot", "Bear & Star Merlot 187ml", "Wine", "Sky Wines", "2 dozen", 39.33, 1),
  stock("sky-bear-star-pinot", "Bear & Star Pinot Grigio 187ml", "Wine", "Sky Wines", "2 dozen", 53.22, 1),
  stock("sky-bear-star-zinfandel", "Bear & Star White Zinfandel 187ml", "Wine", "Sky Wines", "2 dozen", 39.33, 1),
  stock("baby-prosecco-200", "Bella Ponte Prosecco White 200ml", "Wine", "Baby Bottles", "2 dozen", 56.22, 1),
  stock("baby-flowerhead-chardonnay", "Flowerhead Chardonnay 75cl", "Wine", "Baby Bottles", "Bottle", 0.01, 2),
  stock("baby-flowerhead-pinot-blush", "Flowerhead Pinot Grigio Blush 75cl", "Wine", "Baby Bottles", "Bottle", 0.01, 2),

  stock("baby-pringles-bbq", "Pringles BBQ 12 x 40g", "Snacks", "Baby Bottles", "Each", 8.99, 1),
  stock("snack-bacon-fries", "Bacon Fries", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-mini-cheddars", "Mini Cheddars", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-walkers-salt-vinegar", "Walkers Salt & Vinegar", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-walkers-prawn-cocktail", "Walkers Prawn Cocktail", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-kp-salted-nuts", "KP Salted Nuts", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-kp-dry-roasted", "KP Dry Roasted Nuts", "Snacks", "Usual snack supplier", "Case", 0, 1),
  stock("snack-pork-scratchings", "Pork Scratchings", "Snacks", "Usual snack supplier", "Case", 0, 1)
];

function stock(id, name, category, supplier, packSize, unitCost, reorderQuantity) {
  const reorderPoint = Math.max(1, Math.ceil(reorderQuantity / 2));

  return {
    id,
    name,
    sku: id.toUpperCase().replaceAll("-", "-").slice(0, 24),
    category,
    supplier,
    packSize,
    onHand: 0,
    reorderPoint,
    reorderQuantity,
    parLevel: reorderQuantity + reorderPoint,
    unitCost
  };
}

function readStockItems() {
  if (!fs.existsSync(STOCK_FILE)) {
    const seedItems = fs.existsSync(SEED_STOCK_FILE)
      ? JSON.parse(fs.readFileSync(SEED_STOCK_FILE, "utf8"))
      : defaultStockItems;
    writeStockItems(seedItems);
    return seedItems;
  }

  return JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
}

function writeStockItems(items) {
  fs.writeFileSync(STOCK_FILE, JSON.stringify(items, null, 2));
}

function deleteStockItem(itemId) {
  const items = readStockItems();
  const nextItems = items.filter((item) => item.id !== itemId);

  if (nextItems.length === items.length) {
    const error = new Error("Stock item not found.");
    error.statusCode = 404;
    throw error;
  }

  writeStockItems(nextItems);
  return { deleted: true, itemId };
}

function seedDataFiles() {
  if (!fs.existsSync(STOCK_FILE) && fs.existsSync(SEED_STOCK_FILE) && STOCK_FILE !== SEED_STOCK_FILE) {
    fs.copyFileSync(SEED_STOCK_FILE, STOCK_FILE);
  }

  const seedOrdersDir = path.join(ROOT, "orders");
  if (seedOrdersDir !== ORDERS_DIR && fs.existsSync(seedOrdersDir) && !fs.readdirSync(ORDERS_DIR).length) {
    for (const fileName of fs.readdirSync(seedOrdersDir)) {
      fs.copyFileSync(path.join(seedOrdersDir, fileName), path.join(ORDERS_DIR, fileName));
    }
  }
}

function pruneRemovedDuplicateStockItems() {
  if (!fs.existsSync(STOCK_FILE)) return;

  const items = JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
  const nextItems = items.filter((item) => !REMOVED_DUPLICATE_STOCK_IDS.has(item.id));
  if (nextItems.length !== items.length) writeStockItems(nextItems);
}

function isAuthorised(request) {
  const password = process.env.ORDER_APP_PASSWORD;
  if (!password) return true;

  const header = request.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [, suppliedPassword = ""] = decoded.split(":");
  return suppliedPassword === password;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    if (!isAuthorised(request)) {
      response.writeHead(401, {
        "WWW-Authenticate": 'Basic realm="The Domin Inn Orders"',
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end("Password required.");
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/catalog") {
      return sendJson(response, 200, { items: readStockItems() });
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/catalog/")) {
      return sendJson(response, 200, deleteStockItem(decodeURIComponent(url.pathname.replace("/api/catalog/", ""))));
    }

    if (request.method === "GET" && url.pathname === "/api/orders") {
      return sendJson(response, 200, { orders: readOrders() });
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/orders/")) {
      return sendJson(response, 200, deleteOrder(decodeURIComponent(url.pathname.replace("/api/orders/", ""))));
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/orders/") && url.pathname.endsWith("/email")) {
      const orderId = decodeURIComponent(url.pathname.replace("/api/orders/", "").replace(/\/email$/, ""));
      return sendJson(response, 200, await emailSavedOrder(orderId));
    }

    if (request.method === "POST" && url.pathname === "/api/orders") {
      return sendJson(response, 201, await createOrder(await readJson(request)));
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    return sendJson(response, Number(error.statusCode || 500), {
      message: error.publicMessage || error.message || "Something went wrong."
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Stock order app running at http://${HOST}:${PORT}`);
});

async function createOrder(payload) {
  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];
  const existingOrders = readOrders();

  if (!lineItems.length) {
    const error = new Error("The order needs at least one stock line.");
    error.statusCode = 400;
    throw error;
  }

  const order = {
    id: randomUUID(),
    orderNumber: `SO-${String(existingOrders.length + 1).padStart(4, "0")}`,
    neededBy: cleanText(payload.neededBy),
    note: cleanText(payload.note),
    createdAt: new Date().toISOString(),
    lineItems: lineItems.map((line) => ({
      id: cleanText(line.id),
      name: cleanText(line.name),
      sku: cleanText(line.sku),
      supplier: cleanText(line.supplier),
      quantity: Math.max(1, Math.floor(Number(line.quantity || 1))),
      unitCost: Number(line.unitCost || 0)
    }))
  };

  const files = writeOrder(order);
  sendOrderNotification(order, files);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    lineCount: order.lineItems.length,
    createdAt: order.createdAt
  };
}

function readOrders() {
  return fs.readdirSync(ORDERS_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(ORDERS_DIR, fileName);
      const order = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const baseName = fileName.replace(/\.json$/, "");
      fs.writeFileSync(path.join(ORDERS_DIR, `${baseName}.pdf`), buildOrderPdf(order));
      return {
        ...order,
        pdfPath: `/orders/${baseName}.pdf`,
        pdfFileName: `${baseName}.pdf`
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function writeOrder(order) {
  const baseName = `${order.orderNumber}-${order.createdAt.slice(0, 10)}`;
  const jsonPath = path.join(ORDERS_DIR, `${baseName}.json`);
  const pdfPath = path.join(ORDERS_DIR, `${baseName}.pdf`);

  fs.writeFileSync(jsonPath, JSON.stringify(order, null, 2));
  fs.writeFileSync(pdfPath, buildOrderPdf(order));

  return { jsonPath, pdfPath };
}

async function sendOrderNotification(order, files, options = {}) {
  if (process.env.RESEND_API_KEY) {
    return sendOrderViaResend(order, files, options);
  }

  const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "ORDER_NOTIFY_EMAIL"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    if (options.throwOnError) {
      const error = new Error(`Email is missing Render setting: ${missing.join(", ")}`);
      error.statusCode = 500;
      throw error;
    }
    return false;
  }

  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") !== "false",
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ORDER_NOTIFY_EMAIL,
      subject: `New stock order ${order.orderNumber}`,
      text: [
        `New stock order ${order.orderNumber} has been placed.`,
        "",
        order.neededBy ? `Needed by: ${order.neededBy}` : "",
        "",
        "The PDF order form is attached."
      ].filter(Boolean).join("\n"),
      attachments: [
        {
          filename: `${path.basename(files.pdfPath)}`,
          path: files.pdfPath
        }
      ]
    });
    return true;
  } catch (error) {
    if (options.throwOnError) {
      error.statusCode = 500;
      error.publicMessage = `Email could not be sent: ${error.message}`;
      throw error;
    }
    console.error(`Order notification failed: ${error.message}`);
    return false;
  }
}

async function sendOrderViaResend(order, files, options = {}) {
  const required = ["RESEND_API_KEY", "ORDER_NOTIFY_EMAIL"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    if (options.throwOnError) {
      const error = new Error(`Email is missing Render setting: ${missing.join(", ")}`);
      error.statusCode = 500;
      throw error;
    }
    return false;
  }

  try {
    const pdfFileName = path.basename(files.pdfPath);
    const pdfContent = fs.readFileSync(files.pdfPath).toString("base64");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "The Domin Inn Orders <onboarding@resend.dev>",
        to: [process.env.ORDER_NOTIFY_EMAIL],
        subject: `New stock order ${order.orderNumber}`,
        text: [
          `New stock order ${order.orderNumber} has been placed.`,
          "",
          order.neededBy ? `Needed by: ${order.neededBy}` : "",
          "",
          "The PDF order form is attached."
        ].filter(Boolean).join("\n"),
        attachments: [
          {
            filename: pdfFileName,
            content: pdfContent
          }
        ]
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || result.error?.message || `Resend returned ${response.status}`);
    }

    return true;
  } catch (error) {
    if (options.throwOnError) {
      error.statusCode = 500;
      error.publicMessage = `Email could not be sent: ${error.message}`;
      throw error;
    }
    console.error(`Order notification failed: ${error.message}`);
    return false;
  }
}

async function emailSavedOrder(orderId) {
  const savedOrder = findSavedOrder(orderId);
  if (!savedOrder) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const files = {
    pdfPath: path.join(ORDERS_DIR, savedOrder.pdfFileName)
  };

  await sendOrderNotification(savedOrder.order, files, { throwOnError: true });
  return {
    sent: true,
    orderNumber: savedOrder.order.orderNumber,
    pdfFileName: savedOrder.pdfFileName
  };
}

function deleteOrder(orderId) {
  const savedOrder = findSavedOrder(orderId);

  if (!savedOrder) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const baseName = savedOrder.baseName;
  for (const ext of [".json", ".pdf"]) {
    const filePath = path.join(ORDERS_DIR, `${baseName}${ext}`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  return { deleted: true, orderId };
}

function findSavedOrder(orderId) {
  const jsonFiles = fs.readdirSync(ORDERS_DIR).filter((fileName) => fileName.endsWith(".json"));

  for (const fileName of jsonFiles) {
    const filePath = path.join(ORDERS_DIR, fileName);
    const order = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (order.id === orderId) {
      const baseName = fileName.replace(/\.json$/, "");
      return {
        order,
        baseName,
        pdfFileName: `${baseName}.pdf`
      };
    }
  }

  return null;
}

function buildOrderPdf(order) {
  const lineHeight = 18;
  const linesPerPage = 38;
  const rows = [
    "Stock Order",
    `Order: ${order.orderNumber}`,
    `Date: ${formatDate(order.createdAt)}`,
    order.neededBy ? `Needed by: ${order.neededBy}` : "",
    order.note ? `Notes: ${order.note}` : "",
    "",
    "Items",
    ...order.lineItems.flatMap((line) => [
      `${line.quantity} x ${line.name}`
    ]),
  ].filter((line) => line !== "");

  const pages = [];
  for (let index = 0; index < rows.length; index += linesPerPage) {
    pages.push(rows.slice(index, index + linesPerPage));
  }

  const fontObjectNumber = 3 + pages.length * 2;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageRefs = [];

  pages.forEach((pageRows) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    const textCommands = pageRows.map((line, index) => {
      const y = 770 - index * lineHeight;
      return `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
    }).join("\n");

    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(textCommands)} >>\nstream\n${textCommands}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf);
}

function escapePdfText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function serveStatic(pathname, response) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const fileRoot = cleanPath.startsWith("/orders/") ? DATA_DIR : ROOT;
  const filePath = path.normalize(path.join(fileRoot, cleanPath));

  if (!filePath.startsWith(fileRoot)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType(filePath) });
    response.end(content);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".pdf": "application/pdf"
  }[ext] || "application/octet-stream";
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request body is too large."));
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

function cleanText(value) {
  return String(value || "").trim().slice(0, 500);
}
