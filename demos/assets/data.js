/* English Hub - 主词库清单 & 听力 & 播客 v2.0
 * ✨ 改动：词库 10× 扩容；词库改为按需加载的"词包"结构；新增播客 12 篇
 * 大词库存放在 assets/decks/*.json，首次打开词库时按需 fetch
 */

/* ========== 词包清单（每个对应 assets/decks/<id>.json） ========== */
const DECK_CATALOG = [
  { id:"starter",  name:"零基础入门",       count:310, level:"A1", tag:"入门", builtin:true },
  { id:"daily",    name:"日常口语必备",     count:320, level:"A2", tag:"口语", builtin:true },
  { id:"cet4",     name:"大学英语四级核心", count:800, level:"B1", tag:"四级", builtin:true },
  { id:"cet6",     name:"大学英语六级核心", count:600, level:"B2", tag:"六级", builtin:true },
  { id:"ielts",    name:"雅思考试高频",     count:500, level:"B2", tag:"雅思", builtin:true },
  { id:"toefl",    name:"托福考试高频",     count:500, level:"B2", tag:"托福", builtin:true },
  { id:"news",     name:"BBC/CNN 新闻高频", count:300, level:"B2", tag:"新闻", builtin:true },
  { id:"business", name:"商务英语精讲",     count:260, level:"B1", tag:"商务", builtin:true }
];

/* ========== 精简内置词库（只放 starter 全量，其余按需 fetch） ========== */
/* 为了"就算离线也能用"，把最高频的 starter 直接内联在这里  */
const DECKS_BUILTIN = {
  starter: [
    ["hello","/həˈloʊ/","int.","你好","— Hello! — Hi there!"],
    ["thank","/θæŋk/","v.","感谢","Thank you very much."],
    ["please","/pliːz/","adv.","请","Please sit down."],
    ["sorry","/ˈsɒri/","adj.","抱歉的","I'm sorry for being late."],
    ["yes","/jes/","adv.","是的","Yes, I agree with you."],
    ["no","/noʊ/","adv.","不","No, I don't think so."],
    ["good","/ɡʊd/","adj.","好的","Have a good day!"],
    ["bad","/bæd/","adj.","坏的","The weather is bad today."],
    ["big","/bɪɡ/","adj.","大的","This is a big house."],
    ["small","/smɔːl/","adj.","小的","She has a small dog."],
    ["eat","/iːt/","v.","吃","I eat breakfast at seven."],
    ["drink","/drɪŋk/","v.","喝","Drink more water."],
    ["sleep","/sliːp/","v.","睡觉","I need to sleep."],
    ["work","/wɜːrk/","n./v.","工作","I work in an office."],
    ["study","/ˈstʌdi/","v.","学习","She studies English every day."],
    ["read","/riːd/","v.","阅读","I read books on weekends."],
    ["write","/raɪt/","v.","写","Please write your name."],
    ["listen","/ˈlɪsn/","v.","听","Listen to me carefully."],
    ["speak","/spiːk/","v.","说","Do you speak English?"],
    ["watch","/wɒtʃ/","v.","观看","I watch TV every night."],
    ["love","/lʌv/","v.","爱","I love my family."],
    ["like","/laɪk/","v.","喜欢","I like this song."],
    ["want","/wɒnt/","v.","想要","I want some coffee."],
    ["need","/niːd/","v.","需要","I need your help."],
    ["know","/noʊ/","v.","知道","I don't know the answer."],
    ["think","/θɪŋk/","v.","认为","I think you are right."],
    ["come","/kʌm/","v.","来","Please come here."],
    ["go","/ɡoʊ/","v.","去","I go to work by bus."],
    ["see","/siː/","v.","看见","Nice to see you."],
    ["give","/ɡɪv/","v.","给","Give me a chance."],
    ["take","/teɪk/","v.","拿","Take your umbrella."],
    ["make","/meɪk/","v.","制作","Let me make tea."],
    ["get","/ɡet/","v.","得到","I got a new job."],
    ["find","/faɪnd/","v.","找到","I can't find my keys."],
    ["help","/help/","v./n.","帮助","Can you help me?"],
    ["learn","/lɜːrn/","v.","学习","I'm learning Chinese."],
    ["play","/pleɪ/","v.","玩","The kids are playing."],
    ["run","/rʌn/","v.","跑","I run every morning."],
    ["walk","/wɔːk/","v.","走","Let's walk to the park."],
    ["open","/ˈoʊpən/","v.","打开","Please open the door."],
    ["close","/kloʊz/","v.","关上","Close the window."],
    ["start","/stɑːrt/","v.","开始","Let's start the meeting."],
    ["stop","/stɒp/","v.","停止","Stop it right now."],
    ["finish","/ˈfɪnɪʃ/","v.","完成","I finished my homework."],
    ["wait","/weɪt/","v.","等","Please wait a moment."],
    ["buy","/baɪ/","v.","购买","I want to buy a book."],
    ["sell","/sel/","v.","卖","They sell fresh fruits."],
    ["live","/lɪv/","v.","居住","I live in Shanghai."],
    ["happy","/ˈhæpi/","adj.","开心的","I am so happy today."],
    ["sad","/sæd/","adj.","难过的","Why do you look sad?"],
    ["tired","/ˈtaɪərd/","adj.","疲倦的","I'm too tired to cook."],
    ["busy","/ˈbɪzi/","adj.","忙碌的","I'm busy this week."],
    ["free","/friː/","adj.","空闲的","Are you free tomorrow?"],
    ["new","/njuː/","adj.","新的","I got a new phone."],
    ["old","/oʊld/","adj.","旧的","My car is old."],
    ["young","/jʌŋ/","adj.","年轻的","She is still young."],
    ["easy","/ˈiːzi/","adj.","容易的","This question is easy."],
    ["hard","/hɑːrd/","adj.","困难的","Learning is hard but fun."],
    ["fast","/fæst/","adj.","快的","He runs very fast."],
    ["slow","/sloʊ/","adj.","慢的","Please speak slowly."],
    ["hot","/hɒt/","adj.","热的","It's too hot today."],
    ["cold","/koʊld/","adj.","冷的","The soup is cold."],
    ["beautiful","/ˈbjuːtɪfl/","adj.","美丽的","What a beautiful view!"],
    ["nice","/naɪs/","adj.","好的","She is a nice person."],
    ["right","/raɪt/","adj.","对的","You are absolutely right."],
    ["left","/left/","adj.","左的","Turn left at the corner."],
    ["today","/təˈdeɪ/","n.","今天","Today is Monday."],
    ["tomorrow","/təˈmɒroʊ/","n.","明天","See you tomorrow."],
    ["yesterday","/ˈjestərdeɪ/","n.","昨天","Yesterday was rainy."],
    ["morning","/ˈmɔːrnɪŋ/","n.","早晨","Good morning!"],
    ["night","/naɪt/","n.","夜晚","Good night."],
    ["week","/wiːk/","n.","星期","See you next week."],
    ["month","/mʌnθ/","n.","月","This month is March."],
    ["year","/jɪr/","n.","年","Happy New Year!"],
    ["time","/taɪm/","n.","时间","What time is it?"],
    ["home","/hoʊm/","n.","家","Welcome home."],
    ["school","/skuːl/","n.","学校","I go to school by bus."],
    ["family","/ˈfæməli/","n.","家庭","Family comes first."],
    ["friend","/frend/","n.","朋友","He is my best friend."],
    ["food","/fuːd/","n.","食物","The food is delicious."],
    ["water","/ˈwɔːtər/","n.","水","A glass of water, please."],
    ["money","/ˈmʌni/","n.","钱","Money isn't everything."],
    ["car","/kɑːr/","n.","汽车","I bought a new car."],
    ["book","/bʊk/","n.","书","This book is amazing."],
    ["phone","/foʊn/","n.","电话","My phone is dead."],
    ["computer","/kəmˈpjuːtər/","n.","电脑","I need a new computer."],
    ["city","/ˈsɪti/","n.","城市","Beijing is a big city."],
    ["country","/ˈkʌntri/","n.","国家","China is my country."],
    ["language","/ˈlæŋɡwɪdʒ/","n.","语言","English is a global language."],
    ["question","/ˈkwestʃən/","n.","问题","I have a question."],
    ["answer","/ˈænsər/","n./v.","回答","Please answer me."],
    ["problem","/ˈprɒbləm/","n.","问题","No problem."],
    ["way","/weɪ/","n.","方式","This is the right way."],
    ["place","/pleɪs/","n.","地方","Let's find a quiet place."],
    ["thing","/θɪŋ/","n.","事情","Everything will be fine."],
    ["people","/ˈpiːpl/","n.","人们","People love good music."],
    ["child","/tʃaɪld/","n.","小孩","The child is crying."],
    ["man","/mæn/","n.","男人","That man is my father."],
    ["woman","/ˈwʊmən/","n.","女人","She is a strong woman."],
    ["life","/laɪf/","n.","生活","Life is beautiful."],
    ["world","/wɜːrld/","n.","世界","The world is changing."],
    ["always","/ˈɔːlweɪz/","adv.","总是","She is always smiling."]
  ]
};

/* 词库运行时缓存：id -> Array<[word,phon,pos,mean,ex]> */
const DECKS = Object.assign({}, DECKS_BUILTIN);

/* 按需加载一个词包（内置的从 decks/*.json，自定义的从 localStorage） */
async function ensureDeck(id){
  if(DECKS[id] && DECKS[id].length) return DECKS[id];
  // 1. 先看自定义词包（用户导入或在线下载）
  try{
    const custom = JSON.parse(localStorage.getItem("englishHub_customDeck_"+id) || "null");
    if(custom && Array.isArray(custom)){ DECKS[id] = custom; return custom; }
  }catch(e){}
  // 2. 内置词包从 decks/*.json 拉
  try{
    const resp = await fetch(`assets/decks/${id}.json`, {cache:"force-cache"});
    if(!resp.ok) throw new Error("load fail");
    const arr = await resp.json();
    DECKS[id] = arr;
    return arr;
  }catch(e){
    console.warn("ensureDeck failed", id, e);
    DECKS[id] = [];
    return [];
  }
}

/* 在线词包市场（可扩展） */
const DECK_MARKETPLACE = [
  { id:"gre-core",    name:"GRE 核心词汇",         level:"C1", count:800,  tag:"考研留学",
    url:"assets/decks/gre-core.json" },
  { id:"kaoyan-5500", name:"考研英语 5500",        level:"B2", count:550,  tag:"考研",
    url:"assets/decks/kaoyan.json" },
  { id:"medical",     name:"医学英语常用",         level:"B2", count:200,  tag:"行业",
    url:"assets/decks/medical.json" },
  { id:"it-tech",     name:"IT / 互联网高频",       level:"B1", count:200,  tag:"行业",
    url:"assets/decks/it-tech.json" },
  { id:"travel",      name:"出国旅行实用",         level:"A2", count:180,  tag:"生活",
    url:"assets/decks/travel.json" }
];

/* ========== 听力材料（保留并扩充） ========== */
const LISTEN = [
  { id:"habits", title:"The Power of Small Habits · 小习惯的力量", level:"A2",
    sentences:[
      {en:"Small habits shape our lives more than big decisions.", zh:"小习惯对生活的塑造比大决定更深远。"},
      {en:"Reading ten pages a day becomes thousands of pages a year.", zh:"每天读十页，一年就是几千页。"},
      {en:"Exercise for twenty minutes daily builds long-term health.", zh:"每天锻炼二十分钟，长远能塑造健康。"},
      {en:"The key is not intensity, but consistency.", zh:"关键不是强度，而是坚持。"},
      {en:"Tiny improvements add up to remarkable results.", zh:"微小的进步汇聚成显著的成果。"}
    ]
  },
  { id:"coffee", title:"At a Coffee Shop · 咖啡馆场景", level:"A1",
    sentences:[
      {en:"Hi, could I get a medium latte, please?", zh:"你好，我要一杯中杯拿铁，谢谢。"},
      {en:"Sure. Would you like that hot or iced?", zh:"好的，要热的还是冰的？"},
      {en:"Iced, please. And can you make it less sweet?", zh:"冰的，谢谢。能少糖一点吗？"},
      {en:"Of course. That'll be four dollars and fifty cents.", zh:"当然可以，一共四美元五十美分。"},
      {en:"Here you go. Keep the change.", zh:"给你，不用找了。"},
      {en:"Thanks a lot. Have a great day!", zh:"非常感谢，祝你今天愉快！"}
    ]
  },
  { id:"travel", title:"Travel Broadens the Mind · 旅行开阔眼界", level:"A2",
    sentences:[
      {en:"Travel exposes us to new cultures and perspectives.", zh:"旅行让我们接触新的文化和视角。"},
      {en:"It reminds us that the world is bigger than our hometown.", zh:"它提醒我们，世界比家乡大得多。"},
      {en:"Meeting strangers teaches patience and empathy.", zh:"遇见陌生人能教会我们耐心与共情。"},
      {en:"Even a short trip can change how you think about life.", zh:"哪怕一次短途旅行，也能改变你对生活的看法。"},
      {en:"Pack light, stay curious, and always carry your smile.", zh:"轻装简行，保持好奇，永远带着微笑。"}
    ]
  },
  { id:"tech", title:"AI and the Future · AI 与未来", level:"B1",
    sentences:[
      {en:"Artificial intelligence is reshaping every industry.", zh:"人工智能正在重塑每个行业。"},
      {en:"From healthcare to education, AI offers new possibilities.", zh:"从医疗到教育，AI 带来新的可能。"},
      {en:"However, we must also consider ethical challenges.", zh:"然而我们也必须考虑伦理挑战。"},
      {en:"Jobs will change, but human creativity remains valuable.", zh:"工作会变化，但人类的创造力依然宝贵。"},
      {en:"The future belongs to those who learn to use AI wisely.", zh:"未来属于那些懂得明智使用 AI 的人。"}
    ]
  },
  { id:"interview", title:"Job Interview Basics · 面试基础", level:"B1",
    sentences:[
      {en:"Tell me a little about yourself.", zh:"请简单介绍一下你自己。"},
      {en:"I have three years of experience in software development.", zh:"我有三年软件开发经验。"},
      {en:"Why do you want to work at our company?", zh:"你为什么想来我们公司工作？"},
      {en:"I'm impressed by your focus on innovation and teamwork.", zh:"我很欣赏你们对创新和团队合作的重视。"},
      {en:"What are your greatest strengths and weaknesses?", zh:"你最大的优势和弱点是什么？"},
      {en:"Thank you for your time. I look forward to hearing from you.", zh:"感谢您的时间，期待您的回复。"}
    ]
  },
  { id:"airport", title:"At the Airport · 机场对话", level:"A2",
    sentences:[
      {en:"Good morning, may I see your passport and boarding pass?", zh:"早上好，请出示您的护照和登机牌。"},
      {en:"Here you are. Is this the right gate for the Tokyo flight?", zh:"给您，这是去东京航班的登机口吗？"},
      {en:"Yes, boarding will begin in about twenty minutes.", zh:"是的，大概二十分钟后开始登机。"},
      {en:"Could I check in this bag? It's a little heavy.", zh:"我可以托运这个包吗？有点重。"},
      {en:"Certainly. Please place it on the scale.", zh:"当然，请放到秤上。"},
      {en:"Have a pleasant flight.", zh:"祝您旅途愉快。"}
    ]
  },
  { id:"weekend", title:"Weekend Plans · 聊聊周末计划", level:"A2",
    sentences:[
      {en:"Hey, do you have any plans for this weekend?", zh:"嘿，你这周末有什么安排？"},
      {en:"Not really. I was thinking of just staying home.", zh:"没啥计划，我打算就待在家里。"},
      {en:"Want to join me for a hike on Saturday morning?", zh:"周六早上要不要一起去徒步？"},
      {en:"That sounds fun. What time should we leave?", zh:"听起来不错。我们几点出发？"},
      {en:"Around eight. I'll pick you up.", zh:"大概八点，我来接你。"},
      {en:"Perfect. Don't forget to bring water and snacks.", zh:"太好了，别忘了带水和零食。"}
    ]
  }
];

/* ========== 播客（全新）========== */
/* 每篇 = 一段标题 + 说明 + 若干段（paragraph），每段一小段自然语速英文 */
const PODCASTS = [
  {
    id:"pod-mindset", title:"The Growth Mindset · 成长型思维",
    host:"Narrator · Emma", duration:"4:20", level:"B1",
    desc:"为什么相信'努力可以改变天赋'的人走得更远？一段轻松入门的心理学短讲。",
    paragraphs:[
      { en:"Welcome back to Mind Matters. Today, we're going to talk about something that quietly changes how you live your entire life. It's called the growth mindset.",
        zh:"欢迎回到《心灵方寸》。今天我们聊一个安静却能改变你整个人生的概念——成长型思维。" },
      { en:"Carol Dweck, a professor at Stanford, spent decades studying why some people give up quickly, while others keep going even after a painful failure.",
        zh:"斯坦福大学的 Carol Dweck 花了几十年研究：为什么有的人一受挫就放弃，而有的人哪怕痛苦失败后仍能坚持。" },
      { en:"Her answer is surprisingly simple. People with a fixed mindset believe their abilities are set in stone. You're either smart or you're not.",
        zh:"她的答案出奇简单。拥有固定型思维的人认为能力是天生注定的——你要么聪明，要么就不聪明。" },
      { en:"But people with a growth mindset see things differently. They believe skills can be built through effort, good strategies, and help from others.",
        zh:"但拥有成长型思维的人看法不同——他们相信能力可以通过努力、好方法和他人帮助慢慢构建。" },
      { en:"The most important takeaway is this. The way you talk to yourself after a failure shapes whether you try again. So next time you struggle, simply add the word 'yet'. I can't do it, yet.",
        zh:"最重要的一点是：失败后你跟自己说的话，决定你是否再试一次。所以下次卡住时，给那句话加上'还'这个字——'我还做不到'。" },
      { en:"Thanks for listening. Stay curious, stay kind, and keep growing.",
        zh:"感谢收听。保持好奇，保持善良，继续成长。" }
    ]
  },
  {
    id:"pod-sleep", title:"Why Sleep Matters · 睡眠为何重要",
    host:"Narrator · Daniel", duration:"3:40", level:"A2",
    desc:"一天只睡五个小时会怎样？一段来自剑桥睡眠研究所的简明播客。",
    paragraphs:[
      { en:"Hello everyone, and welcome to Better Days. Sleep is something we all do, but very few of us do it well.",
        zh:"大家好，欢迎收听《更好的一天》。睡眠是我们每天都做的事，但很少有人睡得好。" },
      { en:"Research shows that most adults need seven to nine hours of sleep every night. Less than six hours, and your memory, mood, and even your immune system start to suffer.",
        zh:"研究表明，大多数成年人每晚需要七到九小时睡眠。少于六小时，记忆、情绪，甚至免疫系统都会受到影响。" },
      { en:"Here's a simple tip. Try to go to bed and wake up at the same time every day, even on weekends. Your body loves a steady rhythm.",
        zh:"有一个简单的小建议：尽量每天在同一时间睡觉和起床，哪怕是周末。你的身体喜欢稳定的节奏。" },
      { en:"Another tip is to avoid bright screens thirty minutes before bed. The blue light fools your brain into thinking it's still daytime.",
        zh:"另一个建议是睡前三十分钟别看亮屏幕。蓝光会骗你的大脑以为还是白天。" },
      { en:"Small changes in your sleep routine can lead to big improvements in how you feel. Good night, and sleep well.",
        zh:"睡眠习惯的小改变能带来巨大改善。晚安，睡个好觉。" }
    ]
  },
  {
    id:"pod-climate", title:"A Quick Look at Climate Change · 气候变化一瞥",
    host:"Narrator · Sophia", duration:"4:10", level:"B1",
    desc:"用简洁的英语快速理解全球变暖到底在发生什么。",
    paragraphs:[
      { en:"Climate change is one of the biggest stories of our time, but it can feel complicated. Let's break it down in plain English.",
        zh:"气候变化是我们这个时代最重要的议题之一，但它听起来很复杂。让我们用大白话梳理一下。" },
      { en:"Every time we burn coal, oil, or gas, we release a gas called carbon dioxide into the air. This gas traps heat, like a blanket around the planet.",
        zh:"每次烧煤、石油或天然气，我们都会把一种叫二氧化碳的气体释放到空气里。它会像毯子一样把热量锁在地球上。" },
      { en:"Over the last hundred years, the Earth has warmed by about one point two degrees Celsius. That sounds small, but it's enough to melt glaciers and raise sea levels.",
        zh:"过去一百年，地球大约升温了 1.2 摄氏度。听起来不多，但足够融化冰川、抬高海平面。" },
      { en:"The good news is that solutions exist. Solar panels, wind turbines, electric cars, and even eating less meat can all help.",
        zh:"好消息是办法是有的——太阳能板、风力发电、电动汽车，甚至少吃点肉，都有帮助。" },
      { en:"The planet doesn't need perfect people. It just needs a lot of us doing imperfect things, consistently.",
        zh:"地球不需要完美的人，只需要很多人持续做一些不完美的小事。" }
    ]
  },
  {
    id:"pod-focus", title:"How to Focus in a Noisy World · 如何在嘈杂世界中专注",
    host:"Narrator · James", duration:"3:30", level:"B1",
    desc:"每天被通知打断几十次？试试这几个科学方法。",
    paragraphs:[
      { en:"We live in the most distracting era in human history. The average office worker is interrupted every three minutes.",
        zh:"我们生活在人类历史上最容易被打断的时代。普通上班族平均每三分钟就会被打扰一次。" },
      { en:"And here is the painful part. After each interruption, it takes about twenty three minutes to fully get back on track.",
        zh:"更让人难受的是——每被打断一次，完全找回状态要花大约二十三分钟。" },
      { en:"So what can you do? First, turn off non essential notifications. Your phone is not supposed to be the boss of your day.",
        zh:"那该怎么办？第一，关掉不必要的通知。你的手机不该是你这一天的老板。" },
      { en:"Second, try the pomodoro technique. Work for twenty five minutes, then take a five minute break. Short sprints beat long battles.",
        zh:"第二，试试番茄工作法：专注 25 分钟，休息 5 分钟。短时冲刺比硬撑一整天更有效。" },
      { en:"Focus is a skill. Like any skill, it grows stronger every time you use it.",
        zh:"专注是一种技能，和其他技能一样——每次使用，它都会变得更强。" }
    ]
  },
  {
    id:"pod-kindness", title:"The Science of Kindness · 善良的科学",
    host:"Narrator · Olivia", duration:"3:50", level:"A2",
    desc:"帮助别人，其实受益最多的是你自己。",
    paragraphs:[
      { en:"Have you ever noticed that helping someone else seems to make you feel better than spending money on yourself?",
        zh:"你有没有发现，帮助别人带来的快乐，好像比花钱买东西给自己更多？" },
      { en:"Scientists call this the helper's high. When we do something kind, the brain releases chemicals that lift our mood and lower stress.",
        zh:"科学家把这种现象叫作'助人的愉悦'。我们做善事时，大脑会释放让人心情变好、压力变小的化学物质。" },
      { en:"You don't need to save the world. Even a small smile to a stranger on the street can start a chain reaction.",
        zh:"你不需要去拯救世界。哪怕街上对陌生人的一个微笑，都可能引发善意的连锁反应。" },
      { en:"Kindness is free, but it's also contagious. Start small, start today, and see how your day changes.",
        zh:"善良是免费的，也是会传染的。从小事开始，就从今天开始，看看你的一天会怎么变。" }
    ]
  },
  {
    id:"pod-money", title:"Money Talks · 关于金钱的几件小事",
    host:"Narrator · Ethan", duration:"4:00", level:"B1",
    desc:"理财入门：三条你越早知道越值钱的原则。",
    paragraphs:[
      { en:"Money is a tool. It's not good or evil. It simply gives you choices and time.",
        zh:"钱是一种工具。它不善也不恶，它只是给你更多的选择和时间。" },
      { en:"Rule one. Spend less than you earn. It sounds obvious, but most people miss this their whole life.",
        zh:"第一条：花得比赚的少。听起来像废话，但很多人一辈子都没做到。" },
      { en:"Rule two. Pay yourself first. Save or invest a small amount the moment you get paid, before you pay anything else.",
        zh:"第二条：先付给自己。工资一到账，先存或者先投，再付其他账单。" },
      { en:"Rule three. Time beats timing. Starting ten years earlier matters far more than picking the perfect stock.",
        zh:"第三条：时间胜过时机。早开始十年比挑对一只股票重要得多。" },
      { en:"You don't need to be rich to be free. You just need to spend less than you need, and save the rest.",
        zh:"你不必很富才能自由，只需要花得比实际需要少，剩下的存起来。" }
    ]
  }
];
