export interface AirportEntry {
  iata: string;
  city: string;
  country: string;
  name: string;
}

const AIRPORTS: AirportEntry[] = [
  // Brasil
  { iata:"GRU", city:"São Paulo", country:"Brasil", name:"Guarulhos International" },
  { iata:"CGH", city:"São Paulo", country:"Brasil", name:"Congonhas" },
  { iata:"VCP", city:"Campinas", country:"Brasil", name:"Viracopos International" },
  { iata:"GIG", city:"Rio de Janeiro", country:"Brasil", name:"Galeão International" },
  { iata:"SDU", city:"Rio de Janeiro", country:"Brasil", name:"Santos Dumont" },
  { iata:"BSB", city:"Brasília", country:"Brasil", name:"Juscelino Kubitschek International" },
  { iata:"CNF", city:"Belo Horizonte", country:"Brasil", name:"Confins International" },
  { iata:"PLU", city:"Belo Horizonte", country:"Brasil", name:"Pampulha" },
  { iata:"POA", city:"Porto Alegre", country:"Brasil", name:"Salgado Filho International" },
  { iata:"CWB", city:"Curitiba", country:"Brasil", name:"Afonso Pena International" },
  { iata:"FLN", city:"Florianópolis", country:"Brasil", name:"Hercílio Luz International" },
  { iata:"REC", city:"Recife", country:"Brasil", name:"Guararapes International" },
  { iata:"SSA", city:"Salvador", country:"Brasil", name:"Deputado Luís Eduardo Magalhães" },
  { iata:"FOR", city:"Fortaleza", country:"Brasil", name:"Pinto Martins International" },
  { iata:"NAT", city:"Natal", country:"Brasil", name:"Augusto Severo International" },
  { iata:"MCZ", city:"Maceió", country:"Brasil", name:"Zumbi dos Palmares International" },
  { iata:"JPA", city:"João Pessoa", country:"Brasil", name:"Presidente Castro Pinto" },
  { iata:"VIX", city:"Vitória", country:"Brasil", name:"Eurico de Aguiar Salles" },
  { iata:"CGR", city:"Campo Grande", country:"Brasil", name:"Campo Grande International" },
  { iata:"MFG", city:"Manaus", country:"Brasil", name:"Eduardo Gomes International" },
  { iata:"BVB", city:"Boa Vista", country:"Brasil", name:"Atlas Brasil Cantanhede" },
  { iata:"RBR", city:"Rio Branco", country:"Brasil", name:"Plácido de Castro" },
  { iata:"THE", city:"Teresina", country:"Brasil", name:"Senador Petronio Portella" },
  { iata:"SLZ", city:"São Luís", country:"Brasil", name:"Marechal Cunha Machado" },
  { iata:"IMP", city:"Imperatriz", country:"Brasil", name:"Prefeito Renato Moreira" },
  { iata:"AJU", city:"Aracaju", country:"Brasil", name:"Santa Maria International" },
  { iata:"MOC", city:"Montes Claros", country:"Brasil", name:"Mário Ribeiro" },
  { iata:"UBA", city:"Uberaba", country:"Brasil", name:"Mário de Almeida Franco" },
  { iata:"TFL", city:"Teófilo Otoni", country:"Brasil", name:"Juscelino Kubitschek" },

  // Europa
  { iata:"LHR", city:"Londres", country:"Reino Unido", name:"Heathrow" },
  { iata:"LGW", city:"Londres", country:"Reino Unido", name:"Gatwick" },
  { iata:"STN", city:"Londres", country:"Reino Unido", name:"Stansted" },
  { iata:"LTN", city:"Londres", country:"Reino Unido", name:"Luton" },
  { iata:"CDG", city:"Paris", country:"França", name:"Charles de Gaulle" },
  { iata:"ORY", city:"Paris", country:"França", name:"Orly" },
  { iata:"BCN", city:"Barcelona", country:"Espanha", name:"El Prat" },
  { iata:"MAD", city:"Madrid", country:"Espanha", name:"Barajas" },
  { iata:"AGP", city:"Málaga", country:"Espanha", name:"Costa del Sol" },
  { iata:"VLC", city:"Valência", country:"Espanha", name:"Manises" },
  { iata:"SVQ", city:"Sevilha", country:"Espanha", name:"San Pablo" },
  { iata:"BIO", city:"Bilbao", country:"Espanha", name:"Sondika" },
  { iata:"LIS", city:"Lisboa", country:"Portugal", name:"Humberto Delgado" },
  { iata:"OPO", city:"Porto", country:"Portugal", name:"Francisco Sá Carneiro" },
  { iata:"FAO", city:"Faro", country:"Portugal", name:"Gago Coutinho" },
  { iata:"FRA", city:"Frankfurt", country:"Alemanha", name:"Frankfurt am Main" },
  { iata:"MUC", city:"Munique", country:"Alemanha", name:"Franz Josef Strauss" },
  { iata:"BER", city:"Berlim", country:"Alemanha", name:"Brandenburg" },
  { iata:"DUS", city:"Düsseldorf", country:"Alemanha", name:"Düsseldorf International" },
  { iata:"TXL", city:"Berlim", country:"Alemanha", name:"Tegel" },
  { iata:"HAM", city:"Hamburgo", country:"Alemanha", name:"Hamburg" },
  { iata:"CGN", city:"Colônia", country:"Alemanha", name:"Köln/Bonn" },
  { iata:"AMS", city:"Amsterdã", country:"Holanda", name:"Schiphol" },
  { iata:"RTM", city:"Rotterdam", country:"Holanda", name:"Rotterdam The Hague" },
  { iata:"FCO", city:"Roma", country:"Itália", name:"Fiumicino" },
  { iata:"CIA", city:"Roma", country:"Itália", name:"Ciampino" },
  { iata:"MXP", city:"Milão", country:"Itália", name:"Malpensa" },
  { iata:"LIN", city:"Milão", country:"Itália", name:"Linate" },
  { iata:"VCE", city:"Veneza", country:"Itália", name:"Marco Polo" },
  { iata:"NAP", city:"Nápoles", country:"Itália", name:"Capodichino" },
  { iata:"VNO", city:"Vilnius", country:"Lituânia", name:"Vilnius International" },
  { iata:"RIX", city:"Riga", country:"Letônia", name:"Riga International" },
  { iata:"TLL", city:"Tallinn", country:"Estônia", name:"Lennart Meri" },
  { iata:"ATH", city:"Atenas", country:"Grécia", name:"Eleftherios Venizelos" },
  { iata:"SKG", city:"Salônica", country:"Grécia", name:"Makedonia" },
  { iata:"IST", city:"Istambul", country:"Turquia", name:"Istanbul Airport" },
  { iata:"SAW", city:"Istambul", country:"Turquia", name:"Sabiha Gökçen" },
  { iata:"AYT", city:"Antália", country:"Turquia", name:"Antalya" },
  { iata:"ESB", city:"Ancara", country:"Turquia", name:"Esenboğa" },
  { iata:"LED", city:"São Petersburgo", country:"Rússia", name:"Pulkovo" },
  { iata:"SVO", city:"Moscou", country:"Rússia", name:"Sheremetyevo" },
  { iata:"DME", city:"Moscou", country:"Rússia", name:"Domodedovo" },
  { iata:"KEF", city:"Reykjavik", country:"Islândia", name:"Keflavík" },
  { iata:"ARN", city:"Estocolmo", country:"Suécia", name:"Arlanda" },
  { iata:"CPH", city:"Copenhague", country:"Dinamarca", name:"Kastrup" },
  { iata:"OSL", city:"Oslo", country:"Noruega", name:"Gardermoen" },
  { iata:"HEL", city:"Helsinque", country:"Finlândia", name:"Vantaa" },
  { iata:"WAW", city:"Varsóvia", country:"Polônia", name:"Chopin" },
  { iata:"KRK", city:"Cracóvia", country:"Polônia", name:"John Paul II" },
  { iata:"PRG", city:"Praga", country:"República Tcheca", name:"Václav Havel" },
  { iata:"BUD", city:"Budapeste", country:"Hungria", name:"Liszt Ferenc" },
  { iata:"ZAG", city:"Zagreb", country:"Croácia", name:"Franjo Tuđman" },
  { iata:"BEG", city:"Belgrado", country:"Sérvia", name:"Nikola Tesla" },
  { iata:"OTP", city:"Bucareste", country:"Romênia", name:"Henri Coandă" },
  { iata:"SOF", city:"Sófia", country:"Bulgária", name:"Vasil Levski" },
  { iata:"TBS", city:"Tbilisi", country:"Geórgia", name:"Shota Rustaveli" },
  { iata:"EVN", city:"Erevan", country:"Armênia", name:"Zvartnots" },
  { iata:"BRN", city:"Brno", country:"República Tcheca", name:"Brno–Tuřany" },

  // Oriente Médio
  { iata:"DXB", city:"Dubai", country:"Emirados Árabes", name:"Dubai International" },
  { iata:"AUH", city:"Abu Dhabi", country:"Emirados Árabes", name:"Abu Dhabi International" },
  { iata:"DOH", city:"Doha", country:"Catar", name:"Hamad International" },
  { iata:"RUH", city:"Riyadh", country:"Arábia Saudita", name:"King Khalid International" },
  { iata:"JED", city:"Jeddah", country:"Arábia Saudita", name:"King Abdulaziz International" },
  { iata:"MCT", city:"Mascate", country:"Omã", name:"Muscat International" },
  { iata:"BAH", city:"Bahrein", country:"Bahrein", name:"Bahrain International" },
  { iata:"KWI", city:"Kuwait City", country:"Kuwait", name:"Kuwait International" },

  // Ásia
  { iata:"NRT", city:"Tóquio", country:"Japão", name:"Narita International" },
  { iata:"HND", city:"Tóquio", country:"Japão", name:"Haneda" },
  { iata:"KIX", city:"Osaka", country:"Japão", name:"Kansai International" },
  { iata:"ICN", city:"Seul", country:"Coreia do Sul", name:"Incheon International" },
  { iata:"PEK", city:"Pequim", country:"China", name:"Capital International" },
  { iata:"PKX", city:"Pequim", country:"China", name:"Daxing International" },
  { iata:"PVG", city:"Xangai", country:"China", name:"Pudong International" },
  { iata:"SHA", city:"Xangai", country:"China", name:"Hongqiao International" },
  { iata:"CAN", city:"Guangzhou", country:"China", name:"Baiyun International" },
  { iata:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong International" },
  { iata:"TPE", city:"Taipé", country:"Taiwan", name:"Taoyuan International" },
  { iata:"BKK", city:"Bangkok", country:"Tailândia", name:"Suvarnabhumi" },
  { iata:"DMK", city:"Bangkok", country:"Tailândia", name:"Don Mueang" },
  { iata:"SIN", city:"Singapura", country:"Singapura", name:"Changi" },
  { iata:"KUL", city:"Kuala Lumpur", country:"Malásia", name:"KLIA" },
  { iata:"CGK", city:"Jacarta", country:"Indonésia", name:"Soekarno-Hatta" },
  { iata:"DEL", city:"Delhi", country:"Índia", name:"Indira Gandhi International" },
  { iata:"BOM", city:"Bombaim", country:"Índia", name:"Chhatrapati Shivaji Maharaj" },
  { iata:"MAA", city:"Chennai", country:"Índia", name:"Chennai International" },
  { iata:"BLR", city:"Bangalore", country:"Índia", name:"Kempegowda International" },
  { iata:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike International" },
  { iata:"MLE", city:"Malé", country:"Maldivas", name:"Velana International" },
  { iata:"TAS", city:"Tashkent", country:"Uzbequistão", name:"Islam Karimov Tashkent" },

  // América do Norte
  { iata:"JFK", city:"Nova York", country:"EUA", name:"John F. Kennedy International" },
  { iata:"LGA", city:"Nova York", country:"EUA", name:"LaGuardia" },
  { iata:"EWR", city:"Nova York", country:"EUA", name:"Newark Liberty International" },
  { iata:"LAX", city:"Los Angeles", country:"EUA", name:"Los Angeles International" },
  { iata:"ORD", city:"Chicago", country:"EUA", name:"O'Hare International" },
  { iata:"MIA", city:"Miami", country:"EUA", name:"Miami International" },
  { iata:"FLL", city:"Fort Lauderdale", country:"EUA", name:"Fort Lauderdale–Hollywood" },
  { iata:"SFO", city:"São Francisco", country:"EUA", name:"San Francisco International" },
  { iata:"IAH", city:"Houston", country:"EUA", name:"George Bush Intercontinental" },
  { iata:"DFW", city:"Dallas", country:"EUA", name:"Dallas/Fort Worth International" },
  { iata:"ATL", city:"Atlanta", country:"EUA", name:"Hartsfield-Jackson Atlanta" },
  { iata:"BOS", city:"Boston", country:"EUA", name:"Logan International" },
  { iata:"SEA", city:"Seattle", country:"EUA", name:"Seattle-Tacoma International" },
  { iata:"DEN", city:"Denver", country:"EUA", name:"Denver International" },
  { iata:"IAD", city:"Washington D.C.", country:"EUA", name:"Dulles International" },
  { iata:"DCA", city:"Washington D.C.", country:"EUA", name:"Reagan National" },
  { iata:"PHX", city:"Phoenix", country:"EUA", name:"Sky Harbor International" },
  { iata:"LAS", city:"Las Vegas", country:"EUA", name:"Harry Reid International" },
  { iata:"SAN", city:"San Diego", country:"EUA", name:"San Diego International" },
  { iata:"TPA", city:"Tampa", country:"EUA", name:"Tampa International" },
  { iata:"MCO", city:"Orlando", country:"EUA", name:"Orlando International" },
  { iata:"CLT", city:"Charlotte", country:"EUA", name:"Charlotte Douglas International" },
  { iata:"PHL", city:"Filadélfia", country:"EUA", name:"Philadelphia International" },
  { iata:"DTW", city:"Detroit", country:"EUA", name:"Detroit Metro Wayne County" },
  { iata:"MSP", city:"Minneapolis", country:"EUA", name:"Minneapolis-Saint Paul" },
  { iata:"YYZ", city:"Toronto", country:"Canadá", name:"Pearson International" },
  { iata:"YVR", city:"Vancouver", country:"Canadá", name:"Vancouver International" },
  { iata:"YUL", city:"Montreal", country:"Canadá", name:"Montréal-Trudeau" },
  { iata:"YOW", city:"Ottawa", country:"Canadá", name:"Ottawa Macdonald-Cartier" },
  { iata:"MEX", city:"Cidade do México", country:"México", name:"Benito Juárez International" },
  { iata:"CUN", city:"Cancún", country:"México", name:"Cancún International" },
  { iata:"GDL", city:"Guadalajara", country:"México", name:"Miguel Hidalgo" },
  { iata:"PTY", city:"Cidade do Panamá", country:"Panamá", name:"Tocumen International" },
  { iata:"SJO", city:"San José", country:"Costa Rica", name:"Juan Santamaría International" },
  { iata:"CUZ", city:"Cusco", country:"Peru", name:"Alejandro Velasco Astete" },
  { iata:"LIM", city:"Lima", country:"Peru", name:"Jorge Chávez International" },
  { iata:"BOG", city:"Bogotá", country:"Colômbia", name:"El Dorado International" },
  { iata:"MDE", city:"Medellín", country:"Colômbia", name:"José María Córdova" },
  { iata:"CTG", city:"Cartagena", country:"Colômbia", name:"Rafael Núñez" },
  { iata:"UIO", city:"Quito", country:"Equador", name:"Mariscal Sucre International" },
  { iata:"GYE", city:"Guayaquil", country:"Equador", name:"José Joaquín de Olmedo" },
  { iata:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino Benítez" },
  { iata:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ministro Pistarini (Ezeiza)" },
  { iata:"AEP", city:"Buenos Aires", country:"Argentina", name:"Jorge Newbery (Aeroparque)" },
  { iata:"MVD", city:"Montevideu", country:"Uruguai", name:"Carrasco International" },
  { iata:"ASU", city:"Assunção", country:"Paraguai", name:"Silvio Pettirossi International" },
  { iata:"VVI", city:"Santa Cruz", country:"Bolívia", name:"Viru Viru International" },
  { iata:"LPB", city:"La Paz", country:"Bolívia", name:"El Alto International" },
  { iata:"CCS", city:"Caracas", country:"Venezuela", name:"Simón Bolívar International" },
  { iata:"PUJ", city:"Punta Cana", country:"República Dominicana", name:"Punta Cana International" },
  { iata:"SDQ", city:"Santo Domingo", country:"República Dominicana", name:"Las Américas International" },
  { iata:"NAS", city:"Nassau", country:"Bahamas", name:"Lynden Pindling International" },
  { iata:"KIN", city:"Kingston", country:"Jamaica", name:"Norman Manley International" },
  { iata:"MBJ", city:"Montego Bay", country:"Jamaica", name:"Sangster International" },
  { iata:"HAV", city:"Havana", country:"Cuba", name:"José Martí International" },
  { iata:"SJU", city:"San Juan", country:"Porto Rico", name:"Luis Muñoz Marín International" },

  // Caribe (mais)
  { iata:"BGI", city:"Bridgetown", country:"Barbados", name:"Grantley Adams International" },
  { iata:"POS", city:"Port of Spain", country:"Trinidad e Tobago", name:"Piarco International" },
  { iata:"SJU", city:"San Juan", country:"Porto Rico", name:"Luis Muñoz Marín" },
  { iata:"MBJ", city:"Montego Bay", country:"Jamaica", name:"Sangster International" },
  { iata:"PUJ", city:"Punta Cana", country:"República Dominicana", name:"Punta Cana International" },

  // África
  { iata:"CPT", city:"Cidade do Cabo", country:"África do Sul", name:"Cape Town International" },
  { iata:"JNB", city:"Joanesburgo", country:"África do Sul", name:"O.R. Tambo International" },
  { iata:"DUR", city:"Durban", country:"África do Sul", name:"King Shaka International" },
  { iata:"Cairo", city:"Cairo", country:"Egito", name:"Cairo International" },
  { iata:"CMN", city:"Casablanca", country:"Marrocos", name:"Mohammed V International" },
  { iata:"RAK", city:"Marrakech", country:"Marrocos", name:"Menara" },
  { iata:"NBO", city:"Nairóbi", country:"Quênia", name:"Jomo Kenyatta International" },
  { iata:"ADD", city:"Adis Abeba", country:"Etiópia", name:"Bole International" },
  { iata:"LOS", city:"Lagos", country:"Nigéria", name:"Murtala Muhammed International" },
  { iata:"ACC", city:"Acra", country:"Gana", name:"Kotoka International" },
  { iata:"MRU", city:"Maurício", country:"Ilhas Maurício", name:"Sir Seewoosagur Ramgoolam" },
  { iata:"TNR", city:"Antananarivo", country:"Madagascar", name:"Ivato International" },
  { iata:"ZNZ", city:"Zanzibar", country:"Tanzânia", name:"Abeid Amani Karume" },
  { iata:"DSS", city:"Dakar", country:"Senegal", name:"Blaise Diagne International" },
  { iata:"ABJ", city:"Abidjan", country:"Costa do Marfim", name:"Félix Houphouët-Boigny" },
  { iata:"ALG", city:"Argel", country:"Argélia", name:"Houari Boumediene" },
  { iata:"TUN", city:"Túnis", country:"Tunísia", name:"Carthage International" },
  { iata:"RUN", city:"Saint-Denis", country:"Reunião", name:"Roland Garros" },
  { iata:"TNR", city:"Antananarivo", country:"Madagascar", name:"Ivato International" },

  // Oceania
  { iata:"SYD", city:"Sydney", country:"Austrália", name:"Kingsford Smith" },
  { iata:"MEL", city:"Melbourne", country:"Austrália", name:"Tullamarine" },
  { iata:"BNE", city:"Brisbane", country:"Austrália", name:"Brisbane Airport" },
  { iata:"PER", city:"Perth", country:"Austrália", name:"Perth Airport" },
  { iata:"OOL", city:"Gold Coast", country:"Austrália", name:"Gold Coast Airport" },
  { iata:"AKL", city:"Auckland", country:"Nova Zelândia", name:"Auckland Airport" },
  { iata:"WLG", city:"Wellington", country:"Nova Zelândia", name:"Wellington International" },
  { iata:"CHC", city:"Christchurch", country:"Nova Zelândia", name:"Christchurch Airport" },
  { iata:"NAN", city:"Nadi", country:"Fiji", name:"Nadi International" },
];

const DEDUP = new Map<string, AirportEntry>();
for (const a of AIRPORTS) {
  const key = `${a.iata}-${a.city}`;
  if (!DEDUP.has(key)) DEDUP.set(key, a);
}
const UNIQUE = Array.from(DEDUP.values());

export function searchAirports(query: string): AirportEntry[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const scored: [AirportEntry, number][] = [];

  for (const a of UNIQUE) {
    let score = 0;
    const cityL = a.city.toLowerCase();
    const countryL = a.country.toLowerCase();
    const iataL = a.iata.toLowerCase();
    const nameL = a.name.toLowerCase();

    if (cityL === q) score += 100;
    else if (cityL.startsWith(q)) score += 80;
    else if (cityL.includes(q)) score += 60;

    if (countryL === q) score += 50;
    else if (countryL.startsWith(q)) score += 40;
    else if (countryL.includes(q)) score += 30;

    if (iataL === q) score += 90;
    else if (iataL.startsWith(q)) score += 70;

    if (nameL.includes(q)) score += 20;

    if (score > 0) scored.push([a, score]);
  }

  scored.sort((a, b) => b[1] - a[1]);
  return scored.slice(0, 8).map(([a]) => a);
}

export function getAirportByIata(iata: string): AirportEntry | undefined {
  return UNIQUE.find((a) => a.iata === iata);
}

export { UNIQUE as ALL_AIRPORTS };
