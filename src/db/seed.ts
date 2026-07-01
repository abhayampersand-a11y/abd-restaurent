/**
 * Seed script — populates a fresh database with realistic demo data.
 *
 * Run with:  yarn db:seed
 *
 * Idempotent-ish: it clears the core tables first so re-running gives a clean,
 * predictable dataset. It NEVER touches demo-session rows created at runtime.
 */
import { config } from "dotenv";
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { isNull } from "drizzle-orm";

import { db } from "./index";
import {
  categories,
  ingredients,
  inventory,
  menuItems,
  recipes,
  rooms,
  suppliers,
  tables,
  users,
  coupons,
} from "./schema";
import { generateQrToken } from "@/lib/qr";

async function main() {
  console.log("🌱 Seeding ABD Restaurant database…");

  // ---- Clean real (non-demo) rows so the seed is deterministic ----------
  // Delete order matters due to FKs; children first.
  await db.delete(recipes).where(isNull(recipes.sessionId));
  await db.delete(inventory).where(isNull(inventory.sessionId));
  await db.delete(menuItems).where(isNull(menuItems.sessionId));
  await db.delete(categories).where(isNull(categories.sessionId));
  await db.delete(tables).where(isNull(tables.sessionId));
  await db.delete(rooms).where(isNull(rooms.sessionId));
  await db.delete(ingredients).where(isNull(ingredients.sessionId));
  await db.delete(suppliers).where(isNull(suppliers.sessionId));
  await db.delete(coupons).where(isNull(coupons.sessionId));
  await db.delete(users).where(isNull(users.sessionId));

  // ---- Staff / users ----------------------------------------------------
  const pw = await bcrypt.hash("password123", 10);
  const staff = await db
    .insert(users)
    .values([
      { name: "Aarav Admin", email: "admin@abd.test", passwordHash: pw, role: "admin", phone: "+919000000001" },
      { name: "Meera Manager", email: "manager@abd.test", passwordHash: pw, role: "manager", phone: "+919000000002" },
      { name: "Chef Vikram", email: "chef@abd.test", passwordHash: pw, role: "chef", phone: "+919000000003" },
      { name: "Waiter Ravi", email: "waiter@abd.test", passwordHash: pw, role: "waiter", phone: "+919000000004" },
    ])
    .returning();
  console.log(`  ✓ ${staff.length} staff users (login: admin@abd.test / password123)`);

  // ---- Rooms + tables ---------------------------------------------------
  const roomDefs = [
    { name: "Ground Floor", floor: "G", description: "Main dining area", sortOrder: 1, seats: [2, 2, 4, 4, 6] },
    { name: "AC Hall", floor: "1", description: "Air-conditioned family hall", sortOrder: 2, seats: [4, 4, 6, 8] },
    { name: "Rooftop", floor: "3", description: "Open-air rooftop seating", sortOrder: 3, seats: [2, 4, 4, 6] },
    { name: "Cabins", floor: "1", description: "Private cabins", sortOrder: 4, seats: [4, 4] },
  ];

  let tableCount = 0;
  for (const rd of roomDefs) {
    const [room] = await db
      .insert(rooms)
      .values({ name: rd.name, floor: rd.floor, description: rd.description, sortOrder: rd.sortOrder })
      .returning();
    const tableRows = rd.seats.map((cap, i) => ({
      roomId: room.id,
      name: `${rd.name.split(" ")[0].slice(0, 2).toUpperCase()}-${i + 1}`,
      capacity: cap,
      qrToken: generateQrToken(),
      status: "free" as const,
    }));
    await db.insert(tables).values(tableRows);
    tableCount += tableRows.length;
  }
  console.log(`  ✓ ${roomDefs.length} rooms, ${tableCount} tables (with QR tokens)`);

  // ---- Categories -------------------------------------------------------
  const catDefs = [
    { name: "Starters", sortOrder: 1 },
    { name: "Main Course", sortOrder: 2 },
    { name: "Breads", sortOrder: 3 },
    { name: "Rice & Biryani", sortOrder: 4 },
    { name: "Desserts", sortOrder: 5 },
    { name: "Beverages", sortOrder: 6 },
  ];
  const cats = await db.insert(categories).values(catDefs).returning();
  const catId = (name: string) => cats.find((c) => c.name === name)!.id;

  // ---- Menu items -------------------------------------------------------
  const menuDefs = [
    { cat: "Starters", name: "Paneer Tikka", price: "240", cost: "90", prep: 12, veg: true, cal: 320, allergens: ["dairy"], station: "kitchen" as const },
    { cat: "Starters", name: "Chicken 65", price: "280", cost: "120", prep: 14, veg: false, cal: 410, allergens: ["gluten"], station: "kitchen" as const },
    { cat: "Starters", name: "Veg Spring Rolls", price: "180", cost: "60", prep: 10, veg: true, cal: 260, allergens: ["gluten", "soy"], station: "kitchen" as const },
    { cat: "Main Course", name: "Butter Chicken", price: "360", cost: "150", prep: 18, veg: false, cal: 620, allergens: ["dairy", "nuts"], station: "kitchen" as const },
    { cat: "Main Course", name: "Paneer Butter Masala", price: "320", cost: "120", prep: 16, veg: true, cal: 560, allergens: ["dairy", "nuts"], station: "kitchen" as const },
    { cat: "Main Course", name: "Dal Makhani", price: "260", cost: "80", prep: 20, veg: true, cal: 480, allergens: ["dairy"], station: "kitchen" as const },
    { cat: "Breads", name: "Butter Naan", price: "60", cost: "15", prep: 6, veg: true, cal: 210, allergens: ["gluten", "dairy"], station: "kitchen" as const },
    { cat: "Breads", name: "Garlic Roti", price: "50", cost: "12", prep: 6, veg: true, cal: 180, allergens: ["gluten"], station: "kitchen" as const },
    { cat: "Rice & Biryani", name: "Chicken Biryani", price: "340", cost: "140", prep: 22, veg: false, cal: 700, allergens: [], station: "kitchen" as const },
    { cat: "Rice & Biryani", name: "Veg Pulao", price: "220", cost: "70", prep: 15, veg: true, cal: 420, allergens: [], station: "kitchen" as const },
    { cat: "Desserts", name: "Gulab Jamun", price: "120", cost: "40", prep: 5, veg: true, cal: 380, allergens: ["dairy", "gluten"], station: "kitchen" as const },
    { cat: "Desserts", name: "Gajar Halwa", price: "140", cost: "50", prep: 7, veg: true, cal: 450, allergens: ["dairy", "nuts"], station: "kitchen" as const },
    { cat: "Beverages", name: "Masala Chai", price: "40", cost: "10", prep: 5, veg: true, cal: 90, allergens: ["dairy"], station: "bar" as const },
    { cat: "Beverages", name: "Sweet Lassi", price: "90", cost: "30", prep: 4, veg: true, cal: 220, allergens: ["dairy"], station: "bar" as const },
    { cat: "Beverages", name: "Fresh Lime Soda", price: "70", cost: "20", prep: 3, veg: true, cal: 80, allergens: [], station: "bar" as const },
  ];
  const items = await db
    .insert(menuItems)
    .values(
      menuDefs.map((m, i) => ({
        categoryId: catId(m.cat),
        name: m.name,
        description: `${m.veg ? "Veg" : "Non-veg"} • ${m.cal} kcal`,
        price: m.price,
        costPrice: m.cost,
        prepTimeMinutes: m.prep,
        veg: m.veg,
        allergens: m.allergens,
        calories: m.cal,
        station: m.station,
        sortOrder: i,
        isAvailable: true,
      })),
    )
    .returning();
  console.log(`  ✓ ${cats.length} categories, ${items.length} menu items`);

  // ---- Suppliers / ingredients / inventory / recipes --------------------
  await db.insert(suppliers).values([
    { name: "FreshFarm Produce", contactName: "Sunil", phone: "+919812345678", email: "orders@freshfarm.test" },
    { name: "DairyBest Co.", contactName: "Anita", phone: "+919887654321", email: "sales@dairybest.test" },
  ]);

  const ingDefs = [
    { name: "Paneer", unit: "g", qty: "5000", low: "1000" },
    { name: "Chicken", unit: "g", qty: "8000", low: "2000" },
    { name: "Butter", unit: "g", qty: "3000", low: "800" },
    { name: "Basmati Rice", unit: "g", qty: "20000", low: "4000" },
    { name: "Onion", unit: "g", qty: "15000", low: "3000" },
    { name: "Tomato", unit: "g", qty: "12000", low: "3000" },
    { name: "Milk", unit: "ml", qty: "10000", low: "2000" },
  ];
  const ings = await db
    .insert(ingredients)
    .values(ingDefs.map((i) => ({ name: i.name, unit: i.unit })))
    .returning();
  await db.insert(inventory).values(
    ingDefs.map((i) => ({
      ingredientId: ings.find((x) => x.name === i.name)!.id,
      quantity: i.qty,
      lowStockThreshold: i.low,
    })),
  );
  const ingId = (n: string) => ings.find((x) => x.name === n)!.id;
  const itemId = (n: string) => items.find((x) => x.name === n)!.id;

  // A few recipes so inventory auto-deduct / auto-disable can be demoed.
  await db.insert(recipes).values([
    { menuItemId: itemId("Paneer Tikka"), ingredientId: ingId("Paneer"), quantity: "200" },
    { menuItemId: itemId("Butter Chicken"), ingredientId: ingId("Chicken"), quantity: "250" },
    { menuItemId: itemId("Butter Chicken"), ingredientId: ingId("Butter"), quantity: "50" },
    { menuItemId: itemId("Paneer Butter Masala"), ingredientId: ingId("Paneer"), quantity: "220" },
    { menuItemId: itemId("Chicken Biryani"), ingredientId: ingId("Chicken"), quantity: "300" },
    { menuItemId: itemId("Chicken Biryani"), ingredientId: ingId("Basmati Rice"), quantity: "200" },
    { menuItemId: itemId("Sweet Lassi"), ingredientId: ingId("Milk"), quantity: "200" },
  ]);
  console.log(`  ✓ suppliers, ${ings.length} ingredients, inventory, recipes`);

  // ---- Coupons ----------------------------------------------------------
  await db.insert(coupons).values([
    { code: "WELCOME10", type: "percent", value: "10", minOrder: "300", isActive: true },
    { code: "FLAT50", type: "flat", value: "50", minOrder: "500", isActive: true },
  ]);
  console.log("  ✓ coupons (WELCOME10, FLAT50)");

  console.log("✅ Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
