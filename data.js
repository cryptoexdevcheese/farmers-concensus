/**
 * Farmers Consensus - Static & Mock Data
 * Comprehensive crop list (highland crops & rice) and expanded Philippine geographical list
 */

const PHILIPPINES_GEOGRAPHY = {
  "Benguet": {
    "Atok": ["Paoay", "Sayangan", "Cattubo", "Ngalin", "Pasdong", "Abiang", "Topdac", "Calasipan"],
    "Bakun": ["Ampusongan", "Bagu", "Dalipey", "Gambang", "Kayapa", "Sinacbat", "Poblacion"],
    "Bokod": ["Ambuclao", "Bila", "Bobok-Bisal", "Daclan", "Karao", "Pito", "Poblacion", "Tikey"],
    "Buguias": ["Abatan", "Bangao", "Buyacaoan", "Loo", "Natubleng", "Amlimay", "Catlubong", "Guiset"],
    "Itogon": ["Ampucao", "Dalupirip", "Gumatdang", "Loacan", "Poblacion", "Tinongdan", "Ucab", "Virac"],
    "Kabayan": ["Adaoay", "Anchilpey", "Bashoy", "Batan", "Duacan", "Kabayan Barrio", "Poblacion", "Tawangan"],
    "Kapangan": ["Boklaoan", "Datakan", "Gadang", "Gasweling", "Labueg", "Paykek", "Poblacion", "Pudong"],
    "Kibungan": ["Badeo", "Lubo", "Madaymen", "Palina", "Poblacion", "Sagpat", "Tacadang"],
    "La Trinidad": ["Pico", "Balili", "Puguis", "Wangal", "Alapang", "Bahong", "Ambiong", "Shilan", "Lubas", "Beckel", "Betag"],
    "Mankayan": ["Balili", "Bedbed", "Bulalacao", "Cabiten", "Colalo", "Guinaoang", "Poblacion", "Tabio", "Taneg"],
    "Sablan": ["Bagong", "Balluay", "Banangan", "Kamog", "Pagsil", "Poblacion", "Bayabas"],
    "Tuba": ["Camp 1", "Camp 3", "Camp 4", "Nangalisan", "Poblacion", "San Pascual", "Tadiangan", "Twin Peaks"],
    "Tublay": ["Ambassador", "Ambiong", "Basil", "Caponga", "Daclan", "Tublay Barrio", "Tuel"]
  },
  "Nueva Ecija": {
    "Cabanatuan City": ["Valenzuela", "Magsaysay District", "Mabini Extension", "Bitis", "Sangitan", "San Josef Sur", "Mayapyap", "Aduas"],
    "Gapan City": ["Bungo", "Mahipon", "Pambuan", "San Roque", "Santo Cristo", "Mangino", "Kapalangan"],
    "Palayan City": ["Atate", "Caballa", "Ganaderia", "Maligaya", "Singalat", "Popolon", "Langla"],
    "San Jose City": ["Abar Ist", "Abar 2nd", "Calaocan", "Kita-Kita", "Malasin", "Pinili", "Santo Niño", "Tayabo"],
    "Science City of Muñoz": ["Bical", "Catalanacan", "Curva", "Licaong", "Mapangdan", "Poblacion West", "Villa Nati", "Rang-ayan"],
    "Aliaga": ["Bucot", "La Purisima", "Magsaysay", "Pantoc", "San Juan", "Santa Monica", "Santo Tomas"],
    "Bongabon": ["Antipolo", "Ariendo", "Curva", "Larcon", "Vega", "Palo Maria", "Poblacion Soledad", "Commercial"],
    "Cabiao": ["Bagong Silang", "Concepcion", "Entablado", "Maligaya", "San Vicente", "Santa Isabel", "Sinipit"],
    "Carranglan": ["Bunga", "Burgos", "Capintalan", "General Luna", "Pias", "Puntabong", "Salazar"],
    "Cuyapo": ["Balungsay", "Bentigan", "Calancuasan", "Loob", "Malasin", "Sabit", "Salagusog", "Ungab"],
    "Gabaldon": ["Bagting", "Calabasa", "Ligaya", "Malinao", "Pinamalisan", "Sawmill", "Tagumpay"],
    "General Mamerto Natividad": ["Baloc", "Kabulihan", "Mataas na Kahoy", "Platero", "Sapang", "Singalat"],
    "General Tinio": ["Concepcion", "Nazareth", "Padolina", "Pulo", "Rio Chico", "Sampaguita", "San Pedro"],
    "Guimba": ["Ayos Lomboy", "Bantug", "Bunol", "Cavite", "Manacsac", "Pacac", "San Andres", "Triala"],
    "Jaen": ["Calabasa", "Dampulan", "Magsalisi", "Pakul", "Pinanggaan", "San Jose", "Sapang"],
    "Laur": ["Barangay I", "Barangay II", "Nauzon", "Pinagbayanan", "San Isidro", "San Vicente", "Sikat"],
    "Licab": ["Aquino", "Linao", "Poblacion Sur", "San Cristobal", "Santa Maria", "Tabing Ilog"],
    "Llanera": ["Bagumbayan", "Floridablanca", "General Ricarte", "Mabini", "Plaridel", "San Nicolas"],
    "Lupao": ["Agupalo Weste", "Alalay Chica", "Cordero", "Mapangdan", "Parista", "San Isidro", "Salvacion"],
    "Nampicuan": ["Cabawangan", "Mambog", "Recuerdo", "Tony", "West Poblacion", "Yuson"],
    "Pantabangan": ["Cadaclan", "Fatima", "Marikit", "Napon-Napon", "San Juan", "Villarica"],
    "Peñaranda": ["Callos", "Las Piñas", "Poblacion I", "Poblacion II", "San Josef", "Sinasajan"],
    "Quezon": ["Bertese", "Dulong Bayan", "Ilog Baliwag", "Pulong Bahay", "San Alejandro", "Santa Maria"],
    "Rizal": ["Canaan West", "Cabucbucan", "General Luna", "Macapsing", "Maligaya", "Villa Paraiso"],
    "San Antonio": ["Buliran", "Cama Juan", "Luyos", "Papaya", "San Mariano", "Santa Cruz", "Tikiw"],
    "San Isidro": ["Alua", "Calaba", "Mangga", "Poblacion", "San Roque", "Tabon", "Santo Cristo"],
    "San Leonardo": ["Castellano", "Mambang nan", "Nieves", "San Roque", "Tambo Adorable", "Tibatib"],
    "Santa Rosa": ["Aguinaldo", "Cabuntocan", "La Fuente", "Liusin", "Mapalad", "Rajal Centro", "San Gregorio"],
    "Santo Domingo": ["Baloc", "Cabugao", "Dolores", "Mambarao", "Pulong Buli", "San Pascual", "Tobias"],
    "Talavera": ["Bagong Silang", "Dimasalang", "Lomboy", "Pinagpanaan", "Sampaloc", "Bantug", "La Torre"],
    "Talugtug": ["Buted", "Cabiusan", "Fronda", "Magsaysay", "Nambalan", "Sagpat", "Villa Rosenda"],
    "Zaragoza": ["Batitang", "Carmen", "General Luna", "H. Romero", "Macarse", "San Vicente", "Valeriana"]
  },
  "Pangasinan": {
    "Alaminos City": ["Bued", "Caboloan", "Inerangan", "Lucap", "Palamis", "Poblacion", "Sabangan", "Telbang"],
    "Dagupan City": ["Bonuan Boquig", "Bonuan Gueset", "Carael", "Caranglaan", "Malued", "Mayombo", "Tapuac"],
    "San Carlos City": ["Ables", "Bocboc", "Bolingit", "Caoayan Kiling", "Gamata", "Mabalbal", "Pagaling", "Tandoc"],
    "Urdaneta City": ["Anonas", "Bactad East", "Nancalobasaan", "Pinmaludpod", "San Jose", "Nancayasan", "Catablan"],
    "Agno": ["Bangan-Oda", "Boboy", "Cayungnan", "Magsaysay", "Poblacion East", "Sabangan", "Tupa"],
    "Aguilar": ["Bocboc East", "Buer", "Calsib", "Niñoy", "Poblacion", "San Francisco", "Tampac"],
    "Alcala": ["Anulid", "Bersamin", "Gualsic", "Kisikis", "Poblacion East", "San Vicente", "Vacante"],
    "Anda": ["Awile", "Badiola", "Carot", "Macaleeng", "Poblacion", "Sablig", "Tori-Tori"],
    "Asingan": ["Bantog", "Baro", "Carosucan", "Domanpot", "Poblacion West", "San Vicente", "Toboy"],
    "Balungao": ["Angancan", "Capulaan", "Pugaro", "Rajal", "San Leon", "San Miguel", "San Vicente"],
    "Bani": ["Arnedo", "Colayo", "Dacap Gueset", "Poblacion", "Ranom Iloco", "San Jose", "Tugui"],
    "Basista": ["Cabeldatan", "Dumpay", "Malimpec East", "Poblacion", "Patacbo", "Sinulatan"],
    "Bautista": ["Artacho", "Baluyot", "Diaz", "Poblacion West", "Sinabaan", "Vacante"],
    "Bayambang": ["Alcala", "Bical Norte", "Buayaen", "Caturay", "Hermosa", "Malioer", "Pangdel", "Wawa"],
    "Binalonan": ["Balangobong", "Bugayong", "Mangasan", "Poblacion", "San Felipe", "Santa Maria", "Sumabnit"],
    "Binmaley": ["Amansabina", "Biec", "Caloocan Dupo", "Dulag", "Naguilayan", "Poblacion", "Salapingao"],
    "Bolinao": ["Arnedo", "Balingasay", "Concepcion", "Germinal", "Patar", "Pikong", "Santiago"],
    "Bugallon": ["Angarian", "Banaaga", "Gueset", "Poblacion", "Polong", "Salasa", "Samang"],
    "Burgos": ["Anapuela", "Conciso", "Poblacion", "San Isidro", "San Jose", "Tambogan"],
    "Calasiao": ["Ambonao", "Banaoang", "Gabon", "Lasip", "Malabago", "Nalsian", "Poblacion West", "Talibaew"],
    "Dasol": ["Amalbalan", "Eguia", "Malacapas", "Poblacion", "San Isidro", "Tambac", "Viga"],
    "Infanta": ["Bambulit", "Cato", "Nayon", "Poblacion", "Pangasinan", "Pototan"],
    "Labrador": ["Bolo", "Laois", "Magsaysay", "Poblacion", "San Jose", "Uyong"],
    "Laoac": ["Anis", "Botigue", "Cabilaoan", "Laoac East", "Lebueg", "Turac"],
    "Lingayen": ["Alang-Salata", "Baay", "Libsong East", "Maniboc", "Pangapisan", "Poblacion", "Tonton"],
    "Mabini": ["Barlo", "Cabihian", "Poblacion", "San Jose", "Tagudin", "Talogtog"],
    "Malasiqui": ["Asin East", "Bacas", "Cabuelg", "Lareg-Lareg", "Nalsian", "Pacol", "Poblacion", "Warey"],
    "Manaoag": ["Babayan", "Baritao", "Licsi", "Mermer", "Poblacion", "Sapang", "Tebuel"],
    "Mangaldan": ["Anolid", "Bari", "Guanal", "Lanas", "Poblacion", "Salay", "Tebag"],
    "Mangatarem": ["Bogtong", "Cabayugan", "Malabobo", "Poblacion", "Pogo", "Salavante", "Suaco"],
    "Mapandan": ["Amanoaoac", "Apaya", "Golden", "Liliw", "Nilombot", "Poblacion"],
    "Natividad": ["Barangay I", "Barangay II", "Cacapian", "Salud", "San Jose", "San Liborio"],
    "Pozorrubio": ["Alon", "Bantugan", "Cablong", "Naguillayan", "Poblacion", "Taloy"],
    "Rosales": ["Acop", "Bakit-Bakit", "Carmen", "Pangdel", "Poblacion", "San Bartolome", "Station"],
    "San Fabian": ["Alacan", "Bolasi", "Cayanga", "Mabilao", "Poblacion", "Sagunto", "Tempra"],
    "San Jacinto": ["Bolo", "Casibong", "Guibel", "Labuac", "Poblacion", "San Jose"],
    "San Manuel": ["Cabalitian", "Guico", "Lapalo", "San Roque", "Nagsaag", "San Vicente", "Flores"],
    "San Nicolas": ["Bensican", "Calabeng", "Malico", "Poblacion", "San Felipe", "Siblot"],
    "San Quintin": ["Alac", "Bantog", "Cabangaran", "Calasib", "Poblacion", "San Pedro"],
    "Santa Barbara": ["Alibago", "Balinguey", "Maronong", "Nilombot", "Poblacion", "Tebag East"],
    "Santa Maria": ["Caboluan", "Poblacion", "Samon", "San Alejandro", "San Mariano"],
    "Santo Tomas": ["Barangay I", "Barangay II", "Poblacion", "San Antonio", "Santo Domingo"],
    "Sison": ["Artacho", "Binalonan", "Cauringan", "Poblacion", "Sagunto", "Tara-Tara"],
    "Sual": ["Banga", "Baybay", "Cabugaoan", "Pangil", "Poblacion", "Sioasio"],
    "Tayug": ["Amistad", "Barangay A", "Barangay B", "Carriedo", "Poblacion", "Trenchera"],
    "Umingan": ["Barangay I", "Barangay II", "Caballero", "Don Montano", "Poblacion", "San Andres"],
    "Urbiztondo": ["Angatel", "Balangobong", "Batiaw", "Duclas", "Poblacion", "Salavante"],
    "Villasis": ["Barraca", "Lipay", "Puelay", "Tombod", "Amamperez", "Unzad", "Bacag"]
  },
  "Davao del Sur": {
    "Digos City": ["Aplaya", "Balutakay", "Dulangan", "Kapatagan", "Matti", "Ruparan", "San Agustin", "Colorado", "Magsaysay"],
    "Bansalan": ["Kinuskusan", "Managa", "New Clarin", "Poblacion", "Sibulan", "Altavista", "Union", "Buenavista"],
    "Hagonoy": ["Balutakay", "Clarin", "Guihing", "Lapos", "Poblacion", "San Guillermo", "Sinayawan"],
    "Kiblawan": ["Bagong Silang", "Ilocos Norte", "Latian", "Pasig", "Poblacion", "San Jose", "Waterfalls"],
    "Magsaysay": ["Bacungan", "Dalawinon", "Kasuga", "Malawanit", "Poblacion", "San Isidro", "Tagaytay"],
    "Malalag": ["Bagumbayan", "Baybay", "Caputian", "Kibutolan", "Poblacion", "San Isidro", "Tagansule"],
    "Padada": ["Limonso", "Napo", "Poblacion", "Quirino", "San Isidro", "Southern Paligue", "Tulogan"],
    "Santa Cruz": ["Bato", "Melilia", "Saliducon", "Sinuron", "Tuban", "Astorga", "Darong", "Coronon"],
    "Sulop": ["Bagumbayan", "Kibalan", "Laperian", "Poblacion", "Solongvale", "Tala-o", "Talon-Talon"]
  },
  "Batangas": {
    "Batangas City": ["Alangilan", "Balagtas", "Bolbok", "Calicanto", "Kumintang", "Paharang", "Tabangao", "Wawa"],
    "Lipa City": ["Balintawak", "Bulacnin", "Inosluban", "Marawoy", "Mataas na Lupa", "Sabang", "Tambo", "Pinagkawitan"],
    "Santo Tomas City": ["San Antonio", "San Bartolome", "San Felix", "San Jose", "San Roque", "Santiago", "Santa Maria"],
    "Tanauan City": ["Bagumbayan", "Banjo East", "Janopol Oriental", "Natatas", "Sulpoc", "Bilog-bilog", "Boot", "Darasa"],
    "Agoncillo": ["Adia", "Banyaga", "Coral na Munti", "Poblacion", "Subic Ibaba", "Subic Ilaya"],
    "Alitagtag": ["Balagbag", "Concepcion", "Dalipit East", "Muzon First", "Poblacion East", "Ping-As"],
    "Balayan": ["Caloocan", "Gumamela", "Lanatan", "Navotas", "Poblacion I", "Poblacion II", "Santuario"],
    "Balete": ["Alipit", "Malabanan", "Palsara", "Poblacion", "Sala", "Sampalocan", "San Sebastian"],
    "Bauan": ["Aplaya", "Bola", "Manghinao", "Poblacion", "San Andres", "San Roque", "Sinala"],
    "Calaca": ["Baclas", "Dacanlao", "Lumbang na Matanda", "Poblacion", "Salong", "Sinipian", "Coral ni Lopez"],
    "Calatagan": ["Bagong Silang", "Biga", "Carretunan", "Lucsuhin", "Poblacion", "Tanagan", "Wawa"],
    "Cuenca": ["Balagbag", "Bungahan", "Dila", "Ibabao", "Poblacion", "San Isidro", "Emmanuel"],
    "Ibaan": ["Bago", "Calamias", "Malainin", "Pangao", "Poblacion", "Sandalan", "Talaibon"],
    "Laurel": ["Asis", "Balakilong", "Bugaan East", "Molinete", "Poblacion", "San Gabriel", "Ticub"],
    "Lemery": ["Anak-Dagat", "Bagong Sikat", "Malinis", "Matingain", "Poblacion", "Talaga", "Wawa"],
    "Lian": ["Binubusan", "Kapito", "Malaruhat", "Matabungkay", "Poblacion", "San Diego", "Prenza"],
    "Lobo": ["Aplaya", "Biga", "Malabrigo", "Masaguitsit", "Poblacion", "Sabana", "Sawmill"],
    "Mabini": ["Anilao", "Bagalangit", "Mainit", "Poblacion", "San Francisco", "San Jose", "Solo"],
    "Malvar": ["Bulihan", "Luta del Norte", "Poblacion", "San Andres", "San Fernando", "Santiago"],
    "Mataasnakahoy": ["Bayorbor", "Calingag", "Kinalaglagan", "Lumipa", "Nangkaan", "Poblacion"],
    "Nasugbu": ["Bilaran", "Lumbangan", "Natipuan", "Pantalan", "Wawa", "Utod", "Looc", "Kaylaway"],
    "Padre Garcia": ["Banaba", "Maugat East", "Pansol", "Poblacion", "San Miguel", "Tambo"],
    "Rosario": ["Alupay", "Bagong Silang", "Matingain", "Namunga", "Poblacion", "Quilib", "San Jose"],
    "San Jose": ["Aguila", "Banaybanay", "Lalayat", "Poblacion", "Pinagtungalan", "Tugtug"],
    "San Juan": ["Balanacan", "Laiya-Ibabao", "Laiya-Aplaya", "Muzon", "Poblacion", "Sico", "Tipas"],
    "San Luis": ["Abiacoso", "Balagtasin", "Banoyo", "Luya", "Poblacion", "Taliba", "Tejeros"],
    "San Nicolas": ["Abilo", "Bancoro", "Calangay", "Poblacion", "Sinturisan", "Tagodtod"],
    "San Pascual": ["Alalum", "Bayanan", "Danglayan", "Poblacion", "San Antonio", "Sambal"],
    "Santa Teresita": ["Bihis", "Calantas", "Kalisakis", "Poblacion", "Saimsim", "Tambo Ibaba"],
    "Taal": ["Buli", "Cubamba", "Halang", "Ilog", "Poblacion", "San Nicolas", "Tierra Alta"],
    "Talisay": ["Balas", "Caloocan", "Leynes", "Miranda", "Sampaloc", "Banga", "Tranca"],
    "Taysan": ["Bilogo", "Mataas na Lupa", "Pinagbayanan", "Poblacion", "San Isidro", "Tubahan"],
    "Tingloy": ["Barangay I", "Barangay II", "Gamao", "Maricaban", "San Jose", "Talahib"],
    "Tuy": ["Bayudbud", "Lumbangan", "Poblacion", "Rillo", "San Jose", "Toong", "Guinhawa"]
  }
};

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
console.log('PHILIPPINES_GEOGRAPHY loaded:', Object.keys(PHILIPPINES_GEOGRAPHY).length, 'provinces');
console.log('VEGETABLES loaded:', VEGETABLES.length, 'vegetables');
