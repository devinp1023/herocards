/* ── battle-ui.js ── */
// Session 2: Deck Builder UI + Battle Result screen

const DECK_SIZE = 10;
const BATTLE_RARITY_LIMITS = { Legendary:1, Epic:2, Rare:4, Uncommon:10, Common:10 };

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

/* ── BattleTab — orchestrates screens ── */
function BattleTab({collection,sorted,filter,setFilter,rarityFilter,setRarityFilter,sortBy,setSortBy,search,setSearch,packFilter,setPackFilter,rarities,types,battleDeck,setBattleDeck,battleTier,setBattleTier,battleCooldowns,onBattleComplete,notify,gainXp,isGod}){
  const [screen,setScreen]=useState('builder');
  const [battleResult,setBattleResult]=useState(null);

  const startBattle=(tier)=>{
    setBattleTier(tier);
    const deckCards=battleDeck.map(id=>{
      const owned=collection.find(c=>c.id===id);
      return owned||ALL_CARDS.find(c=>c.id===id);
    }).filter(Boolean);

    // Random AI deck from full card pool
    const aiDeck=[...ALL_CARDS].sort(()=>Math.random()-0.5).slice(0,10);

    const result=runBattle(deckCards,aiDeck);
    const rewards=calcBattleRewards(tier,result.winner,0);
    onBattleComplete(result,battleDeck,tier,rewards);
    setBattleResult({...result,rewards,tier});
    setScreen('result');
  };

  if(screen==='result'&&battleResult){
    return(
      <BattleResult
        result={battleResult}
        onRematch={()=>{setBattleResult(null);setScreen('builder');}}
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
  );
}

/* ── DeckBuilder ── */
function DeckBuilder({collection,sorted,filter,setFilter,rarityFilter,setRarityFilter,sortBy,setSortBy,search,setSearch,packFilter,setPackFilter,rarities,types,battleDeck,setBattleDeck,battleCooldowns,onChooseOpponent,notify}){

  const [hoveredSlot,setHoveredSlot]=useState(null);
  const [filterOpen,setFilterOpen]=useState(false);
  const [openSections,setOpenSections]=useState({pack:true,rarity:true,type:true});
  const toggleSection=s=>setOpenSections(prev=>({...prev,[s]:!prev[s]}));
  const activeFilters=[packFilter!==0,rarityFilter!=='All',filter!=='All'].filter(Boolean).length;
  const containerRef=useRef(null);
  const [isSticky,setIsSticky]=useState(false);
  useEffect(()=>{
    // Walk up DOM to find the scrollable ancestor (main-pad)
    const getScroller=el=>{
      let node=el?.parentElement;
      while(node){
        const {overflowY}=getComputedStyle(node);
        if(overflowY==='auto'||overflowY==='scroll')return node;
        node=node.parentElement;
      }
      return window;
    };
    const scroller=getScroller(containerRef.current);
    const onScroll=()=>setIsSticky((scroller===window?window.scrollY:scroller.scrollTop)>10);
    scroller.addEventListener('scroll',onScroll,{passive:true});
    return()=>scroller.removeEventListener('scroll',onScroll);
  },[]);

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
    <div ref={containerRef} style={{paddingBottom:"200px"}}>

      {/* ── Sticky top: controls + deck slots ── */}
      <div style={{position:"sticky",top:0,zIndex:20,background:"#060610",borderBottom:isSticky?"2px solid rgba(255,255,255,0.6)":"none"}}>

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

      {/* ── Deck Slots — same card size as pack summary (HeroCard size="small" = 138×186) ── */}
      <div style={{padding:isSticky?"8px 20px 10px":"16px 20px 20px",borderTop:"1px solid #0f0f24"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#a0aac0",letterSpacing:"3px",marginBottom:"12px"}}>
          YOUR DECK · {battleDeck.length}/{DECK_SIZE}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
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
        </div>
      </div>
      </div>{/* end sticky wrapper */}

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
      <div style={{padding:"29px 32px 0"}}>
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
