export const ITEM_PRESETS = [
  { name: "60in Round Table",          category: "Tables",  material: "Wood",    description: "60-inch round banquet table, seats 8." },
  { name: "8ft Rectangle Table",       category: "Tables",  material: "Wood",    description: "8ft rectangular banquet table, seats 8–10." },
  { name: "Cocktail Table (High-top)", category: "Tables",  material: "Metal",   description: "42in high-top cocktail table." },
  { name: "Chiavari Chair",            category: "Seating", material: "Wood",    description: "Classic Chiavari ballroom chair with cushion." },
  { name: "Folding Chair (White)",     category: "Seating", material: "Plastic", description: "White resin folding chair." },
  { name: "Farmhouse Bench",           category: "Seating", material: "Wood",    description: "Rustic wooden farmhouse bench." },
  { name: "Linen Tablecloth (120in Round)", category: "Linens and Textiles", material: "Polyester", description: "120in round tablecloth, floor-length on 60in round." },
  { name: "Cloth Napkin",              category: "Linens and Textiles", material: "Cotton",   description: "Standard cloth dinner napkin." },
  { name: "Charger Plate",             category: "Tabletop and Place Settings", material: "Acrylic", description: "Decorative under-plate charger." },
  { name: "Dinner Plate",              category: "Tabletop and Place Settings", material: "Porcelain", description: "Standard 10in dinner plate." },
  { name: "Wine Glass",                category: "Tabletop and Place Settings", material: "Glass",  description: "Standard stemmed wine glass." },
  { name: "Champagne Flute",           category: "Tabletop and Place Settings", material: "Glass",  description: "Standard champagne flute." },
  { name: "Chafing Dish",              category: "Serving and Catering Equipment", material: "Stainless Steel", description: "Full-size chafing dish with fuel tray." },
  { name: "Beverage Dispenser",        category: "Bars and Beverage Stations", material: "Glass", description: "3-gallon glass beverage dispenser with spigot." },
  { name: "Portable Bar",              category: "Bars and Beverage Stations", material: "Wood",  description: "Freestanding portable event bar." },
  { name: "20x20 Frame Tent",          category: "Tents and Structures", material: "Metal", description: "20x20 white frame tent." },
  { name: "Dance Floor Panel",         category: "Flooring and Ground Cover", material: "Wood", description: "3x3 wooden dance floor panel." },
  { name: "String Lights (50ft)",      category: "Lighting", material: "Other", description: "50ft warm-white outdoor string lights." },
  { name: "Uplight",                   category: "Lighting", material: "Metal", description: "LED wireless uplight, color-changing." },
  { name: "Wireless Microphone",       category: "Audio, Video and Presentation", material: "Metal", description: "Handheld wireless microphone with receiver." },
  { name: "PA Speaker",                category: "Audio, Video and Presentation", material: "Plastic", description: "Powered PA speaker on stand." },
  { name: "Backdrop Frame",            category: "Backdrops, Walls and Draping", material: "Aluminum", description: "Adjustable pipe-and-drape backdrop frame." },
  { name: "Draping Panel",             category: "Backdrops, Walls and Draping", material: "Polyester", description: "Sheer draping panel." },
  { name: "Giant Connect 4",           category: "Games and Entertainment", material: "Wood",  description: "Yard-size Giant Connect 4 game." },
  { name: "Cornhole Set",              category: "Games and Entertainment", material: "Wood",  description: "Regulation cornhole board set with bags." },
  { name: "Ring Toss",                 category: "Games and Entertainment", material: "Wood",  description: "Yard ring toss game." },
  { name: "A-Frame Sign",              category: "Signage and Branding", material: "Metal", description: "A-frame sidewalk sign." },
  { name: "Stanchion (Velvet Rope)",   category: "Crowd Control and Site Management", material: "Metal", description: "Stanchion post with velvet rope." },
  { name: "Extension Cord (100ft)",    category: "Power and Electrical", material: "Rubber", description: "100ft heavy-duty outdoor extension cord." },
  { name: "Adirondack Chair",          category: "Outdoor Furniture and Amenities", material: "Wood", description: "Classic outdoor Adirondack chair." }
] as const

export interface ItemPreset {
  name: string
  category: string
  material: string
  description: string
}
