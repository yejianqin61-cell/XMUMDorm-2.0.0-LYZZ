/* English content for MelayuDuolingo — merged into data.js at runtime */
export const UNIT_EN = {
  u1: {
    label: 'Vowels & Consonants',
    desc: 'Meet the five Malay vowel letters and practise saying them.',
    vocab: {
      'apa': 'what',
      'hati': 'heart',
      'kami': 'we',
      'biru': 'blue',
      'beri': 'to give',
      'tiga': 'three',
      'pergi': 'to go; to leave',
      'enam': 'six',
      'kek': 'cake',
      'sekolah': 'school',
      'besar': 'big',
      'ikan': 'fish',
      'kita': 'we (near the speaker)',
      'nasi': 'rice',
      'minum': 'to drink',
      'orang': 'person',
      'roti': 'bread',
      'kota': 'city',
      'rumah': 'house',
      'satu': 'one',
      'buku': 'book',
      'duduk': 'to sit',
      'bola': 'ball'
    },
    grammar: {
      title: 'Vowel Sounds (Bunyi Vokal)',
      lead: 'Malay has only five vowel letters — a, e, i, o and u — and every other letter is a consonant.',
      points: [
        'a is a short /a/, like the a in the English word father: apa, hati, kami.',
        'e has two readings: the short pepet /ə/ (beri, tiga) and the long taling /e/ (enam, kek).',
        'i is read /i/: ikan, kita, nasi.',
        'o is read /o/: orang, roti, kota.',
        'u is read /u/: rumah, satu, buku.',
        'The consonant c is read /tʃ/ (cili) and j is read /dʒ/ (jams), which is different from English.'
      ],
      examples: [
        { ms: 'apa · hati · kami', en: 'examples of a: what, heart, we' },
        { ms: 'beri · tiga · enam · kek', en: 'the two readings of e: beri/tiga (short), enam/kek (long)' },
        { ms: 'rumah · satu · buku', en: 'examples of u: house, one, book' }
      ]
    },
    sentences: {
      'Ini buku saya.': 'This is my book.',
      'Saya suka biru.': 'I like blue.',
      'Kami pergi ke kota.': 'We are going to the city.',
      'Kek itu sangat manis.': 'That cake is very sweet.',
      'Ibu duduk di rumah.': 'Mother is sitting at home.'
    },
    gq: [
      { q: 'Which reading does the e in "tiga" have?', opts: ['short pepet', 'long taling', 'the same as a'], a: 0, why: 'tiga is read ti-ga, so the e is a short pepet sound.' },
      { q: 'Which word has an o read /o/?', opts: ['orang', 'satu', 'ikan'], a: 0, why: 'The o in orang, roti and kota is all read /o/.' },
      { q: 'How many vowel letters does Malay have?', opts: ['5', '8', '12'], a: 0, why: 'a, e, i, o and u, five in total.' }
    ]
  },

  u2: {
    label: 'Numbers, Money, Time',
    desc: 'Count, talk about money, tell the time and give the date.',
    vocab: {
      'satu': 'one',
      'dua': 'two',
      'tiga': 'three',
      'empat': 'four',
      'lima': 'five',
      'enam': 'six',
      'tujuh': 'seven',
      'lapan': 'eight',
      'sembilan': 'nine',
      'sifar': 'zero',
      'sepuluh': 'ten',
      'sebelas': 'eleven',
      'seratus': 'one hundred',
      'seribu': 'one thousand',
      'ringgit': 'ringgit (Malaysian currency)',
      'sen': 'sen (100 sen = RM1)',
      'pukul': "o'clock",
      'minit': 'minute',
      'hari': 'day',
      'Isnin': 'Monday',
      'Selasa': 'Tuesday',
      'Rabu': 'Wednesday',
      'Khamis': 'Thursday',
      'Jumaat': 'Friday',
      'Sabtu': 'Saturday',
      'Ahad': 'Sunday',
      'bulan': 'month',
      'tahun': 'year',
      'Januari': 'January',
      'Julai': 'July',
      'Disember': 'December'
    },
    grammar: {
      title: 'Number System (Sistem Nombor)',
      lead: 'The system is decimal, but numbers from 10 to 20 end in -belas and the word order differs from Chinese.',
      points: [
        '10 = sepuluh, 11 = sebelas, 12 = dua belas (12 is read dua-belas, not belas-dua).',
        '20 = dua puluh, 30 = tiga puluh, 100 = seratus, 1000 = seribu.',
        'Hundred is marked with ratus, thousand with ribu and ten thousand with puluh ribu.',
        'The currency is ringgit Malaysia, written RM, and 1 ringgit = 100 sen.',
        'Time uses pukul: pukul 8.30 = pukul lapan tiga puluh / pukul setengah sembilan.',
        'Days and months always start with a capital letter: hari Isnin, bulan Januari.'
      ],
      examples: [
        { ms: '38', en: 'tiga puluh lapan' },
        { ms: '650', en: 'enam ratus lima puluh' },
        { ms: '6020', en: 'enam ribu dua puluh' }
      ]
    },
    sentences: {
      'Saya ada dua puluh ringgit.': 'I have twenty ringgit.',
      'Sekarang pukul tiga belas.': 'It is one o\'clock now.',
      'Hari ini Isnin.': 'Today is Monday.',
      'Umur saya dua puluh lima tahun.': 'I am twenty-five years old.',
      'Saya lahir bulan Julai.': 'I was born in July.'
    },
    gq: [
      { q: 'How is "12" correctly read?', opts: ['dua belas', 'belas dua', 'dua belas'], a: 0, why: 'The unit comes first and belas comes after: dua belas.' },
      { q: 'What is 1000 in Malay?', opts: ['seribu', 'satu ribu', 'ribu'], a: 0, why: 'For the thousands place you simply say seribu.' },
      { q: 'How do you say "pukul 9.15"?', opts: ['pukul sembilan lima belas', 'pukul lima belas sembilan', 'pukul sembilan wbelas'], a: 0, why: 'The minutes come first: sembilan lima belas.' }
    ]
  },

  u3: {
    label: 'Greetings & Introductions',
    desc: 'Say hello, introduce yourself and use polite expressions.',
    vocab: {
      'helo': 'hello (British)',
      'hai': 'hi',
      'apa khabar': 'how are you?',
      'khabar baik': 'very well',
      'selamat pagi': 'good morning',
      'selamat tengah hari': 'good afternoon',
      'selamat petang': 'good afternoon',
      'selamat malam': 'good evening',
      'terima kasih': 'thank you',
      'sama-sama': 'you are welcome',
      'maaf': 'sorry',
      'tolong': 'please; help me',
      'jumpa lagi': 'see you again',
      'selamat tinggal': 'goodbye (said to the one leaving)',
      'nama saya': 'my name is',
      'berkenalan': 'to get acquainted',
      'gembira': 'glad; happy',
      'awak': 'you (friendly)',
      'saya': 'I',
      'berumur': '… years old'
    },
    grammar: {
      title: 'Greetings and Small Talk',
      lead: 'You greet people differently depending on the time of day, and the reply to "Apa khabar?" is "Khabar baik".',
      points: [
        'selamat means safe or blessed and is joined to a time word: pagi, tengah hari, petang, malam.',
        'Reply to a greeting with "Terima kasih", and the other person answers "Sama-sama".',
        '"jumpa lagi" means goodbye (to the one staying), while "selamat tinggal" is said to the one leaving.',
        'Introduce yourself with Nama saya + name. Saya dari + country/city.',
        'Mind the pronouns: saya (I, polite) / aku (I, casual); awak (you, friendly) / kamu (you, neutral) / anda (you, formal).'
      ],
      examples: [
        { ms: 'Helo! Apa khabar?', en: 'Hello! How are you?' },
        { ms: 'Nama saya Li Ming. Saya dari China.', en: 'My name is Li Ming. I am from China.' }
      ]
    },
    sentences: {
      'Helo! Nama saya Li Ming.': 'Hello! My name is Li Ming.',
      'Apa khabar? Khabar baik, terima kasih.': 'How are you? Very well, thank you.',
      'Saya berumur 25 tahun.': 'I am 25 years old.',
      'Saya tinggal di Kuala Lumpur.': 'I live in Kuala Lumpur.',
      'Gembira berkenalan dengan awak!': 'Nice to meet you!'
    },
    gq: [
      { q: 'Which do you say when leaving a friend\'s house?', opts: ['Selamat tinggal', 'Jumpa lagi', 'Terima kasih'], a: 0, why: 'selamat tinggal is the wish said to the person who is leaving.' },
      { q: 'How do you reply to "Terima kasih"?', opts: ['Sama-sama', 'Maaf', 'Tolong'], a: 0, why: 'sama-sama means you are welcome.' },
      { q: 'What is the correct reply to "Apa khabar?"', opts: ['Khabar baik', 'Nama saya Li Ming', 'Selamat pagi'], a: 0, why: 'Khabar baik means very well.' }
    ]
  },

  u4: {
    label: 'This, That & Adjectives',
    desc: 'Point to things with ini/itu and describe people and objects.',
    vocab: {
      'ini': 'this (near)',
      'itu': 'that (far)',
      'sangat': 'very',
      'kurang': 'rather not',
      'tidak': 'not',
      'tinggi': 'tall',
      'rendah': 'short; low',
      'besar': 'big',
      'kecil': 'small',
      'cantik': 'beautiful',
      'comel': 'cute',
      'panjang': 'long',
      'pendek': 'short',
      'baru': 'new',
      'lama': 'old; long (time)',
      'kepala': 'head',
      'tangan': 'hand',
      'mulut': 'mouth',
      'kaki': 'leg; foot',
      'mata': 'eye',
      'hidung': 'nose',
      'rambut': 'hair',
      'telinga': 'ear',
      'pipi': 'cheek',
      'gigi': 'tooth',
      'lidah': 'tongue',
      'pensel': 'pencil',
      'hitam': 'black',
      'merah': 'red'
    },
    grammar: {
      title: 'Demonstratives and Adjectives',
      lead: '"Ini" points to what is near and "itu" to what is far away; adjectives are placed before the noun.',
      points: [
        'Ini means this (close to me), while itu means that (far from me).',
        'Adjectives come before the noun: bola besar (a big ball), pensel pendek (a short pencil).',
        'Strengthen or weaken a description with sangat (very), kurang (rather not) and tidak (not).',
        'To negate an adjective, do not put it before the noun but after be / ada: Bola itu tidak besar.',
        'Malay has no a/an variation and needs no article.'
      ],
      examples: [
        { ms: 'Ini pensel saya.', en: 'This is my pencil.' },
        { ms: 'Pen ini warna hitam.', en: 'This pen is black.' },
        { ms: 'Dia sangat rendah.', en: 'He is very short.' }
      ]
    },
    sentences: {
      'Ini pensel saya.': 'This is my pencil.',
      'Pen itu warna merah.': 'That pen is red.',
      'Saya tinggi.': 'I am tall.',
      'Bola itu kecil.': 'That ball is small.',
      'Rambut saya panjang.': 'My hair is long.'
    },
    gq: [
      { q: 'Which word points to something far away?', opts: ['itu', 'ini', 'di'], a: 0, why: 'itu means that (far), while ini means this (near).' },
      { q: 'How do you say "The ball is not big"?', opts: ['Bola itu tidak besar.', 'Bola itu besar tidak.', 'Tidak bola besar itu.'], a: 0, why: 'The negative word goes after be/ada.' },
      { q: 'Where does an adjective go?', opts: ['before the noun', 'after the noun', 'at the end of the sentence'], a: 0, why: 'In Malay the adjective comes before the noun.' }
    ]
  },

  u5: {
    label: 'Friends & Family',
    desc: 'Introduce friends, introduce family members and name relatives.',
    vocab: {
      'sahabat': 'good friend',
      'teman': 'friend',
      'kawan': 'companion; buddy',
      'kawan baik': 'good friend',
      'sahabat selamanya': 'a lifelong friend',
      'sahabat sejati': 'a true friend',
      'memperkenalkan': 'to introduce',
      'nenek': 'grandmother',
      'datuk': 'grandfather',
      'ibu': 'mother',
      'bapa': 'father',
      'abang': 'older brother',
      'kakak': 'older sister',
      'adik': 'younger brother or sister',
      'adik beradik': 'siblings',
      'adik lelaki': 'younger brother',
      'adik perempuan': 'younger sister',
      'pak cik': 'uncle (older man)',
      'mak cik': 'aunt (older woman)',
      'bapa saudara': 'uncle (father\'s brother)',
      'ibu saudara': 'aunt (father\'s sister-in-law)',
      'sepupu': 'cousin',
      'keluarga': 'family',
      'sayang': 'to love',
      'hobi': 'hobby',
      'melancong': 'to stroll'
    },
    grammar: {
      title: 'Introducing Others and Family',
      lead: '"Sila perkenalkan…" is the standard way to ask someone to make an introduction for you.',
      points: [
        'The third person is dia (he/she), and -nya is added after the noun: sahabat saya, namanya Sarah.',
        'Family terms do not follow order of age, but you separate male and female: adik lelaki / adik perempuan.',
        'Respectful titles: Encik (Mr), Puan (Mrs/Ms), Cik (Miss/Mr).',
        'Quantifiers: Saya ada 3 orang adik-beradik. (I have three younger siblings.)',
        'Introducing family: Ini bapa saya / Ini keluarga saya.'
      ],
      examples: [
        { ms: 'Ini sahabat saya. Namanya Sarah.', en: 'This is my friend. Her name is Sarah.' },
        { ms: 'Saya ada 3 orang adik-beradik.', en: 'I have three younger siblings.' }
      ]
    },
    sentences: {
      'Ini sahabat saya, Namanya Sarah.': 'This is my friend. Her name is Sarah.',
      'Umurnya 21 tahun.': 'She is twenty-one years old.',
      'Dia tinggal di Melaka.': 'She lives in Melaka.',
      'Ini keluarga saya.': 'This is my family.',
      'Saya sayang keluarga saya.': 'I love my family.'
    },
    gq: [
      { q: 'Which one means "my younger sister"?', opts: ['adik perempuan', 'adik lelaki', 'kakak'], a: 0, why: 'perempuan means female, so adik perempuan is the younger sister.' },
      { q: 'Which do you say to ask someone to introduce a friend?', opts: ['Sila perkenalkan kawan kamu.', 'Saya introduce.', 'Tolong introduce.'], a: 0, why: 'Sila perkenalkan… is a fixed polite expression.' },
      { q: 'What does "sahabat sejati" mean?', opts: ['a true friend', 'a boyfriend', 'a lifelong friend'], a: 0, why: 'sejati means true.' }
    ]
  },

  u6: {
    label: 'Tenses & Daily Verbs',
    desc: 'Use the seven aspect helpers: telah/sudah/pernah/sedang/masih/akan/belum.',
    vocab: {
      'telah': 'already (perfect)',
      'sudah': 'already',
      'pernah': 'ever; have done before',
      'sedang': 'in the middle of',
      'masih': 'still',
      'akan': 'will; going to',
      'belum': 'not yet',
      'bangun': 'to get up',
      'tidur': 'to sleep',
      'mengemas': 'to tidy up',
      'mandi': 'to bathe',
      'menggosok': 'to brush',
      'makan': 'to eat',
      'bersarapan': 'to have breakfast',
      'makan malam': 'to have dinner',
      'minum': 'to drink',
      'belajar': 'to study',
      'membaca': 'to read',
      'bernapas': 'to breathe',
      'datang': 'to come',
      'pergi': 'to go',
      'pagi': 'morning',
      'malam': 'night',
      'setiap hari': 'every day'
    },
    grammar: {
      title: 'Aspect Helpers (Kata Bantu Aspek)',
      lead: 'Malay never changes the form of the verb; time is expressed with helper words instead.',
      points: [
        'Perfect: telah (has been done) / sudah (already done) + the verb.',
        'Past experience: pernah + the verb, for example Saya pernah tinggal di China.',
        'Progressive: sedang (is doing) / masih (is still doing) + the verb.',
        'Future: akan + the verb; belum means not yet and is often the opposite of sudah.',
        'Past forms take the meN- prefix, such as makan → memakan, tidur → tertidur.'
      ],
      examples: [
        { ms: 'Saya sudah makan pagi ini.', en: 'I have already eaten this morning.' },
        { ms: 'Dia masih makan di kampus.', en: 'He is still eating on campus.' },
        { ms: 'Kami belum makan lagi.', en: 'We have not eaten yet.' }
      ]
    },
    sentences: {
      'Saya bangun pada pukul enam pagi.': 'I get up at six in the morning.',
      'Dia mandi setiap hari.': 'He bathes every day.',
      'Saya sedang belajar Bahasa Melayu.': 'I am studying Malay.',
      'Saya pernah tinggal di China.': 'I used to live in China.',
      'Ibu mengemas rumah.': 'Mother tidies the house.'
    },
    gq: [
      { q: 'Which helper says "I am studying"?', opts: ['sedang', 'telah', 'akan'], a: 0, why: 'sedang marks an action in progress.' },
      { q: 'Which one says "we have already eaten"?', opts: ['sudah', 'belum', 'pernah'], a: 0, why: 'sudah means already, while belum means not yet.' },
      { q: 'Which one says "I used to live in China"?', opts: ['pernah', 'masih', 'akan'], a: 0, why: 'pernah marks past experience.' }
    ]
  },

  u7: {
    label: 'Prepositions & Location',
    desc: 'Say where things are and where they go with di / ke / dari / pada / dengan.',
    vocab: {
      'di': 'at (place)',
      'ke': 'to (direction)',
      'dari': 'from (starting point)',
      'pada': 'at (time)',
      'dengan': 'with; by means of',
      'untuk': 'for',
      'dalam': 'inside',
      'atas': 'on top of',
      'bawah': 'under',
      'dekat': 'near',
      'jauh': 'far',
      'rumah': 'house; home',
      'universiti': 'university',
      'kampus': 'campus',
      'kelas': 'classroom',
      'bilik': 'room',
      'meja': 'table',
      'kursi': 'chair',
      'beg': 'bag',
      'buku': 'book',
      'kucing': 'cat',
      'minum': 'to drink',
      'teh': 'tea',
      'susu': 'milk'
    },
    grammar: {
      title: 'Prepositions (Kata Sendi)',
      lead: 'Malay prepositions are short and flexible in position, apart from the special use of "ada".',
      points: [
        'di + place: di rumah, di universiti.',
        'ke + destination: ke sekolah, ke Malaysia.',
        'dari + source: dari China, dari universiti.',
        'pada + time: pada hari Isnin, pada tahun 2025.',
        'dengan + tool or companion: dengan rakan saya.',
        'Place phrases: di atas meja (on the table), di dalam beg (in the bag), di bawah bangku (under the chair).'
      ],
      examples: [
        { ms: 'Saya belajar di universiti.', en: 'I study at the university.' },
        { ms: 'Saya minum teh dengan susu.', en: 'I drink tea with milk.' }
      ]
    },
    sentences: {
      'Saya tinggal di Kuala Lumpur.': 'I live in Kuala Lumpur.',
      'Dia datang dari China.': 'He comes from China.',
      'Saya akan pergi ke Malaysia.': 'I am going to Malaysia.',
      'Kucing itu di atas meja.': 'The cat is on the table.',
      'Buku ini di dalam beg saya.': 'This book is in my bag.'
    },
    gq: [
      { q: 'Which preposition shows a destination?', opts: ['ke', 'di', 'dari'], a: 0, why: 'ke means to (direction), di means at, dari means from.' },
      { q: 'Which one says "with my friend"?', opts: ['dengan', 'untuk', 'ke'], a: 0, why: 'dengan means with/using.' },
      { q: 'Which one means "on the table"?', opts: ['di atas meja', 'di bawah meja', 'di dalam meja'], a: 0, why: 'atas means on top, dalam means inside, bawah means underneath.' }
    ]
  },

  u8: {
    label: 'Food & Cooking',
    desc: 'Malay dishes, cooking methods and words for taste.',
    vocab: {
      'restoran': 'restaurant',
      'gerai': 'food stall',
      'kopitiam': 'coffee shop',
      'nasi': 'rice',
      'mi': 'noodles',
      'ikan': 'fish',
      'telur': 'egg',
      'tauhu': 'tofu',
      'keju': 'cheese',
      'daging': 'meat',
      'udang': 'prawn',
      'ayam': 'chicken',
      'sotong': 'squid',
      'goreng': 'fried',
      'panggang': 'grilled',
      'bakar': 'baked; roasted',
      'kukus': 'steamed',
      'rebus': 'boiled (in soup)',
      'manis': 'sweet',
      'pahit': 'bitter',
      'masam': 'sour',
      'masin': 'salty',
      'pedas': 'spicy',
      'sedap': 'delicious',
      'makan': 'to eat',
      'mau': 'to want'
    },
    grammar: {
      title: 'Ordering and Describing Taste',
      lead: 'Use "dato" or "pun" (quantity) with a noun, and cooking methods behave like adjectives.',
      points: [
        'Ordering: Saya mau nasi ayam. / Tolong beri saya satu nasi goreng.',
        'The cooking method modifies the noun directly: nasi goreng (fried rice), ikan panggang (grilled fish), tahu rebus (boiled tofu).',
        'Words for taste come after the noun: nasi manis (sweet rice), air masin (salty water).',
        'Common quantity phrases: satu pinggan (a plate), secangkir (a cup), sepotong (a piece).',
        'At a drink stall: Teh tarik is half tea and half condensed milk.'
      ],
      examples: [
        { ms: 'Nasi ini sangat sedap.', en: 'This rice is very delicious.' },
        { ms: 'Saya suka ikan bancuh.', en: 'I like fish in gravy.' }
      ]
    },
    sentences: {
      'Saya suka nasi ayam.': 'I like chicken rice.',
      'Nasi ini sangat sedap.': 'This rice is very delicious.',
      'Saya mau dua telur goreng.': 'I want two fried eggs.',
      'Makanan ini terlalu pedas.': 'This dish is too spicy.',
      'Ayah saya suka makan di gerai.': 'My father likes eating at the food stall.'
    },
    gq: [
      { q: 'What dish is "nasi goreng"?', opts: ['fried rice', 'boiled rice', 'roasted rice'], a: 0, why: 'goreng means fried, so it is fried rice.' },
      { q: 'What does "kukus" mean?', opts: ['steamed', 'fried', 'grilled'], a: 0, why: 'kukus means steam.' },
      { q: 'Which phrase do you use to order food?', opts: ['Saya mau…', 'Saya jadi…', 'Saya ada…'], a: 0, why: 'mau means to want.' }
    ]
  },

  u9: {
    label: 'Fruits & Vegetables',
    desc: 'Tropical fruit, the wet market and buying by weight.',
    vocab: {
      'timun': 'cucumber',
      'bawang': 'onion',
      'lobak': 'carrot; radish',
      'cili': 'chilli',
      'kelapa': 'coconut',
      'kelapa pandan': 'pandan',
      'durian': 'durian',
      'mangga': 'mango',
      'manggis': 'mangosteen',
      'rambutan': 'rambutan',
      'tembikai': 'watermelon',
      'pisang': 'banana',
      'betik': 'papaya',
      'epal': 'apple',
      'oren': 'orange',
      'sayur': 'vegetables',
      'kangkung': 'water spinach',
      'bayam': 'spinach',
      'kadas': 'long beans',
      'pasar raya': 'supermarket',
      'pasar': 'market',
      'kg': 'kilogram',
      'segenggang': 'a handful (measure word)',
      'segar': 'fresh',
      'manis': 'sweet'
    },
    grammar: {
      title: 'Buying Fruit and Vegetables',
      lead: 'Quantities are measured with kg, segenggang, biji and bilik.',
      points: [
        'When you buy, say: Boleh saya beli dua kilogram mangga? (May I buy two kilograms of mango?)',
        'Common measure words: kg (kilogram), gram, biji (for mangoes), segenggang (a handful of greens), bilik (for eggs or cups).',
        'Adjectives come after the noun: mangga yang manis (the sweet mango).',
        'yang can replace the earlier description: nasi yang sedap.',
        'Use segar for fresh and manis for sweet.'
      ],
      examples: [
        { ms: 'Saya membeli epal dan pisang di pasar raya.', en: 'I bought apples and bananas at the supermarket.' },
        { ms: 'Durian sangat manis.', en: 'Durian is very sweet.' }
      ]
    },
    sentences: {
      'Saya suka mangga.': 'I like mangoes.',
      'Durian sangat manis.': 'Durian is very sweet.',
      'Timun ini segar.': 'This cucumber is fresh.',
      'Saya membeli epal dan pisang di pasar raya.': 'I bought apples and bananas at the supermarket.',
      'Cili itu terlalu pedas.': 'That chilli is too spicy.'
    },
    gq: [
      { q: 'What unit is "beli dua kilogram"?', opts: ['kg (kilogram)', 'biji (piece)', 'bilik (cup)'], a: 0, why: 'kg is the unit of weight.' },
      { q: 'What is "bayam"?', opts: ['spinach', 'cucumber', 'onion'], a: 0, why: 'bayam means spinach.' },
      { q: 'In "apa yang segar", what does apa mean?', opts: ['which/what (in a question)', 'not', 'very'], a: 0, why: 'In questions apa means what or which.' }
    ]
  },

  u10: {
    label: 'Calls & Places to Shop',
    desc: 'Openings and endings for phone calls, and different kinds of shops.',
    vocab: {
      'telefon': 'telephone',
      'telefon bimbit': 'mobile phone',
      'telefon pintar': 'smartphone',
      'telefon awam': 'public telephone',
      'menelefon': 'to make a call',
      'nombor telefon': 'telephone number',
      'hujung talian': 'the other end of the line',
      'bercakap': 'to speak',
      'Kedai pakaian': 'clothes shop',
      'pusat beli-belah': 'shopping centre',
      'pasar raya': 'supermarket',
      'supermarket': 'supermarket',
      'kedai runcit': 'grocery shop',
      'kompang': 'street vendor',
      'gerai': 'stall',
      'bank': 'bank',
      'hospital': 'hospital',
      'klinik': 'clinic',
      'universiti': 'university',
      'sekolah': 'school',
      'tutup': 'to close',
      'buka': 'to open',
      'waktu': 'time',
      'cakap': 'to say'
    },
    grammar: {
      title: 'Phone Conversations',
      lead: 'Phone calls follow fixed opening and closing patterns, and the subject is often left out.',
      points: [
        'Opening: Helo / Hai + your name; you may also say Selamat pagi (good morning).',
        'Asking who is speaking: Siapa di hujung talian?',
        'Asking for a number: Boleh saya mendapat nombor telefon awak?',
        'Ending: Terima kasih, jumpa lagi. / Selamat tinggal!',
        'Opening hours use waktu buka dan tutup; people also say waktu operasi (business hours).'
      ],
      examples: [
        { ms: 'Helo, ini Chong Wei. Boleh saya mendapat nombor telefon awak?', en: 'Hello, this is Chong Wei. May I have your telephone number?' },
        { ms: 'Selamat tinggal, jumpa lagi!', en: 'Goodbye, see you again!' }
      ]
    },
    sentences: {
      'Siapa di hujung talian?': 'Who is at the other end of the line?',
      'Boleh saya mendapat nombor telefon awak?': 'May I have your telephone number?',
      'Saya nak pergi ke kedai pakaian.': 'I want to go to the clothes shop.',
      'Di mana pusat beli-belah?': 'Where is the shopping centre?',
      'Pasar raya tutup pada pukul sepuluh malam.': 'The supermarket closes at ten at night.'
    },
    gq: [
      { q: 'Which question asks who is at the other end of the line?', opts: ['Siapa di hujung talian?', 'Berapa nombor telefon?', 'Di mana kedai?'], a: 0, why: 'hujung talian means the other end of the line.' },
      { q: 'Which one is a clothes shop?', opts: ['kedai pakaian', 'pusat beli-belah', 'bank'], a: 0, why: 'pakaian means clothes.' },
      { q: 'What is the most common way to end a phone call?', opts: ['Terima kasih, jumpa lagi.', 'Selamat pagi.', 'Apa khabar?'], a: 0, why: 'jumpa lagi is used to say goodbye on the phone or in person.' }
    ]
  },

  u11: {
    label: 'Prices & Payment',
    desc: 'Shopping talk: how much, how to pay and getting change.',
    vocab: {
      'harga': 'price',
      'berapa': 'how many; how much',
      'mahal': 'expensive',
      'murah': 'cheap',
      'wang': 'money',
      'bayar': 'to pay',
      'tukar wang': 'to change money',
      'duit': 'money (colloquial)',
      'syiling': 'coin',
      'pecahan': 'change',
      'kad': 'card',
      'kasir': 'cashier',
      'jumlah': 'total; number',
      'diskaun': 'discount',
      'percuma': 'free',
      'beli': 'to buy',
      'jual': 'to sell',
      'tawar': 'to bargain',
      'boleh': 'may; can',
      'tolong': 'please',
      'satu': 'one',
      'dua': 'two',
      'seratus': 'one hundred'
    },
    grammar: {
      title: 'Useful Shopping Phrases',
      lead: 'Ask the price with "berapa + noun" and pay with "bayar dengan…".',
      points: [
        'Asking the price: Berapa harga buku ini? (How much is this book?)',
        'Answering: Harga buku itu sepuluh ringgit.',
        'Saying it is too expensive: Itu terlalu mahal! / Boleh kurang? (Can you lower the price?)',
        'Paying: Saya nak bayar dengan kad. / Boleh saya tukar wang?',
        'Haggle with "boleh kurang?" and compare prices with "mana lebih murah?".',
        'Quantities go before the noun: dua biji telur, tiga kilogram gula.'
      ],
      examples: [
        { ms: 'Berapa harga buku ini?', en: 'How much is this book?' },
        { ms: 'Boleh saya bayar dengan kad?', en: 'May I pay by card?' }
      ]
    },
    sentences: {
      'Berapa harga buku ini?': 'How much is this book?',
      'Harga buku itu sepuluh ringgit.': 'That book costs ten ringgit.',
      'Itu terlalu mahal!': 'That is too expensive!',
      'Boleh saya bayar dengan kad?': 'May I pay by card?',
      'Saya nak beli dua kilogram gula.': 'I want to buy two kilograms of sugar.'
    },
    gq: [
      { q: 'Which question asks the price?', opts: ['Berapa harga…?', 'Siapa…?', 'Di mana…?'], a: 0, why: 'It is berapa + the item + harga.' },
      { q: 'Which one means "too expensive"?', opts: ['Itu terlalu mahal.', 'Itu sangat murah.', 'Itu berapa?'], a: 0, why: 'mahal means expensive.' },
      { q: 'What does "bayar dengan kad" mean?', opts: ['to pay by card', 'to change money', 'to bargain'], a: 0, why: 'dengan kad means using a card.' }
    ]
  },

  u12: {
    label: 'Transport & Directions',
    desc: 'Public transport, giving directions and asking for the way.',
    vocab: {
      'bas': 'bus',
      'teksi': 'taxi',
      'kereta api': 'train',
      'kereta': 'car; train',
      'MRT': 'MRT (subway)',
      'LRT': 'LRT (light rail)',
      'basikal': 'bicycle',
      'motor': 'motorcycle',
      'teksi online': 'ride-hailing taxi',
      'perjalanan': 'journey',
      'tiket': 'ticket',
      'stesen': 'station',
      'henti': 'stop (bus stop)',
      'peta': 'map',
      'arah': 'direction',
      'kanan': 'right',
      'kiri': 'left',
      'lurus': 'straight',
      'berhampiran': 'nearby',
      'jauh': 'far',
      'berjalan kaki': 'to walk',
      'naik': 'to board',
      'turun': 'to get off',
      'masa': 'time',
      'pergi': 'to go'
    },
    grammar: {
      title: 'Asking and Giving Directions',
      lead: 'Ask the way with mana, di mana and ke mana; answer with "Pergi terus, kemudian belok kanan".',
      points: [
        'Di mana stesen bas? (Where is the bus station?)',
        'Ke mana jalan ini membawa? (Where does this road lead?)',
        'Giving directions: Pergi terus (go straight), Belok kiri/kanan (turn left/right), Temu jalan (at the junction), Sebelah kiri (on the left).',
        'Taking transport: Saya naik bas ke universiti setiap hari.',
        'Travel tickets: tiket bas, tiket kereta api.'
      ],
      examples: [
        { ms: 'Boleh tunjukkan jalan ke stesen kereta api?', en: 'Could you show me the way to the train station?' },
        { ms: 'Pergi terus, kemudian belok kanan.', en: 'Go straight, then turn right.' }
      ]
    },
    sentences: {
      'Di mana stesen bas?': 'Where is the bus station?',
      'Pergi terus, kemudian belok kanan.': 'Go straight, then turn right.',
      'Stesen bas di sebelah kiri.': 'The bus station is on the left.',
      'Saya naik bas ke universiti setiap hari.': 'I take the bus to the university every day.',
      'Perjalanan itu mengambil dua jam.': 'That journey takes two hours.'
    },
    gq: [
      { q: 'Which question asks "where to"?', opts: ['Ke mana?', 'Di mana?', 'Berapa?'], a: 0, why: 'ke mana asks about a destination, di mana asks about a place.' },
      { q: 'Which one means "turn right"?', opts: ['belok kanan', 'belok kiri', 'terus'], a: 0, why: 'kanan means right and kiri means left.' },
      { q: 'Which verb says "I take the bus every day"?', opts: ['naik', 'turun', 'pergi'], a: 0, why: 'naik means to board or take.' }
    ]
  },

  u13: {
    label: 'Tourist Attractions',
    desc: 'Talking about attractions: islands, beaches, waterfalls, highlands and theme parks.',
    vocab: {
      'pulau': 'island',
      'pantai': 'beach',
      'air jatuh': 'waterfall',
      'tanah tinggi': 'highland',
      'taman tema': 'theme park',
      'taman air': 'water park',
      'mercu tanda': 'landmark',
      'tempat menarik': 'attraction',
      'bercuti': 'to holiday',
      'melancong': 'to visit; to stroll',
      'Batu Caves': 'Batu Caves',
      'Cameron Highlands': 'Cameron Highlands',
      'Langkawi': 'Langkawi',
      'Genting': 'Genting',
      'Menara Kuala Lumpur': 'Kuala Lumpur Tower',
      'Malaysia': 'Malaysia',
      'indah': 'beautiful',
      'menarik': 'interesting; attractive',
      'sungguh': 'really; truly',
      'mahu': 'to want (mahu bercuti)',
      'ke mana': 'to where',
      'kereta api': 'train',
      'malam': 'night',
      'pagi': 'morning',
      'tiket': 'ticket'
    },
    grammar: {
      title: 'Talking about Holiday Plans',
      lead: 'Plan a trip with the future marker "akan" plus a verb and the place preposition "di".',
      points: [
        'Ke manakah kamu mahu bercuti? (Where do you want to go for a holiday?)',
        'Saya mahu bercuti di Cameron Highlands. (I want to holiday in Cameron Highlands.)',
        'Plans: Saya akan pergi ke Langkawi pada tahun depan.',
        'Describing scenery: Pantai di Langkawi sangat indah.',
        'Use the question words di mana (where), bilakah (when), mengapa (why) and bagaimanakah (how).'
      ],
      examples: [
        { ms: 'Ke manakah kamu mahu bercuti?', en: 'Where do you want to go for a holiday?' },
        { ms: 'Saya mahu bercuti di Cameron Highlands.', en: 'I want to holiday in Cameron Highlands.' }
      ]
    },
    sentences: {
      'Ke manakah kamu mahu bercuti?': 'Where do you want to go for a holiday?',
      'Saya mahu bercuti di Cameron Highlands.': 'I want to holiday in Cameron Highlands.',
      'Pantai di Langkawi sangat indah.': 'The beach in Langkawi is very beautiful.',
      'Taman tema itu sangat menarik.': 'That theme park is very interesting.',
      'Saya naik kereta api ke Kuala Lumpur.': 'I take the train to Kuala Lumpur.'
    },
    gq: [
      { q: 'Which one says "I want to go on holiday"?', opts: ['Saya mahu bercuti', 'Saya ada cuti', 'Saya kerja cuti'], a: 0, why: 'mahu bercuti means to want to go on holiday.' },
      { q: 'Which one means "waterfall"?', opts: ['air jatuh', 'air mata', 'air besar'], a: 0, why: 'air jatuh means falling water, so it is a waterfall.' },
      { q: 'What does "Ke manakah kamu…" ask about?', opts: ['where to', 'when', 'how much'], a: 0, why: 'ke mana asks where to.' }
    ]
  },

  u14: {
    label: 'Opinions & Discussion',
    desc: 'Give your views, give reasons, agree and disagree.',
    vocab: {
      'saya fikir': 'I think',
      'saya percaya': 'I believe',
      'menurut saya': 'in my opinion',
      'sebab': 'because',
      'kerana': 'because',
      'namun': 'however',
      'tetapi': 'but',
      'saya setuju': 'I agree',
      'saya tidak setuju': 'I do not agree',
      'mungkin': 'perhaps; maybe',
      'mesti': 'must; certainly',
      'sangat mudah': 'very easy',
      'sukar': 'difficult',
      'menarik': 'interesting',
      'membosankan': 'boring',
      'mahal': 'expensive',
      'murah': 'cheap',
      'bersih': 'clean',
      'kotor': 'dirty',
      'ramai': 'crowded',
      'senang': 'enjoyable; easy',
      'bayar': 'to pay',
      'kerja': 'to work',
      'main': 'to play'
    },
    grammar: {
      title: 'Linkers for Expressing Opinions',
      lead: 'Opinion + linker + reason is the standard structure of a Malay discussion paragraph.',
      points: [
        'Opening: Saya fikir / Menurut saya / Saya percaya…',
        'Reason: kerana / sebab (because), as in kerana itu sebab…',
        'Contrast: tetapi / namun.',
        'Agreement: Saya setuju dengan awak. Disagreement: Saya tidak setuju.',
        'Degree adverbs come before the adjective: sangat mudah, sangat menarik.',
        'Close with a suggestion: Sila ikutlah nasihat saya.'
      ],
      examples: [
        { ms: 'Saya fikir Bahasa Melayu mudah.', en: 'I think Malay is easy.' },
        { ms: 'Saya setuju, tetapi tempat itu terlalu mahal.', en: 'I agree, but that place is too expensive.' }
      ]
    },
    sentences: {
      'Saya fikir Bahasa Melayu mudah.': 'I think Malay is easy.',
      'Saya setuju dengan awak.': 'I agree with you.',
      'Tempat itu ramai dan mahal.': 'That place is crowded and expensive.',
      'Namun, saya tidak suka menari.': 'However, I do not like dancing.',
      'Menurut saya, ia pasti menarik.': 'In my opinion, it must be interesting.'
    },
    gq: [
      { q: 'Which one means "I think"?', opts: ['Saya fikir', 'Saya tanya', 'Saya jawab'], a: 0, why: 'fikir means to think.' },
      { q: 'Which one means "but"?', opts: ['tetapi / namun', 'kerana', 'jadi'], a: 0, why: 'tetapi and namun show contrast.' },
      { q: 'Which one means "I agree"?', opts: ['Saya setuju', 'Saya tidak setuju', 'Saya tidak suka'], a: 0, why: 'setuju means to agree.' }
    ]
  }
};
