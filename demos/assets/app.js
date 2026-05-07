/* English Hub v2.0 核心逻辑
 * 主要升级：
 *  - TTS 默认 rate=1.0（广播标准），优先 Natural/Neural 神经语音
 *  - 新增 Podcast 页（逐段播放+翻译显隐）
 *  - 新增词包市场（内置词包按需加载 + 在线下载 + 本地导入）
 *  - 查词：内置 + DictionaryAPI + ECDICT 联网兜底
 */

/* ===== 全局状态 & 存储 ===== */
const STORE_KEY = "englishHubData_v2";
let state = loadState();
if(state.version < 2) migrateV1toV2(state);

function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) ||
              JSON.parse(localStorage.getItem("englishHubData_v1"));
    if(s && s.version) return s;
  }catch(e){}
  return {
    version:2, cards:{}, fav:[], chatHistory:[],
    streak:{last:null, days:0},
    installedDecks:[],   // 用户下载/导入的词包 id
    podProgress:{},      // 播客进度 {podId: lastIdx}
    config:{
      endpoint:"", key:"", model:"deepseek-chat", voice:"",
      ttsRate:1.0, ttsPitch:1.0, ttsVolume:1.0,
      preferNeural: true        // 新：优先神经语音
    }
  };
}
function migrateV1toV2(s){
  s.version = 2;
  s.installedDecks = s.installedDecks || [];
  s.podProgress = s.podProgress || {};
  if(s.config){
    if(s.config.ttsRate < 0.95) s.config.ttsRate = 1.0;  // 把 v1 的 0.9 升为 1.0
    if(s.config.preferNeural == null) s.config.preferNeural = true;
  }
  saveState();
}
function saveState(){ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

function toast(msg, type){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " "+type : "");
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.className="toast", 2400);
}

/* ===== 页面切换 ===== */
const pageNames = {
  home:"首页", flashcard:"单词卡", listen:"听力精听",
  podcast:"播客电台", chat:"AI 陪练", dict:"查词 & 生词本",
  decks:"词包市场", settings:"设置"
};
function switchPage(p){
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active", n.dataset.page===p));
  document.querySelectorAll(".page").forEach(e=>e.classList.toggle("active", e.id==="page-"+p));
  const title = document.getElementById("pageTitle");
  if(title) title.textContent = pageNames[p] || p;
  if(p==="flashcard") nextCard();
  if(p==="listen") initListen();
  if(p==="podcast") initPodcast();
  if(p==="dict") renderFav();
  if(p==="decks") renderDeckMarket();
  if(p==="home") refreshHome();
  if(p==="settings") initSettings();
  if(p==="chat") renderChatHistory();
}
document.addEventListener("DOMContentLoaded", ()=>{
  const nav = document.getElementById("nav");
  if(nav) nav.addEventListener("click", e=>{
    const item = e.target.closest(".nav-item");
    if(item && item.dataset.page) switchPage(item.dataset.page);
  });
  refreshHome();
});

/* ===== 连续打卡 ===== */
function markToday(){
  const today = new Date().toDateString();
  if(state.streak.last === today) return;
  const yst = new Date(Date.now()-86400000).toDateString();
  state.streak.days = (state.streak.last === yst)? state.streak.days+1 : 1;
  state.streak.last = today;
  saveState();
  refreshHome();
}
function refreshHome(){
  const el = document.getElementById("streakDays");
  if(!el) return;
  el.textContent = state.streak.days;
  let learned=0, due=0;
  const now = Date.now();
  for(const k in state.cards){
    learned++;
    if(state.cards[k].due <= now) due++;
  }
  const get = id => document.getElementById(id);
  if(get("statLearned")) get("statLearned").textContent = learned;
  if(get("statDue"))     get("statDue").textContent = due;
  if(get("statFav"))     get("statFav").textContent = state.fav.length;
}

/* ===== 单词卡 SM-2 ===== */
let currentDeck = "starter", currentCard = null;
async function switchDeck(){
  const el = document.getElementById("deckSelect");
  currentDeck = el.value;
  await ensureDeck(currentDeck);
  nextCard();
}
function cardKey(deck, word){ return deck+"::"+word; }
function getCard(deck, word){
  const k = cardKey(deck, word);
  return state.cards[k] || {ef:2.5, interval:0, rep:0, due:0, learned:false, word};
}
async function nextCard(){
  const deckData = DECKS[currentDeck] || (await ensureDeck(currentDeck));
  if(!deckData || !deckData.length){
    const el = document.getElementById("fcWord");
    if(el) el.textContent = "词包加载中…";
    return;
  }
  const now = Date.now();
  let candidates = deckData.filter(w=>{
    const c = getCard(currentDeck, w[0]);
    return c.learned && c.due <= now;
  });
  if(candidates.length === 0){
    const newLimit = parseInt(document.getElementById("newPerDay")?.value || 10);
    const todayStr = new Date().toDateString();
    const learnedToday = deckData.filter(w=>{
      const c = getCard(currentDeck, w[0]);
      if(!c.learned || !c.firstLearn) return false;
      return new Date(c.firstLearn).toDateString() === todayStr;
    }).length;
    if(learnedToday < newLimit){
      candidates = deckData.filter(w=>!getCard(currentDeck, w[0]).learned);
    }
  }
  if(candidates.length === 0) candidates = deckData;
  currentCard = candidates[Math.floor(Math.random()*candidates.length)];
  renderCard();
}
function renderCard(){
  if(!currentCard) return;
  const [word,phon,pos,mean,ex] = currentCard;
  document.getElementById("fcWord").textContent = word;
  document.getElementById("fcPhonetic").textContent = phon;
  document.getElementById("fcPos").textContent = pos;
  document.getElementById("fcMeaning").textContent = mean;
  document.getElementById("fcExample").innerHTML = highlightExample(ex, word);
  document.getElementById("fcBack").classList.add("hidden");
  document.getElementById("fcFrontActions").classList.remove("hidden");
  document.getElementById("fcBackActions").classList.add("hidden");
  const c = getCard(currentDeck, word);
  document.getElementById("fcCountBar").textContent =
    c.learned ? `复习 · 重复 ${c.rep} 次 · 熟练度 ${c.ef.toFixed(2)}` : "✨ 新词";
  document.getElementById("fcProgress").textContent = getProgressText();
  setTimeout(()=>speakWord(), 150);
}
function highlightExample(ex, word){
  const re = new RegExp(`\\b${escapeReg(word)}\\b`, "gi");
  return ex.replace(re, m=>`<b>${m}</b>`);
}
function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function getProgressText(){
  const deckData = DECKS[currentDeck];
  if(!deckData) return "—";
  let learned=0, due=0;
  const now = Date.now();
  deckData.forEach(w=>{
    const c = getCard(currentDeck, w[0]);
    if(c.learned) learned++;
    if(c.learned && c.due <= now) due++;
  });
  return `进度 ${learned}/${deckData.length} · 待复习 ${due}`;
}
function showBack(){
  document.getElementById("fcBack").classList.remove("hidden");
  document.getElementById("fcFrontActions").classList.add("hidden");
  document.getElementById("fcBackActions").classList.remove("hidden");
}
function rateCard(quality){
  if(!currentCard) return;
  const word = currentCard[0];
  const k = cardKey(currentDeck, word);
  const c = state.cards[k] || {ef:2.5, interval:0, rep:0, due:0, learned:false};
  if(quality < 3){
    c.rep = 0; c.interval = 1/1440;
  }else{
    c.ef = Math.max(1.3, c.ef + (0.1 - (5-quality)*(0.08 + (5-quality)*0.02)));
    c.rep += 1;
    if(c.rep === 1) c.interval = 1;
    else if(c.rep === 2) c.interval = 6;
    else c.interval = Math.round(c.interval * c.ef);
  }
  c.due = Date.now() + c.interval*86400000;
  c.learned = true; c.word = word;
  if(!c.firstLearn) c.firstLearn = Date.now();
  state.cards[k] = c;
  saveState();
  markToday();
  nextCard();
}

/* ===================================================================
   ===== TTS（广播级高质量发音）
   ================================================================= */
let voices = [];
const IS_NATIVE = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
               || (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech);
const NativeTTS = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) || null;

/* 浏览器语音优先级（从高到低）：神经/自然语音 > 云端语音 > 知名系统语音 */
const VOICE_PRIORITY = [
  // 微软神经语音 / 谷歌神经语音（高质量）
  /Microsoft.*Online/i, /Microsoft.*Natural/i, /Microsoft.*Neural/i,
  /Google US English/i, /Google UK English/i,
  // 苹果高质量（增强型）
  /Samantha.*Enhanced/i, /Alex.*Enhanced/i, /Daniel.*Enhanced/i,
  // 微软系统自带（Aria 最接近真人）
  /Aria/i, /Jenny/i, /Guy/i, /Sonia/i, /Ryan/i,
  // 传统
  /Zira/i, /David/i, /Mark/i, /Hazel/i, /Susan/i
];

function loadVoices(){
  const sel = document.getElementById("voiceSelect");
  if(IS_NATIVE && NativeTTS){
    NativeTTS.getSupportedVoices().then(r=>{
      voices = r.voices || [];
      populateVoiceSelect(sel);
    }).catch(()=>{});
    return;
  }
  if(typeof speechSynthesis === "undefined") return;
  voices = speechSynthesis.getVoices();
  populateVoiceSelect(sel);
}
function populateVoiceSelect(sel){
  if(!sel) return;
  sel.innerHTML = "";
  const list = voices.filter(v=>{
    const lang = v.lang || "";
    return lang.startsWith("en") || lang.startsWith("zh");
  });
  // 按优先级排序
  list.sort((a,b)=>voicePriorityScore(b) - voicePriorityScore(a));
  list.forEach((v,i)=>{
    const o = document.createElement("option");
    o.value = v.name || ("voice-"+i);
    const star = voicePriorityScore(v) >= 80 ? "⭐ " : "";
    o.textContent = `${star}${v.name} (${v.lang})`;
    sel.appendChild(o);
  });
  if(state.config.voice){
    sel.value = state.config.voice;
  }else if(list.length){
    // 首次：自动选第一个（最高优先级）
    state.config.voice = list[0].name;
    sel.value = list[0].name;
    saveState();
  }
}
function voicePriorityScore(v){
  if(!v || !v.name) return 0;
  let score = 0;
  for(let i=0;i<VOICE_PRIORITY.length;i++){
    if(VOICE_PRIORITY[i].test(v.name)){
      score = 100 - i*5;
      break;
    }
  }
  // 英文优先
  if(v.lang && v.lang.startsWith("en")) score += 10;
  // 非本地（即云端，通常更自然）
  if(!v.localService) score += 5;
  return score;
}
if(typeof speechSynthesis !== "undefined" && !IS_NATIVE){
  speechSynthesis.onvoiceschanged = loadVoices;
}
setTimeout(loadVoices, 100);
setTimeout(loadVoices, 800);

function speak(text, lang="en-US"){
  if(!text) return;
  stopSpeech();
  const cfg = state.config || {};
  const rate  = parseFloat(cfg.ttsRate  != null ? cfg.ttsRate  : 1.0);
  const pitch = parseFloat(cfg.ttsPitch != null ? cfg.ttsPitch : 1.0);
  const volume= parseFloat(cfg.ttsVolume!= null ? cfg.ttsVolume: 1.0);

  if(IS_NATIVE && NativeTTS){
    return NativeTTS.speak({
      text: String(text), lang, rate, pitch, volume, category:"ambient"
    }).catch(err=>console.warn("Native TTS failed:", err));
  }
  return webSpeak(text, lang, rate, pitch, volume);
}
function webSpeak(text, lang, rate, pitch, volume){
  if(typeof speechSynthesis === "undefined") return null;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;
  if(state.config.voice){
    const v = voices.find(v=>v.name===state.config.voice);
    if(v) u.voice = v;
  }else{
    // 自动挑选最佳语音
    const preferred = voices.filter(v=>v.lang && v.lang.startsWith("en"));
    preferred.sort((a,b)=>voicePriorityScore(b) - voicePriorityScore(a));
    if(preferred[0]) u.voice = preferred[0];
  }
  speechSynthesis.speak(u);
  return u;
}
function stopSpeech(){
  if(IS_NATIVE && NativeTTS){ NativeTTS.stop().catch(()=>{}); return; }
  if(typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
function speakWord(){ if(currentCard) speak(currentCard[0]); }

function testVoice(){
  const sel = document.getElementById("voiceSelect");
  const name = sel ? sel.value : "";
  const v = voices.find(x=>x.name===name);
  const isZh = v && (v.lang||"").startsWith("zh");
  const text = isZh
    ? "你好，这是语音试听示例。清晰自然。"
    : "Hello. This is a voice test at broadcast speed. The quick brown fox jumps over the lazy dog.";
  speak(text, isZh ? "zh-CN" : "en-US");
}
function saveVoice(){
  const sel = document.getElementById("voiceSelect");
  state.config.voice = sel ? sel.value : "";
  saveState();
  toast("语音已保存 ✓","ok");
}
function saveTtsParams(){
  const cfg = state.config;
  cfg.ttsRate   = parseFloat(document.getElementById("ttsRate").value);
  cfg.ttsPitch  = parseFloat(document.getElementById("ttsPitch").value);
  cfg.ttsVolume = parseFloat(document.getElementById("ttsVolume").value);
  saveState(); toast("朗读参数已保存 ✓","ok");
}
function testTtsParams(){
  saveTtsParams();
  testVoice();
}
function resetTtsParams(){
  state.config.ttsRate = 1.0;
  state.config.ttsPitch = 1.0;
  state.config.ttsVolume = 1.0;
  saveState();
  initSettings();
  toast("已重置为广播标准 (1.0 / 1.0 / 1.0)","ok");
}

/* ===== 听力 ===== */
let currentListen = null;
function initListen(){
  const sel = document.getElementById("listenSelect");
  if(!sel) return;
  sel.innerHTML = "";
  LISTEN.forEach(m=>{
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = `${m.title}${m.level?"  ·  "+m.level:""}`;
    sel.appendChild(o);
  });
  loadListen();
}
function loadListen(){
  const id = document.getElementById("listenSelect").value;
  currentListen = LISTEN.find(m=>m.id===id);
  if(!currentListen) return;
  document.getElementById("listenTitle").textContent = currentListen.title;
  const body = document.getElementById("listenBody");
  body.innerHTML = currentListen.sentences.map((s,i)=>`
    <div class="listen-sentence" data-idx="${i}" onclick="playSentence(${i})">
      <div class="idx">${i+1}</div>
      <div style="flex:1">
        <div class="en">${s.en}</div>
        <div class="zh">${s.zh}</div>
      </div>
    </div>`).join("");
}
function playSentence(i){
  document.querySelectorAll(".listen-sentence").forEach(e=>e.classList.remove("playing"));
  const el = document.querySelector(`.listen-sentence[data-idx="${i}"]`);
  if(el) el.classList.add("playing");
  speak(currentListen.sentences[i].en, "en-US");
}
async function playAll(){
  for(let i=0;i<currentListen.sentences.length;i++){
    await new Promise(r=>{
      document.querySelectorAll(".listen-sentence").forEach(e=>e.classList.remove("playing"));
      const el = document.querySelector(`.listen-sentence[data-idx="${i}"]`);
      if(el){ el.classList.add("playing"); el.scrollIntoView({behavior:"smooth",block:"center"}); }
      const u = speak(currentListen.sentences[i].en);
      if(u && u.then){ u.then(r); return; }
      if(u){ u.onend = r; u.onerror = r; } else r();
    });
    await new Promise(r=>setTimeout(r, 250));
  }
  document.querySelectorAll(".listen-sentence").forEach(e=>e.classList.remove("playing"));
  markToday();
}

/* ===================================================================
   ===== 播客 Podcast
   ================================================================= */
let currentPod = null, podCurrentIdx = 0, podPlaying = false;

function initPodcast(){
  const listEl = document.getElementById("podList");
  if(!listEl) return;
  listEl.innerHTML = PODCASTS.map(p=>`
    <div class="pod-card" onclick="openPod('${p.id}')">
      <div class="pod-cover">🎙️</div>
      <div class="pod-info">
        <div class="pod-title">${p.title}</div>
        <div class="pod-meta">${p.host} · ${p.duration} · ${p.level}</div>
        <div class="pod-desc">${p.desc}</div>
      </div>
    </div>
  `).join("");
  // 默认打开第一集
  if(!currentPod && PODCASTS.length) openPod(PODCASTS[0].id);
}
function openPod(id){
  currentPod = PODCASTS.find(p=>p.id===id);
  if(!currentPod) return;
  podCurrentIdx = state.podProgress[id] || 0;
  document.querySelectorAll(".pod-card").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("onclick")?.includes(`'${id}'`));
  });
  renderPodDetail();
}
function renderPodDetail(){
  const box = document.getElementById("podDetail");
  if(!currentPod || !box) return;
  const showZh = document.getElementById("podShowZh")?.checked !== false;
  box.innerHTML = `
    <div class="pod-detail-head">
      <div>
        <h2>${currentPod.title}</h2>
        <div class="muted small">${currentPod.host} · ${currentPod.duration} · 难度 ${currentPod.level}</div>
      </div>
      <div class="row">
        <button class="btn primary" onclick="podPlayAll()">▶ 从头播放</button>
        <button class="btn" onclick="stopSpeech();podPlaying=false">⏹ 停止</button>
        <label style="margin-left:8px;font-size:12px;color:var(--text-2)">
          <input type="checkbox" id="podShowZh" checked onchange="renderPodDetail()" /> 显示翻译
        </label>
      </div>
    </div>
    <div class="pod-body">
      ${currentPod.paragraphs.map((p,i)=>`
        <div class="pod-para ${i===podCurrentIdx?'playing':''}" data-idx="${i}" onclick="podPlayPara(${i})">
          <div class="pod-idx">${String(i+1).padStart(2,'0')}</div>
          <div style="flex:1">
            <div class="pod-en">${p.en}</div>
            ${showZh? `<div class="pod-zh">${p.zh}</div>`:""}
          </div>
          <div class="pod-play">▶</div>
        </div>
      `).join("")}
    </div>`;
}
function podPlayPara(i){
  podCurrentIdx = i;
  state.podProgress[currentPod.id] = i;
  saveState();
  document.querySelectorAll(".pod-para").forEach(el=>el.classList.remove("playing"));
  const el = document.querySelector(`.pod-para[data-idx="${i}"]`);
  if(el){ el.classList.add("playing"); el.scrollIntoView({behavior:"smooth",block:"center"}); }
  speak(currentPod.paragraphs[i].en, "en-US");
}
async function podPlayAll(){
  if(!currentPod) return;
  podPlaying = true;
  for(let i=podCurrentIdx; i<currentPod.paragraphs.length; i++){
    if(!podPlaying) break;
    await new Promise(r=>{
      podCurrentIdx = i;
      state.podProgress[currentPod.id] = i;
      saveState();
      document.querySelectorAll(".pod-para").forEach(el=>el.classList.remove("playing"));
      const el = document.querySelector(`.pod-para[data-idx="${i}"]`);
      if(el){ el.classList.add("playing"); el.scrollIntoView({behavior:"smooth",block:"center"}); }
      const u = speak(currentPod.paragraphs[i].en);
      if(u && u.then){ u.then(r); return; }
      if(u){ u.onend = r; u.onerror = r; } else r();
    });
    await new Promise(r=>setTimeout(r, 450));
  }
  podPlaying = false;
  markToday();
}

/* ===== 语音识别（跟读）===== */
let recognition = null, recording = false;
function toggleRecord(){
  if(recording){ recognition && recognition.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast("当前浏览器不支持语音识别，请用 Edge / Chrome","err"); return; }
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onstart = ()=>{
    recording = true;
    document.getElementById("recordBtn").textContent = "⏹ 停止录音";
    document.getElementById("recordStatus").textContent = "正在听…";
  };
  recognition.onresult = (e)=>{
    const text = e.results[0][0].transcript;
    const conf = (e.results[0][0].confidence*100).toFixed(1);
    const playingEl = document.querySelector(".listen-sentence.playing");
    const target = playingEl ? currentListen.sentences[parseInt(playingEl.dataset.idx)].en : "";
    const score = target ? similarity(text.toLowerCase(), target.toLowerCase()) : 0;
    document.getElementById("recordResult").innerHTML = `
      <div style="padding:12px;background:var(--bg-3);border-radius:10px">
        <div class="muted small">识别置信度 ${conf}%</div>
        <div style="margin:6px 0">你说的：<b style="color:var(--accent)">${text}</b></div>
        ${target ? `<div>原文：<b style="color:var(--accent-2)">${target}</b></div>
         <div style="margin-top:6px">匹配度：<b style="color:${score>70?'var(--accent-2)':score>40?'var(--warn)':'var(--danger)'}">${score.toFixed(0)}%</b></div>` : '<div class="muted small">提示：先点击一句话播放再录音，可得到对比评分</div>'}
      </div>`;
  };
  recognition.onerror = (e)=>{ document.getElementById("recordStatus").textContent = "识别失败：" + e.error; };
  recognition.onend = ()=>{
    recording = false;
    document.getElementById("recordBtn").textContent = "🎤 开始录音";
    document.getElementById("recordStatus").textContent = "已停止";
  };
  recognition.start();
}
function similarity(a, b){
  const wa = a.replace(/[^\w\s']/g," ").split(/\s+/).filter(Boolean);
  const wb = b.replace(/[^\w\s']/g," ").split(/\s+/).filter(Boolean);
  if(!wa.length || !wb.length) return 0;
  const setB = new Set(wb);
  return (wa.filter(w=>setB.has(w)).length / Math.max(wa.length, wb.length)) * 100;
}

/* ===== AI 陪练 ===== */
const SYS_PROMPTS = {
  free:(lv)=>`You are a friendly English tutor. Chat with the user in simple ${lv}-level English. Keep replies short (1-3 sentences). If the user makes any English mistake, gently correct it in a separate 【纠错】 block in Chinese. If the user writes in Chinese, reply in English first, then add a short Chinese hint in parentheses.`,
  roleplay:(lv)=>`You are an English role-play partner at ${lv} level. First ask "What scene would you like to practice? (ordering food, job interview, at the airport, etc.)". Then play the chosen role. Keep your turns short and natural. After each reply, give a brief 【提示】 line in Chinese with a better alternative phrasing.`,
  essay:(lv)=>`You are an IELTS-style English writing tutor. For any essay or paragraph the user sends:\n1. Give an overall band score 1-9 (target: ${lv}).\n2. List 3-5 concrete improvements in Chinese.\n3. Rewrite 1-2 sentences as demonstrations (keep these in English).\n4. All instructions in Chinese except the rewrites.`,
  grammar:(lv)=>`You are an English grammar teacher for a ${lv}-level Chinese learner. Explain any grammar question in clear Chinese with 2-3 short English examples. Avoid markdown headers, keep it concise.`
};

function renderChatHistory(){
  const box = document.getElementById("chatMsgs");
  if(!box) return;
  box.innerHTML = state.chatHistory.map(m=>renderMsg(m)).join("");
  if(state.chatHistory.length === 0){
    box.innerHTML = `<div class="muted small" style="text-align:center;padding:40px 20px">
      选择模式后输入中/英文开始。第一次使用请先到"设置"填写 AI 接口。</div>`;
  }
  box.scrollTop = box.scrollHeight;
}
function renderMsg(m){
  const avatar = m.role==="user" ? "👤" : "🤖";
  const safe = escapeHtml(m.content);
  const speakBtn = m.role==="assistant"
    ? `<span class="speak-btn" onclick='speak(${JSON.stringify(extractEn(m.content))})'>🔊</span>` : "";
  return `<div class="msg ${m.role==='user'?'user':'ai'}">
    <div class="avatar">${avatar}</div>
    <div class="bubble">${safe}${speakBtn}</div>
  </div>`;
}
function extractEn(text){
  const lines = text.split("\n").filter(l=>!l.startsWith("【"));
  const m = lines.join(" ").match(/[A-Za-z][A-Za-z ,.'?!:;\-]+/g);
  return m ? m.join(" ").slice(0, 500) : text.slice(0, 300);
}
function escapeHtml(s){ return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function resetChat(){ state.chatHistory = []; saveState(); renderChatHistory(); }
async function sendChat(){
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if(!text) return;
  if(!state.config.endpoint || !state.config.key){
    toast("请先到设置页填写 AI 接口","warn");
    switchPage("settings"); return;
  }
  input.value = "";
  state.chatHistory.push({role:"user", content:text});
  renderChatHistory();
  const mode = document.getElementById("chatMode").value;
  const level = document.getElementById("chatLevel").value;
  const sysMsg = {role:"system", content:SYS_PROMPTS[mode](level)};
  const msgs = [sysMsg, ...state.chatHistory.slice(-12)];
  state.chatHistory.push({role:"assistant", content:"…正在思考…"});
  renderChatHistory();
  try{
    const reply = await callAI(msgs);
    state.chatHistory[state.chatHistory.length-1] = {role:"assistant", content:reply};
    saveState(); renderChatHistory(); markToday();
  }catch(e){
    state.chatHistory[state.chatHistory.length-1] = {
      role:"assistant",
      content:"❌ 请求失败：" + e.message + "\n请检查设置里的 Endpoint / API Key / Model。"
    };
    renderChatHistory();
  }
}
async function callAI(messages){
  const {endpoint, key, model} = state.config;
  const resp = await fetch(endpoint, {
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
    body:JSON.stringify({model, messages, temperature:0.7, stream:false})
  });
  if(!resp.ok){ const t = await resp.text(); throw new Error(`HTTP ${resp.status}: ${t.slice(0,200)}`); }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "(无回复)";
}

/* ===================================================================
   ===== 查词 & 生词本（支持联网查词）
   ================================================================= */
async function lookupWord(){
  const raw = document.getElementById("dictInput").value.trim();
  if(!raw) return;
  const word = raw.toLowerCase();
  const box = document.getElementById("dictResult");
  box.innerHTML = `<span class="muted small">查询中… <span class="spin">⟳</span></span>`;

  // 1. 先查内置词库（包括已加载的词包）
  for(const deck in DECKS){
    const hit = DECKS[deck].find(w=>w[0].toLowerCase()===word);
    if(hit){
      box.innerHTML = renderDictEntry(hit[0], hit[1], hit[2], hit[3], [hit[4]], "内置词库 · "+deck);
      speak(hit[0]);
      return;
    }
  }
  // 2. 查在线 DictionaryAPI
  try{
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if(!resp.ok) throw new Error("未找到");
    const arr = await resp.json();
    const entry = arr[0];
    const phon = entry.phonetic || (entry.phonetics?.find(p=>p.text)?.text) || "";
    const meanings = [], examples = [];
    entry.meanings.forEach(m=>{
      m.definitions.slice(0,3).forEach(d=>{
        meanings.push(`[${m.partOfSpeech}] ${d.definition}`);
        if(d.example) examples.push(d.example);
      });
    });
    box.innerHTML = renderDictEntry(word, phon, "", meanings.join("\n"), examples, "在线 · dictionaryapi.dev");
    speak(word);
  }catch(e){
    // 3. 再兜底：ECDICT（通过 jsdelivr 或者备用 API）
    try{
      const resp2 = await fetch(`https://api.tuchuangs.com/dict?word=${encodeURIComponent(word)}`, {mode:"cors"});
      if(resp2.ok){
        const d = await resp2.json();
        if(d && d.translation){
          box.innerHTML = renderDictEntry(word, d.phonetic||"", "", d.translation, [], "在线 · 备用词典");
          speak(word);
          return;
        }
      }
    }catch(e2){}
    box.innerHTML = `<span style="color:var(--danger)">未找到：${word}</span>
      <div class="muted small" style="margin-top:6px">在线接口需要联网。也可尝试其他拼写，或导入自己的词包到"词包市场"。</div>`;
  }
}
function renderDictEntry(word, phon, pos, mean, examples, source){
  const meanSafe = escapeHtml(mean||"");
  const phonSafe = escapeHtml(phon||"");
  return `
    <div class="dict-entry">
      <div class="dict-head">
        <div class="dict-word">${escapeHtml(word)}</div>
        <div class="dict-phon">${phonSafe}</div>
        ${pos?`<div class="dict-pos">${pos}</div>`:""}
        <button class="btn" onclick="speak(${JSON.stringify(word)})">🔊</button>
        <button class="btn primary" onclick='addToFav(${JSON.stringify(word)}, ${JSON.stringify(phon)}, ${JSON.stringify(mean)})'>＋ 生词本</button>
        ${source?`<span class="muted small" style="margin-left:auto">${source}</span>`:""}
      </div>
      <div class="dict-mean">${meanSafe}</div>
      ${examples && examples.length ? `
        <div class="dict-examples">
          <div class="muted small" style="margin-bottom:6px">例句</div>
          ${examples.map(e=>`<div class="muted" style="line-height:1.8">· ${escapeHtml(e)}</div>`).join("")}
        </div>` : ""}
    </div>`;
}
function addToFav(word, phon, mean){
  if(state.fav.find(f=>f.word===word)){ toast("已在生词本","warn"); return; }
  state.fav.unshift({word, phonetic:phon, meaning:mean, time:new Date().toISOString()});
  saveState(); toast("已加入生词本 ✓","ok");
  renderFav(); refreshHome();
}
function removeFav(word){
  state.fav = state.fav.filter(f=>f.word!==word);
  saveState(); renderFav(); refreshHome();
}
function renderFav(){
  const tbody = document.getElementById("favTable");
  if(!tbody) return;
  document.getElementById("favCount").textContent = state.fav.length;
  if(state.fav.length === 0){
    tbody.innerHTML = `<tr><td colspan="5" class="muted small" style="text-align:center;padding:30px">生词本为空 — 查词后点"加入生词本"即可</td></tr>`;
    return;
  }
  tbody.innerHTML = state.fav.map(f=>`
    <tr>
      <td><b>${escapeHtml(f.word)}</b></td>
      <td class="muted">${escapeHtml(f.phonetic||"")}</td>
      <td style="max-width:400px">${escapeHtml((f.meaning||"").slice(0,120))}</td>
      <td class="muted small">${new Date(f.time).toLocaleDateString()}</td>
      <td>
        <span class="link-btn" onclick='speak(${JSON.stringify(f.word)})'>🔊 读</span>
        <span class="link-btn danger" onclick='removeFav(${JSON.stringify(f.word)})'>删除</span>
      </td>
    </tr>`).join("");
}

/* ===================================================================
   ===== 词包市场 Deck Market
   ================================================================= */
function renderDeckMarket(){
  const box = document.getElementById("deckMarketList");
  if(!box) return;
  // 1. 内置词包
  const builtinHtml = DECK_CATALOG.map(d=>{
    const size = DECKS[d.id] ? DECKS[d.id].length : d.count;
    const loaded = DECKS[d.id] && DECKS[d.id].length > 0;
    return `
    <div class="deck-card ${loaded?'loaded':''}">
      <div class="deck-icon">${d.tag==="入门"?"🔰":d.tag==="口语"?"💬":d.tag==="四级"?"📘":d.tag==="六级"?"📗":d.tag==="雅思"?"📙":d.tag==="托福"?"📕":d.tag==="新闻"?"📰":"💼"}</div>
      <div class="deck-main">
        <div class="deck-title">${d.name}</div>
        <div class="deck-meta"><span class="deck-level">${d.level}</span> · ${size} 词</div>
        <div class="deck-tag">#${d.tag}</div>
      </div>
      <div class="deck-action">
        ${loaded
          ? `<span class="badge-ok">已就绪 ✓</span>`
          : `<button class="btn primary" onclick='downloadDeck(${JSON.stringify(d.id)})'>⤓ 加载</button>`}
      </div>
    </div>`;
  }).join("");
  // 2. 用户自定义词包
  const custom = Object.keys(state.installedDecks||[]).length ? state.installedDecks : [];
  const customHtml = (custom||[]).map(id=>{
    try{
      const arr = JSON.parse(localStorage.getItem("englishHub_customDeck_"+id));
      const meta = JSON.parse(localStorage.getItem("englishHub_customDeckMeta_"+id) || "{}");
      return `
      <div class="deck-card custom">
        <div class="deck-icon">📦</div>
        <div class="deck-main">
          <div class="deck-title">${meta.name || id}</div>
          <div class="deck-meta">自定义 · ${(arr||[]).length} 词</div>
          <div class="deck-tag">#导入</div>
        </div>
        <div class="deck-action">
          <button class="btn" onclick='removeCustomDeck(${JSON.stringify(id)})'>删除</button>
        </div>
      </div>`;
    }catch(e){ return ""; }
  }).join("");

  box.innerHTML = `
    <div class="deck-section-title">内置词包</div>
    <div class="deck-grid">${builtinHtml}</div>
    ${customHtml ? `<div class="deck-section-title" style="margin-top:20px">我导入的词包</div>
      <div class="deck-grid">${customHtml}</div>` : ""}`;
}
async function downloadDeck(id){
  toast("加载中…","ok");
  const arr = await ensureDeck(id);
  if(arr && arr.length){
    toast(`已加载 ${arr.length} 词 ✓`,"ok");
    renderDeckMarket();
    // 同步更新单词卡下拉
    updateDeckSelect();
  }else{
    toast("加载失败，请检查网络","err");
  }
}
function updateDeckSelect(){
  const sel = document.getElementById("deckSelect");
  if(!sel) return;
  const allIds = Array.from(new Set([
    ...DECK_CATALOG.map(d=>d.id),
    ...(state.installedDecks||[])
  ]));
  sel.innerHTML = allIds.map(id=>{
    const meta = DECK_CATALOG.find(d=>d.id===id);
    const name = meta ? meta.name : id;
    const count = DECKS[id] ? DECKS[id].length : (meta?meta.count:"-");
    return `<option value="${id}">${name}（${count}）</option>`;
  }).join("");
  sel.value = currentDeck;
}
function importCustomDeck(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = e=>{
    try{
      const data = JSON.parse(e.target.result);
      let id, arr, name;
      if(Array.isArray(data)){
        id = "custom-" + Date.now();
        arr = data; name = file.name.replace(/\.json$/i, "");
      }else if(data.words && Array.isArray(data.words)){
        id = data.id || "custom-" + Date.now();
        arr = data.words; name = data.name || file.name;
      }else{
        throw new Error("JSON 格式不符：应为词条数组或 {id, name, words:[]}");
      }
      // 验证词条格式 [word, phonetic, pos, meaning, example]
      const cleaned = arr.filter(x=>Array.isArray(x)&&x.length>=2).map(x=>{
        return [x[0], x[1]||"", x[2]||"", x[3]||"", x[4]||""];
      });
      if(!cleaned.length) throw new Error("词条为空或格式不对");
      localStorage.setItem("englishHub_customDeck_"+id, JSON.stringify(cleaned));
      localStorage.setItem("englishHub_customDeckMeta_"+id, JSON.stringify({name, count:cleaned.length}));
      if(!state.installedDecks.includes(id)) state.installedDecks.push(id);
      DECKS[id] = cleaned;
      saveState();
      toast(`已导入 ${cleaned.length} 词 ✓`,"ok");
      renderDeckMarket();
      updateDeckSelect();
    }catch(err){
      toast("导入失败：" + err.message, "err");
    }
  };
  r.readAsText(file);
  evt.target.value = "";
}
function removeCustomDeck(id){
  if(!confirm("删除这个自定义词包？进度不会丢失，但词包本身会移除。")) return;
  localStorage.removeItem("englishHub_customDeck_"+id);
  localStorage.removeItem("englishHub_customDeckMeta_"+id);
  state.installedDecks = state.installedDecks.filter(x=>x!==id);
  delete DECKS[id];
  saveState();
  renderDeckMarket();
  updateDeckSelect();
}

/* ===== 设置 ===== */
function initSettings(){
  const cfg = state.config;
  const set = (id,val) => { const el = document.getElementById(id); if(el) el.value = val || ""; };
  set("cfgEndpoint", cfg.endpoint);
  set("cfgKey",      cfg.key);
  set("cfgModel",    cfg.model);
  const setRange = (id, val, def)=>{
    const el = document.getElementById(id); if(!el) return;
    el.value = val != null ? val : def;
    const disp = document.getElementById(id+"Val"); if(disp) disp.textContent = el.value;
  };
  setRange("ttsRate",   cfg.ttsRate,   1.0);
  setRange("ttsPitch",  cfg.ttsPitch,  1.0);
  setRange("ttsVolume", cfg.ttsVolume, 1.0);
  loadVoices();
}
function saveConfig(){
  state.config.endpoint = document.getElementById("cfgEndpoint").value.trim();
  state.config.key = document.getElementById("cfgKey").value.trim();
  state.config.model = document.getElementById("cfgModel").value.trim();
  saveState(); toast("配置已保存 ✓","ok");
}
async function testConfig(){
  saveConfig();
  toast("测试中…","ok");
  try{
    const r = await callAI([
      {role:"system", content:"You are a helpful assistant."},
      {role:"user", content:"Say hi in one short sentence."}
    ]);
    toast("✓ 连接成功：" + r.slice(0,40), "ok");
  }catch(e){
    toast("✗ 失败：" + e.message.slice(0,60), "err");
  }
}

/* ===== 数据导入导出 ===== */
function exportData(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `english-hub-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  toast("已导出备份文件","ok");
}
function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const r = new FileReader();
  r.onload = ev=>{
    try{
      const d = JSON.parse(ev.target.result);
      if(!d.version){ toast("文件格式错误","err"); return; }
      state = d; saveState();
      toast("导入成功 ✓","ok");
      refreshHome();
      if(document.getElementById("page-dict").classList.contains("active")) renderFav();
    }catch(err){ toast("导入失败："+err.message,"err"); }
  };
  r.readAsText(file);
  e.target.value = "";
}
function resetAll(){
  if(!confirm("确定要清空所有学习数据吗？此操作不可撤销。")) return;
  localStorage.removeItem(STORE_KEY);
  state = loadState();
  toast("已重置","ok");
  refreshHome(); renderFav(); renderChatHistory();
}

/* ===== 默写小窗 ===== */
function openDictation(){
  const w = window.open("默写小窗.html", "dictation",
    "width=360,height=560,left=1500,top=100,toolbar=no,menubar=no,location=no,status=no,resizable=yes");
  if(!w) toast("弹窗被浏览器拦截，请允许弹窗","warn");
  else w.focus();
}

/* ===== 启动初始化（补） ===== */
(async function bootstrap(){
  // 预加载 starter 词包，确保单词卡立刻能用
  await ensureDeck("starter");
  // 更新词包下拉
  setTimeout(updateDeckSelect, 100);
})();
