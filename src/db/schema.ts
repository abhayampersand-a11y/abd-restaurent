/**
 * ABD Restaurant — Drizzle schema (Neon Postgres).
 *
 * Conventions
 * -----------
 * - Every table has `id` (uuid), `createdAt`, `updatedAt`.
 * - "Demo-writable" tables carry `sessionId` + `expiresAt` so the 5-minute
 *   Live Demo sandbox can be isolated per session and auto-purged by cron.
 *   For real (non-demo) rows these columns are NULL.
 * - Money is stored in the smallest currency unit conceptually, but for
 *   simplicity we use `numeric` with 2 decimals (INR rupees) throughout.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const userRole = pgEnum("user_role", [
  "admin",
  "manager",
  "chef",
  "waiter",
]);

export const tableStatus = pgEnum("table_status", [
  "free",
  "occupied",
  "reserved",
  "cleaning",
]);

export const orderMode = pgEnum("order_mode", [
  "dine_in",
  "takeaway",
  "delivery",
]);

export const orderStatus = pgEnum("order_status", [
  "placed",
  "accepted",
  "cooking",
  "ready",
  "served",
  "completed",
  "cancelled",
]);

export const cookingStatus = pgEnum("cooking_status", [
  "pending",
  "cooking",
  "ready",
  "served",
]);

export const station = pgEnum("station", ["kitchen", "bar"]);

export const paymentMethod = pgEnum("payment_method", [
  "upi",
  "card",
  "netbanking",
  "cash",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
]);

export const waitlistStatus = pgEnum("waitlist_status", [
  "waiting",
  "notified",
  "seated",
  "cancelled",
]);

export const couponType = pgEnum("coupon_type", ["percent", "flat"]);

export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "received",
  "cancelled",
]);

export const notificationType = pgEnum("notification_type", [
  "order",
  "low_stock",
  "big_order",
  "negative_review",
  "reservation",
  "system",
]);

/* ------------------------------------------------------------------ */
/* Shared column helpers                                              */
/* ------------------------------------------------------------------ */

/** Standard timestamps present on every table. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/**
 * Columns that make a row belong to (and expire with) a Live Demo session.
 * NULL for real data. `expiresAt` drives the cron purge.
 */
const demoColumns = {
  sessionId: text("session_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
};

const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/* ------------------------------------------------------------------ */
/* Auth / Users / Roles                                              */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("waiter"),
    phone: text("phone"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [unique("users_email_unique").on(t.email), index("users_role_idx").on(t.role)],
);

/* ------------------------------------------------------------------ */
/* Rooms & Tables                                                    */
/* ------------------------------------------------------------------ */

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    floor: text("floor"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("rooms_session_idx").on(t.sessionId)],
);

export const tables = pgTable(
  "tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull().default(4),
    status: tableStatus("status").notNull().default("free"),
    qrToken: text("qr_token").notNull(),
    /** When tables are merged, the "child" tables point at the primary table. */
    mergedWith: uuid("merged_with"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    unique("tables_qr_token_unique").on(t.qrToken),
    index("tables_room_idx").on(t.roomId),
    index("tables_status_idx").on(t.status),
    index("tables_session_idx").on(t.sessionId),
  ],
);

/* ------------------------------------------------------------------ */
/* Menu                                                              */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("categories_session_idx").on(t.sessionId)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    price: money("price").notNull(),
    costPrice: money("cost_price"),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(10),
    veg: boolean("veg").notNull().default(true),
    /** Free-form allergen tags, e.g. ["nuts","dairy"]. */
    allergens: text("allergens").array(),
    calories: integer("calories"),
    imageUrl: text("image_url"),
    isAvailable: boolean("is_available").notNull().default(true),
    station: station("station").notNull().default("kitchen"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("menu_items_category_idx").on(t.categoryId),
    index("menu_items_available_idx").on(t.isAvailable),
    index("menu_items_session_idx").on(t.sessionId),
  ],
);

export const menuItemTranslations = pgTable(
  "menu_item_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    unique("menu_item_translations_unique").on(t.menuItemId, t.locale),
    index("menu_item_translations_item_idx").on(t.menuItemId),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders                                                            */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-friendly order number, e.g. "A-1042". */
    orderNumber: text("order_number").notNull(),
    tableId: uuid("table_id").references(() => tables.id, {
      onDelete: "set null",
    }),
    mode: orderMode("mode").notNull().default("dine_in"),
    status: orderStatus("status").notNull().default("placed"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    isRush: boolean("is_rush").notNull().default(false),
    subtotal: money("subtotal").notNull().default("0"),
    tax: money("tax").notNull().default("0"),
    discount: money("discount").notNull().default("0"),
    tip: money("tip").notNull().default("0"),
    total: money("total").notNull().default("0"),
    /** Billing extras (Phase 3): applied coupon + loyalty points redeemed. */
    couponCode: text("coupon_code"),
    loyaltyRedeemed: integer("loyalty_redeemed").notNull().default(0),
    /** Delivery address for `mode = delivery`. */
    deliveryAddress: text("delivery_address"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    unique("orders_number_unique").on(t.orderNumber),
    index("orders_table_idx").on(t.tableId),
    index("orders_status_idx").on(t.status),
    index("orders_session_idx").on(t.sessionId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
      onDelete: "set null",
    }),
    /** Snapshot of the item name at order time (menu items can change). */
    nameSnapshot: text("name_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: money("unit_price").notNull(),
    notes: text("notes"),
    cookingStatus: cookingStatus("cooking_status").notNull().default("pending"),
    station: station("station").notNull().default("kitchen"),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(10),
    startedAt: timestamp("started_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    servedAt: timestamp("served_at", { withTimezone: true }),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    index("order_items_status_idx").on(t.cookingStatus),
    index("order_items_session_idx").on(t.sessionId),
  ],
);

/* ------------------------------------------------------------------ */
/* Reservations & Waitlist                                           */
/* ------------------------------------------------------------------ */

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    partySize: integer("party_size").notNull().default(2),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
    tableId: uuid("table_id").references(() => tables.id, {
      onDelete: "set null",
    }),
    reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    status: reservationStatus("status").notNull().default("pending"),
    notes: text("notes"),
    /** Optional pre-ordered items: [{ menuItemId, quantity }]. */
    preOrder: jsonb("pre_order"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("reservations_time_idx").on(t.reservedAt),
    index("reservations_table_idx").on(t.tableId),
    index("reservations_session_idx").on(t.sessionId),
  ],
);

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    partySize: integer("party_size").notNull().default(2),
    status: waitlistStatus("status").notNull().default("waiting"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("waitlist_session_idx").on(t.sessionId)],
);

/* ------------------------------------------------------------------ */
/* Payments & Promotions                                             */
/* ------------------------------------------------------------------ */

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    method: paymentMethod("method").notNull().default("upi"),
    amount: money("amount").notNull(),
    tip: money("tip").notNull().default("0"),
    tax: money("tax").notNull().default("0"),
    discount: money("discount").notNull().default("0"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    status: paymentStatus("status").notNull().default("pending"),
    /** For split bills: which portion this payment covers. */
    splitLabel: text("split_label"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_status_idx").on(t.status),
    index("payments_session_idx").on(t.sessionId),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: couponType("type").notNull().default("percent"),
    value: money("value").notNull(),
    minOrder: money("min_order").notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    /** Happy-hour window support (0-23) — optional. */
    happyHourStart: integer("happy_hour_start"),
    happyHourEnd: integer("happy_hour_end"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [unique("coupons_code_unique").on(t.code)],
);

export const loyaltyPoints = pgTable(
  "loyalty_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerPhone: text("customer_phone").notNull(),
    points: integer("points").notNull().default(0),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [unique("loyalty_phone_unique").on(t.customerPhone)],
);

/* ------------------------------------------------------------------ */
/* Reviews & Feedback                                                */
/* ------------------------------------------------------------------ */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
      onDelete: "cascade",
    }),
    rating: integer("rating").notNull(),
    serviceRating: integer("service_rating"),
    comment: text("comment"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("reviews_item_idx").on(t.menuItemId),
    index("reviews_session_idx").on(t.sessionId),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    name: text("name"),
    message: text("message").notNull(),
    rating: integer("rating"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("feedback_session_idx").on(t.sessionId)],
);

/* ------------------------------------------------------------------ */
/* Inventory & Suppliers                                             */
/* ------------------------------------------------------------------ */

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("g"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("ingredients_session_idx").on(t.sessionId)],
);

/** Recipe = which ingredients (and how much) a menu item consumes. */
export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    unique("recipes_item_ingredient_unique").on(t.menuItemId, t.ingredientId),
    index("recipes_item_idx").on(t.menuItemId),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    lowStockThreshold: numeric("low_stock_threshold", {
      precision: 12,
      scale: 3,
    })
      .notNull()
      .default("0"),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    wastage: numeric("wastage", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    unique("inventory_ingredient_unique").on(t.ingredientId),
    index("inventory_session_idx").on(t.sessionId),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("suppliers_session_idx").on(t.sessionId)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    status: purchaseOrderStatus("status").notNull().default("draft"),
    total: money("total").notNull().default("0"),
    /** Line items: [{ ingredientId, quantity, unitCost }]. */
    items: jsonb("items"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("purchase_orders_supplier_idx").on(t.supplierId)],
);

/* ------------------------------------------------------------------ */
/* Staff                                                             */
/* ------------------------------------------------------------------ */

export const staffShifts = pgTable(
  "staff_shifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    role: userRole("role"),
    notes: text("notes"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("staff_shifts_user_idx").on(t.userId)],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkIn: timestamp("check_in", { withTimezone: true }),
    checkOut: timestamp("check_out", { withTimezone: true }),
    workDate: timestamp("work_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [index("attendance_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Audit & Notifications                                             */
/* ------------------------------------------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_log_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull().default("system"),
    title: text("title").notNull(),
    message: text("message"),
    isRead: boolean("is_read").notNull().default(false),
    meta: jsonb("meta"),
    ...demoColumns,
    ...timestamps,
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_session_idx").on(t.sessionId),
  ],
);

/* ------------------------------------------------------------------ */
/* Live Demo sessions                                                */
/* ------------------------------------------------------------------ */

export const demoSessions = pgTable(
  "demo_sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("demo_sessions_expires_idx").on(t.expiresAt)],
);

/**
 * Tables that carry `session_id` + `expires_at` and must be purged when a
 * Live Demo session ends. Kept as Drizzle table objects so the cron job can
 * iterate and delete generically. (audit_log is intentionally excluded — it
 * has no demo columns.)
 */
export const DEMO_TABLES = [
  notifications,
  orderItems,
  orders,
  payments,
  reviews,
  feedback,
  reservations,
  waitlist,
  menuItemTranslations,
  menuItems,
  categories,
  tables,
  rooms,
  ingredients,
  inventory,
  suppliers,
  purchaseOrders,
  staffShifts,
  attendance,
  loyaltyPoints,
  coupons,
  users,
] as const;
