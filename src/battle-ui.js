/* ── battle-ui.js ── */
// Session 2: Deck Builder UI + Battle Result screen

const DECK_SIZE = 10;
const BATTLE_RARITY_LIMITS = { Legendary:1, Epic:2, Rare:4, Uncommon:10, Common:10 };

const TIER_INFO = [
  {tier:1, name:'Rookie',   color:'#78909c', emoji:'🥉'},
  {tier:2, name:'Scrapper', color:'#66bb6a', emoji:'⚔️'},
  {tier:3, name:'Fighter',  color:'#42a5f5', emoji:'🛡️'},
  {tier:4, name:'Elite',    color:'#ab47bc', emoji:'💎'},
  {tier:5, name:'Champion', color:'#ffa726', emoji:'👑'},
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
function BattleTab({collection,battleDeck,setBattleDeck,battleTier,setBattleTier,battleCooldowns,onBattleComplete,notify,gainXp,isGod}){
  const [screen,setScreen]=useState('builder');
  const [battleResult,setBattleResult]=useState(null);

  const startBattle=()=>{
    const deckCards=battleDeck.map(id=>{
      const owned=collection.find(c=>c.id===id);
      return owned||ALL_CARDS.find(c=>c.id===id);
    }).filter(Boolean);

    // Random AI deck from full card pool
    const aiDeck=[...ALL_CARDS].sort(()=>Math.random()-0.5).slice(0,10);

    const result=runBattle(deckCards,aiDeck);
    const rewards=calcBattleRewards(battleTier,result.winner,0);
    onBattleComplete(result,battleDeck,battleTier,rewards);
    setBattleResult({...result,rewards,tier:battleTier});
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
      battleTier={battleTier}
      setBattleTier={setBattleTier}
      battleCooldowns={battleCooldowns}
      onStartBattle={startBattle}
      notify={notify}
    />
  );
}

/* ── DeckBuilder ── */
function DeckBuilder({collection,sorted,filter,setFilter,rarityFilter,setRarityFilter,sortBy,setSortBy,search,setSearch,packFilter,setPackFilter,rarities,types,battleDeck,setBattleDeck,battleTier,setBattleTier,battleCooldowns,onStartBattle,notify}){

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

  // Use the same sorted array from Game (filters already applied), selected cards float to top
  const displayCards=[...sorted].sort((a,b)=>{
    const aS=isSelected(a.id)?0:1;
    const bS=isSelected(b.id)?0:1;
    return aS-bS;
  });

  const battleLocked=collection.length<DECK_SIZE;
  const deckFull=battleDeck.length===DECK_SIZE;
  const anyOnCooldown=battleDeck.some(id=>isCardOnCooldown(id,battleCooldowns));
  const canStart=deckFull&&!anyOnCooldown;
  const tierRewards=BATTLE_REWARDS[battleTier];

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
    <div style={{paddingBottom:"200px"}}>

      {/* ── Top controls — mirrors Collection header ── */}
      <div style={{padding:"29px 32px 14px",background:"#060610",position:"sticky",top:0,zIndex:20,borderBottom:"1px solid #0f0f24"}}>

        {/* Title */}
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:"#4fc3f7",letterSpacing:"2px",marginBottom:"14px"}}>
          ⚔️ BUILD YOUR DECK
        </div>

        {/* Difficulty tier row */}
        <div style={{marginBottom:"12px"}}>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
            {TIER_INFO.map(t=>(
              <button key={t.tier} onClick={()=>setBattleTier(t.tier)} style={{
                background:battleTier===t.tier?`${t.color}22`:"transparent",
                border:`1px solid ${battleTier===t.tier?t.color:"#1a1a3a"}`,
                borderRadius:"9px",padding:"6px 13px",
                fontFamily:"'Orbitron',monospace",fontSize:"12px",fontWeight:700,
                color:battleTier===t.tier?t.color:"#404060",
                cursor:"pointer",letterSpacing:"0.5px",transition:"all 0.15s",
              }}>
                {t.emoji} {t.name}
              </button>
            ))}
            <div style={{marginLeft:"auto",fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:"#505878",flexShrink:0}}>
              Win <span style={{color:"#4fc3f7"}}>💎{tierRewards.winCredits} +{tierRewards.winXp}XP</span>
              <span style={{margin:"0 8px",color:"#1a1a3a"}}>·</span>
              Loss <span style={{color:"#606880"}}>💎{tierRewards.lossCredits} +{tierRewards.lossXp}XP</span>
            </div>
          </div>
        </div>

        {/* Rarity limit badges */}
        <div style={{display:"flex",gap:"6px",marginBottom:"12px",flexWrap:"wrap"}}>
          {['Legendary','Epic','Rare'].map(r=>{
            const lim=BATTLE_RARITY_LIMITS[r];
            const cnt=rarityCounts[r];
            const cfg=RC[r];
            return(
              <div key={r} style={{background:cnt>0?`${cfg.color}15`:"transparent",border:`1px solid ${cnt>0?cfg.color+"44":"#1a1a3a"}`,borderRadius:"7px",padding:"3px 10px",fontFamily:"monospace",fontSize:"13px",color:cnt>=lim?cfg.color:"#404060"}}>
                <span style={{color:cfg.color}}>{r[0]}</span>:{cnt}/{lim}
              </div>
            );
          })}
          <div style={{background:"transparent",border:"1px solid #1a1a3a",borderRadius:"7px",padding:"3px 10px",fontFamily:"monospace",fontSize:"13px",color:"#404060"}}>U/C: ∞</div>
        </div>

        {/* Pack filter — same as Collection */}
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"8px"}}>
          {[{id:0,label:"All",emoji:"📋",color:"#4fc3f7"},...Object.values(PACKS).map(p=>({id:p.id,label:p.name,emoji:p.emoji,color:p.color}))].map(p=>(
            <button key={p.id} onClick={()=>setPackFilter(p.id)} className="pack-filter-btn" style={{display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",borderRadius:"14px",background:packFilter===p.id?`${p.color}22`:"transparent",border:`1.5px solid ${packFilter===p.id?p.color:"rgba(255,255,255,0.2)"}`,color:packFilter===p.id?p.color:"#c0c4d8",fontFamily:"'Orbitron',monospace",fontSize:"13px",cursor:"pointer",fontWeight:600,letterSpacing:"0.5px",transition:"all 0.15s",whiteSpace:"nowrap"}}>
              <span>{p.emoji}</span><span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Search + sort — same as Collection */}
        <div style={{display:"flex",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." className="collection-search" style={{flex:1,minWidth:0,fontSize:"15px",marginBottom:"0"}}/>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="sort-select" style={{background:"#0a0a20",border:"1px solid #2a2a4a",borderRadius:"10px",padding:"8px 10px",color:"#ffffff",fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",cursor:"pointer",outline:"none",flexShrink:0}}>
            <option value="rarity">Rarity</option>
            <option value="name_az">A→Z</option>
            <option value="name_za">Z→A</option>
            <option value="count_hl">Most Owned</option>
            <option value="acquired_new">Newest</option>
            <option value="acquired_old">Oldest</option>
          </select>
        </div>

        {/* Rarity filter pills — same as Collection */}
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"4px"}}>
          {rarities.map(r=>{const cfg=r==="All"?{color:"#4fc3f7"}:RC[r];return<button key={r} onClick={()=>setRarityFilter(r)} className="rarity-filter-btn" style={{padding:"5px 12px",borderRadius:"20px",background:rarityFilter===r?`${cfg.color}33`:"transparent",border:`1px solid ${rarityFilter===r?cfg.color:"rgba(255,255,255,0.2)"}`,color:rarityFilter===r?cfg.color:"#c0c4d8",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",cursor:"pointer",fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap"}}>{r}</button>;})}
        </div>

        {/* Type filter pills — same as Collection */}
        <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
          {types.map(t=><button key={t} onClick={()=>setFilter(t)} className="type-filter-btn" style={{padding:"4px 12px",borderRadius:"20px",background:filter===t?"#4fc3f722":"transparent",border:`1px solid ${filter===t?"#4fc3f7":"rgba(255,255,255,0.2)"}`,color:filter===t?"#4fc3f7":"#c0c4d8",fontFamily:"'Rajdhani',sans-serif",fontSize:"13px",cursor:"pointer",fontWeight:600,transition:"all 0.15s",flexShrink:0,whiteSpace:"nowrap"}}>{t}</button>)}
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
                <CardWrapper rarity={card.rarity} onClick={()=>!disabled&&toggleCard(card)}>
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

      {/* ── Fixed tray — always visible ── */}
      <div className="battle-tray-fixed" style={{background:"#08081a",borderTop:"1px solid #12122a",padding:"10px 16px 12px"}}>

        {/* 10 deck slots */}
        <div style={{display:"flex",gap:"5px",overflowX:"auto",marginBottom:"9px",paddingBottom:"2px"}}>
          {Array.from({length:DECK_SIZE}).map((_,i)=>{
            const cardId=battleDeck[i];
            const card=cardId?(collection.find(c=>c.id===cardId)||ALL_CARDS.find(c=>c.id===cardId)):null;
            const onCd=card?isCardOnCooldown(card.id,battleCooldowns):false;
            const cfg=card?RC[card.rarity]:null;
            return(
              <div key={i}
                onClick={()=>card&&setBattleDeck(prev=>prev.filter(id=>id!==card.id))}
                title={card?`Remove ${card.name}`:`Slot ${i+1}`}
                style={{flexShrink:0,width:"40px",height:"54px",borderRadius:"7px",overflow:"hidden",border:card?(onCd?"1px solid #ef535044":`1px solid ${cfg.color}55`):"1px dashed #1a1a3a",background:card?`${cfg.color}11`:"#0a0a1e",display:"flex",alignItems:"center",justifyContent:"center",cursor:card?"pointer":"default",position:"relative",transition:"border-color 0.15s"}}
                onMouseEnter={e=>{if(card)e.currentTarget.style.borderColor="#ef5350aa";}}
                onMouseLeave={e=>{if(card)e.currentTarget.style.borderColor=onCd?"#ef535044":`${cfg.color}55`;}}
              >
                {card?(
                  <>
                    <div style={{fontSize:"20px",lineHeight:1}}>{card.emoji}</div>
                    {onCd&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>⏱️</div>}
                  </>
                ):(
                  <div style={{fontFamily:"monospace",fontSize:"13px",color:"#1a1a3a",fontWeight:700}}>{i+1}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Start battle button */}
        <button
          onClick={canStart?onStartBattle:undefined}
          style={{width:"100%",background:canStart?"linear-gradient(135deg,#4fc3f7,#00e5ff)":"#0a0a1e",border:canStart?"none":"1px solid #1a1a3a",borderRadius:"13px",padding:"14px",fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,color:canStart?"#060610":"#303050",cursor:canStart?"pointer":"not-allowed",letterSpacing:"2px",boxShadow:canStart?"0 0 18px #4fc3f755":"none",transition:"all 0.2s"}}
        >
          {anyOnCooldown?"⏱️ CARDS ON COOLDOWN":deckFull?"⚔️ START BATTLE":`SELECT ${DECK_SIZE-battleDeck.length} MORE CARD${DECK_SIZE-battleDeck.length!==1?"S":""}`}
        </button>

        {/* Deck count */}
        <div style={{textAlign:"center",marginTop:"6px",fontFamily:"monospace",fontSize:"13px",color:deckFull?"#4fc3f7":"#404060"}}>
          {battleDeck.length}/{DECK_SIZE} cards selected
          {anyOnCooldown&&<span style={{color:"#ef5350",marginLeft:"10px"}}>· cooldown active</span>}
        </div>
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
