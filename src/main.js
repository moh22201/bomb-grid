const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "bomb-grid-demo-v1";
const SIZE = 25;
const translations = {
  en: {
    demo:"DEMO MODE", language:"Language", gameLabel:"MINES • STRATEGY", title:"Find the gems. Avoid the bombs.",
    subtitle:"Choose your risk, reveal tiles, and cash out before you hit a bomb.", ready:"READY TO PLAY",
    gridLabel:"5 × 5 GRID", newRound:"New round", gemLegend:"Gem found", bombLegend:"Bomb hit",
    demoBalance:"DEMO BALANCE", roundSetup:"ROUND SETUP", betAmount:"Demo bet amount", max:"MAX",
    bombs:"Number of bombs", lowRisk:"LOW RISK", highRisk:"HIGH RISK", riskCopy:"5 bombs · balanced risk",
    startRound:"Start round", cashOut:"Cash out", gemsFound:"GEMS FOUND", currentMultiplier:"MULTIPLIER",
    footnote:"Demo credits only. Game progress is stored in this browser for now.", footerText:"Play smart. Know when to stop.",
    playing:"Round in progress", won:"Round cashed out", lost:"Bomb hit — round over", roundStarted:"Round started. Good luck!",
    needBet:"Enter a valid bet amount.", notEnough:"Not enough demo credits.", chooseTile:"Choose a tile on the grid.",
    gemMessage:"Gem found!", bombMessage:"Boom! You hit a bomb.", cashMessage:"Cashed out successfully!",
    resetMessage:"Demo balance reset to 1,000 credits.", resetConfirm:"Reset demo balance to 1,000 credits?",
    riskBalanced:"balanced risk", riskHigh:"high risk", riskLow:"lower risk", noGems:"No gems found yet.",
    alreadyPlaying:"Finish or cash out the current round first."
  },
  fr: {
    demo:"MODE DÉMO", language:"Langue", gameLabel:"MINES • STRATÉGIE", title:"Trouvez les gemmes. Évitez les bombes.",
    subtitle:"Choisissez votre risque, révélez des cases et encaissez avant une bombe.", ready:"PRÊT À JOUER",
    gridLabel:"GRILLE 5 × 5", newRound:"Nouvelle manche", gemLegend:"Gemme trouvée", bombLegend:"Bombe touchée",
    demoBalance:"SOLDE DÉMO", roundSetup:"PARAMÈTRES", betAmount:"Mise de démonstration", max:"MAX",
    bombs:"Nombre de bombes", lowRisk:"RISQUE FAIBLE", highRisk:"RISQUE ÉLEVÉ", riskCopy:"5 bombes · risque équilibré",
    startRound:"Démarrer", cashOut:"Encaisser", gemsFound:"GEMMES TROUVÉES", currentMultiplier:"MULTIPLICATEUR",
    footnote:"Crédits démo uniquement. La progression est stockée dans ce navigateur pour le moment.", footerText:"Jouez avec stratégie. Sachez vous arrêter.",
    playing:"Manche en cours", won:"Manche encaissée", lost:"Bombe touchée — manche terminée", roundStarted:"Manche lancée. Bonne chance !",
    needBet:"Saisissez une mise valide.", notEnough:"Crédits démo insuffisants.", chooseTile:"Choisissez une case sur la grille.",
    gemMessage:"Gemme trouvée !", bombMessage:"Boum ! Vous avez touché une bombe.", cashMessage:"Encaissement réussi !",
    resetMessage:"Solde démo réinitialisé à 1 000 crédits.", resetConfirm:"Réinitialiser le solde démo à 1 000 crédits ?",
    riskBalanced:"risque équilibré", riskHigh:"risque élevé", riskLow:"risque plus faible", noGems:"Aucune gemme trouvée.",
    alreadyPlaying:"Terminez ou encaissez la manche en cours."
  }
};
let language = localStorage.getItem("bomb-grid-language") || "en";
let state = loadState();
let round = null;
let toastTimer;
function loadState(){
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); if(s && Number.isFinite(s.balance)) return {balance:Math.max(0,s.balance)}; } catch {}
  return {balance:1000};
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function t(key){ return translations[language][key] || translations.en[key] || key; }
function money(n){ return Number(n).toLocaleString(language==="fr"?"fr-FR":"en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function showToast(message,bad=false){
  const el=$("toast"); el.textContent=message; el.classList.toggle("bad",bad); el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function setStatus(key){ $("round-status").textContent=t(key); }
function renderLanguage(){
  document.documentElement.lang=language;
  document.querySelectorAll("[data-i18n]").forEach(el=>{ const key=el.dataset.i18n; if(t(key)) el.textContent=t(key); });
  $("language").value=language; updateRisk(); updateBalance();
  if(round) renderGrid();
}
function updateBalance(){ $("balance").innerHTML = money(state.balance)+' <small>CR</small>'; }
function updateRisk(){
  const n=Number($("bomb-count").value); $("bomb-count-label").textContent=n;
  const level=n>=13?"riskHigh":n<=3?"riskLow":"riskBalanced";
  $("risk-copy").textContent= language==="fr" ? `${n} bombes · ${t(level)}` : `${n} bombs · ${t(level)}`;
}
function multiplierFor(gems,bombs){
  if(!gems) return 1;
  // A modest demo multiplier based on the chance of each safe pick.
  let fair=1;
  for(let i=0;i<gems;i++) fair *= (SIZE-(i))/(SIZE-bombs-i);
  return Math.max(1, fair*0.96);
}
function renderGrid(){
  const grid=$("game-grid"); grid.innerHTML="";
  const revealed=round?.revealed || {};
  for(let i=0;i<SIZE;i++){
    const btn=document.createElement("button"); btn.type="button"; btn.className="tile"; btn.setAttribute("role","gridcell");
    btn.setAttribute("aria-label",`Tile ${i+1}`);
    const result=revealed[i];
    if(result==="gem"){btn.classList.add("revealed-gem");btn.innerHTML='<span class="tile-symbol">◆</span>';btn.disabled=true;btn.setAttribute("aria-label",`Tile ${i+1}: gem`);}
    else if(result==="bomb"){btn.classList.add("revealed-bomb");btn.innerHTML='<span class="tile-symbol">✹</span>';btn.disabled=true;btn.setAttribute("aria-label",`Tile ${i+1}: bomb`);}
    else if(round?.ended && round.bombs.has(i)){btn.classList.add("revealed-bomb");btn.textContent="✹";btn.disabled=true;}
    else if(round?.ended){btn.disabled=true;btn.classList.add("revealed-safe");btn.textContent="·";}
    else {btn.textContent="+";btn.disabled=!round?.active;btn.addEventListener("click",()=>pickTile(i));}
    grid.appendChild(btn);
  }
}
function updateRoundStats(){
  const gems=round?Object.values(round.revealed).filter(x=>x==="gem").length:0;
  const mult=round?multiplierFor(gems,round.bombCount):1;
  $("gems-found").textContent=gems; $("multiplier").textContent=mult.toFixed(2)+"×";
  $("cashout-value").textContent=money(round?round.bet*mult:0)+" CR";
  $("cashout-button").disabled=!(round?.active && gems>0);
  $("start-button").disabled=!!round?.active;
}
function startRound(){
  if(round?.active){showToast(t("alreadyPlaying"),true);return;}
  const bet=Number($("bet-amount").value), bombs=Number($("bomb-count").value);
  if(!Number.isFinite(bet)||bet<1){showToast(t("needBet"),true);return;}
  if(bet>state.balance){showToast(t("notEnough"),true);return;}
  state.balance-=bet; saveState(); updateBalance();
  const bombsSet=new Set();
  while(bombsSet.size<bombs) bombsSet.add(Math.floor(Math.random()*SIZE));
  round={active:true,ended:false,bet,bombCount:bombs,bombs:bombsSet,revealed:{}};
  setStatus("playing"); renderGrid(); updateRoundStats(); showToast(t("roundStarted"));
}
function pickTile(index){
  if(!round?.active||round.revealed[index]) return;
  if(round.bombs.has(index)){
    round.revealed[index]="bomb"; round.active=false; round.ended=true;
    for(const b of round.bombs) if(round.revealed[b]===undefined) round.revealed[b]="bomb";
    setStatus("lost"); renderGrid(); updateRoundStats(); showToast(t("bombMessage"),true); return;
  }
  round.revealed[index]="gem"; renderGrid(); updateRoundStats(); showToast(t("gemMessage"));
  if(Object.values(round.revealed).filter(x=>x==="gem").length===SIZE-round.bombCount){
    cashOut(true);
  }
}
function cashOut(auto=false){
  if(!round?.active) return;
  const gems=Object.values(round.revealed).filter(x=>x==="gem").length;
  if(!gems){showToast(t("noGems"),true);return;}
  const payout=round.bet*multiplierFor(gems,round.bombCount);
  state.balance+=payout;saveState();updateBalance();round.active=false;round.ended=true;
  setStatus("won");renderGrid();updateRoundStats();showToast(t("cashMessage"));
}
$("language").addEventListener("change",e=>{language=e.target.value;localStorage.setItem("bomb-grid-language",language);renderLanguage();});
$("bomb-count").addEventListener("input",()=>{updateRisk();});
$("start-button").addEventListener("click",startRound);
$("cashout-button").addEventListener("click",()=>cashOut());
$("max-bet").addEventListener("click",()=>{$("bet-amount").value=Math.max(1,Math.floor(state.balance));});
document.querySelectorAll("[data-bet]").forEach(btn=>btn.addEventListener("click",()=>{$("bet-amount").value=btn.dataset.bet;}));
$("reset-balance").addEventListener("click",()=>{if(confirm(t("resetConfirm"))){state.balance=1000;saveState();updateBalance();showToast(t("resetMessage"));}});
renderLanguage(); renderGrid(); updateRoundStats();