/**
 * Farmers Consensus - Static & Mock Data
 * Crop list; Philippine geography is loaded from /api/geo/* (official PSGC dataset).
 */

/** @deprecated Use /api/geo/* — kept for backward compatibility with any legacy references */
const PHILIPPINES_GEOGRAPHY = {};

const VEGETABLES = [
  // ═══════════════════════════════════════════════════
  // PRIMARY STAPLE PLANTATION
  // ═══════════════════════════════════════════════════
  { id: "rice", name: "Rice (Palay)", tag: "Palay", emoji: "🌾", image: "", yieldPerHa: 4.5, maturationDays: 115, color: "#eab308", class: "staple" },

  // ═══════════════════════════════════════════════════
  // BAGUIO / BENGUET HIGHLAND VEGETABLES
  // Source: DA-CAR, Benguet State University, PSA
  // ═══════════════════════════════════════════════════
  { id: "cabbage", name: "Cabbage", tag: "Repolyo", emoji: "🥬", image: "", yieldPerHa: 20.5, maturationDays: 75, color: "#10b981", class: "brassica" },
  { id: "napacabbage", name: "Napa Cabbage", tag: "Wombok", emoji: "🥬", image: "", yieldPerHa: 18.0, maturationDays: 60, color: "#10b981", class: "brassica" },
  { id: "pechay", name: "Chinese Cabbage", tag: "Pechay", emoji: "🍃", image: "", yieldPerHa: 15.0, maturationDays: 30, color: "#4ade80", class: "brassica" },
  { id: "broccoli", name: "Broccoli", tag: "Brokoli", emoji: "🥦", image: "", yieldPerHa: 14.5, maturationDays: 75, color: "#0284c7", class: "brassica" },
  { id: "cauliflower", name: "Cauliflower", tag: "Koliplawer", emoji: "💭", image: "", yieldPerHa: 15.0, maturationDays: 80, color: "#94a3b8", class: "brassica" },
  { id: "lettuce", name: "Lettuce", tag: "Latis", emoji: "🥬", image: "", yieldPerHa: 12.0, maturationDays: 45, color: "#22c55e", class: "salad" },
  { id: "celery", name: "Celery", tag: "Kinchay", emoji: "🥬", image: "", yieldPerHa: 12.0, maturationDays: 85, color: "#a3e635", class: "salad" },
  { id: "carrot", name: "Carrot", tag: "Karot", emoji: "🥕", image: "", yieldPerHa: 18.0, maturationDays: 90, color: "#f59e0b", class: "root" },
  { id: "radish", name: "Radish", tag: "Labanos", emoji: "🥕", image: "", yieldPerHa: 18.0, maturationDays: 50, color: "#cbd5e1", class: "root" },
  { id: "potato", name: "Potato", tag: "Patatas", emoji: "🥔", image: "", yieldPerHa: 22.0, maturationDays: 100, color: "#b45309", class: "tuber" },
  { id: "sayote", name: "Sayote (Chayote)", tag: "Sayote", emoji: "🍏", image: "", yieldPerHa: 15.0, maturationDays: 120, color: "#86efac", class: "cucurbit" },
  { id: "bellpepper", name: "Bell Pepper", tag: "Siling Lara", emoji: "🫑", image: "", yieldPerHa: 12.5, maturationDays: 85, color: "#f43f5e", class: "nightshade" },
  { id: "sugarpeas", name: "Sweet Peas", tag: "Chicharo", emoji: "🫛", image: "", yieldPerHa: 8.0, maturationDays: 65, color: "#84cc16", class: "legume" },
  { id: "baguiobeans", name: "Baguio Beans", tag: "Habitchuelas", emoji: "🫛", image: "", yieldPerHa: 9.0, maturationDays: 55, color: "#65a30d", class: "legume" },
  { id: "strawberry", name: "Strawberry", tag: "Presa", emoji: "🍓", image: "", yieldPerHa: 5.0, maturationDays: 90, color: "#e11d48", class: "fruit" },

  // ═══════════════════════════════════════════════════
  // LOWLAND & MID-ELEVATION CROPS
  // ═══════════════════════════════════════════════════
  { id: "tomato", name: "Tomato", tag: "Kamatis", emoji: "🍅", image: "", yieldPerHa: 25.0, maturationDays: 85, color: "#ef4444", class: "nightshade" },
  { id: "eggplant", name: "Eggplant", tag: "Talong", emoji: "🍆", image: "", yieldPerHa: 15.0, maturationDays: 80, color: "#8b5cf6", class: "nightshade" },
  { id: "ampalaya", name: "Bitter Gourd", tag: "Ampalaya", emoji: "🥒", image: "", yieldPerHa: 12.0, maturationDays: 70, color: "#047857", class: "cucurbit" },
  { id: "cucumber", name: "Cucumber", tag: "Pipino", emoji: "🥒", image: "", yieldPerHa: 18.0, maturationDays: 60, color: "#15803d", class: "cucurbit" },
  { id: "squash", name: "Squash", tag: "Kalabasa", emoji: "🎃", image: "", yieldPerHa: 28.0, maturationDays: 110, color: "#f97316", class: "cucurbit" },
  { id: "chili", name: "Chili", tag: "Siling Haba", emoji: "🌶️", image: "", yieldPerHa: 8.5, maturationDays: 75, color: "#dc2626", class: "nightshade" },
  { id: "stringbeans", name: "String Beans", tag: "Sitaw", emoji: "🫛", image: "", yieldPerHa: 10.0, maturationDays: 60, color: "#16a34a", class: "legume" },
  { id: "onion", name: "Onion", tag: "Sibuyas", emoji: "🧅", image: "", yieldPerHa: 16.5, maturationDays: 120, color: "#ec4899", class: "allium" },
  { id: "garlic", name: "Garlic", tag: "Bawang", emoji: "🧄", image: "", yieldPerHa: 7.0, maturationDays: 130, color: "#78716c", class: "allium" },
  { id: "other", name: "Other Vegetables", tag: "Iba Pa", emoji: "🌱", image: "", yieldPerHa: 10.0, maturationDays: 60, color: "#6b7280", class: "other" }
];

// No mock registrations - platform starts with zero farmers
const MOCK_REGISTRATIONS = [];

// Make data globally available
window.PHILIPPINES_GEOGRAPHY = PHILIPPINES_GEOGRAPHY;
window.VEGETABLES = VEGETABLES;
window.MOCK_REGISTRATIONS = MOCK_REGISTRATIONS;

// Debug: Log data availability
console.log('Philippine geography: loaded via /api/geo (PSGC)');
console.log('VEGETABLES loaded:', VEGETABLES.length, 'vegetables');
