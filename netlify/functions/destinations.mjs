export const DESTINATIONS = {
  "Visakhapatnam & Araku": {
    region: "Andhra Pradesh",
    tagline: "Coastline mornings, coffee hills by afternoon.",
    starting: 2600,
    activities: [
      { name: "Kailasagiri viewpoint", kind: "nature", cost: 80, time: "Morning", detail: "Ride the hilltop ropeway for a wide view of the Bay of Bengal." },
      { name: "RK Beach & Submarine Museum", kind: "culture", cost: 120, time: "Late morning", detail: "Walk the seafront and explore a submarine museum with a local host." },
      { name: "Borra Caves", kind: "adventure", cost: 250, time: "Morning", detail: "See dramatic limestone formations in the Eastern Ghats." },
      { name: "Araku coffee estate", kind: "food", cost: 350, time: "Afternoon", detail: "Taste locally grown coffee and learn how the valley harvests it." },
      { name: "Tribal Museum", kind: "culture", cost: 100, time: "Afternoon", detail: "Discover the craft, music and daily life of Araku communities." },
      { name: "Yarada Beach", kind: "nature", cost: 0, time: "Sunset", detail: "Finish the day at a quieter cove between green hills." }
    ]
  },
  Tirupati: {
    region: "Andhra Pradesh",
    tagline: "A thoughtful pilgrimage through the Tirumala hills.",
    starting: 2200,
    activities: [
      { name: "Sri Venkateswara Temple", kind: "culture", cost: 300, time: "Early morning", detail: "Plan darshan timing and local etiquette with a knowledgeable guide." },
      { name: "Sri Vari Museum", kind: "culture", cost: 0, time: "Late morning", detail: "Explore the temple's history, art and traditions." },
      { name: "Akasa Ganga waterfall", kind: "nature", cost: 80, time: "Afternoon", detail: "Visit a sacred waterfall tucked into the forested hills." },
      { name: "Kapila Theertham", kind: "culture", cost: 0, time: "Morning", detail: "See the ancient temple and waterfall at the foot of Tirumala." },
      { name: "Local prasadam & tiffin trail", kind: "food", cost: 250, time: "Evening", detail: "Sample regional vegetarian favourites around Tirupati." },
      { name: "Talakona forest walk", kind: "adventure", cost: 150, time: "Morning", detail: "Take an easy guided walk through the forest reserve." }
    ]
  },
  Jaipur: {
    region: "Rajasthan",
    tagline: "Pink City lanes, palace stories and a proper lassi stop.",
    starting: 3100,
    activities: [
      { name: "Amber Fort", kind: "culture", cost: 550, time: "Morning", detail: "Trace the courtyards and hilltop views with a local history guide." },
      { name: "Hawa Mahal & old city", kind: "culture", cost: 100, time: "Late morning", detail: "Walk the rose-coloured lanes and learn the stories behind the facades." },
      { name: "City Palace", kind: "culture", cost: 500, time: "Afternoon", detail: "Explore royal collections, courtyards and artisan details." },
      { name: "Johari Bazaar food walk", kind: "food", cost: 450, time: "Evening", detail: "Taste kachori, sweets and lassi at trusted neighbourhood stalls." },
      { name: "Jal Mahal lakeside", kind: "nature", cost: 0, time: "Sunset", detail: "Pause for a lakeside view of the Water Palace." },
      { name: "Nahargarh sunset trail", kind: "adventure", cost: 100, time: "Sunset", detail: "Take a short hill walk to a sweeping view of the city." }
    ]
  },
  Kochi: {
    region: "Kerala",
    tagline: "Harbour history, spice-scented lanes and backwater light.",
    starting: 2900,
    activities: [
      { name: "Fort Kochi heritage walk", kind: "culture", cost: 100, time: "Morning", detail: "Find layered Portuguese, Dutch and Malabari stories in the old quarter." },
      { name: "Chinese fishing nets", kind: "culture", cost: 0, time: "Sunset", detail: "Watch the working harbour and its famous cantilevered nets." },
      { name: "Mattancherry Palace", kind: "culture", cost: 20, time: "Late morning", detail: "See Kerala murals and the history of the spice trade." },
      { name: "Jew Town spice & craft lane", kind: "food", cost: 250, time: "Afternoon", detail: "Meet shopkeepers and taste the aromas of the old trading quarter." },
      { name: "Kumbalangi village visit", kind: "nature", cost: 500, time: "Afternoon", detail: "Spend time in a community-led island village." },
      { name: "Kathakali introduction", kind: "culture", cost: 400, time: "Evening", detail: "Learn the gestures and make-up behind Kerala's classical theatre." }
    ]
  },
  Hampi: {
    region: "Karnataka",
    tagline: "A slow wander through an open-air stone kingdom.",
    starting: 2400,
    activities: [
      { name: "Virupaksha Temple & bazaar", kind: "culture", cost: 0, time: "Morning", detail: "Walk the temple street and hear how Hampi became a great city." },
      { name: "Vijaya Vittala Temple", kind: "culture", cost: 600, time: "Morning", detail: "See the stone chariot and musical-pillared halls." },
      { name: "Tungabhadra riverside", kind: "nature", cost: 0, time: "Sunset", detail: "Take a quiet break beside the boulder-lined river." },
      { name: "Matanga Hill walk", kind: "adventure", cost: 0, time: "Sunrise", detail: "Climb an easy rocky trail for a panoramic sunrise." },
      { name: "Banana plantation lunch", kind: "food", cost: 350, time: "Afternoon", detail: "Try a local thali in a leafy riverside setting." },
      { name: "Anegundi village cycle", kind: "adventure", cost: 300, time: "Afternoon", detail: "Cycle between small temples, farms and village lanes." }
    ]
  },
  Hyderabad: {
    region: "Telangana",
    tagline: "Deccan stories, lake evenings and generous plates.",
    starting: 2800,
    activities: [
      { name: "Charminar & Laad Bazaar", kind: "culture", cost: 100, time: "Morning", detail: "Walk the old city lanes around Hyderabad's best-known monument." },
      { name: "Golconda Fort", kind: "adventure", cost: 250, time: "Morning", detail: "Explore the hilltop fort and its gateways at a comfortable pace." },
      { name: "Chowmahalla Palace", kind: "culture", cost: 150, time: "Afternoon", detail: "See the courtyards and collections of the former Nizams." },
      { name: "Hussain Sagar lakeside", kind: "nature", cost: 80, time: "Sunset", detail: "Take a relaxed evening walk by the lake." },
      { name: "Old city food walk", kind: "food", cost: 450, time: "Evening", detail: "Sample local favourites with attention to spice and dietary needs." },
      { name: "Qutb Shahi Tombs", kind: "culture", cost: 100, time: "Afternoon", detail: "Discover the garden tombs and their distinctive Deccan architecture." }
    ]
  },
  Chennai: {
    region: "Tamil Nadu",
    tagline: "Temple streets, sea air and a strong filter coffee.",
    starting: 2700,
    activities: [
      { name: "Kapaleeshwarar Temple & Mylapore", kind: "culture", cost: 0, time: "Morning", detail: "Visit the temple precinct and its lively neighbourhood streets." },
      { name: "Marina Beach walk", kind: "nature", cost: 0, time: "Sunrise", detail: "Enjoy the seafront in the cooler early hours." },
      { name: "Fort St. George", kind: "culture", cost: 100, time: "Late morning", detail: "Explore the fort and museum collections from Chennai's history." },
      { name: "Mylapore coffee & tiffin trail", kind: "food", cost: 300, time: "Morning", detail: "Try a traditional breakfast and filter coffee at local cafés." },
      { name: "San Thome Basilica", kind: "culture", cost: 0, time: "Afternoon", detail: "Visit the basilica and learn about its place in the city." },
      { name: "DakshinaChitra craft visit", kind: "culture", cost: 250, time: "Afternoon", detail: "See regional homes, crafts and performing arts at a living-history centre." }
    ]
  },
  Bengaluru: {
    region: "Karnataka",
    tagline: "Garden shade, old markets and a city that loves to eat.",
    starting: 3000,
    activities: [
      { name: "Lalbagh Botanical Garden", kind: "nature", cost: 50, time: "Morning", detail: "Take a quiet walk through the historic garden and glasshouse." },
      { name: "Bengaluru Palace", kind: "culture", cost: 300, time: "Late morning", detail: "Explore the palace rooms and grounds at your own pace." },
      { name: "KR Market flower lanes", kind: "culture", cost: 0, time: "Early morning", detail: "See the colourful wholesale flower market before the day gets busy." },
      { name: "Basavanagudi dosa trail", kind: "food", cost: 300, time: "Evening", detail: "Try neighbourhood snacks and South Indian staples." },
      { name: "Cubbon Park", kind: "nature", cost: 0, time: "Afternoon", detail: "Rest under the trees in the heart of the city." },
      { name: "Tipu Sultan's Summer Palace", kind: "culture", cost: 50, time: "Afternoon", detail: "See the carved wooden halls and learn about the city's past." }
    ]
  },
  Goa: {
    region: "Goa",
    tagline: "Heritage lanes, coastal paths and time to slow down.",
    starting: 3400,
    activities: [
      { name: "Fontainhas heritage walk", kind: "culture", cost: 0, time: "Morning", detail: "Wander Panaji's colourful Latin Quarter with a local guide." },
      { name: "Old Goa churches", kind: "culture", cost: 0, time: "Late morning", detail: "Explore the historic churches and their shared heritage." },
      { name: "Local market & snack stop", kind: "food", cost: 350, time: "Afternoon", detail: "Try Goan snacks and seasonal produce at a neighbourhood market." },
      { name: "Spice farm visit", kind: "nature", cost: 500, time: "Afternoon", detail: "Walk a working spice garden and learn about local ingredients." },
      { name: "Coastal sunset viewpoint", kind: "nature", cost: 0, time: "Sunset", detail: "Finish with a quiet view of the Arabian Sea." },
      { name: "Mandovi riverside", kind: "adventure", cost: 100, time: "Evening", detail: "Take an easy riverside walk and enjoy the cooler evening air." }
    ]
  },
  Mumbai: {
    region: "Maharashtra",
    tagline: "Harbour landmarks, local trains and neighbourhood flavours.",
    starting: 3600,
    activities: [
      { name: "Gateway of India & Colaba", kind: "culture", cost: 0, time: "Morning", detail: "See the harbour landmark and explore the surrounding lanes." },
      { name: "Elephanta Caves", kind: "culture", cost: 500, time: "Morning", detail: "Take the ferry to the island caves; check ferry times before you go." },
      { name: "Fort heritage walk", kind: "culture", cost: 0, time: "Late morning", detail: "Notice the city's historic buildings and busy streets." },
      { name: "Marine Drive", kind: "nature", cost: 0, time: "Sunset", detail: "Walk the seafront promenade as the city lights come on." },
      { name: "Dadar market food trail", kind: "food", cost: 350, time: "Afternoon", detail: "Taste familiar Mumbai snacks in a lively local market." },
      { name: "Sanjay Gandhi National Park", kind: "adventure", cost: 100, time: "Morning", detail: "Choose an easy nature walk within the city's large green reserve." }
    ]
  },
  "Delhi & Agra": {
    region: "Delhi & Uttar Pradesh",
    tagline: "Monuments, old-city lanes and Mughal-era stories.",
    starting: 3900,
    activities: [
      { name: "Humayun's Tomb", kind: "culture", cost: 200, time: "Morning", detail: "Walk through the gardens and red sandstone architecture." },
      { name: "Qutub Minar complex", kind: "culture", cost: 200, time: "Late morning", detail: "Explore the towers and monuments of the historic complex." },
      { name: "Old Delhi food walk", kind: "food", cost: 450, time: "Afternoon", detail: "Try local snacks with a guide who can help navigate the lanes." },
      { name: "India Gate & central vista", kind: "nature", cost: 0, time: "Evening", detail: "Take a relaxed walk through the broad central avenues." },
      { name: "Taj Mahal visit", kind: "culture", cost: 600, time: "Sunrise", detail: "Plan the early visit and confirm current entry arrangements locally." },
      { name: "Agra Fort", kind: "culture", cost: 300, time: "Afternoon", detail: "See the fort's courtyards and views across the Yamuna." }
    ]
  },
  Varanasi: {
    region: "Uttar Pradesh",
    tagline: "River mornings, old lanes and living traditions.",
    starting: 2600,
    activities: [
      { name: "Sunrise at the ghats", kind: "culture", cost: 0, time: "Sunrise", detail: "See the riverfront wake up; follow local guidance around ceremonies." },
      { name: "Old city lane walk", kind: "culture", cost: 0, time: "Morning", detail: "Explore the narrow streets with a guide who knows the neighbourhood." },
      { name: "Banarasi weaving visit", kind: "culture", cost: 200, time: "Late morning", detail: "Learn about the craft and the people who keep it going." },
      { name: "Local vegetarian food trail", kind: "food", cost: 300, time: "Afternoon", detail: "Sample regional snacks and sweets at small local shops." },
      { name: "Sarnath museum and stupa", kind: "culture", cost: 150, time: "Afternoon", detail: "Visit an important Buddhist heritage site just outside the city." },
      { name: "Ganga Aarti riverside view", kind: "culture", cost: 0, time: "Evening", detail: "Observe the evening ceremony respectfully from a suitable public spot." }
    ]
  },
  Udaipur: {
    region: "Rajasthan",
    tagline: "Lake light, painted lanes and a slower royal-city day.",
    starting: 3200,
    activities: [
      { name: "City Palace", kind: "culture", cost: 400, time: "Morning", detail: "Explore the palace rooms and terraces overlooking the lake." },
      { name: "Jagdish Temple & old lanes", kind: "culture", cost: 0, time: "Late morning", detail: "Walk the temple approach and nearby craft streets." },
      { name: "Lake Pichola boat ride", kind: "nature", cost: 500, time: "Sunset", detail: "See the city and lakefront from the water; check current boat times." },
      { name: "Saheliyon Ki Bari", kind: "nature", cost: 50, time: "Afternoon", detail: "Take a shaded walk through the historic garden." },
      { name: "Rajasthani thali stop", kind: "food", cost: 350, time: "Evening", detail: "Try a regional meal at a local restaurant." },
      { name: "Bada Bazaar craft walk", kind: "culture", cost: 0, time: "Afternoon", detail: "Browse local textiles, miniature paintings and everyday market goods." }
    ]
  },
  Madurai: {
    region: "Tamil Nadu",
    tagline: "Temple towers, jasmine markets and an unforgettable breakfast.",
    starting: 2400,
    activities: [
      { name: "Meenakshi Amman Temple", kind: "culture", cost: 0, time: "Morning", detail: "Visit respectfully and check current entry and photography rules." },
      { name: "Puthu Mandapam & old streets", kind: "culture", cost: 0, time: "Morning", detail: "Explore the historic market lanes beside the temple." },
      { name: "Thirumalai Nayakkar Palace", kind: "culture", cost: 100, time: "Afternoon", detail: "See the palace courtyard and its distinctive columns." },
      { name: "Jasmine flower market", kind: "culture", cost: 100, time: "Early morning", detail: "Experience the lively flower trade and its local traditions." },
      { name: "Madurai tiffin trail", kind: "food", cost: 300, time: "Evening", detail: "Sample South Indian tiffin favourites at local eateries." },
      { name: "Gandhi Memorial Museum", kind: "culture", cost: 0, time: "Afternoon", detail: "Learn about India's freedom movement through the museum exhibits." }
    ]
  }
};

export const SUPPORTED_LANGUAGES = [
  "Telugu", "English", "Hindi", "Tamil", "Kannada", "Malayalam", "Bengali",
  "Marathi", "Gujarati", "Punjabi", "Urdu", "Odia", "Assamese", "Kashmiri",
  "Sanskrit", "French", "Spanish", "Japanese"
];

