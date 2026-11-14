/* =========================================================
   MelayuDuolingo — 课程数据
   依据《MPU1.1 Bahasa Melayu Komunikasi 2》教材 14 课编排
   ========================================================= */

export const COURSE = {
  title: '马来语学习 · MelayuDuolingo',
  subtitle: '跟着 MPU1.1 教材，14 单元闯关学马来语',
  lang: 'ms-MY'
};

/* 单元定义 ------------------------------------------------------ */
export const UNITS = [
  {
    id: 'u1', icon: '🔤', title: 'Bunyi dan Sebutan I', zh: '元音与辅音',
    desc: '认识马来语的 5 个元音字母，练习正确发音。',
    vocab: [
      { ms: 'apa', zh: '什么', emoji: '❓' },
      { ms: 'hati', zh: '心', emoji: '❤️' },
      { ms: 'kami', zh: '我们', emoji: '👥' },
      { ms: 'biru', zh: '蓝色', emoji: '🔵' },
      { ms: 'beri', zh: '给', emoji: '🎁' },
      { ms: 'tiga', zh: '三', emoji: '3️⃣' },
      { ms: 'pergi', zh: '走；离开', emoji: '🚶' },
      { ms: 'enam', zh: '六', emoji: '6️⃣' },
      { ms: 'kek', zh: '蛋糕', emoji: '🍰' },
      { ms: 'sekolah', zh: '学校', emoji: '🏫' },
      { ms: 'besar', zh: '大', emoji: '🐘' },
      { ms: 'ikan', zh: '鱼', emoji: '🐟' },
      { ms: 'kita', zh: '我们（近）', emoji: '🙋' },
      { ms: 'nasi', zh: '米饭', emoji: '🍚' },
      { ms: 'minum', zh: '喝', emoji: '🥤' },
      { ms: 'orang', zh: '人', emoji: '🧑' },
      { ms: 'roti', zh: '面包', emoji: '🍞' },
      { ms: 'kota', zh: '城市', emoji: '🏙️' },
      { ms: 'rumah', zh: '房子', emoji: '🏠' },
      { ms: 'satu', zh: '一', emoji: '1️⃣' },
      { ms: 'buku', zh: '书', emoji: '📕' },
      { ms: 'duduk', zh: '坐', emoji: '🪑' },
      { ms: 'bola', zh: '球', emoji: '⚽' }
    ],
    grammar: {
      title: '元音字母 Bunyi Vokal',
      zh: '马来语只有 5 个元音字母：a、e、i、o、u，其余都是辅音。',
      points: [
        'a 读作短促的 /a/，类似英语 father 的 a：apa、hati、kami。',
        'e 有两种读法：“pepet” 短音 /ə/（beri、tiga）；“taling” 长音 /e/（enam、kek）。',
        'i 读 /i/：ikan、kita、nasi。',
        'o 读 /o/：orang、roti、kota。',
        'u 读 /u/：rumah、satu、buku。',
        '辅音 c 读 /tʃ/（cili）、j 读 /dʒ/（ jams），跟英语不一样哦。'
      ],
      examples: [
        { ms: 'apa · hati · kami', zh: 'a 的例子：什么、心、我们' },
        { ms: 'beri · tiga · enam · kek', zh: 'e 的两种读法：beri/tiga（短）、enam/kek（长）' },
        { ms: 'rumah · satu · buku', zh: 'u 的例子：房子、一、书' }
      ]
    },
    sentences: [
      { ms: 'Ini buku saya.', zh: '这是我的书。' },
      { ms: 'Saya suka biru.', zh: '我喜欢蓝色。' },
      { ms: 'Kami pergi ke kota.', zh: '我们去城市。' },
      { ms: 'Kek itu sangat manis.', zh: '那个蛋糕很甜。' },
      { ms: 'Ibu duduk di rumah.', zh: '妈妈坐在家里。' }
    ],
    gq: [
      { q: '“tiga” 里的 e 属于哪种读法？', opts: ['pepet 短音', 'taling 长音', '跟 a 一样'], a: 0, why: 'tiga 读作 ti-ga，e 是短促的 pepet 音。' },
      { q: '下面哪个词的 o 读 /o/？', opts: ['orang', 'satu', 'ikan'], a: 0, why: 'orang、roti、kota 中的 o 都读 /o/。' },
      { q: '马来语一共有几个元音字母？', opts: ['5 个', '8 个', '12 个'], a: 0, why: 'a、e、i、o、u，一共 5 个。' }
    ]
  },

  {
    id: 'u2', icon: '🔢', title: 'Bunyi dan Sebutan II', zh: '数字、货币、时间与日期',
    desc: '数数、说钱、看时间、报日期。',
    vocab: [
      { ms: 'satu', zh: '一', emoji: '1️⃣' },
      { ms: 'dua', zh: '二', emoji: '2️⃣' },
      { ms: 'tiga', zh: '三', emoji: '3️⃣' },
      { ms: 'empat', zh: '四', emoji: '4️⃣' },
      { ms: 'lima', zh: '五', emoji: '5️⃣' },
      { ms: 'enam', zh: '六', emoji: '6️⃣' },
      { ms: 'tujuh', zh: '七', emoji: '7️⃣' },
      { ms: 'lapan', zh: '八', emoji: '8️⃣' },
      { ms: 'sembilan', zh: '九', emoji: '9️⃣' },
      { ms: 'sifar', zh: '零', emoji: '0️⃣' },
      { ms: 'sepuluh', zh: '十', emoji: '🔟' },
      { ms: 'sebelas', zh: '十一', emoji: '1️⃣1️⃣' },
      { ms: 'seratus', zh: '一百', emoji: '💯' },
      { ms: 'seribu', zh: '一千', emoji: '🔢' },
      { ms: 'ringgit', zh: '令吉（马来西亚币）', emoji: '💰' },
      { ms: 'sen', zh: '仙（100 sen = RM1）', emoji: '🪙' },
      { ms: 'pukul', zh: '…点钟', emoji: '🕐' },
      { ms: 'minit', zh: '分钟', emoji: '⏱️' },
      { ms: 'hari', zh: '天；日', emoji: '📅' },
      { ms: 'Isnin', zh: '星期一', emoji: '1️⃣' },
      { ms: 'Selasa', zh: '星期二', emoji: '2️⃣' },
      { ms: 'Rabu', zh: '星期三', emoji: '3️⃣' },
      { ms: 'Khamis', zh: '星期四', emoji: '4️⃣' },
      { ms: 'Jumaat', zh: '星期五', emoji: '5️⃣' },
      { ms: 'Sabtu', zh: '星期六', emoji: '6️⃣' },
      { ms: 'Ahad', zh: '星期日', emoji: '7️⃣' },
      { ms: 'bulan', zh: '月份', emoji: '📆' },
      { ms: 'tahun', zh: '年', emoji: '🎊' },
      { ms: 'Januari', zh: '一月', emoji: '🗓️' },
      { ms: 'Julai', zh: '七月', emoji: '🗓️' },
      { ms: 'Disember', zh: '十二月', emoji: '🗓️' }
    ],
    grammar: {
      title: '数字系统 Sistem Nombor',
      zh: '十进制，但 10 到 20 的读法是「-belas」结尾，词序和中文不同。',
      points: [
        '10 = sepuluh，11 = sebelas，12 = dua belas（12 读作 dua-belas，不是 belas-dua）。',
        '20 = dua puluh，30 = tiga puluh，100 = seratus，1000 = seribu。',
        '百位前用 ratus，千位前用 ribu，万位用 puluh ribu。',
        '货币是 ringgit Malaysia，缩写 RM，1 ringgit = 100 sen。',
        '时间用 pukul：pukul 8.30 = pukul lapan tiga puluh / pukul setengah sembilan。',
        '星期和月份都用大写开头：hari Isnin、bulan Januari。'
      ],
      examples: [
        { ms: '38', zh: 'tiga puluh lapan' },
        { ms: '650', zh: 'enam ratus lima puluh' },
        { ms: '6020', zh: 'enam ribu dua puluh' }
      ]
    },
    sentences: [
      { ms: 'Saya ada dua puluh ringgit.', zh: '我有二十令吉。' },
      { ms: 'Sekarang pukul tiga belas.', zh: '现在十三点。' },
      { ms: 'Hari ini Isnin.', zh: '今天是星期一。' },
      { ms: 'Umur saya dua puluh lima tahun.', zh: '我二十五岁。' },
      { ms: 'Saya lahir bulan Julai.', zh: '我七月出生。' }
    ],
    gq: [
      { q: '“12” 正确的读法是？', opts: ['dua belas', 'belas dua', 'dua belas'], a: 0, why: '语序是单位数在前、belas 在后：dua belas。' },
      { q: '1000 的马来语是？', opts: ['seribu', 'satu ribu', 'ribu'], a: 0, why: '千位直接说 seribu。' },
      { q: '“pukul 9.15” 怎么说？', opts: ['pukul sembilan lima belas', 'pukul lima belas sembilan', 'pukul sembilan wbelas'], a: 0, why: '分钟在前：sembilan lima belas。' }
    ]
  },

  {
    id: 'u3', icon: '👋', title: 'Saya, Kawan dan Keluarga I', zh: '问候与自我介绍',
    desc: '打招呼、自我介绍、礼貌用语。',
    vocab: [
      { ms: 'helo', zh: '你好（英式）', emoji: '👋' },
      { ms: 'hai', zh: '你好', emoji: '✋' },
      { ms: 'apa khabar', zh: '你好吗？', emoji: '❓' },
      { ms: 'khabar baik', zh: '很好', emoji: '😊' },
      { ms: 'selamat pagi', zh: '早上好', emoji: '🌅' },
      { ms: 'selamat tengah hari', zh: '中午好', emoji: '🌞' },
      { ms: 'selamat petang', zh: '下午好', emoji: '🌇' },
      { ms: 'selamat malam', zh: '晚上好', emoji: '🌙' },
      { ms: 'terima kasih', zh: '谢谢', emoji: '🙏' },
      { ms: 'sama-sama', zh: '不客气', emoji: '🤝' },
      { ms: 'maaf', zh: '对不起', emoji: '😅' },
      { ms: 'tolong', zh: '请；帮忙', emoji: '🫱' },
      { ms: 'jumpa lagi', zh: '再见', emoji: '👋' },
      { ms: 'selamat tinggal', zh: '告辞（对离开的人说）', emoji: '🚪' },
      { ms: 'nama saya', zh: '我的名字是', emoji: '🏷️' },
      { ms: 'berkenalan', zh: '认识', emoji: '🤝' },
      { ms: 'gembira', zh: '高兴', emoji: '😄' },
      { ms: 'awak', zh: '你（亲切称呼）', emoji: '🫵' },
      { ms: 'saya', zh: '我', emoji: '🙋' },
      { ms: 'berumur', zh: '…岁', emoji: '🎂' }
    ],
    grammar: {
      title: '问候与寒暄',
      zh: '一天不同时间用不同的问候语，回答「Apa khabar?」用「Khabar baik」。',
      points: [
        'selamat = 平安/祝福词，可接 waktu：pagi、tengah hari、petang、malam。',
        '回应祝福时说「Terima kasih」；对方答「Sama-sama」。',
        '「jumpa lagi」= 再见（对留下的人说），「selamat tinggal」= 告辞（对离开的人说）。',
        '介绍自己：Nama saya + 名字 + 。Saya dari + 国家/城市。',
        '注意 pronouns：saya（我，礼貌）/ aku（我，随意）；awak（你，亲切）/ kamu（你，普通）/ anda（你，敬语）。'
      ],
      examples: [
        { ms: 'Helo! Apa khabar?', zh: '你好！最近好吗？' },
        { ms: 'Nama saya Li Ming. Saya dari China.', zh: '我叫李明，来自中国。' }
      ]
    },
    sentences: [
      { ms: 'Helo! Nama saya Li Ming.', zh: '你好！我叫李明。' },
      { ms: 'Apa khabar? Khabar baik, terima kasih.', zh: '你好吗？很好，谢谢。' },
      { ms: 'Saya berumur 25 tahun.', zh: '我二十五岁。' },
      { ms: 'Saya tinggal di Kuala Lumpur.', zh: '我住在吉隆坡。' },
      { ms: 'Gembira berkenalan dengan awak!', zh: '很高兴认识你！' }
    ],
    gq: [
      { q: '要离开朋友家时说哪一句？', opts: ['Selamat tinggal', 'Jumpa lagi', 'Terima kasih'], a: 0, why: 'selamat tinggal 是对「离开的人」说的祝愿。' },
      { q: '别人说 “Terima kasih”，你应该回答？', opts: ['Sama-sama', 'Maaf', 'Tolong'], a: 0, why: 'sama-sama = 不客气。' },
      { q: '“Apa khabar?” 的正确回答是？', opts: ['Khabar baik', 'Nama saya Li Ming', 'Selamat pagi'], a: 0, why: 'Khabar baik = 很好。' }
    ]
  },

  {
    id: 'u4', icon: '🧍', title: 'Saya, Kawan dan Keluarga II', zh: '这个那个与形容词',
    desc: '用 ini/itu 指东西，用形容词描述人和物。',
    vocab: [
      { ms: 'ini', zh: '这个（近）', emoji: '👉' },
      { ms: 'itu', zh: '那个（远）', emoji: '👈' },
      { ms: 'sangat', zh: '非常', emoji: '💯' },
      { ms: 'kurang', zh: '比较不', emoji: '↘️' },
      { ms: 'tidak', zh: '不', emoji: '❌' },
      { ms: 'tinggi', zh: '高', emoji: '📏' },
      { ms: 'rendah', zh: '矮；低', emoji: '📉' },
      { ms: 'besar', zh: '大', emoji: '🔺' },
      { ms: 'kecil', zh: '小', emoji: '🔻' },
      { ms: 'cantik', zh: '漂亮', emoji: '💖' },
      { ms: 'comel', zh: '可爱', emoji: '🥰' },
      { ms: 'panjang', zh: '长', emoji: '📏' },
      { ms: 'pendek', zh: '短', emoji: '📐' },
      { ms: 'baru', zh: '新', emoji: '✨' },
      { ms: 'lama', zh: '旧；久', emoji: '🕰️' },
      { ms: 'kepala', zh: '头', emoji: '🧠' },
      { ms: 'tangan', zh: '手', emoji: '✋' },
      { ms: 'mulut', zh: '嘴', emoji: '👄' },
      { ms: 'kaki', zh: '腿；脚', emoji: '🦵' },
      { ms: 'mata', zh: '眼睛', emoji: '👁️' },
      { ms: 'hidung', zh: '鼻子', emoji: '👃' },
      { ms: 'rambut', zh: '头发', emoji: '💇' },
      { ms: 'telinga', zh: '耳朵', emoji: '👂' },
      { ms: 'pipi', zh: '脸颊', emoji: '😊' },
      { ms: 'gigi', zh: '牙齿', emoji: '🦷' },
      { ms: 'lidah', zh: '舌头', emoji: '👅' },
      { ms: 'pensel', zh: '铅笔', emoji: '✏️' },
      { ms: 'hitam', zh: '黑色', emoji: '⚫' },
      { ms: 'merah', zh: '红色', emoji: '🔴' }
    ],
    grammar: {
      title: '指示词与形容词',
      zh: 'ini 指近处，itu 指远处；形容词放在名词前面。',
      points: [
        'Ini = 这个（离我近）；Itu = 那个（离我远）。',
        '形容词在名词前：bola besar（大的球）、pensel pendek（短铅笔）。',
        '加强/减弱描述用 sangat（非常）、kurang（比较不）、tidak（不）。',
        '否定形容词时，不放在名词前，而是放在 be / ada 之后：Bola itu tidak besar.',
        '马来语没有 a/an 变体，不需要冠词。'
      ],
      examples: [
        { ms: 'Ini pensel saya.', zh: '这是我的铅笔。' },
        { ms: 'Pen ini warna hitam.', zh: '这支笔是黑色的。' },
        { ms: 'Dia sangat rendah.', zh: '他非常矮。' }
      ]
    },
    sentences: [
      { ms: 'Ini pensel saya.', zh: '这是我的铅笔。' },
      { ms: 'Pen itu warna merah.', zh: '那支笔是红色的。' },
      { ms: 'Saya tinggi.', zh: '我很高。' },
      { ms: 'Bola itu kecil.', zh: '那个球很小。' },
      { ms: 'Rambut saya panjang.', zh: '我的头发很长。' }
    ],
    gq: [
      { q: '指远处的东西应该用？', opts: ['itu', 'ini', 'di'], a: 0, why: 'itu = 那个（远）；ini = 这个（近）。' },
      { q: '“The ball is not big” 怎么说？', opts: ['Bola itu tidak besar.', 'Bola itu besar tidak.', 'Tidak bola besar itu.'], a: 0, why: '否定词放在 be/ada 之后。' },
      { q: '形容词的位置是？', opts: ['名词前', '名词后', '句末'], a: 0, why: '马来语形容词在名词之前。' }
    ]
  },

  {
    id: 'u5', icon: '👨‍👩‍👧', title: 'Saya, Kawan dan Keluarga III', zh: '朋友与家庭',
    desc: '介绍朋友、介绍家人、家庭成员称呼。',
    vocab: [
      { ms: 'sahabat', zh: '好朋友', emoji: '🫶' },
      { ms: 'teman', zh: '朋友', emoji: '👬' },
      { ms: 'kawan', zh: '同伴；哥们', emoji: '🧑‍🤝‍🧑' },
      { ms: 'kawan baik', zh: '好朋友', emoji: '💚' },
      { ms: 'sahabat selamanya', zh: '一辈子的好朋友', emoji: '♾️' },
      { ms: 'sahabat sejati', zh: '真正的朋友', emoji: '💯' },
      { ms: 'memperkenalkan', zh: '介绍', emoji: '📣' },
      { ms: 'nenek', zh: '奶奶；外婆', emoji: '👵' },
      { ms: 'datuk', zh: '爷爷；外公', emoji: '👴' },
      { ms: 'ibu', zh: '妈妈', emoji: '👩' },
      { ms: 'bapa', zh: '爸爸', emoji: '👨' },
      { ms: 'abang', zh: '哥哥（兄）', emoji: '👦' },
      { ms: 'kakak', zh: '姐姐（姊）', emoji: '👧' },
      { ms: 'adik', zh: '弟；妹', emoji: '🧒' },
      { ms: 'adik beradik', zh: '兄弟姐妹', emoji: '👨‍👩‍👦' },
      { ms: 'adik lelaki', zh: '弟弟', emoji: '👦' },
      { ms: 'adik perempuan', zh: '妹妹', emoji: '👧' },
      { ms: 'pak cik', zh: '伯伯；叔叔', emoji: '🧔' },
      { ms: 'mak cik', zh: '阿姨', emoji: '👩‍🦰' },
      { ms: 'bapa saudara', zh: '伯父／舅舅', emoji: '👨‍🦰' },
      { ms: 'ibu saudara', zh: '伯母／阿姨', emoji: '👩‍🦱' },
      { ms: 'sepupu', zh: '堂／表兄弟姐妹', emoji: '🧑‍🧑' },
      { ms: 'keluarga', zh: '家庭', emoji: '🏠' },
      { ms: 'sayang', zh: '爱', emoji: '❤️' },
      { ms: 'hobi', zh: '爱好', emoji: '🎯' },
      { ms: 'melancong', zh: '散步', emoji: '🚶' }
    ],
    grammar: {
      title: '介绍他人与家庭',
      zh: '「Sila perkenalkan…」是请求对方介绍的标准说法。',
      points: [
        '第三人称用 dia（他/她），名词后用 -nya：sahabat saya、namanya Sarah。',
        '家庭成员称呼不分长幼次序，但要用男性/女性区分：adik lelaki / adik perempuan。',
        '尊称：Encik（先生）、Puan（女士）、Cik（小姐/先生）。',
        '数量词：Saya ada 3 orang adik-beradik.（我有三个弟妹）',
        '介绍家人：Ini bapa saya / Ini keluarga saya.'
      ],
      examples: [
        { ms: 'Ini sahabat saya. Namanya Sarah.', zh: '这是我的朋友，她叫 Sarah。' },
        { ms: 'Saya ada 3 orang adik-beradik.', zh: '我有三个弟妹。' }
      ]
    },
    sentences: [
      { ms: 'Ini sahabat saya, Namanya Sarah.', zh: '这是我的朋友，她叫 Sarah。' },
      { ms: 'Umurnya 21 tahun.', zh: '她二十一岁。' },
      { ms: 'Dia tinggal di Melaka.', zh: '她住在马六甲。' },
      { ms: 'Ini keluarga saya.', zh: '这是我的家人。' },
      { ms: 'Saya sayang keluarga saya.', zh: '我爱我的家人。' }
    ],
    gq: [
      { q: '“我的妹妹” 是？', opts: ['adik perempuan', 'adik lelaki', 'kakak'], a: 0, why: 'perempuan = 女性，adik perempuan 即妹妹。' },
      { q: '请求对方介绍朋友时说？', opts: ['Sila perkenalkan kawan kamu.', 'Saya introduce.', 'Tolong introduce.'], a: 0, why: 'Sila perkenalkan… 是固定礼貌用语。' },
      { q: '“sahabat sejati” 意思是？', opts: ['真正的朋友', '男朋友', '一辈子的好朋友'], a: 0, why: 'sejati = 真正的。' }
    ]
  },

  {
    id: 'u6', icon: '⏰', title: 'Persekitaran I', zh: '时态与日常动词',
    desc: 'telah/sudah/pernah/sedang/masih/akan/belum 七个时态助词。',
    vocab: [
      { ms: 'telah', zh: '已经（完成）', emoji: '✅' },
      { ms: 'sudah', zh: '已经', emoji: '☑️' },
      { ms: 'pernah', zh: '曾经', emoji: '🔁' },
      { ms: 'sedang', zh: '正在', emoji: '⏳' },
      { ms: 'masih', zh: '还；仍然', emoji: '↩️' },
      { ms: 'akan', zh: '将要', emoji: '🔜' },
      { ms: 'belum', zh: '还没', emoji: '⛔' },
      { ms: 'bangun', zh: '起床', emoji: '⏰' },
      { ms: 'tidur', zh: '睡觉', emoji: '😴' },
      { ms: 'mengemas', zh: '收拾', emoji: '🧹' },
      { ms: 'mandi', zh: '洗澡', emoji: '🚿' },
      { ms: 'menggosok', zh: '刷', emoji: '🪥' },
      { ms: 'makan', zh: '吃', emoji: '🍽️' },
      { ms: 'bersarapan', zh: '吃早饭', emoji: '🥐' },
      { ms: 'makan malam', zh: '吃晚饭', emoji: '🍲' },
      { ms: 'minum', zh: '喝', emoji: '🥤' },
      { ms: 'belajar', zh: '学习', emoji: '📚' },
      { ms: 'membaca', zh: '阅读', emoji: '📖' },
      { ms: 'bernapas', zh: '呼吸', emoji: '💨' },
      { ms: 'datang', zh: '来', emoji: '🚪' },
      { ms: 'pergi', zh: '去', emoji: '🚶' },
      { ms: 'pagi', zh: '早上', emoji: '🌅' },
      { ms: 'malam', zh: '晚上', emoji: '🌙' },
      { ms: 'setiap hari', zh: '每天', emoji: '📆' }
    ],
    grammar: {
      title: '时态助词 Kata Bantu Aspek',
      zh: '马来语不改变动词形式，靠助词表达时间。',
      points: [
        '过去完成：telah（已完成）/ sudah（已做、已完成）+ 动词过去式。',
        '过去经历：pernah + 动词，例如 Saya pernah tinggal di China.',
        '进行：sedang（正在）/ masih（还在）+ 动词。',
        '将来：akan + 动词；belum = 还没（常与 sudah 反义）。',
        '过去式动词加 meN- 前缀，如 makan → memakan，tidur → tertidur。'
      ],
      examples: [
        { ms: 'Saya sudah makan pagi ini.', zh: '我今天早上已经吃过早饭了。' },
        { ms: 'Dia masih makan di kampus.', zh: '他还在校园里吃饭。' },
        { ms: 'Kami belum makan lagi.', zh: '我们还没吃饭。' }
      ]
    },
    sentences: [
      { ms: 'Saya bangun pada pukul enam pagi.', zh: '我六点起床。' },
      { ms: 'Dia mandi setiap hari.', zh: '他每天洗澡。' },
      { ms: 'Saya sedang belajar Bahasa Melayu.', zh: '我正在学马来语。' },
      { ms: 'Saya pernah tinggal di China.', zh: '我以前住过中国。' },
      { ms: 'Ibu mengemas rumah.', zh: '妈妈收拾房子。' }
    ],
    gq: [
      { q: '“我正在学习” 用哪个助词？', opts: ['sedang', 'telah', 'akan'], a: 0, why: 'sedang 表示正在进行的动作。' },
      { q: '“我们已经吃过饭了” 用？', opts: ['sudah', 'belum', 'pernah'], a: 0, why: 'sudah = 已经；belum = 还没。' },
      { q: '“我以前住过中国” 用？', opts: ['pernah', 'masih', 'akan'], a: 0, why: 'pernah 表示过去经历。' }
    ]
  },

  {
    id: 'u7', icon: '🏘️', title: 'Persekitaran II', zh: '介词与方位表达',
    desc: '用 di / ke / dari / pada / dengan 说清地点和方向。',
    vocab: [
      { ms: 'di', zh: '在（地点）', emoji: '📍' },
      { ms: 'ke', zh: '去（方向）', emoji: '➡️' },
      { ms: 'dari', zh: '从（起点）', emoji: '⬅️' },
      { ms: 'pada', zh: '在（时间）', emoji: '🕰️' },
      { ms: 'dengan', zh: '和；用', emoji: '🤝' },
      { ms: 'untuk', zh: '为了；给', emoji: '🎯' },
      { ms: 'dalam', zh: '在……里面', emoji: '📦' },
      { ms: 'atas', zh: '在……上面', emoji: '🔝' },
      { ms: 'bawah', zh: '在……下面', emoji: '🔽' },
      { ms: 'dekat', zh: '靠近', emoji: '🔗' },
      { ms: 'jauh', zh: '远', emoji: '🛣️' },
      { ms: 'rumah', zh: '房子；家', emoji: '🏠' },
      { ms: 'universiti', zh: '大学', emoji: '🎓' },
      { ms: 'kampus', zh: '校园', emoji: '🏫' },
      { ms: 'kelas', zh: '教室', emoji: '🪑' },
      { ms: 'bilik', zh: '房间', emoji: '🚪' },
      { ms: 'meja', zh: '桌子', emoji: '🪑' },
      { ms: 'kursi', zh: '椅子', emoji: '💺' },
      { ms: 'beg', zh: '包', emoji: '🎒' },
      { ms: 'buku', zh: '书', emoji: '📕' },
      { ms: 'kucing', zh: '猫', emoji: '🐈' },
      { ms: 'minum', zh: '喝', emoji: '🥤' },
      { ms: 'teh', zh: '茶', emoji: '🍵' },
      { ms: 'susu', zh: '牛奶', emoji: '🥛' }
    ],
    grammar: {
      title: '介词 Kata Sendi',
      zh: '马来语介词不分长短（除 ada / ada 的特殊用），位置很灵活。',
      points: [
        'di + 地点：di rumah、di universiti。',
        'ke + 目的地：ke sekolah、ke Malaysia。',
        'dari + 来源：dari China、dari universiti。',
        'pada + 时间：pada hari Isnin、pada tahun 2025。',
        'dengan + 工具/同伴：dengan rakan saya。',
        '方位词组：di atas meja（在桌上）、di dalam beg（在包里）、di bawah bangku（在椅子下）。'
      ],
      examples: [
        { ms: 'Saya belajar di universiti.', zh: '我在大学学习。' },
        { ms: 'Saya minum teh dengan susu.', zh: '我喝茶加奶。' }
      ]
    },
    sentences: [
      { ms: 'Saya tinggal di Kuala Lumpur.', zh: '我住在吉隆坡。' },
      { ms: 'Dia datang dari China.', zh: '他来自中国。' },
      { ms: 'Saya akan pergi ke Malaysia.', zh: '我要去马来西亚。' },
      { ms: 'Kucing itu di atas meja.', zh: '那只猫在桌子上。' },
      { ms: 'Buku ini di dalam beg saya.', zh: '这本书在我的包里。' }
    ],
    gq: [
      { q: '表示目的地用哪个介词？', opts: ['ke', 'di', 'dari'], a: 0, why: 'ke = 去（方向）；di = 在；dari = 从。' },
      { q: '“和我的朋友一起” 用？', opts: ['dengan', 'untuk', 'ke'], a: 0, why: 'dengan 表示和/用。' },
      { q: '“在桌子上” 是？', opts: ['di atas meja', 'di bawah meja', 'di dalam meja'], a: 0, why: 'atas = 上面，dalam = 里面，bawah = 下面。' }
    ]
  },

  {
    id: 'u8', icon: '🍛', title: 'Persekitaran III', zh: '食物与烹饪方式',
    desc: '马来美食、煮法、味道形容词。',
    vocab: [
      { ms: 'restoran', zh: '餐厅', emoji: '🍽️' },
      { ms: 'gerai', zh: '食阁；小摊', emoji: '🏪' },
      { ms: 'kopitiam', zh: '咖啡店（南洋）', emoji: '☕' },
      { ms: 'nasi', zh: '米饭', emoji: '🍚' },
      { ms: 'mi', zh: '面', emoji: '🍜' },
      { ms: 'ikan', zh: '鱼', emoji: '🐟' },
      { ms: 'telur', zh: '蛋', emoji: '🥚' },
      { ms: 'tauhu', zh: '豆腐', emoji: '🧈' },
      { ms: 'keju', zh: '奶酪', emoji: '🧀' },
      { ms: 'daging', zh: '肉', emoji: '🥩' },
      { ms: 'udang', zh: '虾', emoji: '🦐' },
      { ms: 'ayam', zh: '鸡', emoji: '🐔' },
      { ms: 'sotong', zh: '鱿鱼', emoji: '🦑' },
      { ms: 'goreng', zh: '炸（炒）', emoji: '🍤' },
      { ms: 'panggang', zh: '烤', emoji: '🔥' },
      { ms: 'bakar', zh: '烘；烧', emoji: '🔥' },
      { ms: 'kukus', zh: '蒸', emoji: '♨️' },
      { ms: 'rebus', zh: '煮（汤）', emoji: '🍲' },
      { ms: 'manis', zh: '甜', emoji: '🍬' },
      { ms: 'pahit', zh: '苦', emoji: '😖' },
      { ms: 'masam', zh: '酸', emoji: '🍋' },
      { ms: 'masin', zh: '咸', emoji: '🧂' },
      { ms: 'pedas', zh: '辣', emoji: '🌶️' },
      { ms: 'sedap', zh: '美味', emoji: '😋' },
      { ms: 'makan', zh: '吃', emoji: '🍴' },
      { ms: 'mau', zh: '想要', emoji: '🙋' }
    ],
    grammar: {
      title: '点餐与描述味道',
      zh: '名词用 dato 或 pun（数量）+ 名词；烹饪方式作形容词。',
      points: [
        '点餐：Saya mau nasi ayam. / Tolong beri saya satu nasi goreng.',
        '烹饪方式直接修饰名词：nasi goreng（炒饭）、ikan panggang（烤鱼）、tauhu rebus（煮豆腐）。',
        '味道形容词在名词后：nasi manis（甜饭）、air masin（咸水）。',
        '常用数量表达：satu pinggan（一盘）、secangkir（一杯）、sepotong（一块）。',
        '饮料店点单：Teh tarik 一半一半。'
      ],
      examples: [
        { ms: 'Nasi ini sangat sedap.', zh: '这份米饭很好吃。' },
        { ms: 'Saya suka ikan bancuh.', zh: '我喜欢咖喱鱼。' }
      ]
    },
    sentences: [
      { ms: 'Saya suka nasi ayam.', zh: '我喜欢鸡肉饭。' },
      { ms: 'Nasi ini sangat sedap.', zh: '这份米饭很好吃。' },
      { ms: 'Saya mau dua telur goreng.', zh: '我要两个煎蛋。' },
      { ms: 'Makanan ini terlalu pedas.', zh: '这道菜太辣了。' },
      { ms: 'Ayah saya suka makan di gerai.', zh: '爸爸喜欢在食阁吃饭。' }
    ],
    gq: [
      { q: '“nasi goreng” 是什么菜？', opts: ['炒饭', '煮饭', '烤饭'], a: 0, why: 'goreng = 炒，fried rice。' },
      { q: '“kukus” 的意思是？', opts: ['蒸', '炸', '烤'], a: 0, why: 'kukus = steam。' },
      { q: '想点餐可以说？', opts: ['Saya mau…', 'Saya jadi…', 'Saya ada…'], a: 0, why: 'mau = 想要。' }
    ]
  },

  {
    id: 'u9', icon: '🥭', title: 'Persekitaran IV', zh: '水果与蔬菜',
    desc: '热带水果、菜市场、点买斤两。',
    vocab: [
      { ms: 'timun', zh: '黄瓜', emoji: '🥒' },
      { ms: 'bawang', zh: '洋葱', emoji: '🧅' },
      { ms: 'lobak', zh: '萝卜', emoji: '🥕' },
      { ms: 'cili', zh: '辣椒', emoji: '🌶️' },
      { ms: 'kelapa', zh: '椰子', emoji: '🥥' },
      { ms: 'kelapa pandan', zh: '香兰子', emoji: '🌿' },
      { ms: 'durian', zh: '榴莲', emoji: '🥭' },
      { ms: 'mangga', zh: '芒果', emoji: '🥭' },
      { ms: 'manggis', zh: '山竹', emoji: '🍈' },
      { ms: 'rambutan', zh: '红毛丹', emoji: '🍒' },
      { ms: 'tembikai', zh: '西瓜', emoji: '🍉' },
      { ms: 'pisang', zh: '香蕉', emoji: '🍌' },
      { ms: 'betik', zh: '木瓜', emoji: '🍈' },
      { ms: 'epal', zh: '苹果', emoji: '🍎' },
      { ms: 'oren', zh: '橙子', emoji: '🍊' },
      { ms: 'sayur', zh: '蔬菜', emoji: '🥬' },
      { ms: 'kangkung', zh: '空心菜', emoji: '🥬' },
      { ms: 'bayam', zh: '菠菜', emoji: '🥬' },
      { ms: 'kadas', zh: '豆角', emoji: '🫛' },
      { ms: 'pasar raya', zh: '大卖场', emoji: '🛒' },
      { ms: 'pasar', zh: '菜市场', emoji: '🏪' },
      { ms: 'kg', zh: '公斤', emoji: '⚖️' },
      { ms: 'segenggang', zh: '一把（量词）', emoji: '🤲' },
      { ms: 'segar', zh: '新鲜', emoji: '🥬' },
      { ms: 'manis', zh: '甜', emoji: '🍬' }
    ],
    grammar: {
      title: '买水果蔬菜',
      zh: '计量单位用 kg、segenggang、biji、bilik。',
      points: [
        '买的时候说：Boleh saya beli dua kilogram mangga?（我能买两公斤芒果吗？）',
        '常见量词：kg（公斤）、gram、biji（颗，芒果）、segenggang（一把，菜）、bilik（个，鸡蛋/纸杯）。',
        '形容词放在名词后：mangga yang manis（甜的芒果）。',
        'yang 可以替代前面的定语：nasi yang sedap。',
        '新鲜说 segar，甜的用 manis。'
      ],
      examples: [
        { ms: 'Saya membeli epal dan pisang di pasar raya.', zh: '我在大卖场买了苹果和香蕉。' },
        { ms: 'Durian sangat manis.', zh: '榴莲很甜。' }
      ]
    },
    sentences: [
      { ms: 'Saya suka mangga.', zh: '我喜欢芒果。' },
      { ms: 'Durian sangat manis.', zh: '榴莲很甜。' },
      { ms: 'Timun ini segar.', zh: '这根黄瓜很新鲜。' },
      { ms: 'Saya membeli epal dan pisang di pasar raya.', zh: '我在大卖场买苹果和香蕉。' },
      { ms: 'Cili itu terlalu pedas.', zh: '那个辣椒太辣了。' }
    ],
    gq: [
      { q: '“beli dua kilogram” 是什么单位？', opts: ['kg 公斤', 'biji 颗', 'bilik 杯'], a: 0, why: 'kg 是重量单位。' },
      { q: '“bayam” 是什么？', opts: ['菠菜', '黄瓜', '洋葱'], a: 0, why: 'bayam = 菠菜。' },
      { q: '“apa yang segar” 里 mana 的意思是？', opts: ['哪（提问）', '不', '很'], a: 0, why: 'apa 在疑问句中表示“什么/哪”。' }
    ]
  },

  {
    id: 'u10', icon: '📞', title: 'Situasi Perbualan I', zh: '电话与购物场所',
    desc: '打电话的开头结尾、各种店铺类型。',
    vocab: [
      { ms: 'telefon', zh: '电话', emoji: '📞' },
      { ms: 'telefon bimbit', zh: '手机', emoji: '📱' },
      { ms: 'telefon pintar', zh: '智能手机', emoji: '🤖' },
      { ms: 'telefon awam', zh: '公用电话', emoji: '☎️' },
      { ms: 'menelefon', zh: '打电话', emoji: '📲' },
      { ms: 'nombor telefon', zh: '电话号码', emoji: '🔢' },
      { ms: 'hujung talian', zh: '电话那头', emoji: '📡' },
      { ms: 'bercakap', zh: '说话', emoji: '💬' },
      { ms: 'Kedai pakaian', zh: '服装店', emoji: '👕' },
      { ms: 'pusat beli-belah', zh: '购物中心', emoji: '🏬' },
      { ms: 'pasar raya', zh: '大卖场', emoji: '🛒' },
      { ms: 'supermarket', zh: '超市', emoji: '🏪' },
      { ms: 'kedai runcit', zh: '杂货店', emoji: '🛍️' },
      { ms: 'kompang', zh: '小摊贩', emoji: '🧺' },
      { ms: 'gerai', zh: '档口', emoji: '🍛' },
      { ms: 'bank', zh: '银行', emoji: '🏦' },
      { ms: 'hospital', zh: '医院', emoji: '🏥' },
      { ms: 'klinik', zh: '诊所', emoji: '🩺' },
      { ms: 'universiti', zh: '大学', emoji: '🎓' },
      { ms: 'sekolah', zh: '学校', emoji: '🏫' },
      { ms: 'tutup', zh: '关门', emoji: '🔒' },
      { ms: 'buka', zh: '开门', emoji: '🔓' },
      { ms: 'waktu', zh: '时间', emoji: '⏰' },
      { ms: 'cakap', zh: '说', emoji: '🗣️' }
    ],
    grammar: {
      title: '电话会话',
      zh: '打电话有固定的开头和结尾，句型常省略主语。',
      points: [
        '开头：Helo / Hai + 自己名字；可以说 Selamat pagi（早上）。',
        '问对方是谁：Siapa di hujung talian?',
        '要电话号码：Boleh saya mendapat nombor telefon awak?',
        '结尾：Terima kasih, jumpa lagi. / Selamat tinggal!',
        '营业时间用 waktu buka dan tutup；人们也常说 waktu的业务时间（营业时间）。'
      ],
      examples: [
        { ms: 'Helo, ini Chong Wei. Boleh saya mendapat nombor telefon awak?', zh: '你好，我是崇伟。能给我你的电话号码吗？' },
        { ms: 'Selamat tinggal, jumpa lagi!', zh: '再见，再会！' }
      ]
    },
    sentences: [
      { ms: 'Siapa di hujung talian?', zh: '谁在线那头？' },
      { ms: 'Boleh saya mendapat nombor telefon awak?', zh: '能给我你的电话号码吗？' },
      { ms: 'Saya nak pergi ke kedai pakaian.', zh: '我要去服装店。' },
      { ms: 'Di mana pusat beli-belah?', zh: '购物中心在哪里？' },
      { ms: 'Pasar raya tutup pada pukul sepuluh malam.', zh: '大卖场晚上十点关门。' }
    ],
    gq: [
      { q: '问「谁在线那头」用？', opts: ['Siapa di hujung talian?', 'Berapa nombor telefon?', 'Di mana kedai?'], a: 0, why: 'hujung talian = 电话那头。' },
      { q: '服装店是？', opts: ['kedai pakaian', 'pusat beli-belah', 'bank'], a: 0, why: 'pakaian = 衣服。' },
      { q: '打电话结尾最常说？', opts: ['Terima kasih, jumpa lagi.', 'Selamat pagi.', 'Apa khabar?'], a: 0, why: 'jumpa lagi 用于电话/见面的告别。' }
    ]
  },

  {
    id: 'u11', icon: '💰', title: 'Situasi Perbualan II', zh: '问价、付款与讨价还价',
    desc: '购物对话：多少钱、怎么付钱、找零。',
    vocab: [
      { ms: 'harga', zh: '价格', emoji: '🏷️' },
      { ms: 'berapa', zh: '多少', emoji: '❓' },
      { ms: 'mahal', zh: '贵', emoji: '💸' },
      { ms: 'murah', zh: '便宜', emoji: '🪙' },
      { ms: 'wang', zh: '钱', emoji: '💰' },
      { ms: 'bayar', zh: '付钱', emoji: '💳' },
      { ms: 'tukar wang', zh: '换钱', emoji: '🔄' },
      { ms: 'duit', zh: '钱（口语）', emoji: '💵' },
      { ms: 'syiling', zh: '硬币', emoji: '🪙' },
      { ms: 'pecahan', zh: '零钱；找零', emoji: '🧾' },
      { ms: 'kad', zh: '卡', emoji: '💳' },
      { ms: 'kasir', zh: '收银员', emoji: '🧑‍💼' },
      { ms: 'jumlah', zh: '总数', emoji: '🧮' },
      { ms: 'diskaun', zh: '折扣', emoji: '🏷️' },
      { ms: 'percuma', zh: '免费', emoji: '🆓' },
      { ms: 'beli', zh: '买', emoji: '🛍️' },
      { ms: 'jual', zh: '卖', emoji: '🏪' },
      { ms: 'tawar', zh: '讨价还价', emoji: '🤝' },
      { ms: 'boleh', zh: '可以', emoji: '✅' },
      { ms: 'tolong', zh: '请', emoji: '🙏' },
      { ms: 'satu', zh: '一', emoji: '1️⃣' },
      { ms: 'dua', zh: '二', emoji: '2️⃣' },
      { ms: 'seratus', zh: '一百', emoji: '💯' }
    ],
    grammar: {
      title: '购物常用句型',
      desc: '',
      zh: '价钱用「berapa + 名词」，付款用「bayar dengan…」。',
      points: [
        '问价：Berapa harga buku ini?（这本书多少钱？）',
        '回答：Harga buku itu sepuluh ringgit.',
        '嫌贵：Itu terlalu mahal! / Boleh kurang?（能便宜点吗？）',
        '付款：Saya nak bayar dengan kad. / Boleh saya tukar wang?',
        '讨价还价用「boleh kurang?」，比价用「mana lebih murah?」。',
        '数量放名词前：dua biji telur、tiga kilogram gula。'
      ],
      examples: [
        { ms: 'Berapa harga buku ini?', zh: '这本书多少钱？' },
        { ms: 'Boleh saya bayar dengan kad?', zh: '我可以刷卡吗？' }
      ]
    },
    sentences: [
      { ms: 'Berapa harga buku ini?', zh: '这本书多少钱？' },
      { ms: 'Harga buku itu sepuluh ringgit.', zh: '那本书十令吉。' },
      { ms: 'Itu terlalu mahal!', zh: '太贵了！' },
      { ms: 'Boleh saya bayar dengan kad?', zh: '我可以刷卡吗？' },
      { ms: 'Saya nak beli dua kilogram gula.', zh: '我要买两公斤糖。' }
    ],
    gq: [
      { q: '问价格用？', opts: ['Berapa harga…?', 'Siapa…?', 'Di mana…?'], a: 0, why: 'berapa + 物品 + 多少钱。' },
      { q: '“太贵了” 是？', opts: ['Itu terlalu mahal.', 'Itu sangat murah.', 'Itu berapa?'], a: 0, why: 'mahal = 贵。' },
      { q: '“bayar dengan kad” 是？', opts: ['刷卡付款', '换钱', '讨价还价'], a: 0, why: 'dengan kad = 用卡。' }
    ]
  },

  {
    id: 'u12', icon: '🚌', title: 'Situasi Perbualan III', zh: '交通与问路',
    desc: '公共交通、方向指引、问路对话。',
    vocab: [
      { ms: 'bas', zh: '巴士', emoji: '🚌' },
      { ms: 'teksi', zh: '出租车', emoji: '🚕' },
      { ms: 'kereta api', zh: '火车', emoji: '🚆' },
      { ms: 'kereta', zh: '汽车；火车', emoji: '🚗' },
      { ms: 'MRT', zh: '地铁（MRT）', emoji: '🚇' },
      { ms: 'LRT', zh: '轻轨', emoji: '🚝' },
      { ms: 'basikal', zh: '自行车', emoji: '🚲' },
      { ms: 'motor', zh: '摩托车', emoji: '🏍️' },
      { ms: 'teksi online', zh: '网约车', emoji: '📱' },
      { ms: 'perjalanan', zh: '旅程', emoji: '🧳' },
      { ms: 'tiket', zh: '票', emoji: '🎫' },
      { ms: 'stesen', zh: '站', emoji: '🚏' },
      { ms: 'henti', zh: '站（公交站）', emoji: '🚏' },
      { ms: 'peta', zh: '地图', emoji: '🗺️' },
      { ms: 'arah', zh: '方向', emoji: '🧭' },
      { ms: 'kanan', zh: '右', emoji: '👉' },
      { ms: 'kiri', zh: '左', emoji: '👈' },
      { ms: 'lurus', zh: '直', emoji: '⬆️' },
      { ms: 'berhampiran', zh: '附近', emoji: '📍' },
      { ms: 'jauh', zh: '远', emoji: '🛣️' },
      { ms: 'berjalan kaki', zh: '走路', emoji: '🚶' },
      { ms: 'naik', zh: '乘坐', emoji: '🪜' },
      { ms: 'turun', zh: '下（车）', emoji: '⬇️' },
      { ms: 'masa', zh: '时间', emoji: '⏱️' },
      { ms: 'pergi', zh: '去', emoji: '🚗' }
    ],
    grammar: {
      title: '问路与指路',
      zh: '用 blocking 词 mana、di mana、ke mana 问路，回答用「Pergi terus, kemudian belok kanan」。',
      points: [
        'Di mana stesen bas?（汽车站在哪儿？）',
        'Ke mana jalan ini membawa?（这条路通往哪里？）',
        '指示方向：Pergi terus（直走）、Belok kiri/kanan（左/右转）、Temu jalan（到路口）、Sebelah kiri（左边）。',
        '乘坐：Saya naik bas ke universiti setiap hari.',
        '交通票：tiket bas、tiket kereta api。'
      ],
      examples: [
        { ms: 'Boleh tunjukkan jalan ke stesen kereta api?', zh: '能告诉我去火车站的路吗？' },
        { ms: 'Pergi terus, kemudian belok kanan.', zh: '直走，然后右转。' }
      ]
    },
    sentences: [
      { ms: 'Di mana stesen bas?', zh: '汽车站在哪里？' },
      { ms: 'Pergi terus, kemudian belok kanan.', zh: '直走，然后右转。' },
      { ms: 'Stesen bas di sebelah kiri.', zh: '汽车站在左边。' },
      { ms: 'Saya naik bas ke universiti setiap hari.', zh: '我每天坐巴士去大学。' },
      { ms: 'Perjalanan itu mengambil dua jam.', zh: '这段路程要两个小时。' }
    ],
    gq: [
      { q: '“往哪里走” 问？', opts: ['Ke mana?', 'Di mana?', 'Berapa?'], a: 0, why: 'ke mana = 去哪里（目的地）；di mana = 在哪里（地点）。' },
      { q: '“右转” 是？', opts: ['belok kanan', 'belok kiri', 'terus'], a: 0, why: 'kanan = 右，kiri = 左。' },
      { q: '“我每天坐巴士” 用哪个动词？', opts: ['naik', 'turun', 'pergi'], a: 0, why: 'naik = 乘坐（上车）。' }
    ]
  },

  {
    id: 'u13', icon: '🏞️', title: 'Perbualan I', zh: '马来西亚旅游景点',
    desc: '谈景点：海岛、海滩、瀑布、高地、主题乐园。',
    vocab: [
      { ms: 'pulau', zh: '岛', emoji: '🏝️' },
      { ms: 'pantai', zh: '海滩', emoji: '🏖️' },
      { ms: 'air jatuh', zh: '瀑布', emoji: '💦' },
      { ms: 'tanah tinggi', zh: '高地', emoji: '⛰️' },
      { ms: 'taman tema', zh: '主题乐园', emoji: '🎡' },
      { ms: 'taman air', zh: '水上乐园', emoji: '💦' },
      { ms: 'mercu tanda', zh: '地标', emoji: '🗼' },
      { ms: 'tempat menarik', zh: '景点', emoji: '📍' },
      { ms: 'bercuti', zh: '度假', emoji: '🏖️' },
      { ms: 'melancong', zh: '游览；散步', emoji: '🚶' },
      { ms: 'Batu Caves', zh: '黑罗洞', emoji: '🛕' },
      { ms: 'Cameron Highlands', zh: '金马仑高原', emoji: '🌄' },
      { ms: 'Langkawi', zh: '兰卡威', emoji: '🏝️' },
      { ms: 'Genting', zh: '云顶', emoji: '🎢' },
      { ms: 'Menara Kuala Lumpur', zh: '吉隆坡塔', emoji: '🗼' },
      { ms: 'Malaysia', zh: '马来西亚', emoji: '🇲🇾' },
      { ms: 'indah', zh: '美丽', emoji: '💐' },
      { ms: 'menarik', zh: '有趣；吸引人', emoji: '✨' },
      { ms: 'sungguh', zh: '非常；真', emoji: '💯' },
      { ms: 'mahu', zh: '想要（mahu bercuti）', emoji: '🙋' },
      { ms: 'ke mana', zh: '去哪里', emoji: '➡️' },
      { ms: 'kereta api', zh: '火车', emoji: '🚆' },
      { ms: 'malam', zh: '夜晚', emoji: '🌙' },
      { ms: 'pagi', zh: '早晨', emoji: '🌅' },
      { ms: 'tiket', zh: '门票', emoji: '🎫' }
    ],
    grammar: {
      title: '谈论假期计划',
      zh: '用打算句（akan + 动词）和地点介词 di 来安排行程。',
      points: [
        'Ke manakah kamu mahu bercuti?（你想去哪里度假？）',
        'Saya mahu bercuti di Cameron Highlands.（我想去金马仑度假。）',
        '打算：Saya akan pergi ke Langkawi pada tahun depan.',
        '评价景色：Pantai di Langkawi sangat indah.',
        '最好用疑问词：di mana（哪里）、bilakah（什么时候）、mengapa（为什么）、bagaimanakah（怎样）。'
      ],
      examples: [
        { ms: 'Ke manakah kamu mahu bercuti?', zh: '你想到哪里度假？' },
        { ms: 'Saya mahu bercuti di Cameron Highlands.', zh: '我想去金马仑高原度假。' }
      ]
    },
    sentences: [
      { ms: 'Ke manakah kamu mahu bercuti?', zh: '你想到哪里度假？' },
      { ms: 'Saya mahu bercuti di Cameron Highlands.', zh: '我想去金马仑高原度假。' },
      { ms: 'Pantai di Langkawi sangat indah.', zh: '兰卡威的海滩非常美。' },
      { ms: 'Taman tema itu sangat menarik.', zh: '那个主题乐园非常有趣。' },
      { ms: 'Saya naik kereta api ke Kuala Lumpur.', zh: '我坐火车去吉隆坡。' }
    ],
    gq: [
      { q: '“我想去度假” 用？', opts: ['Saya mahu bercuti', 'Saya ada cuti', 'Saya kerja cuti'], a: 0, why: 'mahu bercuti = 想要度假。' },
      { q: '“瀑布” 是？', opts: ['air jatuh', 'air mata', 'air besar'], a: 0, why: 'air jatuh = 瀑布（ Literally 落水）。' },
      { q: '“Ke manakah kamu…” 问的是？', opts: ['去哪里', '什么时候', '多少钱'], a: 0, why: 'ke mana = 去哪里。' }
    ]
  },

  {
    id: 'u14', icon: '💬', title: 'Perbualan II', zh: '表达看法与讨论',
    desc: '说出观点、理由、同意与反驳。',
    vocab: [
      { ms: 'saya fikir', zh: '我认为', emoji: '🤔' },
      { ms: 'saya percaya', zh: '我相信', emoji: '🙏' },
      { ms: 'menurut saya', zh: '依我看', emoji: '💭' },
      { ms: 'sebab', zh: '因为', emoji: '🔗' },
      { ms: 'kerana', zh: '因为', emoji: '➰' },
      { ms: 'namun', zh: '然而', emoji: '↩️' },
      { ms: 'tetapi', zh: '但是', emoji: '🔄' },
      { ms: 'saya setuju', zh: '我同意', emoji: '✅' },
      { ms: 'saya tidak setuju', zh: '我不同意', emoji: '❌' },
      { ms: 'mungkin', zh: '也许', emoji: '🤷' },
      { ms: 'mesti', zh: '一定', emoji: '💯' },
      { ms: 'sangat mudah', zh: '非常容易', emoji: '🟢' },
      { ms: 'sukar', zh: '难', emoji: '🟠' },
      { ms: 'menarik', zh: '有趣', emoji: '🎉' },
      { ms: 'membosankan', zh: '无聊', emoji: '🥱' },
      { ms: 'mahal', zh: '贵', emoji: '💸' },
      { ms: 'murah', zh: '便宜', emoji: '🪙' },
      { ms: 'bersih', zh: '干净', emoji: '🧼' },
      { ms: 'kotor', zh: '脏', emoji: '🪣' },
      { ms: 'ramai', zh: '拥挤；人多', emoji: '👥' },
      { ms: 'senang', zh: '愉快；容易', emoji: '😄' },
      { ms: 'bayar', zh: '付钱', emoji: '💳' },
      { ms: 'kerja', zh: '工作', emoji: '💼' },
      { ms: 'main', zh: '玩', emoji: '🎮' }
    ],
    grammar: {
      title: '表达观点的连接词',
      zh: '观点 + 连接词 + 理由，是马来语议论文的常见结构。',
      points: [
        '开场：Saya fikir / Menurut saya / Saya percaya…',
        '理由：kerana / sebab（因为）、kerana itu sebab…',
        '转折：tetapi / namun /年春。',
        '同意：Saya setuju dengan awak. 不同意：Saya tidak setuju.',
        '程度副词放在形容词前：sangat mudah、sangat menarik。',
        '结尾给出建议：Sila ikutlah nasihat saya.'
      ],
      examples: [
        { ms: 'Saya fikir Bahasa Melayu mudah.', zh: '我认为马来语很容易。' },
        { ms: 'Saya setuju, tetapi tempat itu terlalu mahal.', zh: '我同意，但那个地方太贵了。' }
      ]
    },
    sentences: [
      { ms: 'Saya fikir Bahasa Melayu mudah.', zh: '我认为马来语很简单。' },
      { ms: 'Saya setuju dengan awak.', zh: '我同意你的看法。' },
      { ms: 'Tempat itu ramai dan mahal.', zh: '那个地方人多而且贵。' },
      { ms: 'Namun, saya tidak suka menari.', zh: '不过，我不喜欢跳舞。' },
      { ms: 'Menurut saya, ia pasti menarik.', zh: '依我看，那一定很有趣。' }
    ],
    gq: [
      { q: '“我认为” 是？', opts: ['Saya fikir', 'Saya tanya', 'Saya jawab'], a: 0, why: 'fikir = 想，认为。' },
      { q: '表示“但是” 用？', opts: ['tetapi / namun', 'kerana', 'jadi'], a: 0, why: 'tetapi、namun 表示转折。' },
      { q: '“我同意” 是？', opts: ['Saya setuju', 'Saya tidak setuju', 'Saya tidak suka'], a: 0, why: 'setuju = 同意。' }
    ]
  }
];

/* 句子练习补充：每个单元的“听音辨义”选项由句子自动生成 */
export const INTRO = {
  unit: null
};
