/* ── battle-ui.js ── */
// Session 2: Deck Builder UI + Battle Result screen
// Session 3: Interactive Battle Stage

const DECK_SIZE = 10;
const BATTLE_RARITY_LIMITS = { Legendary:1, Epic:2, Rare:4, Uncommon:10, Common:10 };

// AI deck composition by tier (per PRD §6)
const AI_DECK_COMP = {
  1:{Common:10,Uncommon:0,Rare:0,Epic:0,Legendary:0},
  2:{Common:6,Uncommon:4,Rare:0,Epic:0,Legendary:0},
  3:{Common:3,Uncommon:4,Rare:3,Epic:0,Legendary:0},
  4:{Common:2,Uncommon:3,Rare:3,Epic:2,Legendary:0},
  5:{Common:1,Uncommon:1,Rare:2,Epic:3,Legendary:3},
};
function generateAiDeck(tier){
  const comp=AI_DECK_COMP[tier]||AI_DECK_COMP[1];
  const deck=[];
  for(const [rarity,count] of Object.entries(comp)){
    if(!count) continue;
    const pool=[...ALL_CARDS.filter(c=>c.rarity===rarity)].sort(()=>Math.random()-0.5);
    deck.push(...pool.slice(0,count));
  }
  return deck.sort(()=>Math.random()-0.5);
}

const TIER_INFO = [
  {tier:1, name:'Rookie',   color:'#78909c', emoji:'🥉', avatar:'🤖', difficulty:1, description:'A brand-new trainer running a random collection. Great for testing your deck.'},
  {tier:2, name:'Scrapper', color:'#66bb6a', emoji:'⚔️', avatar:'🥷', difficulty:2, description:'A scrappy fighter who plays fast and loose with common and uncommon cards.'},
  {tier:3, name:'Fighter',  color:'#42a5f5', emoji:'🛡️', avatar:'🧙', difficulty:3, description:'A seasoned duelist with a balanced deck and a few rare tricks up their sleeve.'},
  {tier:4, name:'Elite',    color:'#ab47bc', emoji:'💎', avatar:'🦅', difficulty:4, description:'An elite challenger running powerful epic combinations. Expect a real fight.'},
  {tier:5, name:'Champion', color:'#ffa726', emoji:'👑', avatar:'🐲', difficulty:5, description:'The reigning champion. Runs legendary cards and counters everything.'},
];

function formatCdTime(ms){
  if(ms<=0)return"Ready";
  const h=Math.floor(ms/3600000);
  const m=Math.floor((ms%3600000)/60000);
  if(h>0)return`${h}h ${m}m`;
  return`${m}m`;
}

function getNextMidnight(){
  const d=new Date();
  d.setDate(d.getDate()+1);
  d.setHours(0,0,0,0);
  return d.getTime();
}

/* ── HpBar ── */
function HpBar({hp,maxHp}){
  const pct=Math.max(0,Math.min(100,(hp/maxHp)*100));
  const barColor=pct>60?"#4caf50":pct>33?"#ffeb3b":"#ef5350";
  return(
    <div style={{width:"100%"}}>
      <div style={{background:"#0a0a20",borderRadius:"4px",height:"7px",overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:barColor,borderRadius:"4px",transition:"width 0.4s ease,background 0.3s ease"}}/>
      </div>
    </div>
  );
}

/* ── CircularHpBar ── */
function CircularHpBar({hp,maxHp,size=64}){
  const pct=Math.max(0,Math.min(1,hp/maxHp));
  const strokeW=5;
  const r=(size-strokeW*2)/2;
  const circ=2*Math.PI*r;
  const offset=circ*(1-pct);
  const color=pct>0.6?"#4caf50":pct>0.33?"#ffeb3b":"#ef5350";
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a3a" strokeWidth={strokeW}/>
        {/* Progress arc */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.4s ease,stroke 0.3s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:900,color:"#fff",lineHeight:1}}>{hp}</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"7px",fontWeight:700,color:"#a0aac0",marginTop:"2px"}}>HP</div>
      </div>
    </div>
  );
}

/* ── FaceDownCard ── */
function FaceDownCard({small,large}){
  const w=small?20:large?80:100;
  const h=small?29:large?115:145;
  const r=small?3:large?10:13;
  return(
    <div style={{width:`${w}px`,height:`${h}px`,borderRadius:`${r}px`,flexShrink:0,position:"relative",overflow:"hidden",
      background:"linear-gradient(145deg,#0a0a1e 0%,#12122e 40%,#0d0d28 100%)",
      border:"1px solid #3a2a6a",
    }}>
      {/* Hex tile pattern */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.15}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`hex-${small?"s":"r"}`} x="0" y="0" width="10" height="11" patternUnits="userSpaceOnUse">
            <polygon points="5,0.8 8.5,2.8 8.5,7.2 5,9.2 1.5,7.2 1.5,2.8" fill="none" stroke="#8866ff" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#hex-${small?"s":"r"})`}/>
      </svg>
      {/* Radial glow */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,#4a2a8a44 0%,transparent 70%)"}}/>
      {/* Centre hero emoji */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:small?"7px":large?"28px":"36px",filter:"drop-shadow(0 0 3px #aa66ff)",lineHeight:1}}>🦸</span>
      </div>
      {/* Shimmer */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 35%,rgba(150,100,255,0.1) 50%,transparent 65%)",animation:"shimmer 2.5s ease-in-out infinite"}}/>
    </div>
  );
}

/* ── BattleStage — Session 3: Interactive Battle ── */
function BattleStage({playerDeck,aiDeck,tierInfo,onBattleEnd}){
  const pRef=useRef(null);
  const aRef=useRef(null);
  const logRef=useRef([]);
  const [phase,setPhase]=useState('init');
  // 'init'|'ready'|'attacking'|'free_ai_attack'|'ai_replacing'|'selecting'|'done'
  const [tick,setTick]=useState(0);
  const [roundNum,setRoundNum]=useState(1);
  const [typeRevealed,setTypeRevealed]=useState(false);
  const [attackAnim,setAttackAnim]=useState(null); // 'player'|'ai'|null — who is lunging
  const [hitAnim,setHitAnim]=useState(null);       // 'player'|'ai'|null — who is shaking/flashing
  const refresh=()=>setTick(t=>t+1);

  // ── Responsive active-card sizing ───────────────────────────────
  // ResizeObserver watches the combat zone and computes the largest card
  // width that lets both active cards + all labels/bars/VS fit without scroll.
  // ResizeObserver sits on the AI card container (flex:1 within its section).
  // That element's height IS the available card height — no overhead math needed.
  const cardContainerRef=useRef(null);
  const [cardW,setCardW]=useState(190);
  useEffect(()=>{
    if(!cardContainerRef.current) return;
    const compute=(h)=>{
      const w=Math.round(h*(201/290));
      setCardW(Math.min(190,Math.max(90,w)));
    };
    compute(cardContainerRef.current.getBoundingClientRect().height);
    const obs=new ResizeObserver(e=>compute(e[0].contentRect.height));
    obs.observe(cardContainerRef.current);
    return ()=>obs.disconnect();
  },[]);

  useEffect(()=>{
    const p=initSideState(playerDeck);
    const a=initSideState(aiDeck);
    const log=[];
    applyEntryEffects(p.active,p,a,log);
    applyEntryEffects(a.active,a,p,log);
    log.push({type:'BATTLE_START',playerActive:p.active.name,aiActive:a.active.name});
    pRef.current=p; aRef.current=a; logRef.current=log;
    setPhase('ready'); refresh();
  },[]);

  const endBattle=(winner)=>{
    const log=logRef.current;
    log.push({type:'BATTLE_END',winner});
    setPhase('done');
    setTimeout(()=>onBattleEnd({winner,log}),900);
  };

  const finishRound=()=>{
    const p=pRef.current; const a=aRef.current; const log=logRef.current;
    resolvePostRound(p,a,log);
    refresh();
    // Check bleed deaths
    if(p.active&&p.active.hp<=0){
      resolveDefeat(p.active,p,log);
      p.active=null;
      if(p.hand.length===0&&p.deck.length===0){ endBattle('ai'); return; }
      if(p.hand.length===0&&p.deck.length>0) drawCard(p);
      setPhase('selecting'); refresh(); return;
    }
    if(a.active&&a.active.hp<=0){
      resolveDefeat(a.active,a,log);
      a.active=null;
      if(a.hand.length===0&&a.deck.length===0){ endBattle('player'); return; }
      aiReplace(); return;
    }
    setRoundNum(n=>n+1); setPhase('ready'); refresh();
  };

  const aiReplace=()=>{
    setPhase('ai_replacing'); refresh();
    setTimeout(()=>{
      const a=aRef.current; const p=pRef.current; const log=logRef.current;
      if(a.hand.length===0&&a.deck.length>0) drawCard(a);
      const next=aiSelectCard(a.hand,p.active?p.active.type:'Brawler');
      if(!next){ endBattle('player'); return; }
      a.hand=a.hand.filter(c=>c.id!==next.id);
      a.active=next;
      applyEntryEffects(next,a,p,log);
      log.push({type:'CARD_ENTER',side:'ai',card:next.name});
      setRoundNum(n=>n+1); setPhase('ready'); refresh();
    },1400);
  };

  const handleAttack=()=>{
    if(phase!=='ready') return;
    const p=pRef.current; const a=aRef.current; const log=logRef.current;
    if(a.hand.length<5&&a.deck.length>0) drawCard(a);
    executeAIProactiveSwap(a,p,log);
    setTypeRevealed(false);
    log.push({type:'ROUND_START',round:roundNum,playerHp:p.active.hp,playerMaxHp:p.active.maxHp,aiHp:a.active.hp,aiMaxHp:a.active.maxHp});
    const pSpd=effSpeed(p.active); const aSpd=effSpeed(a.active);
    const playerFirst=pSpd>=aSpd;
    setPhase('attacking');
    let pKilled=false; let aKilled=false;

    const doResolve=()=>{
      setTimeout(()=>{
        if(!aKilled&&!pKilled){ finishRound(); return; }
        if(aKilled&&pKilled){
          resolveKill(p.active,p,a,log); resolveDefeat(a.active,a,log);
          resolveKill(a.active,a,p,log); resolveDefeat(p.active,p,log);
          a.active=null; p.active=null;
          if(a.hand.length===0&&a.deck.length===0){ endBattle('player'); return; }
          if(p.hand.length===0&&p.deck.length===0){ endBattle('ai'); return; }
          if(a.hand.length===0&&a.deck.length>0) drawCard(a);
          const next=aiSelectCard(a.hand,'Brawler');
          if(next){ a.hand=a.hand.filter(c=>c.id!==next.id); a.active=next; applyEntryEffects(next,a,p,log); }
          if(p.hand.length===0&&p.deck.length>0) drawCard(p);
          setPhase('selecting'); refresh(); return;
        }
        if(aKilled){
          resolveKill(p.active,p,a,log); resolveDefeat(a.active,a,log);
          a.active=null; refresh();
          if(a.hand.length===0&&a.deck.length===0){ endBattle('player'); return; }
          aiReplace(); return;
        }
        resolveKill(a.active,a,p,log); resolveDefeat(p.active,p,log);
        p.active=null; refresh();
        if(p.hand.length===0&&p.deck.length===0){ endBattle('ai'); return; }
        if(p.hand.length===0&&p.deck.length>0) drawCard(p);
        setPhase('selecting'); refresh();
      },300);
    };

    // ── Timing constants ──────────────────────────────────────────────
    const PEAK=480;   // ms from lunge start to impact
    const END=950;    // ms for full lunge + return (matches 0.95s CSS)
    const GAP=500;    // ms pause between the two attacks

    // ── First attack: lunge toward opponent ──────────────────────────
    setAttackAnim(playerFirst?'player':'ai');
    setTimeout(()=>{
      // Peak of lunge — impact fires
      setHitAnim(playerFirst?'ai':'player');
      if(playerFirst){
        const r=executeAttack(p.active,a.active,p,a,log);
        aKilled=r.killed||a.active.hp<=0; pKilled=p.active.hp<=0;
      } else {
        const r=executeAttack(a.active,p.active,a,p,log);
        pKilled=r.killed||p.active.hp<=0; aKilled=a.active.hp<=0;
      }
      setTypeRevealed(true); refresh();
    },PEAK);

    setTimeout(()=>{
      setAttackAnim(null); setHitAnim(null);
      if(!aKilled&&!pKilled){
        // ── Gap then second attack ─────────────────────────────────────
        setTimeout(()=>{
          setAttackAnim(playerFirst?'ai':'player');
          setTimeout(()=>{
            setHitAnim(playerFirst?'player':'ai');
            if(playerFirst){
              const r=executeAttack(a.active,p.active,a,p,log);
              pKilled=r.killed||p.active.hp<=0; aKilled=aKilled||a.active.hp<=0;
            } else {
              const r=executeAttack(p.active,a.active,p,a,log);
              aKilled=r.killed||a.active.hp<=0; pKilled=pKilled||p.active.hp<=0;
            }
            refresh();
          },PEAK);
          setTimeout(()=>{ setAttackAnim(null); setHitAnim(null); doResolve(); },END);
        },GAP);
      } else {
        doResolve();
      }
    },END);
  };

  const handleSelectCard=(card)=>{
    if(phase!=='selecting') return;
    const p=pRef.current; const a=aRef.current; const log=logRef.current;
    p.hand=p.hand.filter(c=>c.id!==card.id);
    p.active=card;
    applyEntryEffects(card,p,a,log);
    log.push({type:'CARD_ENTER',side:'player',card:card.name});
    resolvePostRound(p,a,log);
    setRoundNum(n=>n+1); setPhase('ready'); refresh();
  };

  const runFreeAiAttack=()=>{
    setPhase('free_ai_attack');
    let pKilled=false;
    setAttackAnim('ai');
    setTimeout(()=>{
      const p=pRef.current; const a=aRef.current; const log=logRef.current;
      executeAIProactiveSwap(a,p,log);
      setHitAnim('player');
      const r=executeAttack(a.active,p.active,a,p,log);
      pKilled=r.killed||p.active.hp<=0;
      setTypeRevealed(true); refresh();
    },480);
    setTimeout(()=>{
      setAttackAnim(null); setHitAnim(null);
      setTimeout(()=>{
        const p=pRef.current; const a=aRef.current; const log=logRef.current;
        if(pKilled){
          resolveKill(a.active,a,p,log); resolveDefeat(p.active,p,log);
          p.active=null; refresh();
          if(p.hand.length===0&&p.deck.length===0){ endBattle('ai'); return; }
          if(p.hand.length===0&&p.deck.length>0) drawCard(p);
          resolvePostRound(p,a,log); setRoundNum(n=>n+1); refresh();
          setPhase('selecting');
        } else {
          finishRound();
        }
      },300);
    },950);
  };

  const handleDraw=()=>{
    if(phase!=='ready') return;
    const p=pRef.current; const a=aRef.current; const log=logRef.current;
    if(p.hand.length>=5||p.deck.length===0) return;
    if(a.hand.length<5&&a.deck.length>0) drawCard(a);
    drawCard(p);
    log.push({type:'PLAYER_DRAW',card:p.hand[p.hand.length-1].name});
    setTypeRevealed(false); refresh();
    runFreeAiAttack();
  };

  const handleSwap=(card)=>{
    if(phase!=='ready') return;
    const p=pRef.current; const a=aRef.current; const log=logRef.current;
    if(!p.active) return;
    if(a.hand.length<5&&a.deck.length>0) drawCard(a);
    const prev=p.active;
    p.hand=p.hand.filter(c=>c.id!==card.id);
    p.hand.push(prev);
    p.active=card;
    applyEntryEffects(card,p,a,log);
    log.push({type:'PLAYER_SWAP',card:card.name,prev:prev.name});
    setTypeRevealed(false); refresh();
    runFreeAiAttack();
  };

  const p=pRef.current; const a=aRef.current;
  if(!p||!a||phase==='init'){
    return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",background:"#060610"}}><Spinner size={40} color="#4fc3f7"/></div>);
  }

  const canAttack=phase==='ready'&&!!p.active&&!!a.active;
  const needSelect=phase==='selecting';
  const mult=typeRevealed&&p.active&&a.active?getTypeMultiplier(p.active.type,a.active.type):null;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#060610",overflow:"hidden"}}>

      {/* ── AI zone ── */}
      <div style={{flexShrink:0,padding:"10px 16px 20px",background:"#080818",borderBottom:"1px solid #0f0f24"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
          <span style={{fontSize:"24px"}}>{tierInfo.avatar}</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:900,color:tierInfo.color,letterSpacing:"1px"}}>{tierInfo.emoji} {tierInfo.name.toUpperCase()}</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",fontWeight:700,color:"#c0c8e0",letterSpacing:"1px"}}>ROUND {roundNum}</div>
          </div>
          {/* Forfeit — only during live battle */}
          {phase!=='init'&&phase!=='done'&&(
            <button onClick={()=>endBattle('ai')}
              style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",fontWeight:700,
                color:"#ef5350",background:"rgba(239,83,80,0.08)",border:"1px solid rgba(239,83,80,0.35)",
                borderRadius:"8px",padding:"5px 10px",cursor:"pointer",letterSpacing:"1px",flexShrink:0}}>
              FORFEIT
            </button>
          )}
        </div>
        {/* Hand (centered, scrollable) + deck pushed to far right */}
        <div style={{display:"flex",alignItems:"flex-end",gap:"10px"}}>
          <div style={{flex:1,display:"flex",gap:"6px",alignItems:"center",justifyContent:"center",overflowX:"auto",paddingBottom:"2px"}}>
            {a.hand.map((_,i)=><FaceDownCard key={i}/>)}
            {Array.from({length:Math.max(0,5-a.hand.length)}).map((_,i)=>(
              <div key={`empty-${i}`} style={{width:"100px",flexShrink:0,aspectRatio:"201/290",borderRadius:"9px",
                border:"2px dashed rgba(239,83,80,0.35)",background:"rgba(239,83,80,0.03)"}}/>
            ))}
          </div>
          {a.deck.length>0&&(
            <div style={{flexShrink:0,position:"relative"}}>
              <FaceDownCard large/>
              <div style={{position:"absolute",bottom:"2px",right:"-4px",background:"#12122e",border:"1px solid #3a2a6a",borderRadius:"4px",padding:"0 3px",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,color:"#9966ff",lineHeight:"13px",minWidth:"13px",textAlign:"center"}}>{a.deck.length}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Combat zone ── */}
      {/* flex:1 outer; AI section + VS + player section each flex:1 so CSS
          handles the allocation. HP bars live outside card containers so they
          are never clipped. ResizeObserver on the AI card container derives
          cardW from its actual flex-allocated height — no OVERHEAD constant. */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden",padding:"8px 16px 4px",gap:"4px",boxSizing:"border-box"}}>

        {/* ── AI section ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",minHeight:0}}>
          {/* Card container — position:relative so CircularHpBar can escape without being clipped */}
          <div ref={cardContainerRef} style={{flex:1,minHeight:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {a.active?(
              <div style={{width:`${cardW}px`,height:`${Math.round(cardW*290/201)}px`,position:"relative","--sidebar-w":`calc(100vw - ${cardW}px)`,"--card-col":"1"}}>
                <div className={attackAnim==='ai'?'lunge-down':hitAnim==='ai'?'card-hit':''}
                  style={{position:"absolute",inset:0}}>
                  <CardWrapper rarity={a.active.rarity}><HeroCard card={a.active} size="normal" fill/></CardWrapper>
                  {hitAnim==='ai'&&<div style={{position:"absolute",inset:0,borderRadius:"13px",background:"rgba(239,83,80,0.38)",pointerEvents:"none"}}/>}
                </div>
              </div>
            ):(
              <div style={{width:`${cardW}px`,height:`${Math.round(cardW*290/201)}px`,border:"2px dashed #ef535033",borderRadius:"13px",display:"flex",alignItems:"center",justifyContent:"center",color:"#303050",fontFamily:"monospace",fontSize:"11px"}}>DEFEATED</div>
            )}
            {/* Circular HP — left of card, absolutely positioned so it never affects layout */}
            {a.active&&(
              <div style={{position:"absolute",top:"50%",left:`calc(50% - ${cardW/2}px)`,transform:"translate(calc(-100% - 14px), -50%)"}}>
                <CircularHpBar hp={a.active.hp} maxHp={a.active.maxHp}/>
              </div>
            )}
          </div>
          {/* Type indicator — fixed height so layout is stable */}
          <div style={{height:"16px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {mult!==null&&<div style={{fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.5px",color:mult===1.5?"#ef5350":mult===0.75?"#4caf50":"#404060"}}>{mult===1.5?"▲ STRONG vs you":mult===0.75?"▼ WEAK vs you":"— NEUTRAL"}</div>}
          </div>
        </div>

        {/* ── VS ── */}
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:"#4fc3f7",userSelect:"none",textShadow:"0 0 12px #4fc3f788",letterSpacing:"4px",textAlign:"center",flexShrink:0}}>— VS —</div>

        {/* ── Player section ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",minHeight:0}}>
          {/* Card container — position:relative so circles/buttons can escape without clipping */}
          <div style={{flex:1,minHeight:0,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {p.active?(
              <div style={{position:"relative"}}>
                <div style={{width:`${cardW}px`,height:`${Math.round(cardW*290/201)}px`,position:"relative","--sidebar-w":`calc(100vw - ${cardW}px)`,"--card-col":"1"}}>
                  <div className={attackAnim==='player'?'lunge-up':hitAnim==='player'?'card-hit':''}
                    style={{position:"absolute",inset:0}}>
                    <CardWrapper rarity={p.active.rarity}><HeroCard card={p.active} size="normal" fill/></CardWrapper>
                    {hitAnim==='player'&&<div style={{position:"absolute",inset:0,borderRadius:"13px",background:"rgba(239,83,80,0.38)",pointerEvents:"none"}}/>}
                  </div>
                </div>
                {/* Attack button — right of card */}
                <div style={{position:"absolute",top:"50%",left:"100%",transform:"translateY(-50%)",marginLeft:"14px",width:"64px",height:"64px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <button onClick={canAttack?handleAttack:undefined} disabled={!canAttack}
                    style={{width:"64px",height:"64px",borderRadius:"50%",
                      background:canAttack?"linear-gradient(135deg,#ef5350,#ff7043)":"#0d0d20",
                      border:canAttack?"2px solid #ff7043":"2px solid #1a1a3a",
                      fontSize:"26px",cursor:canAttack?"pointer":"not-allowed",
                      animation:canAttack?"attackGlow 2s ease-in-out infinite":"none",
                      transition:"background 0.2s,border 0.2s,opacity 0.2s",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      opacity:canAttack?1:0.3}}>
                    ⚔️
                  </button>
                </div>
              </div>
            ):(
              <div style={{width:`${cardW}px`,height:`${Math.round(cardW*290/201)}px`,border:"2px dashed #4fc3f733",borderRadius:"13px",display:"flex",alignItems:"center",justifyContent:"center",color:"#303050",fontFamily:"monospace",fontSize:"11px"}}>SELECT →</div>
            )}
            {/* Circular HP — left of card */}
            {p.active&&(
              <div style={{position:"absolute",top:"50%",left:`calc(50% - ${cardW/2}px)`,transform:"translate(calc(-100% - 14px), -50%)"}}>
                <CircularHpBar hp={p.active.hp} maxHp={p.active.maxHp}/>
              </div>
            )}
          </div>
          <div style={{height:"16px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {mult!==null&&<div style={{fontFamily:"monospace",fontSize:"10px",letterSpacing:"0.5px",color:mult===1.5?"#4caf50":mult===0.75?"#ef5350":"#404060"}}>{mult===1.5?"▲ STRONG vs them":mult===0.75?"▼ WEAK vs them":"— NEUTRAL"}</div>}
          </div>
        </div>

      </div>

      {/* ── Player hand ── */}
      <div style={{flexShrink:0,background:"#080818",borderTop:"1px solid #0f0f24",padding:"8px 12px 10px"}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:"10px"}}>
          {/* Hand — centered, scrollable */}
          <div style={{flex:1,display:"flex",gap:"8px",overflowX:"auto",paddingBottom:"2px",justifyContent:"center",alignItems:"flex-end"}}>
            {p.hand.map(card=>(
              <div key={card.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",flexShrink:0}}>
                <div onClick={needSelect?()=>handleSelectCard(card):undefined}
                  style={{width:"100px",cursor:needSelect?"pointer":"default",borderRadius:"9px",
                    outline:needSelect?"2px solid #4fc3f7":"none",outlineOffset:"2px",
                    opacity:needSelect?1:(phase==='ready'?1:0.6),transition:"opacity 0.2s,outline 0.2s",
                    "--sidebar-w":"calc(100vw - 100px)","--card-col":"1"}}>
                  <CardWrapper rarity={card.rarity}><HeroCard card={card} size="normal" fill/></CardWrapper>
                </div>
                <HpBar hp={card.hp} maxHp={card.maxHp} color="#4fc3f7"/>
                {phase==='ready'?(
                  <button onClick={()=>handleSwap(card)}
                    style={{width:"100px",padding:"3px 0",fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:700,
                      color:"#4fc3f7",background:"rgba(79,195,247,0.1)",border:"1px solid rgba(79,195,247,0.35)",
                      borderRadius:"6px",cursor:"pointer",letterSpacing:"1px"}}>
                    ↕ SWAP IN
                  </button>
                ):<div style={{height:"24px"}}/>}
              </div>
            ))}
            {Array.from({length:Math.max(0,5-p.hand.length)}).map((_,i)=>(
              <div key={`empty-${i}`} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",flexShrink:0}}>
                <div style={{width:"100px",aspectRatio:"201/290",borderRadius:"9px",
                  border:"2px dashed rgba(79,195,247,0.45)",background:"rgba(79,195,247,0.04)",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {phase==='ready'&&p.deck.length>0&&(
                    <button onClick={handleDraw}
                      style={{width:"38px",height:"38px",borderRadius:"50%",
                        background:"rgba(79,195,247,0.12)",border:"1px solid rgba(79,195,247,0.45)",
                        color:"#4fc3f7",fontSize:"22px",lineHeight:1,cursor:"pointer",
                        display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300}}>
                      +
                    </button>
                  )}
                </div>
                <div style={{visibility:"hidden"}}><HpBar hp={0} maxHp={1}/></div>
                <button style={{width:"100px",padding:"3px 0",fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:700,
                  color:"#4fc3f7",background:"rgba(79,195,247,0.1)",border:"1px solid rgba(79,195,247,0.35)",
                  borderRadius:"6px",letterSpacing:"1px",visibility:"hidden",pointerEvents:"none"}}>↕ SWAP IN</button>
              </div>
            ))}
          </div>
          {/* Deck — single card image on right */}
          {p.deck.length>0&&(
            <div style={{flexShrink:0,position:"relative"}}>
              <FaceDownCard large/>
              <div style={{position:"absolute",bottom:"-4px",right:"-4px",background:"#12122e",border:"1px solid #3a2a6a",borderRadius:"4px",padding:"0 3px",fontFamily:"'Orbitron',monospace",fontSize:"8px",fontWeight:700,color:"#9966ff",lineHeight:"13px",minWidth:"13px",textAlign:"center"}}>{p.deck.length}</div>
            </div>
          )}
        </div>
      </div>

      {needSelect&&(
        <div style={{flexShrink:0,padding:"10px 16px 12px",background:"#08081a",borderTop:"1px solid #12122a",textAlign:"center",fontFamily:"'Orbitron',monospace",fontSize:"13px",color:"#4fc3f7",letterSpacing:"1px"}}>
          👆 Tap a card from your hand to play
        </div>
      )}
    </div>
  );
}

/* ── BattleTab — orchestrates screens ── */
function BattleTab({collection,sorted,filter,setFilter,rarityFilter,setRarityFilter,sortBy,setSortBy,search,setSearch,packFilter,setPackFilter,rarities,types,battleDeck,setBattleDeck,battleTier,setBattleTier,battleCooldowns,onBattleComplete,notify,gainXp,isGod,onBattlingChange}){
  const [screen,setScreen]=useState(()=>sessionStorage.getItem('hc_battleScreen')||'builder');
  const [battleResult,setBattleResult]=useState(null);
  const [battleSetup,setBattleSetup]=useState(()=>{
    try{ return JSON.parse(sessionStorage.getItem('hc_battleSetup')||'null'); }catch{ return null; }
  });

  // Persist battle screen + setup so a page refresh lands back in the battle
  useEffect(()=>{
    if(screen==='battle'&&battleSetup){
      sessionStorage.setItem('hc_battleScreen','battle');
      sessionStorage.setItem('hc_battleSetup',JSON.stringify(battleSetup));
    } else {
      sessionStorage.removeItem('hc_battleScreen');
      sessionStorage.removeItem('hc_battleSetup');
    }
  },[screen,battleSetup]);

  // Signal parent when entering/leaving live battle
  useEffect(()=>{
    onBattlingChange?.(screen==='battle');
    return()=>onBattlingChange?.(false);
  },[screen]);

  const startBattle=(tier)=>{
    setBattleTier(tier);
    const deckCards=battleDeck.map(id=>{
      const owned=collection.find(c=>c.id===id);
      return owned||ALL_CARDS.find(c=>c.id===id);
    }).filter(Boolean);
    const aiDeck=generateAiDeck(tier);
    setBattleSetup({playerDeck:deckCards,aiDeck,tier});
    setScreen('battle');
  };

  if(screen==='result'&&battleResult){
    return(
      <BattleResult
        result={battleResult}
        onRematch={()=>{setBattleResult(null);setScreen('builder');}}
      />
    );
  }

  if(screen==='battle'&&battleSetup){
    return(
      <BattleStage
        playerDeck={battleSetup.playerDeck}
        aiDeck={battleSetup.aiDeck}
        tierInfo={TIER_INFO[battleSetup.tier-1]}
        onBattleEnd={(result)=>{
          const rewards=calcBattleRewards(battleSetup.tier,result.winner,0);
          onBattleComplete(result,battleDeck,battleSetup.tier,rewards);
          setBattleResult({...result,rewards,tier:battleSetup.tier});
          setBattleSetup(null);
          setScreen('result');
        }}
      />
    );
  }

  if(screen==='opponent'){
    return(
      <OpponentSelect
        battleDeck={battleDeck}
        collection={collection}
        onStartBattle={startBattle}
        onBack={()=>setScreen('builder')}
      />
    );
  }

  return(
    <div style={{height:"100%"}}>
      <DeckBuilder
        collection={collection}
        sorted={sorted}
        filter={filter} setFilter={setFilter}
        rarityFilter={rarityFilter} setRarityFilter={setRarityFilter}
        sortBy={sortBy} setSortBy={setSortBy}
        search={search} setSearch={setSearch}
        packFilter={packFilter} setPackFilter={setPackFilter}
        rarities={rarities} types={types}
        battleDeck={battleDeck}
        setBattleDeck={setBattleDeck}
        battleCooldowns={battleCooldowns}
        onChooseOpponent={()=>setScreen('opponent')}
        notify={notify}
      />
    </div>
  );
}

/* ── DeckBuilder ── */
function DeckBuilder({collection,sorted,filter,setFilter,rarityFilter,setRarityFilter,sortBy,setSortBy,search,setSearch,packFilter,setPackFilter,rarities,types,battleDeck,setBattleDeck,battleCooldowns,onChooseOpponent,notify}){

  const [hoveredSlot,setHoveredSlot]=useState(null);
  const [filterOpen,setFilterOpen]=useState(false);
  const [openSections,setOpenSections]=useState({pack:true,rarity:true,type:true});
  const toggleSection=s=>setOpenSections(prev=>({...prev,[s]:!prev[s]}));
  const activeFilters=[packFilter!==0,rarityFilter!=='All',filter!=='All'].filter(Boolean).length;
  const collectionScrollRef=useRef(null);
  const [isSticky,setIsSticky]=useState(false);
  const deckScrollRef=useRef(null);
  const [deckScroll,setDeckScroll]=useState({left:false,right:false});
  const updateDeckScroll=()=>{
    const el=deckScrollRef.current;
    if(!el)return;
    setDeckScroll({left:el.scrollLeft>4,right:el.scrollLeft<el.scrollWidth-el.clientWidth-4});
  };
  useEffect(()=>{updateDeckScroll();},[battleDeck]);
  const handleCollectionScroll=()=>setIsSticky((collectionScrollRef.current?.scrollTop||0)>10);

  // Count selected cards by rarity
  const rarityCounts=(()=>{
    const counts={Legendary:0,Epic:0,Rare:0,Uncommon:0,Common:0};
    battleDeck.forEach(id=>{
      const card=collection.find(c=>c.id===id)||ALL_CARDS.find(c=>c.id===id);
      if(card)counts[card.rarity]=(counts[card.rarity]||0)+1;
    });
    return counts;
  })();

  const isSelected=id=>battleDeck.includes(id);

  const canSelect=card=>{
    if(isSelected(card.id))return true;
    if(battleDeck.length>=DECK_SIZE)return false;
    if(rarityCounts[card.rarity]>=(BATTLE_RARITY_LIMITS[card.rarity]||10))return false;
    return true;
  };

  const toggleCard=card=>{
    if(isSelected(card.id)){
      setBattleDeck(prev=>prev.filter(id=>id!==card.id));
    } else {
      if(!canSelect(card)){
        if(battleDeck.length>=DECK_SIZE)notify('Deck is full! Remove a card first.','#ef5350');
        else notify(`Max ${BATTLE_RARITY_LIMITS[card.rarity]} ${card.rarity} per deck`,'#ff9800');
        return;
      }
      setBattleDeck(prev=>[...prev,card.id]);
    }
  };

  // Use sorted array as-is — no reorder on select (avoids scroll-to-top jump)
  const displayCards=sorted;

  const battleLocked=collection.length<DECK_SIZE;
  const deckFull=battleDeck.length===DECK_SIZE;
  const anyOnCooldown=battleDeck.some(id=>isCardOnCooldown(id,battleCooldowns));
  const canStart=deckFull&&!anyOnCooldown;

  if(battleLocked){
    return(
      <div style={{padding:"64px 32px",textAlign:"center",maxWidth:"560px",margin:"0 auto"}}>
        <div style={{fontSize:"80px",marginBottom:"24px"}}>🔒</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:"#4fc3f7",letterSpacing:"2px",marginBottom:"14px"}}>BATTLE LOCKED</div>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",color:"#a0a8c0",lineHeight:1.7}}>
          You need at least 10 cards to enter battle.<br/>Open packs to collect more heroes!
        </div>
        <div style={{marginTop:"20px",fontFamily:"monospace",fontSize:"17px",color:"#4fc3f755"}}>
          {collection.length} / 10 cards collected
        </div>
      </div>
    );
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      {/* ── Pinned top: controls + deck slots ── */}
      <div style={{background:"#060610",zIndex:100,flexShrink:0,borderBottom:isSticky?"2px solid rgba(255,255,255,0.6)":"none"}}>

      {/* Top controls */}
      <div style={{padding:isSticky?"8px 20px 6px":"20px 20px 14px"}}>

        {/* Title — hidden when stickied */}
        {!isSticky&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:"#4fc3f7",letterSpacing:"2px",marginBottom:"12px"}}>
          ⚔️ BUILD YOUR DECK
        </div>}

        {/* Rarity limit badges */}
        <div style={{display:"flex",gap:"6px",marginBottom:isSticky?"6px":"14px",flexWrap:"wrap"}}>
          {['Legendary','Epic','Rare'].map(r=>{
            const lim=BATTLE_RARITY_LIMITS[r];
            const cnt=rarityCounts[r];
            const cfg=RC[r];
            return(
              <div key={r} style={{background:cnt>0?`${cfg.color}15`:"transparent",border:`1px solid ${cnt>0?cfg.color+"44":"rgba(255,255,255,0.15)"}`,borderRadius:"7px",padding:"3px 10px",fontFamily:"monospace",fontSize:"13px",color:cnt>=lim?cfg.color:"#c0c8e0"}}>
                <span style={{color:cfg.color}}>{r}</span>: {cnt}/{lim}
              </div>
            );
          })}
          <div style={{background:"transparent",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",padding:"3px 10px",fontFamily:"monospace",fontSize:"13px",color:"#c0c8e0"}}>Uncommon / Common: ∞</div>
        </div>

      </div>

      {/* ── Deck Slots ── */}
      <div style={{padding:isSticky?"8px 20px 10px":"16px 20px 20px",borderTop:"1px solid #0f0f24"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#a0aac0",letterSpacing:"3px",marginBottom:"12px"}}>
          YOUR DECK · {battleDeck.length}/{DECK_SIZE}
        </div>
        <div style={{position:"relative",display:"flex",alignItems:"center",gap:"6px"}}>
          {/* Left arrow */}
          <button onClick={()=>{deckScrollRef.current.scrollBy({left:-300,behavior:"smooth"});}} style={{flexShrink:0,width:"28px",height:"28px",borderRadius:"50%",background:deckScroll.left?"#1a1a3a":"transparent",border:`1px solid ${deckScroll.left?"#4fc3f7":"rgba(255,255,255,0.12)"}`,color:deckScroll.left?"#4fc3f7":"rgba(255,255,255,0.2)",cursor:deckScroll.left?"pointer":"default",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>◀</button>
          <div ref={deckScrollRef} className="deck-slots-scroll" style={{display:"flex",flexWrap:"nowrap",gap:"8px",overflowX:"auto",flex:1}} onScroll={updateDeckScroll}>
          {Array.from({length:DECK_SIZE}).map((_,i)=>{
            const cardId=battleDeck[i];
            const card=cardId?(collection.find(c=>c.id===cardId)||ALL_CARDS.find(c=>c.id===cardId)):null;
            const onCd=card?isCardOnCooldown(card.id,battleCooldowns):false;

            if(card){
              return(
                <div key={i} style={{position:"relative",width:"138px",height:"186px",flexShrink:0,cursor:"pointer"}}
                  onMouseEnter={()=>setHoveredSlot(i)}
                  onMouseLeave={()=>setHoveredSlot(null)}
                  onClick={()=>toggleCard(card)}
                >
                  <HeroCard card={card} size="small"/>
                  {onCd&&(
                    <div style={{position:"absolute",inset:0,background:"rgba(6,6,16,0.7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",borderRadius:"9px"}}>⏱️</div>
                  )}
                  {hoveredSlot===i&&(
                    <div style={{position:"absolute",inset:0,background:"rgba(6,6,16,0.78)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"9px",pointerEvents:"none"}}>
                      <div style={{color:"#ef5350",fontFamily:"'Orbitron',monospace",fontSize:"9px",fontWeight:900,letterSpacing:"1px",textAlign:"center",lineHeight:1.6}}>✕<br/>REMOVE</div>
                    </div>
                  )}
                </div>
              );
            }

            return(
              <div key={i} style={{width:"138px",height:"186px",flexShrink:0,border:"2px dashed rgba(79,195,247,0.45)",borderRadius:"9px",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(79,195,247,0.04)",color:"rgba(79,195,247,0.5)",fontFamily:"monospace",fontSize:"16px",fontWeight:700}}>
                {i+1}
              </div>
            );
          })}
          </div>{/* end scroll container */}
          {/* Right arrow */}
          <button onClick={()=>{deckScrollRef.current.scrollBy({left:300,behavior:"smooth"});}} style={{flexShrink:0,width:"28px",height:"28px",borderRadius:"50%",background:deckScroll.right?"#1a1a3a":"transparent",border:`1px solid ${deckScroll.right?"#4fc3f7":"rgba(255,255,255,0.12)"}`,color:deckScroll.right?"#4fc3f7":"rgba(255,255,255,0.2)",cursor:deckScroll.right?"pointer":"default",fontSize:"12px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>▶</button>
        </div>{/* end arrow+scroll row */}
      </div>
      </div>{/* end sticky wrapper */}

      {/* ── Scrollable collection ── */}
      <div ref={collectionScrollRef} style={{flex:1,overflowY:"auto",position:"relative"}} onScroll={handleCollectionScroll}>

      {/* ── YOUR COLLECTION row — search + sort + filter button ── */}
      <div style={{padding:"16px 20px 12px",borderBottom:"1px solid #0f0f24"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:"#c0c8e0",letterSpacing:"2px",flexShrink:0,whiteSpace:"nowrap"}}>YOUR COLLECTION</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." className="collection-search" style={{flex:1,minWidth:0,fontSize:"14px",marginBottom:"0"}}/>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="sort-select" style={{background:"#0a0a20",border:"1px solid #2a2a4a",borderRadius:"10px",padding:"7px 8px",color:"#ffffff",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",cursor:"pointer",outline:"none",flexShrink:0}}>
            <option value="rarity">Rarity</option>
            <option value="name_az">A→Z</option>
            <option value="name_za">Z→A</option>
            <option value="count_hl">Most Owned</option>
            <option value="acquired_new">Newest</option>
            <option value="acquired_old">Oldest</option>
          </select>
          <button onClick={()=>setFilterOpen(true)} style={{position:"relative",background:"#0a0a20",border:`1px solid ${activeFilters>0?"#4fc3f7":"#2a2a4a"}`,borderRadius:"10px",padding:"7px 12px",color:activeFilters>0?"#4fc3f7":"#c0c8e0",fontFamily:"'Orbitron',monospace",fontSize:"11px",cursor:"pointer",flexShrink:0,letterSpacing:"0.5px",transition:"border-color 0.15s,color 0.15s",whiteSpace:"nowrap"}}>
            ⚙ FILTERS
            {activeFilters>0&&(<span style={{position:"absolute",top:"-6px",right:"-6px",background:"#4fc3f7",color:"#060610",borderRadius:"50%",width:"16px",height:"16px",fontSize:"10px",fontFamily:"monospace",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeFilters}</span>)}
          </button>
        </div>
      </div>

      {/* ── Card grid — same layout as Collection ── */}
      <div style={{padding:"29px 32px 0",position:"relative",zIndex:0,isolation:"isolate"}}>
        {displayCards.length===0&&(
          <div style={{textAlign:"center",color:"#a8b0c8",padding:"97px 0",fontFamily:"'Orbitron',monospace",fontSize:"21px"}}>
            No matches found.
          </div>
        )}
        <div className="collection-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"28px"}}>
          {displayCards.map(card=>{
            const selected=isSelected(card.id);
            const onCd=isCardOnCooldown(card.id,battleCooldowns);
            const disabled=!selected&&!canSelect(card);
            const cdMs=cooldownRemaining(card.id,battleCooldowns);

            return(
              <div key={card.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"7px",opacity:disabled?0.35:1,cursor:disabled?"not-allowed":"pointer",transition:"opacity 0.15s"}}>
                <CardWrapper rarity={card.rarity} onClick={()=>!disabled&&toggleCard(card)} cursor={disabled?"not-allowed":"pointer"}>
                  <HeroCard card={card} size="normal" fill/>

                  {/* Cooldown overlay */}
                  {onCd&&(
                    <div style={{position:"absolute",inset:0,background:"rgba(6,6,16,0.8)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px"}}>
                      <div style={{fontSize:"22px"}}>⏱️</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:"#808098",letterSpacing:"1px"}}>COOLDOWN</div>
                      <div style={{fontFamily:"monospace",fontSize:"13px",color:"#4fc3f7"}}>{formatCdTime(cdMs)}</div>
                    </div>
                  )}

                  {/* Selected check */}
                  {selected&&(
                    <div style={{position:"absolute",top:"6px",right:"6px",width:"22px",height:"22px",borderRadius:"50%",background:"#4fc3f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:900,color:"#060610",boxShadow:"0 0 10px #4fc3f7aa"}}>✓</div>
                  )}

                  {/* Selected border glow */}
                  {selected&&(
                    <div style={{position:"absolute",inset:0,borderRadius:"13px",boxShadow:"inset 0 0 0 2px #4fc3f7",pointerEvents:"none"}}/>
                  )}
                </CardWrapper>

                {/* Ability label — same position as dupe badge in Collection */}
                {card.ability&&(
                  <div style={{background:"#4fc3f722",border:"1px solid #4fc3f755",borderRadius:"8px",padding:"3px 10px",fontFamily:"'Orbitron',monospace",fontSize:"12px",color:"#4fc3f7",fontWeight:700,letterSpacing:"0.5px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>
                    ⚡ {card.ability}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* spacer so cards aren't hidden behind tray */}
      <div style={{height:"200px"}}/>
      </div>{/* end scrollable collection */}

      {/* ── Filter drawer ── */}
      {filterOpen&&(<div className="battle-filter-backdrop" onClick={()=>setFilterOpen(false)}/>)}
      <div className={`battle-filter-drawer${filterOpen?" open":""}`}>
        {/* Drawer header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 20px 16px",borderBottom:"1px solid #0f0f24",position:"sticky",top:0,background:"#08081a",zIndex:1}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:900,color:"#ffffff",letterSpacing:"1px"}}>FILTERS</div>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {activeFilters>0&&(
              <button onClick={()=>{setPackFilter(0);setRarityFilter('All');setFilter('All');}} style={{background:"none",border:"none",color:"#4fc3f7",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",cursor:"pointer",padding:0,fontWeight:600}}>Clear all</button>
            )}
            <button onClick={()=>setFilterOpen(false)} style={{background:"none",border:"none",color:"#a0a8c0",fontSize:"20px",cursor:"pointer",lineHeight:1,padding:0}}>✕</button>
          </div>
        </div>

        {/* PACK section */}
        <div style={{borderBottom:"1px solid #0f0f24"}}>
          <button onClick={()=>toggleSection('pack')} style={{width:"100%",background:"none",border:"none",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:"#c0c8e0",fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"1px"}}>
            PACK <span style={{fontSize:"10px"}}>{openSections.pack?"▲":"▼"}</span>
          </button>
          {openSections.pack&&(
            <div style={{paddingBottom:"8px"}}>
              {[{id:0,label:"All",emoji:"📋",color:"#4fc3f7"},...Object.values(PACKS).map(p=>({id:p.id,label:p.name,emoji:p.emoji,color:p.color}))].map(p=>(
                <button key={p.id} onClick={()=>setPackFilter(p.id)} style={{width:"100%",background:packFilter===p.id?`${p.color}18`:"none",border:"none",padding:"10px 20px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",textAlign:"left",transition:"background 0.12s"}}>
                  <div style={{width:"15px",height:"15px",borderRadius:"50%",border:`2px solid ${p.color}`,background:packFilter===p.id?p.color:"transparent",flexShrink:0,transition:"background 0.12s"}}/>
                  <span style={{fontSize:"15px"}}>{p.emoji}</span>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:packFilter===p.id?p.color:"#c0c8e0",fontWeight:600}}>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RARITY section */}
        <div style={{borderBottom:"1px solid #0f0f24"}}>
          <button onClick={()=>toggleSection('rarity')} style={{width:"100%",background:"none",border:"none",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:"#c0c8e0",fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"1px"}}>
            RARITY <span style={{fontSize:"10px"}}>{openSections.rarity?"▲":"▼"}</span>
          </button>
          {openSections.rarity&&(
            <div style={{paddingBottom:"8px"}}>
              {rarities.map(r=>{
                const cfg=r==="All"?{color:"#4fc3f7"}:RC[r];
                return(
                  <button key={r} onClick={()=>setRarityFilter(r)} style={{width:"100%",background:rarityFilter===r?`${cfg.color}18`:"none",border:"none",padding:"10px 20px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",textAlign:"left",transition:"background 0.12s"}}>
                    <div style={{width:"15px",height:"15px",borderRadius:"50%",border:`2px solid ${cfg.color}`,background:rarityFilter===r?cfg.color:"transparent",flexShrink:0,transition:"background 0.12s"}}/>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:rarityFilter===r?cfg.color:"#c0c8e0",fontWeight:600}}>{r}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* TYPE section */}
        <div>
          <button onClick={()=>toggleSection('type')} style={{width:"100%",background:"none",border:"none",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:"#c0c8e0",fontFamily:"'Orbitron',monospace",fontSize:"11px",letterSpacing:"1px"}}>
            TYPE <span style={{fontSize:"10px"}}>{openSections.type?"▲":"▼"}</span>
          </button>
          {openSections.type&&(
            <div style={{paddingBottom:"8px"}}>
              {types.map(t=>(
                <button key={t} onClick={()=>setFilter(t)} style={{width:"100%",background:filter===t?"#4fc3f718":"none",border:"none",padding:"10px 20px",display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",textAlign:"left",transition:"background 0.12s"}}>
                  <div style={{width:"15px",height:"15px",borderRadius:"50%",border:`2px solid ${filter===t?"#4fc3f7":"rgba(255,255,255,0.3)"}`,background:filter===t?"#4fc3f7":"transparent",flexShrink:0,transition:"background 0.12s"}}/>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:filter===t?"#4fc3f7":"#c0c8e0",fontWeight:600}}>{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed tray — always visible ── */}
      <div className="battle-tray-fixed" style={{background:"#08081a",borderTop:"1px solid #12122a",padding:"10px 16px 12px"}}>

        {/* Start battle button */}
        <button
          onClick={canStart?onChooseOpponent:undefined}
          style={{width:"100%",background:canStart?"linear-gradient(135deg,#4fc3f7,#00e5ff)":"#0a0a1e",border:canStart?"none":"1px solid rgba(255,255,255,0.12)",borderRadius:"13px",padding:"14px",fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,color:canStart?"#060610":"#6070a0",cursor:canStart?"pointer":"not-allowed",letterSpacing:"2px",boxShadow:canStart?"0 0 18px #4fc3f755":"none",transition:"all 0.2s"}}
        >
          {anyOnCooldown?"⏱️ CARDS ON COOLDOWN":deckFull?"👥 CHOOSE OPPONENT":`SELECT ${DECK_SIZE-battleDeck.length} MORE CARD${DECK_SIZE-battleDeck.length!==1?"S":""}`}
        </button>

        {/* Deck count */}
        <div style={{textAlign:"center",marginTop:"6px",fontFamily:"monospace",fontSize:"13px",color:deckFull?"#4fc3f7":"#c0c8e0"}}>
          {battleDeck.length}/{DECK_SIZE} cards selected
          {anyOnCooldown&&<span style={{color:"#ef5350",marginLeft:"10px"}}>· cooldown active</span>}
        </div>
      </div>
    </div>
  );
}

/* ── OpponentSelect ── */
function OpponentSelect({onStartBattle,onBack}){
  const [hovered,setHovered]=useState(null);

  return(
    <div style={{maxWidth:"680px",margin:"0 auto",padding:"32px 32px 120px"}}>

      {/* Back */}
      <button onClick={onBack} style={{background:"transparent",border:"none",color:"#4fc3f7",fontFamily:"'Orbitron',monospace",fontSize:"12px",letterSpacing:"1px",cursor:"pointer",padding:"0",marginBottom:"28px",display:"flex",alignItems:"center",gap:"6px"}}>
        ← CHANGE DECK
      </button>

      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:"#ffffff",letterSpacing:"2px",marginBottom:"6px"}}>
        CHOOSE YOUR OPPONENT
      </div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:"#a0a8c0",marginBottom:"28px"}}>
        Higher tiers mean tougher opponents and bigger rewards.
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
        {TIER_INFO.map(t=>{
          const rewards=BATTLE_REWARDS[t.tier];
          const isHovered=hovered===t.tier;
          return(
            <div key={t.tier}
              onClick={()=>onStartBattle(t.tier)}
              onMouseEnter={()=>setHovered(t.tier)}
              onMouseLeave={()=>setHovered(null)}
              style={{background:isHovered?`${t.color}18`:`${t.color}0a`,border:`1.5px solid ${isHovered?t.color:`${t.color}44`}`,borderRadius:"16px",padding:"20px 24px",cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:"20px"}}
            >
              {/* Avatar */}
              <div style={{fontSize:"52px",lineHeight:1,flexShrink:0,filter:isHovered?"drop-shadow(0 0 12px currentColor)":"none",transition:"filter 0.15s"}}>
                {t.avatar}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"6px",flexWrap:"wrap"}}>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:900,color:t.color,letterSpacing:"1px"}}>
                    {t.emoji} {t.name.toUpperCase()}
                  </div>
                  <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                    {Array.from({length:5}).map((_,i)=>(
                      <div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:i<t.difficulty?t.color:`${t.color}28`,transition:"background 0.15s"}}/>
                    ))}
                  </div>
                </div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:"#c0c8e0",marginBottom:"10px",lineHeight:1.45}}>
                  {t.description}
                </div>
                <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",color:"#4fc3f7"}}>Win: 💎{rewards.winCredits} +{rewards.winXp}XP</span>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",color:"#a0a8c0"}}>Loss: 💎{rewards.lossCredits} +{rewards.lossXp}XP</span>
                </div>
              </div>

              {/* CTA arrow */}
              <div style={{flexShrink:0,background:isHovered?t.color:`${t.color}22`,border:`1px solid ${isHovered?"transparent":`${t.color}66`}`,borderRadius:"10px",padding:"10px 16px",fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:900,color:isHovered?"#060610":t.color,letterSpacing:"1px",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                BATTLE →
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── BattleResult ── */
function BattleResult({result,onRematch}){
  const {winner,log,rewards,tier}=result;
  const won=winner==='player';
  const tierInfo=TIER_INFO[(tier||1)-1];
  const rounds=log?log.filter(e=>e.type==='ROUND_START').length:0;

  return(
    <div style={{padding:"56px 32px 80px",textAlign:"center",maxWidth:"480px",margin:"0 auto",animation:"fadeIn 0.4s ease-out"}}>

      <div style={{fontSize:"88px",marginBottom:"18px",animation:"float 2s ease-in-out infinite"}}>
        {won?"🏆":"💀"}
      </div>

      <div style={{
        fontFamily:"'Orbitron',monospace",fontSize:"34px",fontWeight:900,
        color:won?"#ffd700":"#ef5350",
        letterSpacing:"3px",marginBottom:"8px",
        textShadow:won?"0 0 24px #ffd70077":"0 0 24px #ef535077",
      }}>
        {won?"VICTORY":"DEFEAT"}
      </div>

      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"17px",color:"#505878",marginBottom:"32px"}}>
        {tierInfo.emoji} {tierInfo.name} · {rounds} round{rounds!==1?"s":""}
      </div>

      {/* Rewards card */}
      <div style={{background:"#0a0a1e",border:"1px solid #12122a",borderRadius:"20px",padding:"28px",marginBottom:"28px"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"12px",color:"#404060",letterSpacing:"2px",marginBottom:"18px"}}>REWARDS EARNED</div>
        <div style={{display:"flex",justifyContent:"center",gap:"40px"}}>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"32px",fontWeight:900,color:"#4fc3f7"}}>+{(rewards.credits||0).toLocaleString()}</div>
            <div style={{fontFamily:"monospace",fontSize:"13px",color:"#505878",marginTop:"4px"}}>💎 CREDITS</div>
          </div>
          <div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"32px",fontWeight:900,color:"#ffd700"}}>+{(rewards.xp||0).toLocaleString()}</div>
            <div style={{fontFamily:"monospace",fontSize:"13px",color:"#505878",marginTop:"4px"}}>XP</div>
          </div>
        </div>
        {rewards.streakBonus&&(
          <div style={{marginTop:"14px",fontFamily:"'Orbitron',monospace",fontSize:"12px",color:"#ff9800",letterSpacing:"1px"}}>🔥 WIN STREAK BONUS ×2</div>
        )}
      </div>

      <button onClick={onRematch} style={{
        width:"100%",background:"linear-gradient(135deg,#4fc3f7,#00e5ff)",
        border:"none",borderRadius:"14px",padding:"16px",
        fontFamily:"'Orbitron',monospace",fontSize:"17px",fontWeight:900,
        color:"#060610",cursor:"pointer",letterSpacing:"2px",
        boxShadow:"0 0 16px #4fc3f755",
      }}>
        ⚔️ BATTLE AGAIN
      </button>

      <div style={{marginTop:"14px",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",color:"#303050"}}>
        Used cards are on cooldown until midnight
      </div>
    </div>
  );
}
