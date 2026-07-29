export const CATEGORIES = [
  "Tables","Seating","Linens and Textiles","Tabletop and Place Settings",
  "Serving and Catering Equipment","Bars and Beverage Stations",
  "Tents and Structures","Flooring and Ground Cover","Lighting",
  "Audio, Video and Presentation","Stages, Truss and Production",
  "Backdrops, Walls and Draping","Decor and Styling","Florals and Greenery",
  "Photo Booths and Interactive Media","Games and Entertainment",
  "Inflatables and Children's Attractions","Signage and Branding",
  "Crowd Control and Site Management","Power and Electrical",
  "Safety and Accessibility","Outdoor Furniture and Amenities",
  "Holiday and Seasonal Decor"
] as const

export const COLORS = [
  "White","Black","Ivory","Beige","Natural","Brown","Gray","Gold","Silver",
  "Rose Gold","Clear","Red","Burgundy","Orange","Yellow","Green","Sage",
  "Emerald","Blue","Navy","Purple","Lavender","Pink","Blush","Multicolor",
  "Custom"
] as const

export const MATERIALS = [
  "Wood","Metal","Aluminum","Steel","Stainless Steel","Acrylic","Glass",
  "Ceramic","Porcelain","Plastic","Resin","Rattan","Wicker","Fabric","Vinyl",
  "Leather","Faux Leather","Velvet","Linen","Polyester","Cotton","Rubber",
  "Turf","Composite","Paper","Foam","Mixed Materials","Other"
] as const

export const CONDITIONS = [
  "New","Excellent","Good","Fair","Service Required","Damaged","Retired"
] as const

export const UNIT_STATUSES = [
  "good","needsRepair","needsReplacement"
] as const

export const UNIT_STATUS_LABELS = {
  good: "Good",
  needsRepair: "Needs Repair",
  needsReplacement: "Needs Replacement"
}

export type Category = typeof CATEGORIES[number]
export type Color = typeof COLORS[number]
export type Material = typeof MATERIALS[number]
export type Condition = typeof CONDITIONS[number]
export type UnitStatus = typeof UNIT_STATUSES[number]
