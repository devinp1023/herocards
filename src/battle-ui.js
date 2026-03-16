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
function DeckBuilder({collection,battleDeck,setBattleDeck,battleTier,setBattleTier,battleCooldowns,onStartBattle,notify}){
  const [rarityFilter,setRarityFilter]=useState('All');
  const [search,setSearch]=useState('');

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

  const filteredCards=[...collection]
    .filter(c=>rarityFilter==='All'||c.rarity===rarityFilter)
    .filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      const aS=isSelected(a.id)?0:1;
      const bS=isSelected(b.id)?0:1;
      if(aS!==bS)return aS-bS;
      return(RO[a.rarity]||0)-(RO[b.rarity]||0);
    });

  const battleLocked=collection.length<DECK_SIZE;
  const deckFull=battleDeck.length===DECK_SIZE;
  const anyOnCooldown=battleDeck.some(id=>isCardOnCooldown(id,battleCooldowns));
  const canStart=deckFull&&!anyOnCooldown;
  const tierInfo=TIER_INFO[battleTier-1];
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
    <div style={{paddingBottom:"160px"}}>

      {/* ── Top controls ── */}
      <div style={{padding:"24px 28px 0",background:"#060610",position:"sticky",top:0,zIndex:20,borderBottom:"1px solid #0f0f24",paddingBottom:"14px"}}>

        {/* Title */}
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:900,color:"#4fc3f7",letterSpacing:"2px",marginBottom:"14px"}}>
          ⚔️ BUILD YOUR DECK
        </div>

        {/* Difficulty tier row */}
        <div style={{marginBottom:"10px"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#505878",letterSpacing:"2px",marginBottom:"7px"}}>DIFFICULTY</div>
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
            <div style={{marginLeft:"auto",fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:"#505878"}}>
              Win <span style={{color:"#4fc3f7"}}>💎{tierRewards.winCredits} +{tierRewards.winXp}XP</span>
              <span style={{margin:"0 8px",color:"#1a1a3a"}}>·</span>
              Loss <span style={{color:"#606880"}}>💎{tierRewards.lossCredits} +{tierRewards.lossXp}XP</span>
            </div>
          </div>
        </div>

        {/* Rarity limits + filter pills */}
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          {['Legendary','Epic','Rare'].map(r=>{
            const lim=BATTLE_RARITY_LIMITS[r];
            const cnt=rarityCounts[r];
            const cfg=RC[r];
            return(
              <div key={r} style={{
                background:cnt>0?`${cfg.color}15`:"transparent",
                border:`1px solid ${cnt>0?cfg.color+"44":"#1a1a3a"}`,
                borderRadius:"7px",padding:"3px 10px",
                fontFamily:"monospace",fontSize:"13px",
                color:cnt>=lim?cfg.color:"#404060",
              }}>
                <span style={{color:cfg.color}}>{r[0]}</span>:{cnt}/{lim}
              </div>
            );
          })}
          <div style={{marginLeft:"auto",display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {['All','Legendary','Epic','Rare','Uncommon','Common'].map(r=>(
              <button key={r} onClick={()=>setRarityFilter(r)} style={{
                background:rarityFilter===r?"#4fc3f722":"transparent",
                border:`1px solid ${rarityFilter===r?"#4fc3f7":"#1a1a3a"}`,
                borderRadius:"7px",padding:"4px 10px",
                fontFamily:"'Rajdhani',sans-serif",fontSize:"13px",fontWeight:600,
                color:rarityFilter===r?"#4fc3f7":"#505878",
                cursor:"pointer",
              }}>
                {r==='All'?'All':r.slice(0,3)}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search your cards…"
          style={{
            width:"100%",boxSizing:"border-box",marginTop:"10px",
            background:"#0a0a1e",border:"1px solid #1a1a3a",
            borderRadius:"10px",padding:"8px 14px",
            color:"#d0d4e8",fontFamily:"'Rajdhani',sans-serif",fontSize:"16px",outline:"none",
          }}
        />
      </div>

      {/* ── Card grid ── */}
      <div style={{padding:"16px 28px 0"}}>
        {filteredCards.length===0&&(
          <div style={{textAlign:"center",padding:"48px 0",color:"#404060",fontFamily:"monospace",fontSize:"16px"}}>
            No cards match this filter.
          </div>
        )}
        <div className="battle-card-grid">
          {filteredCards.map(card=>{
            const selected=isSelected(card.id);
            const onCd=isCardOnCooldown(card.id,battleCooldowns);
            const disabled=!selected&&!canSelect(card);
            const cdMs=cooldownRemaining(card.id,battleCooldowns);
            const cfg=RC[card.rarity]||RC["Common"];

            return(
              <div key={card.id}
                onClick={()=>!disabled&&toggleCard(card)}
                style={{cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.35:1,transition:"transform 0.15s, opacity 0.15s"}}
                onMouseEnter={e=>{if(!disabled)e.currentTarget.style.transform="translateY(-3px)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}
              >
                {/* Card container */}
                <div style={{
                  position:"relative",aspectRatio:"201/290",borderRadius:"13px",overflow:"hidden",
                  border:selected?`2px solid #4fc3f7`:`1px solid ${cfg.color}33`,
                  boxShadow:selected?"0 0 14px #4fc3f766":"none",
                  transition:"border-color 0.15s, box-shadow 0.15s",
                }}>
                  <HeroCard card={card} fill={true} size="normal"/>

                  {/* Cooldown overlay */}
                  {onCd&&(
                    <div style={{position:"absolute",inset:0,background:"rgba(6,6,16,0.78)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"4px"}}>
                      <div style={{fontSize:"22px"}}>⏱️</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:"#808098",letterSpacing:"1px"}}>COOLDOWN</div>
                      <div style={{fontFamily:"monospace",fontSize:"13px",color:"#4fc3f7"}}>{formatCdTime(cdMs)}</div>
                    </div>
                  )}

                  {/* Selected check */}
                  {selected&&(
                    <div style={{position:"absolute",top:"6px",right:"6px",width:"20px",height:"20px",borderRadius:"50%",background:"#4fc3f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:900,color:"#060610",boxShadow:"0 0 8px #4fc3f7aa"}}>✓</div>
                  )}
                </div>

                {/* Ability label */}
                <div style={{textAlign:"center",marginTop:"5px",padding:"0 2px",fontFamily:"'Rajdhani',sans-serif",fontSize:"12px",color:card.ability?"#7ab8d4":"#303050",letterSpacing:"0.3px",minHeight:"16px",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {card.ability?`⚡ ${card.ability}`:"—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sticky tray ── */}
      <div className="battle-tray" style={{position:"sticky",bottom:0,zIndex:20,background:"#08081a",borderTop:"1px solid #12122a",padding:"10px 16px 12px"}}>

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
                style={{
                  flexShrink:0,width:"40px",height:"54px",borderRadius:"7px",overflow:"hidden",
                  border:card?(onCd?"1px solid #ef535044":`1px solid ${cfg.color}55`):"1px dashed #1a1a3a",
                  background:card?`${cfg.color}11`:"#0a0a1e",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:card?"pointer":"default",position:"relative",transition:"border-color 0.15s",
                }}
                onMouseEnter={e=>{if(card)e.currentTarget.style.borderColor="#ef5350aa";}}
                onMouseLeave={e=>{if(card)e.currentTarget.style.borderColor=onCd?"#ef535044":`${cfg.color}55`;}}
              >
                {card?(
                  <>
                    <div style={{fontSize:"20px",lineHeight:1}}>{card.emoji}</div>
                    {onCd&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>⏱️</div>}
                    {/* tiny ×  on hover handled via onMouseEnter above */}
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
          style={{
            width:"100%",
            background:canStart?"linear-gradient(135deg,#4fc3f7,#00e5ff)":"#0a0a1e",
            border:canStart?"none":"1px solid #1a1a3a",
            borderRadius:"13px",padding:"14px",
            fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:900,
            color:canStart?"#060610":"#303050",
            cursor:canStart?"pointer":"not-allowed",
            letterSpacing:"2px",
            boxShadow:canStart?"0 0 18px #4fc3f755":"none",
            transition:"all 0.2s",
          }}
        >
          {anyOnCooldown
            ?"⏱️ CARDS ON COOLDOWN"
            :deckFull
            ?"⚔️ START BATTLE"
            :`SELECT ${DECK_SIZE-battleDeck.length} MORE CARD${DECK_SIZE-battleDeck.length!==1?"S":""}`}
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
