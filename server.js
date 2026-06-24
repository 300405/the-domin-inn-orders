const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || ROOT;
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const DRAFTS_DIR = path.join(DATA_DIR, "draft-orders");
const STOCK_FILE = path.join(DATA_DIR, "stock-items.json");
const SEED_STOCK_FILE = path.join(ROOT, "stock-items.json");
const DELETED_ORDERS_FILE = path.join(DATA_DIR, "deleted-orders.json");
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MINIMUM_STOCK_ITEMS = 20;
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
  "baby-flowerhead-pinot-blush",
  "square-salt-vinegar",
  "square-prawn-cocktail",
  "snack-walkers-salt-vinegar",
  "snack-walkers-prawn-cocktail",
  "square-milky-bar",
  "sky-sourz-apple-70",
  "sky-sourz-cherry-70",
  "square-famous-grouse",
  "square-kraken-rum",
  "square-bear-star-pinot-grigio",
  "square-bacardi",
  "square-malibu",
  "square-baileys-irish-cream",
  "square-archers",
  "square-captain-morgan-spiced-gold-rum",
  "square-jamesons-irish-whiskey",
  "square-jd-no7",
  "square-martell"
]);

const ZERO_RATE_VAT_ITEM_IDS = new Set([
  "snack-pork-scratchings"
]);

const SQUARE_CATALOGUE_PATCHES = [
  { id: "baby-bulmers-500", name: "Bulmers 500ml", category: "Bottles", unitCost: 1.29 },
  { id: "baby-bulmers-red-berry", name: "Bulmers No17 Crushed Red Berry/Lime 500ml", category: "Bottles", unitCost: 1.19 },
  { id: "square-kopparberg-mango", name: "Kopparberg  Mango", category: "Bottles", unitCost: 1.53 },
  { id: "baby-kopparberg-mixed", name: "Kopparberg Mixed Fruit 500ml", category: "Bottles", unitCost: 1.53 },
  { id: "baby-kopparberg-strawberry", name: "Kopparberg Strawberry & Lime 500ml", category: "Bottles", unitCost: 1.53 },
  { id: "snack-bacon-fries", name: "Bacon Fries", category: "Snacks", unitCost: 0.46 },
  { id: "square-grab-bag-chicken-walkers", name: "Grab Bag Chicken Walkers", category: "Snacks", unitCost: 0.63 },
  { id: "snack-pork-scratchings", name: "Pork Scratchings", category: "Snacks", unitCost: 0.96 },
  { id: "square-birra-moretti-0-0", name: "Birra Moretti 0.0", category: "Soft Drinks", unitCost: 0.97 },
  { id: "britvic-slimline-tonic", name: "Britvic Slimline Tonic", category: "Soft Drinks", unitCost: 0.66 },
  { id: "square-ciders", name: "Ciders", category: "Soft Drinks", unitCost: 1.86 },
  { id: "square-coca-cola-bottle", name: "Coca cola bottle", category: "Soft Drinks", unitCost: 0 },
  { id: "square-coffee", name: "Coffee", category: "Soft Drinks", unitCost: 1.2 },
  { id: "square-hardy-s-0-chardonnay", name: "Hardy's 0% Chardonnay", category: "Soft Drinks", unitCost: 4.17 },
  { id: "square-irn-bru-bottle", name: "Irn Bru Bottle", category: "Soft Drinks", unitCost: 0 },
  { id: "square-orange-carton", name: "Orange Carton - Case", category: "Soft Drinks", unitCost: 0, packSize: "Case" },
  { id: "square-pineapple-carton", name: "Pineapple carton", category: "Soft Drinks", unitCost: 0 },
  { id: "square-tea", name: "Tea", category: "Soft Drinks", unitCost: 1.2 },
  { id: "square-beefeater-blood-orange-gin", name: "Beefeater Blood Orange Gin", category: "Spirits", unitCost: 12.69 },
  { id: "baby-smirnoff-red-15", name: "Smirnoff Vodka - 1.5L Bottle", category: "Spirits", unitCost: 26.48, packSize: "1.5L Bottle" },
  { id: "square-southern-comfort", name: "Southern Comfort - 1.5L Bottle", category: "Spirits", unitCost: 27.55, packSize: "1.5L Bottle" },
  { id: "baby-bacardi-15", name: "Bacardi - 1.5L Bottle", category: "Spirits", unitCost: 31.24, packSize: "1.5L Bottle" },
  { id: "square-bells-scotch-whisky", name: "Bells Whisky - 1.5L Bottle", category: "Spirits", unitCost: 23.5, packSize: "1.5L Bottle" },
  { id: "baby-gordons-pink-15", name: "Gordons Pink Gin - 1.5L Bottle", category: "Spirits", unitCost: 29.32, packSize: "1.5L Bottle" },
  { id: "baby-gordons-15", name: "Gordons Gin - 1.5L Bottle", category: "Spirits", unitCost: 28, packSize: "1.5L Bottle" },
  { id: "square-house-vodka", name: "House Vodka - 1.5L Bottle", category: "Spirits", unitCost: 22.69, packSize: "1.5L Bottle" },
  { id: "baby-malibu-15", name: "Malibu - 1.5L Bottle", category: "Spirits", unitCost: 24.99, packSize: "1.5L Bottle" },
  { id: "baby-famous-grouse-15", name: "Famous Grouse - 1.5L Bottle", category: "Spirits", unitCost: 29.99, packSize: "1.5L Bottle" },
  { id: "baby-captain-morgan-spiced-15", name: "Captain Morgan Spiced Rum - 1.5L Bottle", category: "Spirits", unitCost: 27.99, packSize: "1.5L Bottle" },
  { id: "square-captain-morgans-dark-rum", name: "Captain Morgan Dark Rum - 1.5L Bottle", category: "Spirits", unitCost: 29.33, packSize: "1.5L Bottle" },
  { id: "baby-jack-daniels-15", name: "Jack Daniels - 1.5L Bottle", category: "Spirits", unitCost: 38.64, packSize: "1.5L Bottle" },
  { id: "square-tia-maria", name: "Tia Maria - 1.5L Bottle", category: "Spirits", unitCost: 0, packSize: "1.5L Bottle" },
  { id: "baby-baileys-15", name: "Baileys - 1.5L Bottle", category: "Spirits", unitCost: 0, packSize: "1.5L Bottle" },
  { id: "baby-archers-15", name: "Archers Peach - 1.5L Bottle", category: "Spirits", unitCost: 24.44, packSize: "1.5L Bottle" },
  { id: "baby-jameson-15", name: "Jameson - 1.5L Bottle", category: "Spirits", unitCost: 37.89, packSize: "1.5L Bottle" },
  { id: "baby-martell-15", name: "Martell - 1.5L Bottle", category: "Spirits", unitCost: 47.33, packSize: "1.5L Bottle" },
  { id: "sky-jose-cuervo-silver-70", name: "Jose Cuervo Especial Silver - 70cl Bottle", category: "Spirits", unitCost: 15.09, packSize: "70cl Bottle" },
  { id: "square-original-pringles", name: "Original Pringles", category: "Snacks", unitCost: 8.99, packSize: "12 x 40g" },
  { id: "square-bear-star-chardonay", name: "FlowerHead Chardonnay - Single Serve Bottle", category: "Wine", unitCost: 1.8, packSize: "Single Serve Bottle" },
  { id: "square-bear-star-merlot", name: "FlowerHead Merlot - Single Serve Bottle", category: "Wine", unitCost: 1.81, packSize: "Single Serve Bottle" },
  { id: "sky-bear-star-pinot", name: "FlowerHead Pinot Grigio - Single Serve Bottle", category: "Wine", unitCost: 1.91, packSize: "Single Serve Bottle" },
  { id: "square-bear-star-sauvignon-blanc", name: "FlowerHead Sauvignon Blanc - Single Serve Bottle", category: "Wine", unitCost: 1.81, packSize: "Single Serve Bottle" },
  { id: "square-bear-star-shiraz", name: "FlowerHead Shiraz - Single Serve Bottle", category: "Wine", unitCost: 1.81, packSize: "Single Serve Bottle" },
  { id: "square-bear-star-zinfandel-rose", name: "FlowerHead Zinfandel Rose - Single Serve Bottle", category: "Wine", unitCost: 1.43, packSize: "Single Serve Bottle" },
  { id: "square-hardy-s-vr-chardonnay", name: "FlowerHead Chardonnay - 75cl Bottle", category: "Wine", unitCost: 6.28, packSize: "75cl Bottle" },
  { id: "square-hardy-s-vr-melot", name: "FlowerHead Merlot - 75cl Bottle", category: "Wine", unitCost: 6.36, packSize: "75cl Bottle" },
  { id: "square-hardy-s-vr-pinot-grigio", name: "FlowerHead Pinot Grigio - 75cl Bottle", category: "Wine", unitCost: 6.29, packSize: "75cl Bottle" },
  { id: "square-hardy-s-vr-rose", name: "FlowerHead Rose - 75cl Bottle", category: "Wine", unitCost: 6.14, packSize: "75cl Bottle" },
  { id: "square-hardy-s-vr-sauvignon-blanc", name: "FlowerHead Sauvignon Blanc - 75cl Bottle", category: "Wine", unitCost: 6.19, packSize: "75cl Bottle" },
  { id: "square-hardy-s-vr-shiraz", name: "FlowerHead Shiraz - 75cl Bottle", category: "Wine", unitCost: 6.28, packSize: "75cl Bottle" },

  // LD163 supplier invoice costs. Newer invoice prices take priority.
  { id: "baby-carlsberg-11gl", unitCost: 88.95, packSize: "11 gallon keg" },
  { id: "baby-coors-11gl", unitCost: 128.42, packSize: "11 gallon keg" },
  { id: "sky-guinness-11gl", unitCost: 162, packSize: "11 gallon keg" },
  { id: "baby-madri-11gl", unitCost: 152.39, packSize: "11 gallon keg" },
  { id: "sky-strongbow-11gl", unitCost: 104.5, packSize: "11 gallon keg" },
  { id: "sky-strongbow-dark-fruit-11gl", unitCost: 118.4, packSize: "11 gallon keg" },
  { id: "baby-carling-22gl", unitCost: 234.99, packSize: "22 gallon keg" },
  { id: "baby-captain-morgan-spiced-15", unitCost: 26.89, packSize: "1.5L Bottle" },
  { id: "baby-coke-can", unitCost: 10.99, packSize: "2 dozen" },
  { id: "baby-coke-zero-can", unitCost: 9.99, packSize: "2 dozen" },
  { id: "square-corona", unitCost: 17.62, packSize: "18 x 330ml bottles" },
  { id: "square-diet-coke", unitCost: 9.99, packSize: "2 dozen" },
  { id: "baby-bib-lemonade", unitCost: 33.99, packSize: "10L bag-in-box" },
  { id: "square-fanta-lemon", unitCost: 9.64, packSize: "2 dozen" },
  { id: "square-fanta-orange", unitCost: 9.64, packSize: "2 dozen" },
  { id: "square-bear-star-chardonay", unitCost: 43.19, packSize: "2 dozen single serve bottles" },
  { id: "baby-gordons-pink-15", unitCost: 28.35, packSize: "1.5L Bottle" },
  { id: "square-irn-bru", unitCost: 11.17, packSize: "2 dozen" },
  { id: "baby-jack-daniels-15", unitCost: 36.65, packSize: "1.5L Bottle" },
  { id: "baby-kopparberg-mixed", unitCost: 24.99, packSize: "15 x 500ml bottles" },
  { id: "baby-kopparberg-af", unitCost: 11.31, packSize: "8 x 500ml bottles" },
  { id: "baby-kopparberg-strawberry", unitCost: 24.99, packSize: "15 x 500ml bottles" },
  { id: "snack-kp-dry-roasted", unitCost: 13.2, packSize: "24 x 50g" },
  { id: "square-orange-carton", unitCost: 19.99, packSize: "12 x 1L" },
  { id: "baby-malibu-15", unitCost: 24.99, packSize: "1.5L Bottle" },
  { id: "square-pepsi-max", unitCost: 10.3, packSize: "2 dozen" },
  { id: "square-r-whites-lemonade", unitCost: 10.18, packSize: "2 dozen" },
  { id: "snack-pork-scratchings", unitCost: 11.49, packSize: "12 x 70g" },
  { id: "square-schweppes-orange", unitCost: 14.49, packSize: "2 dozen" },
  { id: "baby-smirnoff-red-15", unitCost: 26.15, packSize: "1.5L Bottle" },
  { id: "square-tequila-rose", unitCost: 16.39, packSize: "1L Bottle" },
  { id: "square-vk-blue", unitCost: 21.71, packSize: "24 x 275ml bottles" },
  { id: "square-cheese-onion", unitCost: 16.99, packSize: "32 bags" },
  { id: "baby-white-rock-water-500", unitCost: 4.34, packSize: "2 dozen" },
  { id: "baby-bacardi-15", unitCost: 31.12, packSize: "1.5L Bottle" },
  { id: "britvic-slimline-tonic", unitCost: 15.9, packSize: "2 dozen" },
  { id: "baby-bulmers-500", unitCost: 14.49, packSize: "12 x 500ml bottles" },
  { id: "baby-bulmers-red-berry", unitCost: 17.99, packSize: "12 x 500ml bottles" },
  { id: "square-desperados", unitCost: 30, packSize: "24 x 330ml bottles" },
  { id: "baby-bib-pepsi", unitCost: 69.93, packSize: "10L bag-in-box" },
  { id: "baby-jameson-15", unitCost: 37.89, packSize: "1.5L Bottle" },
  { id: "square-kit-kat", unitCost: 13.99, packSize: "24 bars" },
  { id: "snack-kp-salted-nuts", unitCost: 13.2, packSize: "24 x 50g" },
  { id: "baby-magners-568", unitCost: 16.99, packSize: "12 x 568ml bottles" },
  { id: "square-newcastle-brown-ale", unitCost: 21.43, packSize: "1 dozen 550ml bottles" },
  { id: "baby-pringles-bbq", unitCost: 8.99, packSize: "12 x 40g" },
  { id: "square-original-pringles", unitCost: 8.99, packSize: "12 x 40g" },
  { id: "square-salt-vinegar-pringles", unitCost: 8.99, packSize: "12 x 40g" },
  { id: "square-scampi-fries", unitCost: 10.99, packSize: "Card" },
  { id: "square-southern-comfort", unitCost: 36.66, packSize: "1.5L Bottle" },
  { id: "square-wkd-blue", unitCost: 21.86, packSize: "24 x 275ml bottles" },
  { id: "square-budwiser", unitCost: 20.99, packSize: "24 x 330ml bottles" },
  { id: "square-captain-morgan-tiki", unitCost: 15.2, packSize: "70cl Bottle" },
  { id: "square-courvoisier-vs-cognac-brandy", unitCost: 25.77, packSize: "70cl Bottle" },
  { id: "square-doombar", unitCost: 13.58, packSize: "8 x 500ml bottles" },
  { id: "baby-bib-pepsi-zero", unitCost: 52, packSize: "10L bag-in-box" },
  { id: "square-bear-star-sauvignon-blanc", unitCost: 43.19, packSize: "2 dozen single serve bottles" },
  { id: "square-red-bull", unitCost: 21.24, packSize: "2 dozen 250ml cans" },
  { id: "square-smirnoff-ice", unitCost: 25.99, packSize: "24 x 275ml bottles" },
  { id: "square-snickers", unitCost: 12.99, packSize: "24 bars" },
  { id: "square-stella", unitCost: 18.99, packSize: "18 x 330ml bottles" },
  { id: "square-ready-salted", unitCost: 16.99, packSize: "32 bags" }
];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ORDERS_DIR, { recursive: true });
fs.mkdirSync(DRAFTS_DIR, { recursive: true });
seedDataFiles();
pruneRemovedDuplicateStockItems();
reconcileStockCatalogue();

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
  let items = null;

  if (fs.existsSync(STOCK_FILE)) {
    try {
      items = JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    } catch {
      items = null;
    }
  }

  if (Array.isArray(items) && items.length >= MINIMUM_STOCK_ITEMS) {
    return items;
  }

  const seedItems = readSeedStockItems();
  if (seedItems.length) {
    writeStockItems(seedItems);
    return seedItems;
  }

  return Array.isArray(items) ? items : [];
}

function writeStockItems(items) {
  fs.writeFileSync(STOCK_FILE, JSON.stringify(items, null, 2));
}

function createStockItem(payload) {
  const name = cleanText(payload.name);
  const category = cleanText(payload.category) || "Bottles";
  if (!name) {
    const error = new Error("Item name is required.");
    error.statusCode = 400;
    throw error;
  }

  const items = readStockItems();
  const baseId = slugify(name);
  let id = baseId;
  let suffix = 2;
  while (items.some((item) => item.id === id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  const item = {
    id,
    name,
    sku: id.toUpperCase().slice(0, 24),
    category,
    supplier: "",
    packSize: "Regular",
    onHand: 0,
    reorderPoint: 1,
    reorderQuantity: 1,
    parLevel: 2,
    unitCost: parseMoney(payload.unitCost)
  };

  items.push(item);
  writeStockItems(items);
  return { item };
}

function updateStockItem(itemId, payload) {
  const name = cleanText(payload.name);
  const category = cleanText(payload.category);
  const items = readStockItems();
  const item = items.find((entry) => entry.id === itemId);

  if (!item) {
    const error = new Error("Stock item not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!name) {
    const error = new Error("Item name is required.");
    error.statusCode = 400;
    throw error;
  }

  item.name = name;
  if (category) item.category = category;
  if (Object.prototype.hasOwnProperty.call(payload, "unitCost")) {
    item.unitCost = parseMoney(payload.unitCost);
  }
  writeStockItems(items);
  return { item };
}

function parseMoney(value) {
  const parsed = Number(String(value ?? "").replace(/[£,]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;
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

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || `stock-${randomUUID().slice(0, 8)}`;
}

function seedDataFiles() {
  if (stockFileNeedsSeed() && fs.existsSync(SEED_STOCK_FILE) && STOCK_FILE !== SEED_STOCK_FILE) {
    fs.copyFileSync(SEED_STOCK_FILE, STOCK_FILE);
  }

  const seedOrdersDir = path.join(ROOT, "orders");
  if (seedOrdersDir !== ORDERS_DIR && fs.existsSync(seedOrdersDir) && !fs.readdirSync(ORDERS_DIR).length) {
    for (const fileName of fs.readdirSync(seedOrdersDir)) {
      fs.copyFileSync(path.join(seedOrdersDir, fileName), path.join(ORDERS_DIR, fileName));
    }
  }
}

function stockFileNeedsSeed() {
  if (!fs.existsSync(STOCK_FILE)) return true;

  try {
    const items = JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    return !Array.isArray(items) || items.length < MINIMUM_STOCK_ITEMS;
  } catch {
    return true;
  }
}

function readSeedStockItems() {
  if (!fs.existsSync(SEED_STOCK_FILE) || STOCK_FILE === SEED_STOCK_FILE) return [];

  try {
    const items = JSON.parse(fs.readFileSync(SEED_STOCK_FILE, "utf8"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function pruneRemovedDuplicateStockItems() {
  if (!fs.existsSync(STOCK_FILE)) return;

  const items = readStockItems();
  const nextItems = items.filter((item) => !REMOVED_DUPLICATE_STOCK_IDS.has(item.id));
  if (nextItems.length !== items.length) writeStockItems(nextItems);
}

function reconcileStockCatalogue() {
  const renameMap = new Map([
    ["Bear & Star Chardonay", "FlowerHead Chardonnay"],
    ["Bear & Star Merlot", "FlowerHead Merlot"],
    ["Bear & Star Pinot Grigio", "FlowerHead Pinot Grigio"],
    ["Bear & Star Pinot Grigio 187ml", "FlowerHead Pinot Grigio 187ml"],
    ["Bear & Star Sauvignon Blanc", "FlowerHead Sauvignon Blanc"],
    ["Bear & Star Shiraz", "FlowerHead Shiraz"],
    ["Bear & Star Zinfandel Rose", "FlowerHead Zinfandel Rose"],
    ["Ready salted", "Walkers Ready Salted"],
    ["Cheese & Onion", "Walkers Cheese & Onion"],
    ["Chicken", "Walkers Chicken"]
  ]);
  const items = readStockItems();
  let changed = false;

  for (const item of items) {
    if (renameMap.has(item.name)) {
      item.name = renameMap.get(item.name);
      changed = true;
    } else if (item.name.includes("Bear & Star")) {
      item.name = item.name.replaceAll("Bear & Star", "FlowerHead");
      changed = true;
    }

    if (item.category === "Spirits") {
      const packSize = String(item.packSize || "").trim().toLowerCase();
      const isUnspecifiedBottle = !packSize || packSize === "regular" || packSize === "single" || packSize.includes("25ml");
      const unitCost = Number(item.unitCost || 0);

      if (isUnspecifiedBottle && item.packSize !== "Bottle size needed") {
        item.packSize = "Bottle size needed";
        changed = true;
      }

      if (isUnspecifiedBottle && unitCost > 0 && unitCost < 2) {
        item.unitCost = 0;
        changed = true;
      }
    }
  }

  if (!items.some((item) => item.id === "britvic-slimline-tonic")) {
    items.push(stock("britvic-slimline-tonic", "Britvic Slimline Tonic", "Soft Drinks", "", "Regular", 0, 1));
    changed = true;
  }

  if (!items.some((item) => item.id === "kopparberg-strawberry-lime-0-0")) {
    items.push(stock("kopparberg-strawberry-lime-0-0", "Kopparberg Strawberry & Lime 0.0", "Bottles", "", "Regular", 0, 1));
    changed = true;
  }

  for (const patch of SQUARE_CATALOGUE_PATCHES) {
    const item = items.find((entry) => entry.id === patch.id || entry.name === patch.name);
    if (item) {
      if (patch.name && item.name !== patch.name) {
        item.name = patch.name;
        changed = true;
      }
      if (patch.category && item.category !== patch.category) {
        item.category = patch.category;
        changed = true;
      }
      if (Number(item.unitCost || 0) !== patch.unitCost) {
        item.unitCost = patch.unitCost;
        changed = true;
      }
      if (patch.packSize && item.packSize !== patch.packSize) {
        item.packSize = patch.packSize;
        changed = true;
      }
    } else if (patch.name && patch.category) {
      items.push(stock(patch.id, patch.name, patch.category, "", patch.packSize || "Regular", patch.unitCost, 1));
      changed = true;
    }
  }

  if (changed) writeStockItems(items);
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

function hasSupabase() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

async function supabaseRequest(pathname, options = {}) {
  if (!hasSupabase()) {
    const error = new Error("Supabase is not configured.");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || `Supabase returned ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/supplier-order/") && url.pathname.endsWith(".pdf")) {
      const orderId = decodeURIComponent(url.pathname.replace("/supplier-order/", "").replace(/\.pdf$/, ""));
      return await sendSavedOrderPdf(orderId, response, false);
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

    if (request.method === "POST" && url.pathname === "/api/catalog") {
      return sendJson(response, 201, createStockItem(await readJson(request)));
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/catalog/")) {
      return sendJson(response, 200, updateStockItem(decodeURIComponent(url.pathname.replace("/api/catalog/", "")), await readJson(request)));
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/catalog/")) {
      return sendJson(response, 200, deleteStockItem(decodeURIComponent(url.pathname.replace("/api/catalog/", ""))));
    }

    if (request.method === "GET" && url.pathname === "/api/orders") {
      return sendJson(response, 200, { orders: await readOrders() });
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/orders/") && url.pathname.endsWith("/priced-pdf")) {
      const orderId = decodeURIComponent(url.pathname.replace("/api/orders/", "").replace(/\/priced-pdf$/, ""));
      return await sendSavedOrderPdf(orderId, response, true);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/orders/") && url.pathname.endsWith("/pdf")) {
      const orderId = decodeURIComponent(url.pathname.replace("/api/orders/", "").replace(/\/pdf$/, ""));
      return await sendSavedOrderPdf(orderId, response, false);
    }

    if (request.method === "POST" && url.pathname === "/api/orders/restore") {
      return sendJson(response, 200, await restoreOrders(await readJson(request)));
    }

    if (request.method === "GET" && url.pathname === "/api/drafts") {
      return sendJson(response, 200, { drafts: await readDrafts() });
    }

    if (request.method === "POST" && url.pathname === "/api/drafts") {
      return sendJson(response, 200, await saveDraft(await readJson(request)));
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/drafts/")) {
      return sendJson(response, 200, await deleteDraft(decodeURIComponent(url.pathname.replace("/api/drafts/", ""))));
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/orders/")) {
      return sendJson(response, 200, await deleteOrder(decodeURIComponent(url.pathname.replace("/api/orders/", ""))));
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
  const existingOrders = await readOrders();

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
      category: cleanText(line.category),
      packSize: cleanText(line.packSize),
      quantity: Math.max(1, Math.floor(Number(line.quantity || 1))),
      unitCost: Number(line.unitCost || 0),
      vatRate: ZERO_RATE_VAT_ITEM_IDS.has(cleanText(line.id)) ? 0 : 0.2
    }))
  };

  const files = await writeOrder(order);
  const backupDraft = await writeSubmittedOrderBackup(order);
  sendOrderNotification(order, files);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    backupDraftId: backupDraft.id,
    backupDraftNumber: backupDraft.draftNumber,
    lineCount: order.lineItems.length,
    createdAt: order.createdAt
  };
}

function calculateOrderTotals(lineItems) {
  return lineItems.reduce((summary, line) => {
    const net = Number(line.unitCost || 0) * Number(line.quantity || 0);
    const vatRate = Number(line.vatRate ?? (ZERO_RATE_VAT_ITEM_IDS.has(cleanText(line.id)) ? 0 : 0.2));
    summary.net = Number((summary.net + net).toFixed(2));
    summary.vat = Number((summary.vat + net * vatRate).toFixed(2));
    summary.gross = Number((summary.net + summary.vat).toFixed(2));
    return summary;
  }, { net: 0, vat: 0, gross: 0 });
}

function orderBaseName(order) {
  return `${order.orderNumber}-${String(order.createdAt || new Date().toISOString()).slice(0, 10)}`;
}

function ensureSavedOrderPdfFile(savedOrder) {
  const pdfPath = path.join(ORDERS_DIR, savedOrder.pdfFileName);
  fs.writeFileSync(pdfPath, buildOrderPdf(savedOrder.order, { includePrices: false }));
  return { pdfPath };
}

function orderFromSupabaseRow(row) {
  const metadata = row.totals && typeof row.totals === "object" ? row.totals : {};
  const lineItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: row.id,
    orderNumber: row.order_number,
    neededBy: row.needed_by || "",
    note: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineItems,
    sourceOrderId: metadata.sourceOrderId || "",
    sourceOrderNumber: metadata.sourceOrderNumber || "",
    pdfPath: row.status === "submitted" ? `/supplier-order/${encodeURIComponent(row.id)}.pdf` : "",
    pricedPdfPath: row.status === "submitted" ? `/api/orders/${encodeURIComponent(row.id)}/priced-pdf` : "",
    pdfFileName: row.supplier_pdf_name || `${row.order_number}-${String(row.created_at || "").slice(0, 10)}.pdf`
  };
}

function draftFromSupabaseRow(row) {
  const metadata = row.totals && typeof row.totals === "object" ? row.totals : {};
  return {
    id: row.id,
    draftNumber: row.order_number,
    sourceOrderId: metadata.sourceOrderId || "",
    sourceOrderNumber: metadata.sourceOrderNumber || "",
    neededBy: row.needed_by || "",
    note: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lineItems: Array.isArray(row.items) ? row.items : []
  };
}

async function readCloudOrders() {
  const rows = await supabaseRequest("stock_orders?select=*&status=eq.submitted&deleted_at=is.null&order=created_at.desc");
  return rows.map(orderFromSupabaseRow);
}

async function readCloudDrafts() {
  const rows = await supabaseRequest("stock_orders?select=*&status=eq.draft&deleted_at=is.null&order=updated_at.desc");
  return rows.map(draftFromSupabaseRow);
}

async function writeCloudOrder(order, baseName = orderBaseName(order)) {
  const row = {
    id: order.id,
    order_number: order.orderNumber,
    status: "submitted",
    needed_by: order.neededBy || null,
    notes: order.note || "",
    items: order.lineItems,
    totals: calculateOrderTotals(order.lineItems),
    supplier_pdf_name: `${baseName}.pdf`,
    priced_pdf_name: `${baseName}-priced.pdf`,
    submitted_at: order.createdAt,
    deleted_at: null,
    created_at: order.createdAt,
    updated_at: order.createdAt
  };

  await supabaseRequest("stock_orders", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row)
  });
}

async function writeCloudDraft(draft) {
  const row = {
    id: draft.id,
    order_number: draft.draftNumber,
    status: "draft",
    needed_by: draft.neededBy || null,
    notes: draft.note || "",
    items: draft.lineItems,
    totals: {
      ...calculateOrderTotals(draft.lineItems),
      sourceOrderId: draft.sourceOrderId || "",
      sourceOrderNumber: draft.sourceOrderNumber || ""
    },
    deleted_at: null,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt
  };

  await supabaseRequest("stock_orders", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row)
  });
}

async function findCloudDraft(draftId) {
  const rows = await supabaseRequest(`stock_orders?select=*&id=eq.${encodeURIComponent(draftId)}&status=eq.draft&deleted_at=is.null&limit=1`);
  return rows[0] ? draftFromSupabaseRow(rows[0]) : null;
}

async function deleteCloudDraft(draftId) {
  const draft = await findCloudDraft(draftId);
  if (!draft) {
    const error = new Error("Draft order not found.");
    error.statusCode = 404;
    throw error;
  }

  await supabaseRequest(`stock_orders?id=eq.${encodeURIComponent(draftId)}&status=eq.draft`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ deleted_at: new Date().toISOString() })
  });

  return { deleted: true, draftId };
}

async function findCloudSavedOrder(orderId) {
  const rows = await supabaseRequest(`stock_orders?select=*&id=eq.${encodeURIComponent(orderId)}&status=eq.submitted&deleted_at=is.null&limit=1`);
  if (!rows[0]) return null;

  const order = orderFromSupabaseRow(rows[0]);
  const baseName = order.pdfFileName.replace(/\.pdf$/, "");
  return { order, baseName, pdfFileName: order.pdfFileName };
}

async function deleteCloudOrder(orderId) {
  const savedOrder = await findCloudSavedOrder(orderId);
  if (!savedOrder) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const deletedAt = new Date().toISOString();
  await supabaseRequest(`stock_orders?id=eq.${encodeURIComponent(orderId)}&status=eq.submitted`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ deleted_at: deletedAt })
  });
  const deletedDrafts = await deleteCloudDraftsForOrder(orderId, deletedAt);
  return { deleted: true, orderId, deletedDrafts };
}

async function deleteCloudDraftsForOrder(orderId, deletedAt = new Date().toISOString()) {
  const rows = await supabaseRequest(`stock_orders?select=id,totals&status=eq.draft&deleted_at=is.null`);
  const matchingIds = rows
    .filter((row) => row.id === `backup-${orderId}` || row.totals?.sourceOrderId === orderId)
    .map((row) => row.id);

  for (const draftId of matchingIds) {
    await supabaseRequest(`stock_orders?id=eq.${encodeURIComponent(draftId)}&status=eq.draft`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ deleted_at: deletedAt })
    });
  }

  return matchingIds;
}

function readOrders() {
  if (hasSupabase()) return readCloudOrders();

  return fs.readdirSync(ORDERS_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => {
      const filePath = path.join(ORDERS_DIR, fileName);
      const order = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const baseName = fileName.replace(/\.json$/, "");
      fs.writeFileSync(path.join(ORDERS_DIR, `${baseName}.pdf`), buildOrderPdf(order, { includePrices: false }));
      return {
        ...order,
        pdfPath: `/supplier-order/${encodeURIComponent(order.id)}.pdf`,
        pricedPdfPath: `/api/orders/${encodeURIComponent(order.id)}/priced-pdf`,
        pdfFileName: `${baseName}.pdf`
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function readDrafts() {
  if (hasSupabase()) return readCloudDrafts();

  return fs.readdirSync(DRAFTS_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, fileName), "utf8")))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

async function saveDraft(payload) {
  const lineItems = Array.isArray(payload.lineItems) ? payload.lineItems : [];

  if (!lineItems.length) {
    const error = new Error("Add at least one stock item before saving.");
    error.statusCode = 400;
    throw error;
  }

  const existingDraft = payload.id ? await findDraft(cleanText(payload.id)) : null;
  const existingDrafts = await readDrafts();
  const now = new Date().toISOString();
  const draft = {
    id: existingDraft?.id || randomUUID(),
    draftNumber: existingDraft?.draftNumber || `DRAFT-${String(existingDrafts.length + 1).padStart(4, "0")}`,
    neededBy: cleanText(payload.neededBy),
    note: cleanText(payload.note),
    createdAt: existingDraft?.createdAt || now,
    updatedAt: now,
    lineItems: lineItems.map((line) => ({
      id: cleanText(line.id),
      name: cleanText(line.name),
      sku: cleanText(line.sku),
      supplier: cleanText(line.supplier),
      category: cleanText(line.category),
      packSize: cleanText(line.packSize),
      quantity: Math.max(1, Math.floor(Number(line.quantity || 1))),
      unitCost: Number(line.unitCost || 0),
      vatRate: ZERO_RATE_VAT_ITEM_IDS.has(cleanText(line.id)) ? 0 : 0.2
    }))
  };

  if (hasSupabase()) {
    await writeCloudDraft(draft);
    return { draft };
  }

  fs.writeFileSync(path.join(DRAFTS_DIR, `${draft.id}.json`), JSON.stringify(draft, null, 2));
  return { draft };
}

async function writeSubmittedOrderBackup(order) {
  const now = new Date().toISOString();
  const draft = {
    id: `backup-${order.id}`,
    draftNumber: `BACKUP-${order.orderNumber}`,
    sourceOrderId: order.id,
    sourceOrderNumber: order.orderNumber,
    neededBy: order.neededBy,
    note: order.note,
    createdAt: now,
    updatedAt: now,
    lineItems: order.lineItems.map((line) => ({
      id: line.id,
      name: line.name,
      sku: line.sku,
      supplier: line.supplier,
      category: line.category,
      packSize: line.packSize,
      quantity: line.quantity,
      unitCost: line.unitCost,
      vatRate: line.vatRate
    }))
  };

  if (hasSupabase()) {
    await writeCloudDraft(draft);
    return draft;
  }

  fs.writeFileSync(path.join(DRAFTS_DIR, `${draft.id}.json`), JSON.stringify(draft, null, 2));
  return draft;
}

function findDraft(draftId) {
  if (hasSupabase()) return findCloudDraft(draftId);

  const filePath = path.join(DRAFTS_DIR, `${draftId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function deleteDraft(draftId) {
  if (hasSupabase()) return deleteCloudDraft(draftId);

  const filePath = path.join(DRAFTS_DIR, `${draftId}.json`);

  if (!fs.existsSync(filePath)) {
    const error = new Error("Draft order not found.");
    error.statusCode = 404;
    throw error;
  }

  fs.unlinkSync(filePath);
  return { deleted: true, draftId };
}

async function writeOrder(order) {
  const baseName = `${order.orderNumber}-${order.createdAt.slice(0, 10)}`;
  const jsonPath = path.join(ORDERS_DIR, `${baseName}.json`);
  const pdfPath = path.join(ORDERS_DIR, `${baseName}.pdf`);

  if (hasSupabase()) await writeCloudOrder(order, baseName);

  fs.writeFileSync(jsonPath, JSON.stringify(order, null, 2));
  fs.writeFileSync(pdfPath, buildOrderPdf(order, { includePrices: false }));

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
  const savedOrder = await findSavedOrder(orderId);
  if (!savedOrder) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  const files = ensureSavedOrderPdfFile(savedOrder);

  await sendOrderNotification(savedOrder.order, files, { throwOnError: true });
  return {
    sent: true,
    orderNumber: savedOrder.order.orderNumber,
    pdfFileName: savedOrder.pdfFileName
  };
}

async function deleteOrder(orderId) {
  if (hasSupabase()) return deleteCloudOrder(orderId);

  const savedOrder = await findSavedOrder(orderId);

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

  recordDeletedOrder(orderId);
  const deletedDrafts = await deleteDraftsForOrder(orderId);

  return { deleted: true, orderId, deletedDrafts };
}

async function deleteDraftsForOrder(orderId) {
  if (hasSupabase()) return deleteCloudDraftsForOrder(orderId);

  const deletedDrafts = [];

  for (const fileName of fs.readdirSync(DRAFTS_DIR).filter((entry) => entry.endsWith(".json"))) {
    const filePath = path.join(DRAFTS_DIR, fileName);
    try {
      const draft = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (draft.sourceOrderId === orderId || draft.id === `backup-${orderId}`) {
        fs.unlinkSync(filePath);
        deletedDrafts.push(draft.id);
      }
    } catch {
      // Ignore damaged draft files so one bad file cannot block deleting an order.
    }
  }

  return deletedDrafts;
}

function readDeletedOrderIds() {
  try {
    const ids = JSON.parse(fs.readFileSync(DELETED_ORDERS_FILE, "utf8"));
    return Array.isArray(ids) ? new Set(ids.map(cleanText).filter(Boolean)) : new Set();
  } catch {
    return new Set();
  }
}

function writeDeletedOrderIds(ids) {
  fs.writeFileSync(DELETED_ORDERS_FILE, JSON.stringify([...ids], null, 2));
}

function recordDeletedOrder(orderId) {
  const ids = readDeletedOrderIds();
  ids.add(cleanText(orderId));
  writeDeletedOrderIds(ids);
}

function findSavedOrder(orderId) {
  if (hasSupabase()) return findCloudSavedOrder(orderId);

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

async function sendSavedOrderPdf(orderId, response, includePrices) {
  const savedOrder = await findSavedOrder(orderId);
  if (!savedOrder) {
    return sendJson(response, 404, { message: "Order report not found." });
  }

  const pdf = buildOrderPdf(savedOrder.order, { includePrices });
  const fileName = includePrices
    ? savedOrder.pdfFileName.replace(/\.pdf$/, "-priced.pdf")
    : savedOrder.pdfFileName;
  response.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Content-Length": pdf.length,
    "Cache-Control": "no-store"
  });
  response.end(pdf);
}

async function restoreOrders(payload) {
  const incomingOrders = Array.isArray(payload.orders) ? payload.orders : [];
  const existingOrders = await readOrders();
  const existingIds = new Set(existingOrders.map((order) => order.id));
  const deletedIds = readDeletedOrderIds();

  for (const candidate of incomingOrders.slice(0, 250)) {
    const id = cleanText(candidate.id);
    const orderNumber = cleanText(candidate.orderNumber);
    const createdAt = cleanText(candidate.createdAt);
    const lineItems = Array.isArray(candidate.lineItems) ? candidate.lineItems : [];
    if (!id || !orderNumber || !createdAt || !lineItems.length || existingIds.has(id) || deletedIds.has(id)) continue;

    const restoredOrder = {
      id,
      orderNumber,
      neededBy: cleanText(candidate.neededBy),
      note: cleanText(candidate.note),
      createdAt,
      lineItems: lineItems.map((line) => ({
        id: cleanText(line.id),
        name: cleanText(line.name),
        sku: cleanText(line.sku),
        supplier: cleanText(line.supplier),
        packSize: cleanText(line.packSize),
        quantity: Math.max(1, Math.floor(Number(line.quantity || 1))),
        unitCost: Number(line.unitCost || 0),
        vatRate: Number(line.vatRate ?? (ZERO_RATE_VAT_ITEM_IDS.has(cleanText(line.id)) ? 0 : 0.2))
      }))
    };
    await writeOrder(restoredOrder);
    existingIds.add(id);
  }

  return { orders: await readOrders() };
}

function buildOrderPdf(order, options = {}) {
  const includePrices = options.includePrices !== false;
  const stockById = new Map(readStockItems().map((item) => [item.id, item]));
  const pricedLines = order.lineItems.map((line) => {
    const stockItem = stockById.get(line.id);
    return {
      ...line,
      packSize: line.packSize || stockItem?.packSize || "Each",
      unitCost: Number(line.unitCost || stockItem?.unitCost || 0),
      vatRate: Number(line.vatRate ?? (ZERO_RATE_VAT_ITEM_IDS.has(line.id) ? 0 : 0.2))
    };
  });

  if (!includePrices) return buildSupplierOrderPdf(order, pricedLines);

  const lineHeight = 16;
  const linesPerPage = 36;
  const totals = pricedLines.reduce((summary, line) => {
    const net = line.unitCost * Number(line.quantity || 0);
    summary.net += net;
    summary.vat += net * line.vatRate;
    return summary;
  }, { net: 0, vat: 0 });
  const detailRows = [
    ...wrapPdfLine(`Order: ${order.orderNumber}`),
    ...wrapPdfLine(`Date: ${formatDate(order.createdAt)}`),
    ...(order.neededBy ? wrapPdfLine(`Needed by: ${order.neededBy}`) : []),
    ...(order.note ? wrapPdfLine(`Notes: ${order.note}`) : []),
    { text: "", size: 9 },
    { text: "Items to supply", size: 11 },
    ...pricedLines.flatMap((line) => {
      const quantity = Number(line.quantity || 0);
      const rows = [...wrapPdfLine(`${quantity} x ${line.name}`)];
      if (includePrices) {
        rows.push(...wrapPdfLine(`Pack: ${line.packSize} | Expected price: ${formatPdfMoney(line.unitCost)} each | Line: ${formatPdfMoney(line.unitCost * quantity)}`));
        if (line.vatRate === 0) rows.push(...wrapPdfLine("VAT: zero-rated"));
      } else {
        rows.push(...wrapPdfLine(`Pack: ${line.packSize}`));
      }
      return [...rows, { text: "", size: 6 }];
    }),
    ...(includePrices ? [
      { text: "Expected order value", size: 11 },
      ...wrapPdfLine(`Subtotal before VAT: ${formatPdfMoney(totals.net)}`),
      ...wrapPdfLine(`VAT: ${formatPdfMoney(totals.vat)}`),
      ...wrapPdfLine(`Estimated total including VAT: ${formatPdfMoney(totals.net + totals.vat)}`),
      { text: "", size: 8 },
      ...wrapPdfLine("Internal copy: prices are estimates from the latest supplier invoices and can be checked against the delivery note.")
    ] : [])
  ];

  const pages = [];
  for (let index = 0; index < detailRows.length; index += linesPerPage) {
    const pageNumber = pages.length + 1;
    pages.push([
      {
        text: pageNumber === 1
          ? `The Domin Inn - ${includePrices ? "Priced Order Copy" : "Supplier Stock Order"}`
          : `${includePrices ? "Priced Order Copy" : "Supplier Stock Order"} - continued`,
        size: 12
      },
      ...(pageNumber > 1 ? [{ text: `Order: ${order.orderNumber}`, size: 9 }] : []),
      { text: "", size: 9 },
      ...detailRows.slice(index, index + linesPerPage)
    ]);
  }

  return renderPdfDocument(pages.map((pageRows) => pageRows.map((row, index) => {
    const y = 785 - index * lineHeight;
    return pdfText(50, y, row.text, row.size || 9.5);
  }).join("\n")));
}

function buildSupplierOrderPdf(order, lineItems) {
  const pageWidth = 595;
  const left = 78;
  const bottom = 86;
  const supplierLines = [...lineItems].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "en-GB", {
    numeric: true,
    sensitivity: "base"
  }));
  const pages = [];
  let commands = [];
  let y = 0;
  let pageNumber = 0;

  const startPage = (continued = false) => {
    commands = [];
    pageNumber += 1;
    y = 770;
    const orderLabel = supplierOrderLabel(order.orderNumber);
    const title = continued
      ? `The Domin Inn - Supplier Stock Order (${orderLabel}) - continued`
      : `The Domin Inn - Supplier Stock Order (${orderLabel})`;
    commands.push(pdfText(pageWidth / 2, y, title, continued ? 14 : 17, "F2", "center"));
    y -= 32;
  };

  const finishPage = () => {
    commands.push(pdfText(pageWidth / 2, 46, `Page ${pageNumber}`, 8, "F1", "center"));
    pages.push(commands.join("\n"));
  };

  const addSupplierRow = (line) => {
    const quantity = Number(line.quantity || 0);
    const itemText = `${quantity} x ${line.name}`;
    const itemLines = wrapPlainText(itemText, 62);
    const lineGap = 17;
    const rowHeight = Math.max(22, itemLines.length * lineGap);

    if (y - rowHeight < bottom) {
      finishPage();
      startPage(true);
    }

    itemLines.forEach((row, index) => {
      commands.push(pdfText(left, y - index * lineGap, row, 11));
    });
    y -= rowHeight;
  };

  startPage();
  supplierLines.forEach(addSupplierRow);
  finishPage();

  return renderPdfDocument(pages);
}

function supplierOrderLabel(orderNumber) {
  const numericPart = String(orderNumber || "").match(/\d+/)?.[0];
  return numericPart ? `Order ${Number(numericPart)}` : String(orderNumber || "Order");
}

function renderPdfDocument(pageStreams) {
  const fontObjectNumber = 3 + pageStreams.length * 2;
  const boldFontObjectNumber = fontObjectNumber + 1;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
  const pageRefs = [];

  pageStreams.forEach((commands) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = objects.length + 2;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R /F2 ${boldFontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageStreams.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

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

function pdfText(x, y, value, size = 10, font = "F1", align = "left") {
  const text = String(value || "");
  const adjustedX = align === "center" ? x - estimatePdfTextWidth(text, size) / 2 : x;
  return `BT /${font} ${size} Tf ${adjustedX.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`;
}

function wrapPlainText(value, maxCharacters) {
  return wrapPdfLine(value, maxCharacters).map((line) => line.text);
}

function estimatePdfTextWidth(value, size) {
  return String(value || "").length * size * 0.52;
}

function wrapPdfLine(value, maxCharacters = 78) {
  const text = String(value || "").trim();
  if (!text) return [{ text: "", size: 9 }];

  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharacters) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.map((line) => ({ text: line, size: 9.5 }));
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

function formatPdfMoney(value) {
  return `GBP ${Number(value || 0).toFixed(2)}`;
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
