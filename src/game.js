function Game({uid,username,initData,onLogout,isGod=false}){
  const [tab,setTab]=useState(()=>localStorage.getItem("heroCards_tab")||"home");
  const setTabPersist=t=>{localStorage.setItem("heroCards_tab",t);setTab(t);};
  const [showPackSelect,setShowPackSelect]=useState(false);
  const [ownedAvatars,setOwnedAvatars]=useState(()=>initData.ownedAvatars||["a1"]);
  const [activeAvatar,setActiveAvatar]=useState(()=>initData.activeAvatar||"a1");
  const [showAvatarModal,setShowAvatarModal]=useState(false);
  const [xp,setXp]=useState(()=>initData.xp||0);
  const [showLevelUp,setShowLevelUp]=useState(null);
  const [earnedAchievements,setEarnedAchievements]=useState(()=>initData.earnedAchievements||[]);
  const [packsOpened,setPacksOpened]=useState(()=>initData.packsOpened||0);
  const [packTradedIds,setPackTradedIds]=useState(new Set());
  const [tradesCompleted,setTradesCompleted]=useState(()=>initData.tradesCompleted||0);
  const [pendingAchievements,setPendingAchievements]=useState([]); // {level, avatar?}
  const [coins,setCoins]=useState(initData.coins||350);
  const [collection,setCollection]=useState(initData.collection||[]);
  const [openingPack,setOpeningPack]=useState(null);
  const [selectedPack,setSelectedPack]=useState(null);
  const [packFilter,setPackFilter]=useState(0); // 0=All, 1=pack1, 2=pack2
  const [sortBy,setSortBy]=useState('rarity');
  const rarities=["All","Common","Uncommon","Rare","Epic","Legendary"];
  const types=["All",...[...new Set(ALL_CARDS.map(c=>c.type))].sort()];
  const [selectedCard,setSelectedCard]=useState(null);
  const [filter,setFilter]=useState("All");
  const [rarityFilter,setRarityFilter]=useState("All");
  const [notification,setNotification]=useState(null);
  const [questDate,setQuestDate]=useState(initData.questDate||"");
  const [questProgress,setQuestProgress]=useState(()=>initData.questProgress||{});
  const todaysQuests=getTodaysQuests();
  const today=new Date().toDateString();
  const isNewDay=questDate!==today;
  // Reset progress if it's a new day
  const activeQuestProgress=isNewDay?{}:questProgress;
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState("");
  const [showMissing,setShowMissing]=useState(false);
  const [newCardIds,setNewCardIds]=useState(new Set());
  const [expandedDesc,setExpandedDesc]=useState(false);
  const [storeTab,setStoreTab]=useState("avatars");
  const [battleDeck,setBattleDeck]=useState([]);
  const [battleTier,setBattleTier]=useState(1);
  const [battleCooldowns,setBattleCooldowns]=useState({});
  const saveTimer=useRef(null);

  const questUsed=!isNewDay&&todaysQuests.every(q=>activeQuestProgress[q.id]>=(q.req.n||1));

  // Debounced save to Firestore — skipped in god mode
  const saveData=useCallback((nc,ncol,nqd,nqp)=>{
    if(isGod)return;
    setSaving(true);
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      try{
        await db.collection("users").doc(uid).update({
          coins:nc,
          collection:ncol,
          questDate:nqd,
          questProgress:nqp||questProgress,
          ownedAvatars,
          activeAvatar,
          xp,
          earnedAchievements,
          packsOpened,
          tradesCompleted,
          lastUpdated:firebase.firestore.FieldValue.serverTimestamp()
        });
      }catch(e){console.error("Save failed:",e);}
      setSaving(false);
    },800);
  },[uid]);

  const notify=(msg,color="#4fc3f7")=>{setNotification({msg,color});setTimeout(()=>setNotification(null),2600);};

  const gainXp=(amount)=>{
    setXp(prev=>{
      const oldLevel=getLevel(prev);
      const newXp=prev+amount;
      const newLevel=getLevel(newXp);
      if(newLevel>oldLevel){
        // Check for level-up avatar unlock
        const unlockedAvatar=LEVEL_AVATARS.find(a=>a.unlocksAt===newLevel);
        setShowLevelUp({level:newLevel,avatar:unlockedAvatar||null});
        if(unlockedAvatar){
          setOwnedAvatars(owned=>[...owned,unlockedAvatar.id]);
          setActiveAvatar(unlockedAvatar.id);
        }
        // Bonus credits on level up
        const bonus=newLevel*50;
        setCoins(c=>{
          const nc=c+bonus;
          return nc;
        });
      }
      return newXp;
    });
  };

  const buyPack=(packId)=>{
    if(coins<PACK_COST){notify("Not enough credits!","#ef5350");return;}
    const nc=coins-PACK_COST;
    const newCards=[];
    const usedIds=new Set();
    let attempts=0;
    while(newCards.length<5&&attempts<50){
      attempts++;
      const c=getRandom([...usedIds],packId);
      if(!usedIds.has(c.id)){
        usedIds.add(c.id);
        newCards.push(c);
      }
    }
    setCoins(nc);setOpeningPack(newCards);
    setSelectedPack(packId);
  };

  const onPackDone=()=>{
    const newCol=[...collection];
    openingPack.forEach(card=>{
      if(packTradedIds.has(card.id))return; // already traded for credits
      const ex=newCol.find(c=>c.id===card.id);
      if(ex) ex.count=(ex.count||1)+1;
      else newCol.push({...card,count:1,acquiredAt:Date.now()});
    });
    setPackTradedIds(new Set());
    setCollection(newCol);
    const best=openingPack.reduce((a,b)=>RO[a.rarity]<RO[b.rarity]?a:b);
    if(best.rarity==="Legendary")notify(`⚡ LEGENDARY: ${best.name}!`,"#ff9800");
    else if(best.rarity==="Epic")notify(`💥 EPIC: ${best.name}!`,"#9c27b0");
    else notify(`Pack opened! +${openingPack.length} heroes`);
    // Award XP: 100 for pack + 25 per Rare/Epic/Legendary
    const bonusXp=openingPack.filter(c=>["Rare","Epic","Legendary"].includes(c.rarity)).length*XP_AWARDS.rare_card;
    gainXp(XP_AWARDS.pack+bonusXp);
    // Mark newly acquired (non-dupe) cards
    const brandNew=openingPack.filter(c=>!collection.find(col=>col.id===c.id));
    if(brandNew.length>0)setNewCardIds(prev=>new Set([...prev,...brandNew.map(c=>c.id)]));
    const newPacksOpened=packsOpened+1;
    setPacksOpened(newPacksOpened);
    checkAchievements(newCol,newPacksOpened,null,null,null,null);
    // Advance daily quests
    advanceQuest('packs');
    const newCards=openingPack.filter(c=>!collection.find(col=>col.id===c.id));
    newCards.forEach(c=>{
      advanceQuest('newcards');
      advanceQuest('rarity',{rarity:c.rarity});
      advanceQuest('alliance',{alliance:c.alliance});
      advanceQuest('types');
    });
    setOpeningPack(null);setTabPersist("collection");
    saveData(coins,newCol,questDate,questProgress);
  };

  const tradeCard=(card)=>{
    if(!card||!card.count||card.count<=1){notify("No duplicates to trade!","#ef5350");return;}
    const credits=DUPE_CREDITS[card.rarity]||0;
    const nc=coins+credits;
    const newCol=collection.map(c=>c.id===card.id?{...c,count:c.count-1}:c);
    setCoins(nc);
    setCollection(newCol);
    setSelectedCard({...card,count:card.count-1});
    gainXp(XP_AWARDS.trade);
    advanceQuest('trades');
    const newTrades=tradesCompleted+1;
    setTradesCompleted(newTrades);
    checkAchievements(newCol,null,newTrades,nc,null,null);
    notify(`Traded 1× ${card.name} for +${credits} 💎 & +${XP_AWARDS.trade} XP`,"#ffa060");
    saveData(nc,newCol,questDate,questProgress);
  };

  const onTradeDupes=(dupes)=>{
    if(!dupes||dupes.length===0)return;
    const totalCredits=dupes.reduce((s,c)=>s+DUPE_CREDITS[c.rarity],0);
    const nc=coins+totalCredits;
    setCoins(nc);
    const newTradesCompleted=tradesCompleted+dupes.length;
    setTradesCompleted(newTradesCompleted);
    setPackTradedIds(new Set(dupes.map(d=>d.id)));
    dupes.forEach(()=>{gainXp(XP_AWARDS.trade);advanceQuest('trades');});
    checkAchievements(collection,null,newTradesCompleted,nc,null,null);
    saveData(nc,collection,questDate,questProgress);
  };

  const onBattleComplete=(result,deckCardIds,tier,rewards)=>{
    // Award credits + XP
    const nc=coins+(rewards.credits||0);
    setCoins(nc);
    gainXp(rewards.xp||0);
    // Put used cards on cooldown until next midnight
    const expiry=getNextMidnight();
    setBattleCooldowns(prev=>{
      const next={...prev};
      deckCardIds.forEach(id=>{next[id]=expiry;});
      return next;
    });
    // Notify
    if(result.winner==='player'){
      notify(`⚔️ VICTORY! +${rewards.credits}💎 +${rewards.xp}XP`,"#ffd700");
    } else {
      notify(`💀 Defeat — +${rewards.credits}💎 +${rewards.xp}XP`,"#ef5350");
    }
    saveData(nc,collection,questDate,questProgress);
  };

  // Advance daily quest progress
  const advanceQuest=(type,opts={})=>{
    if(isNewDay){setQuestDate(today);setQuestProgress({});}
    const prog=isNewDay?{}:{...activeQuestProgress};
    let changed=false;
    todaysQuests.forEach(q=>{
      if((prog[q.id]||0)>=(q.req.n||1))return; // already done
      if(q.req.type!==type)return;
      // Check specific conditions
      if(type==='rarity'&&q.req.rarity!==opts.rarity)return;
      if(type==='alliance'&&q.req.alliance!==opts.alliance)return;
      prog[q.id]=(prog[q.id]||0)+1;
      changed=true;
      // Check if just completed
      if(prog[q.id]>=q.req.n){
        gainXp(q.xp);
        setCoins(c=>c+q.credits);
        notify(`✅ Quest complete: ${q.task} +${q.credits}💎`,"#ffd700");
      }
    });
    if(changed){
      setQuestProgress(prog);
      setQuestDate(today);
      saveData(coins,collection,today,prog);
    }
  };

  // Check and award achievements (tiered)
  const checkAchievements=(newCollection,newPacksOpened,newTradesCompleted,newCoins,newXp,newOwnedAvatars)=>{
    const col=newCollection||collection;
    const packs=newPacksOpened??packsOpened;
    const trades=newTradesCompleted??tradesCompleted;
    const coins_=newCoins??coins;
    const owned=newOwnedAvatars||ownedAvatars;
    const xp_=newXp??xp;
    const level=getLevel(xp_);
    const newlyEarned=[];

    const check=(id,condition)=>{
      if(condition&&!earnedAchievements.includes(id)&&!newlyEarned.includes(id)){
        newlyEarned.push(id);
      }
    };

    // Helper values
    const purchasedAvatarCount=owned.filter(id=>!id.startsWith('lv')&&id!=='a1'||(AVATARS.find(a=>a.id===id))).length;
    const typeCount=[...new Set(col.map(c=>c.type))].length;
    const pack1Pct=ALL_CARDS.filter(c=>c.pack===1).length>0?Math.round(col.filter(c=>c.pack===1).length/ALL_CARDS.filter(c=>c.pack===1).length*100):0;
    const pack2Pct=ALL_CARDS.filter(c=>c.pack===2).length>0?Math.round(col.filter(c=>c.pack===2).length/ALL_CARDS.filter(c=>c.pack===2).length*100):0;

    ACHIEVEMENTS.forEach(ach=>{
      const r=ach.req;
      if(r.type==='col')        check(ach.id, col.length>=r.n);
      if(r.type==='packs')      check(ach.id, packs>=r.n);
      if(r.type==='rarity')     check(ach.id, col.filter(c=>c.rarity===r.rarity).length>=r.n);
      if(r.type==='level')      check(ach.id, level>=r.n);
      if(r.type==='trades')     check(ach.id, trades>=r.n);
      if(r.type==='avatars')    check(ach.id, purchasedAvatarCount>=r.n);
      if(r.type==='alliance')   check(ach.id, col.filter(c=>c.alliance===r.alliance).length>=r.n);
      if(r.type==='types')      check(ach.id, typeCount>=r.n);
      if(r.type==='pack')       check(ach.id, r.pack===1?pack1Pct>=r.pct:pack2Pct>=r.pct);
    });

    if(newlyEarned.length>0){
      const newEarned=[...earnedAchievements,...newlyEarned];
      setEarnedAchievements(newEarned);
      setPendingAchievements(q=>[...q,...newlyEarned]);
      let bonusXp=0, bonusCredits=0;
      newlyEarned.forEach(id=>{
        const ach=ACHIEVEMENTS.find(a=>a.id===id);
        if(ach){bonusXp+=ach.xp;bonusCredits+=ach.credits;}
      });
      if(bonusXp>0) gainXp(bonusXp);
      if(bonusCredits>0) setCoins(c=>c+bonusCredits);
    }
  }

  const earnCoins=()=>{
    if(questUsed){notify("Mission already complete!","#ef5350");return;}
    const nc=coins+80;setCoins(nc);setQuestDate(today);
    gainXp(XP_AWARDS.daily);
    checkAchievements(null,null,null,nc,null,null);
    notify("+80 credits & +50 XP! ⚡","#4caf50");
    saveData(nc,collection,today,questProgress);
  };

  let filtered=collection;
  if(packFilter!==0)filtered=filtered.filter(c=>c.pack===packFilter);
  if(filter!=="All")filtered=filtered.filter(c=>c.type===filter);
  if(rarityFilter!=="All")filtered=filtered.filter(c=>c.rarity===rarityFilter);
  if(search)filtered=filtered.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));
  const sorted=[...filtered].sort((a,b)=>{
    if(sortBy==='rarity') return (RO[a.rarity]||0)-(RO[b.rarity]||0)||a.name.localeCompare(b.name);
    if(sortBy==='name_az') return a.name.localeCompare(b.name);
    if(sortBy==='name_za') return b.name.localeCompare(a.name);
    if(sortBy==='count_hl') return (b.count||1)-(a.count||1);
    if(sortBy==='acquired_new') return (b.acquiredAt||0)-(a.acquiredAt||0);
    if(sortBy==='acquired_old') return (a.acquiredAt||0)-(b.acquiredAt||0);
    return 0;
  });
  const statsByRarity=Object.keys(RC).map(r=>({r,count:collection.filter(c=>c.rarity===r).length,total:ALL_CARDS.filter(c=>c.rarity===r).length,cfg:RC[r]}));

  return(
    <div style={{minHeight:"100vh",background:"#060610",color:"#d0d4e8"}}>
      {notification&&<div style={{position:"fixed",top:"18px",left:"50%",transform:"translateX(-50%)",background:"#0a0a20",border:`1px solid ${notification.color}`,color:notification.color,padding:"12px 23px",borderRadius:"23px",fontFamily:"'Orbitron',monospace",fontSize:"17px",zIndex:400,animation:"slideDown 0.3s ease-out",whiteSpace:"nowrap",boxShadow:`0 4px 20px ${notification.color}44`}}>{notification.msg}</div>}

      {/* Header */}
      <div className="header-bar" style={{background:"linear-gradient(180deg,#0d0d22,#060610)",padding:"17px 29px",borderBottom:"1px solid #0f0f24",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:300,transform:"translateZ(0)"}}>
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"34px",fontWeight:900,letterSpacing:"3.4px",color:"#4fc3f7",animation:"glow 3s ease-in-out infinite"}}>HERO CARDS</div>
          <div style={{fontSize:"18px",color:"#c8ccde",letterSpacing:"2.3px",fontFamily:"monospace",display:"flex",alignItems:"center",gap:"10px"}}>
            <span>{username.toUpperCase()}</span>
            {saving&&<Spinner size={8} color="#4fc3f7"/>}
            {saving&&<span>SAVING</span>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"13px"}}>
          <div style={{background:"#0a0a20",border:"1px solid #4fc3f733",borderRadius:"32px",padding:"8px 20px",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"21px"}}>💎</span>
            <span style={{fontFamily:"'Orbitron',monospace",color:"#4fc3f7",fontWeight:700,fontSize:"28px"}}>{coins}</span>
          </div>
          <button onClick={onLogout} title="Sign out" className="header-signout-btn" style={{background:"transparent",border:"1px solid #1a1a3a",borderRadius:"10px",padding:"8px 17px",color:"#c8ccde",cursor:"pointer",fontSize:"20px",display:"flex",alignItems:"center",gap:"8px",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,letterSpacing:"1px"}}><span className="header-signout-text">🚪 </span>SIGN OUT</button>
        </div>
      </div>

      <div style={{display:"flex",height:`calc(100vh - ${isGod?86:57}px)`}}>
        <Sidebar tab={tab} setTab={setTabPersist} selectedCard={selectedCard} collection={collection} isGod={isGod}/>
        <div className="main-pad" style={{flex:1,overflowY:"auto",height:"100%",isolation:"isolate"}}>

          {/* HOME */}
          {tab==="home"&&!showPackSelect&&(
            <div style={{padding:"48px 40px",animation:"fadeIn 0.3s ease-out",maxWidth:"1200px",margin:"0 auto"}}>

              {/* User profile section */}
              <div className="profile-card" style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"56px",background:"#0a0a1e",borderRadius:"28px",padding:"28px 32px",border:"1px solid #12122a",flexWrap:"wrap"}}>
                {/* Avatar - clickable */}
                <div onClick={()=>setShowAvatarModal(true)} className="profile-avatar" style={{width:"100px",height:"100px",borderRadius:"50%",background:"linear-gradient(135deg,#1a1a3a,#2a2a5a)",border:"3px solid #4fc3f755",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"transform 0.2s,border-color 0.2s",position:"relative"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.08)";e.currentTarget.style.borderColor="#4fc3f7";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.borderColor="#4fc3f755";}}>
                  <span className="profile-avatar-emoji" style={{fontSize:"52px"}}>{(AVATARS.find(a=>a.id===activeAvatar)||LEVEL_AVATARS.find(a=>a.id===activeAvatar)||AVATARS[0]).emoji}</span>
                  <div style={{position:"absolute",bottom:"0px",right:"0px",width:"26px",height:"26px",borderRadius:"50%",background:"#4fc3f7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px"}}>✏️</div>
                </div>
                {/* Username + level */}
                <div className="profile-info" style={{flex:1,minWidth:0}}>
                  <div className="profile-username" style={{fontFamily:"'Orbitron',monospace",fontSize:"28px",fontWeight:900,color:"#ffffff",letterSpacing:"1px",marginBottom:"8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{username.toUpperCase()}</div>
                  {(()=>{
                    const level=getLevel(xp);
                    const xpInLevel=getXpForCurrentLevel(xp);
                    const xpNeeded=getXpNeededForNextLevel(xp);
                    const pct=xpNeeded>0?Math.min((xpInLevel/xpNeeded)*100,100):100;
                    return(<>
                      <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"10px"}}>
                        <div className="profile-level-badge" style={{background:"#4fc3f722",border:"1px solid #4fc3f755",borderRadius:"8px",padding:"4px 12px",fontFamily:"'Orbitron',monospace",fontSize:"30px",color:"#4fc3f7",fontWeight:700}}>
                          ⭐ LEVEL {level}
                        </div>
                        <div className="profile-cards-count" style={{fontSize:"30px",color:"#a0a8c0",fontFamily:"monospace"}}>
                          {collection.length}/{ALL_CARDS.length} cards
                        </div>
                      </div>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                          <span className="profile-xp-text" style={{fontSize:"25px",color:"#a0a8c0",fontFamily:"monospace"}}>{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
                          {level<100&&<span className="profile-xp-text" style={{fontSize:"25px",color:"#4fc3f788",fontFamily:"monospace"}}>LVL {level+1}</span>}
                          {level===100&&<span className="profile-xp-text" style={{fontSize:"25px",color:"#ff9800",fontFamily:"monospace"}}>MAX LEVEL</span>}
                        </div>
                        <div style={{height:"8px",background:"#0f0f24",borderRadius:"4px",border:"1px solid rgba(255,255,255,0.15)"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#4fc3f7,#00e5ff)",borderRadius:"4px",transition:"width 0.5s",boxShadow:"0 0 8px #4fc3f766"}}/>
                        </div>
                      </div>
                    </>);
                  })()}
                </div>
                {/* Credits */}
                <div className="profile-credits" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",flexShrink:0}}>
                  <div className="profile-credits-amount" style={{fontFamily:"'Orbitron',monospace",fontSize:"32px",fontWeight:900,color:"#4fc3f7",lineHeight:1}}>{coins.toLocaleString()}</div>
                  <div style={{fontSize:"13px",color:"#a0a8c0",fontFamily:"monospace"}}>💎 CREDITS</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{display:"flex",flexDirection:"column",gap:"22px",marginBottom:"56px"}}>
                <button onClick={()=>setShowPackSelect(true)} className="home-openpack-btn" style={{
                  width:"100%",background:"linear-gradient(135deg,#4fc3f7,#00e5ff)",
                  border:"none",borderRadius:"28px",padding:"42px",
                  fontFamily:"'Orbitron',monospace",fontSize:"39px",fontWeight:900,
                  color:"#060610",cursor:"pointer",letterSpacing:"3px",
                  boxShadow:"0 0 50px #4fc3f755",animation:"powerUp 2s ease-in-out infinite",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"22px",
                }}>
                  🃏 OPEN A PACK
                </button>
                <div style={{display:"flex",gap:"22px",width:"100%"}}>
                  <button onClick={()=>setTabPersist("store")} className="home-store-btn" style={{
                    flex:1,background:"linear-gradient(135deg,#ff9800,#ffc04a)",
                    border:"none",borderRadius:"22px",padding:"31px",
                    fontFamily:"'Orbitron',monospace",fontSize:"28px",fontWeight:900,
                    color:"#060610",cursor:"pointer",letterSpacing:"2px",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",
                  }}>
                    🛒 STORE
                  </button>
                  <button onClick={()=>setTabPersist("quests")} className="home-daily-btn" style={{
                    flex:1,background:"transparent",
                    border:`2px solid ${questUsed?"#1a1a3a":"#4caf5066"}`,
                    borderRadius:"16px",padding:"22px",
                    fontFamily:"'Orbitron',monospace",fontSize:"22px",
                    color:questUsed?"#505878":"#4caf50",
                    cursor:"pointer",letterSpacing:"1px",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",
                  }}>
                    {questUsed?"✓ QUESTS DONE":"⚡ DAILY QUESTS"}
                    {(()=>{const done=todaysQuests.filter(q=>(activeQuestProgress[q.id]||0)>=(q.req.n||1)).length;return<span style={{fontFamily:"monospace",fontSize:"16px",color:"#a0c8a0",marginLeft:"6px"}}>{done}/3</span>})()}
                  </button>
                </div>
              </div>

              {/* Pack stats */}
              <div className="home-pack-stats" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:"28px"}}>
                {Object.values(PACKS).map(pack=>{
                  const packCards=ALL_CARDS.filter(c=>c.pack===pack.id);
                  const packOwned=collection.filter(c=>c.pack===pack.id);
                  const statsByRarity=Object.keys(RC).map(r=>({r,count:packOwned.filter(c=>c.rarity===r).length,total:packCards.filter(c=>c.rarity===r).length,cfg:RC[r]}));
                  return(
                    <div key={pack.id} style={{background:"#0a0a1e",borderRadius:"22px",padding:"34px",border:`1px solid ${pack.color}33`}}>
                      <div style={{display:"flex",alignItems:"center",gap:"17px",marginBottom:"28px"}}>
                        <span style={{fontSize:"42px"}}>{pack.emoji}</span>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"22px",color:pack.color,letterSpacing:"1px",fontWeight:700}}>{pack.name}</div>
                        <div style={{marginLeft:"auto",fontFamily:"monospace",fontSize:"21px",color:`${pack.color}88`}}>{packOwned.length}/{packCards.length}</div>
                      </div>
                      {statsByRarity.map(({r,count,total,cfg})=>(
                        <div key={r} style={{display:"flex",alignItems:"center",marginBottom:"17px"}}>
                          <div style={{color:cfg.color,fontFamily:"'Rajdhani',sans-serif",fontSize:"22px",fontWeight:600,width:"154px"}}>{r}</div>
                          <div style={{flex:1,height:"10px",background:"#0f0f24",borderRadius:"6px",margin:"0 12px"}}>
                            <div style={{width:`${total?Math.min((count/total)*100,100):0}%`,height:"100%",background:cfg.color,borderRadius:"6px",transition:"width 0.5s"}}/>
                          </div>
                          <div style={{color:"#c0c4d8",fontSize:"21px",fontFamily:"monospace",width:"67px",textAlign:"right"}}>{count}/{total}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PACK SELECT SCREEN */}
          {tab==="home"&&showPackSelect&&(
            <div style={{padding:"39px 31px",animation:"fadeIn 0.3s ease-out",maxWidth:"700px",margin:"0 auto"}}>
              <button onClick={()=>setShowPackSelect(false)} style={{background:"transparent",border:"1px solid #1a1a3a",borderRadius:"11px",padding:"11px 25px",color:"#c8ccde",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"17px",letterSpacing:"1px",marginBottom:"34px"}}>← BACK</button>
              <div className="pack-select-title" style={{fontFamily:"'Orbitron',monospace",fontSize:"31px",fontWeight:900,color:"#4fc3f7",letterSpacing:"2px",marginBottom:"11px",textAlign:"center",animation:"glow 3s ease-in-out infinite"}}>CHOOSE A PACK</div>
              <div className="pack-select-subtitle" style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",color:"#c0c4d8",textAlign:"center",marginBottom:"45px",letterSpacing:"1px"}}>Each pack costs 💎{PACK_COST} credits</div>
              <div style={{display:"flex",flexDirection:"column",gap:"28px"}}>
                {Object.values(PACKS).map(pack=>{
                  const ownedCount=collection.filter(c=>c.pack===pack.id).length;
                  const totalCount=ALL_CARDS.filter(c=>c.pack===pack.id).length;
                  const pct=Math.round((ownedCount/totalCount)*100);
                  return(
                    <div key={pack.id} className="pack-select-card" style={{
                      background:pack.grad,border:`2px solid ${pack.color}55`,borderRadius:"28px",
                      padding:"39px 45px",display:"flex",alignItems:"center",gap:"34px",
                      boxShadow:`0 0 24px ${pack.glow}`,cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 0 40px ${pack.glow}`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 0 24px ${pack.glow}`;}}>
                      <div style={{fontSize:"90px",flexShrink:0}}>{pack.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"25px",fontWeight:700,color:pack.color,letterSpacing:"1px",marginBottom:"6px"}}>{pack.name}</div>
                        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"18px",color:"#d0d4e8",marginBottom:"14px"}}>{pack.subtitle}</div>
                        <div style={{height:"6px",background:"rgba(0,0,0,0.3)",borderRadius:"3px",marginBottom:"8px"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:pack.color,borderRadius:"3px",transition:"width 0.5s",boxShadow:`0 0 6px ${pack.color}`}}/>
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:"15px",color:`${pack.color}99`}}>{ownedCount}/{totalCount} collected · {pct}%</div>
                      </div>
                      <button
                        onClick={e=>{e.stopPropagation();buyPack(pack.id);setShowPackSelect(false);}}
                        disabled={coins<PACK_COST}
                        className="pack-open-btn"
                        style={{
                          background:coins>=PACK_COST?`linear-gradient(135deg,${pack.color},${pack.color}bb)`:"#1a1a3a",
                          border:"none",borderRadius:"17px",padding:"22px 39px",
                          fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:700,
                          color:coins>=PACK_COST?"#060610":"#c8d0e0",
                          cursor:coins>=PACK_COST?"pointer":"not-allowed",
                          letterSpacing:"1px",flexShrink:0,
                          boxShadow:coins>=PACK_COST?`0 0 16px ${pack.glow}`:"none",
                          whiteSpace:"nowrap",
                        }}>
                        OPEN 💎{PACK_COST}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLLECTION */}
          {tab==="collection"&&(
            <div style={{padding:"29px 32px",animation:"fadeIn 0.3s ease-out"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
                  <div className="collection-header" style={{fontFamily:"'Orbitron',monospace",color:"#4fc3f7",fontSize:"25px",fontWeight:700}}>{collection.length}/{ALL_CARDS.length}</div>
                  <div style={{fontSize:"18px",color:"#d8dcea",fontFamily:"monospace"}}>{collection.reduce((a,c)=>a+(c.count||1),0)} total</div>
                </div>
                {/* View toggle */}
                <div className="view-toggle" style={{display:"flex",background:"#0a0a1e",borderRadius:"12px",border:"1px solid #1a1a3a",overflow:"hidden"}}>
                  <button onClick={()=>setShowMissing(false)} style={{
                    padding:"10px 22px",border:"none",cursor:"pointer",
                    background:!showMissing?"#4fc3f7":"transparent",
                    color:!showMissing?"#060610":"#c0c4d8",
                    fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700,
                    letterSpacing:"1px",transition:"all 0.15s",
                  }}>📋 OWNED</button>
                  <button onClick={()=>setShowMissing(true)} style={{
                    padding:"10px 22px",border:"none",cursor:"pointer",
                    background:showMissing?"#4fc3f7":"transparent",
                    color:showMissing?"#060610":"#c0c4d8",
                    fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700,
                    letterSpacing:"1px",transition:"all 0.15s",
                  }}>👀 MISSING</button>
                </div>
              </div>
              
              {/* Pack filter */}
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"12px"}}>
                {[{id:0,label:"All",emoji:"📋",color:"#4fc3f7"},...Object.values(PACKS).map(p=>({id:p.id,label:p.name,emoji:p.emoji,color:p.color}))].map(p=>(
                  <button key={p.id} onClick={()=>setPackFilter(p.id)} className="pack-filter-btn" style={{
                    display:"flex",alignItems:"center",gap:"6px",
                    padding:"8px 14px",borderRadius:"14px",
                    background:packFilter===p.id?`${p.color}22`:"transparent",
                    border:`1.5px solid ${packFilter===p.id?p.color:"rgba(255,255,255,0.2)"}`,
                    color:packFilter===p.id?p.color:"#c0c4d8",
                    fontFamily:"'Orbitron',monospace",fontSize:"13px",cursor:"pointer",
                    fontWeight:600,letterSpacing:"0.5px",transition:"all 0.15s",
                    whiteSpace:"nowrap",
                  }}>
                    <span>{p.emoji}</span><span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Search row */}
              <div style={{display:"flex",gap:"8px",marginBottom:"8px",alignItems:"center"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search..." className="collection-search" style={{flex:1,minWidth:0,fontSize:"15px",marginBottom:"0"}}/>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} className="sort-select" style={{
                  background:"#0a0a20",border:"1px solid #2a2a4a",borderRadius:"10px",
                  padding:"8px 10px",color:"#ffffff",fontFamily:"'Rajdhani',sans-serif",
                  fontSize:"15px",cursor:"pointer",outline:"none",flexShrink:0,
                }}>
                  <option value="rarity">Rarity</option>
                  <option value="name_az">A→Z</option>
                  <option value="name_za">Z→A</option>
                  <option value="count_hl">Most Owned</option>
                  <option value="acquired_new">Newest</option>
                  <option value="acquired_old">Oldest</option>
                </select>
              </div>

              {/* Rarity filter row */}
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"8px"}}>
                {rarities.map(r=>{const cfg=r==="All"?{color:"#4fc3f7"}:RC[r];return<button key={r} onClick={()=>setRarityFilter(r)} className="rarity-filter-btn" style={{padding:"5px 12px",borderRadius:"20px",background:rarityFilter===r?`${cfg.color}33`:"transparent",border:`1px solid ${rarityFilter===r?cfg.color:"rgba(255,255,255,0.2)"}`,color:rarityFilter===r?cfg.color:"#c0c4d8",fontFamily:"'Rajdhani',sans-serif",fontSize:"14px",cursor:"pointer",fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap"}}>{r}</button>;})}
              </div>

              {/* Type filter row — scrollable on mobile */}
              <div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"4px",marginBottom:"16px",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
                {types.map(t=><button key={t} onClick={()=>setFilter(t)} className="type-filter-btn" style={{padding:"4px 12px",borderRadius:"20px",background:filter===t?"#4fc3f722":"transparent",border:`1px solid ${filter===t?"#4fc3f7":"rgba(255,255,255,0.2)"}`,color:filter===t?"#4fc3f7":"#c0c4d8",fontFamily:"'Rajdhani',sans-serif",fontSize:"13px",cursor:"pointer",fontWeight:600,transition:"all 0.15s",flexShrink:0,whiteSpace:"nowrap"}}>{t}</button>)}
              </div>

              {/* MISSING VIEW */}
              {showMissing&&(()=>{
                // Apply pack/rarity/type/search filters to ALL_CARDS, then show unowned
                let missingCards=ALL_CARDS.filter(ac=>!collection.find(c=>c.id===ac.id));
                if(packFilter!==0)missingCards=missingCards.filter(c=>c.pack===packFilter);
                if(rarityFilter!=="All")missingCards=missingCards.filter(c=>c.rarity===rarityFilter);
                if(filter!=="All")missingCards=missingCards.filter(c=>c.type===filter);
                // Sort by rarity order then id
                missingCards.sort((a,b)=>RO[a.rarity]-RO[b.rarity]||a.id-b.id);
                return missingCards.length===0?(
                  <div style={{textAlign:"center",padding:"80px 0",fontFamily:"'Orbitron',monospace",fontSize:"22px",color:"#4fc3f7"}}>
                    🎉 No missing cards{packFilter||rarityFilter!=="All"||filter!=="All"?" in this filter":""} — impressive!
                  </div>
                ):(
                  <>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"18px",color:"#a0a8c0",marginBottom:"20px"}}>
                      {missingCards.length} cards still to collect
                    </div>
                    <div className="collection-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"28px"}}>
                      {missingCards.map((card)=>(
                        <div key={card.id}>
                          <MissingCard card={card}/>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* OWNED VIEW */}
              {!showMissing&&(sorted.length===0?(
                <div style={{textAlign:"center",color:"#a8b0c8",padding:"97px 0px",fontFamily:"'Orbitron',monospace",fontSize:"21px"}}>
                  {collection.length===0?"No heroes yet. Open a pack!":"No matches found."}
                </div>
              ):(
                <div className="collection-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"28px"}}>
                  {sorted.map((card,i)=>(
                    <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"7px"}}>
                      <CardWrapper rarity={card.rarity} contain="layout" onClick={()=>{setNewCardIds(prev=>{const n=new Set(prev);n.delete(card.id);return n;});setExpandedDesc(false);setSelectedCard(card);setTabPersist("detail");}}>
                        <HeroCard card={card} size="normal" fill/>
                        {newCardIds.has(card.id)&&(
                          <div style={{position:"absolute",top:"6px",left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#00e676,#69f0ae)",borderRadius:"6px",padding:"3px 10px",fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#003300",fontWeight:900,letterSpacing:"1px",pointerEvents:"none",zIndex:10,whiteSpace:"nowrap",boxShadow:"0 0 8px #00e67688"}}>NEW</div>
                        )}
                      </CardWrapper>
                      {card.count>1&&(
                        <div style={{background:"#ff6b3522",border:"1px solid #ff6b3577",borderRadius:"8px",padding:"3px 14px",fontFamily:"'Orbitron',monospace",fontSize:"15px",color:"#ff6b35",fontWeight:700,letterSpacing:"1px"}}>
                          ×{card.count-1} {card.count-1===1?"DUPE":"DUPES"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* DETAIL */}
          {tab==="detail"&&selectedCard&&(()=>{
            const card=selectedCard,cfg=RC[card.rarity],tc=TYPE_COLORS[card.type]||"#888";
            const alliance=card.alliance&&(ALLIANCE_COLORS[card.alliance]||ALLIANCE_COLORS["Hero"]);
            return(
              <div style={{padding:"34px 48px",animation:"fadeIn 0.3s ease-out",maxWidth:"1500px",margin:"0 auto"}}>

                {/* Back button top left */}
                <button onClick={()=>setTabPersist("collection")} style={{background:"transparent",border:"2px solid rgba(255,255,255,0.4)",borderRadius:"13px",padding:"13px 28px",color:"#ffffff",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"18px",letterSpacing:"1.2px",marginBottom:"39px",display:"inline-flex",alignItems:"center",gap:"8px"}}>
                  ← BACK
                </button>

                <div className="detail-flex" style={{display:"flex",gap:"67px",alignItems:"flex-start",flexWrap:"wrap",justifyContent:"flex-start"}}>

                  {/* Card — fill inside fixed-width aspect-ratio container */}
                  <div className="detail-card" style={{flexShrink:0,width:"320px"}}>
                    <CardWrapper rarity={card.rarity}>
                      <HeroCard card={card} size="normal" fill showShine/>
                    </CardWrapper>
                  </div>

                  {/* Info panel */}
                  <div className="detail-info" style={{flex:"1 1 500px",display:"flex",flexDirection:"column",gap:"34px"}}>

                    {/* Name + meta */}
                    <div>
                      <div className="detail-name" style={{fontFamily:"'Orbitron',monospace",fontSize:"59px",color:"#ffffff",fontWeight:900,lineHeight:1.1,marginBottom:"17px"}}>{card.name}</div>
                      <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",marginBottom:"20px"}}>
                        <div style={{color:cfg.color,fontFamily:"'Orbitron',monospace",fontSize:"25px",fontWeight:700}}>{card.rarity}</div>
                        <div style={{color:"#c8d0e0",fontSize:"25px"}}>·</div>
                        <div style={{color:"#c0c4d8",fontFamily:"monospace",fontSize:"22px"}}>#{String(card.id).padStart(3,"0")}</div>
                        {alliance&&<div style={{background:alliance.bg,border:`1px solid ${alliance.border}`,borderRadius:"11px",padding:"6px 20px",fontFamily:"'Orbitron',monospace",fontSize:"18px",color:alliance.color,fontWeight:700}}>{alliance.icon} {card.alliance}</div>}
                        <div style={{background:`${tc}18`,border:`1px solid ${tc}44`,borderRadius:"11px",padding:"6px 20px",color:tc,fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",fontWeight:700,letterSpacing:"1px"}}>{TYPE_ICONS[card.type]} {card.type.toUpperCase()}</div>
                      </div>
                      {(()=>{
                        const isLong=card.desc&&card.desc.length>180;
                        return(
                          <div style={{marginBottom:"8px"}}>
                            <div style={{
                              fontSize:"28px",color:"#d8dcea",fontStyle:"italic",lineHeight:1.7,fontFamily:"'Rajdhani',sans-serif",
                              maxHeight:expandedDesc||!isLong?"none":"108px",
                              overflow:"hidden",
                              position:"relative",
                            }}>
                              {card.desc}
                              {!expandedDesc&&isLong&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:"54px",background:"linear-gradient(0deg,#060618 0%,transparent 100%)"}}/>}
                            </div>
                            {isLong&&(
                              <button onClick={()=>setExpandedDesc(e=>!e)} style={{background:"transparent",border:"1px solid #2a2a4a",borderRadius:"6px",padding:"6px 18px",color:"#4fc3f7",fontFamily:"'Orbitron',monospace",fontSize:"13px",cursor:"pointer",marginTop:"10px",letterSpacing:"1px"}}>
                                {expandedDesc?"▲ SHOW LESS":"▼ READ MORE"}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Stats */}
                    <div style={{display:"flex",flexDirection:"column",gap:"22px"}}>
                      {[["⚡ POWER",card.power,"#ff5722"],["🛡️ DEFENSE",card.defense,"#42a5f5"],["💨 SPEED",card.speed,"#ffeb3b"]].map(([label,val,color])=>(
                        <div key={label}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"11px"}}>
                            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"25px",color:"#d0d4e8",letterSpacing:"1px"}}>{label}</span>
                            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"34px",color,fontWeight:900}}>{val}</span>
                          </div>
                          <div style={{height:"14px",background:"#0f0f24",borderRadius:"7px"}}>
                            <div style={{width:`${val}%`,height:"100%",background:`linear-gradient(90deg,${color}66,${color})`,borderRadius:"7px",transition:"width 0.8s",boxShadow:`0 0 8px ${color}66`}}/>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Trade duplicates */}
                    {card.count>1&&(
                      <div style={{background:"#1a0f08",border:"1px solid #ff6b3544",borderRadius:"20px",padding:"28px 34px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"22px"}}>
                        <div>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",color:"#ff6b35",letterSpacing:"1px",marginBottom:"8px"}}>DUPLICATES: ×{card.count-1}</div>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"22px",color:"#d0d4e8"}}>Trade 1 copy for {DUPE_CREDITS[card.rarity]} 💎</div>
                        </div>
                        <button onClick={()=>tradeCard(collection.find(c=>c.id===card.id))} style={{background:"linear-gradient(135deg,#ff6b35,#ff9060)",border:"none",borderRadius:"14px",padding:"20px 34px",fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:"1px",whiteSpace:"nowrap"}}>
                          TRADE +{DUPE_CREDITS[card.rarity]}💎
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          {/* STORE */}
          {tab==="store"&&(()=>{
            // Pick today's card store items using date seed (same for all users)
            const cardSeed=parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''));
            const legendaries=ALL_CARDS.filter(c=>c.rarity==="Legendary");
            const rares=ALL_CARDS.filter(c=>c.rarity==="Rare");
            const epics=ALL_CARDS.filter(c=>c.rarity==="Epic");
            const dailyLegendary=legendaries[((cardSeed*1234567)>>>0)%legendaries.length];
            const dailyRare=rares[((cardSeed*7654321)>>>0)%rares.length];
            const dailyEpic=epics[((cardSeed*3141592)>>>0)%epics.length];
            const LEGENDARY_PRICE=8000;
            const EPIC_PRICE=5000;
            const RARE_PRICE=3000;

            // Countdown to reset
            const now=new Date();
            const midnight=new Date(now);midnight.setHours(24,0,0,0);
            const msLeft=midnight-now;
            const hLeft=Math.floor(msLeft/3600000);
            const mLeft=Math.floor((msLeft%3600000)/60000);

            return(
              <div style={{padding:"56px 34px",animation:"fadeIn 0.3s ease-out",maxWidth:"1600px",margin:"0 auto"}}>
                {/* Store header */}
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"48px",fontWeight:900,color:"#ff9800",letterSpacing:"2px",marginBottom:"11px",animation:"glow 3s ease-in-out infinite"}}>🛒 STORE</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"29px",color:"#c0c4d8",marginBottom:"39px"}}>You have <span style={{color:"#4fc3f7",fontWeight:700}}>💎 {coins}</span> credits.</div>

                {/* Tab switcher */}
                <div style={{display:"flex",background:"#0a0a1e",borderRadius:"20px",border:"1px solid #1a1a3a",overflow:"hidden",marginBottom:"50px",width:"fit-content"}}>
                  {[{id:"avatars",label:"🧙 Avatar Store"},{id:"cards",label:"🃏 Card Store"}].map(t=>(
                    <button key={t.id} onClick={()=>setStoreTab(t.id)} style={{
                      padding:"20px 45px",border:"none",cursor:"pointer",
                      background:storeTab===t.id?"#ff9800":"transparent",
                      color:storeTab===t.id?"#060610":"#c0c4d8",
                      fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:700,
                      letterSpacing:"1px",transition:"all 0.15s",
                    }}>{t.label}</button>
                  ))}
                </div>

                {/* ══ AVATAR STORE ══ */}
                {storeTab==="avatars"&&<>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"25px",color:"#c0c4d8",marginBottom:"45px"}}>Purchase avatars to show off on your profile.</div>

                  {/* Featured daily deal */}
                  {(()=>{
                    const seed=parseInt(new Date().toISOString().slice(0,10).replace(/-/g,''));
                    const purchaseable=AVATARS;
                    const featuredIdx=((seed*2654435761)>>>0)%purchaseable.length;
                    const featured=purchaseable[featuredIdx];
                    const discount=0.4;
                    const originalPrice=featured.price;
                    const salePrice=Math.floor(originalPrice*(1-discount));
                    const owned=ownedAvatars.includes(featured.id);
                    const isActive=activeAvatar===featured.id;
                    const tc=AVATAR_TIER_COLORS[featured.tier];
                    const canAfford=coins>=salePrice;
                    return(
                      <div style={{marginBottom:"63px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"31px"}}>
                          <div style={{height:"1px",flex:1,background:"#ff980033"}}/>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:"#ff9800",letterSpacing:"2px",fontWeight:700}}>🔥 FEATURED DEAL</div>
                          <div style={{height:"1px",flex:1,background:"#ff980033"}}/>
                        </div>
                        <div className="featured-deal" style={{background:"linear-gradient(135deg,#1a0f00,#2a1800)",border:"2px solid #ff9800",borderRadius:"28px",padding:"39px 45px",display:"flex",alignItems:"center",gap:"39px",flexWrap:"nowrap",boxShadow:"0 0 40px #ff980033",position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,152,0,0.06) 50%,transparent 60%)",animation:"shimmer 3s ease-in-out infinite",pointerEvents:"none"}}/>
                          <div style={{width:"168px",height:"168px",borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${tc.bg},#1a1a3a)`,border:`3px solid ${tc.color}`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${tc.color}66`}}>
                            <span style={{fontSize:"90px"}}>{featured.emoji}</span>
                          </div>
                          <div style={{flex:1,minWidth:"280px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"11px",flexWrap:"wrap"}}>
                              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"34px",color:"#ffffff",fontWeight:900}}>{featured.name}</div>
                              <div style={{background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"8px",padding:"4px 14px",fontFamily:"'Orbitron',monospace",fontSize:"17px",color:tc.color,fontWeight:700}}>{featured.tier}</div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"17px",flexWrap:"wrap"}}>
                              <span style={{fontFamily:"'Orbitron',monospace",fontSize:"39px",color:"#ff9800",fontWeight:900}}>💎 {salePrice.toLocaleString()}</span>
                              <span style={{fontFamily:"monospace",fontSize:"25px",color:"#505878",textDecoration:"line-through"}}>💎 {originalPrice.toLocaleString()}</span>
                              <span style={{background:"#ff980022",border:"1px solid #ff980066",borderRadius:"8px",padding:"6px 17px",fontFamily:"'Orbitron',monospace",fontSize:"20px",color:"#ff9800",fontWeight:700}}>40% OFF</span>
                            </div>
                            <div style={{fontFamily:"monospace",fontSize:"21px",color:"#c0c4d8"}}>⏱ Resets in <span style={{color:"#ff9800",fontWeight:700}}>{hLeft}h {mLeft}m</span></div>
                          </div>
                          <div style={{flexShrink:0}}>
                            {isActive&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"22px",color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"14px",padding:"20px 34px",fontWeight:700}}>✓ ACTIVE</div>}
                            {owned&&!isActive&&<button onClick={()=>{setActiveAvatar(featured.id);saveData(coins,collection,questDate,questProgress);notify(`Avatar changed to ${featured.name}!`,"#ff9800");}} style={{background:`linear-gradient(135deg,${tc.color},${tc.color}bb)`,border:"none",borderRadius:"14px",padding:"20px 39px",fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:700,color:"#060610",cursor:"pointer"}}>EQUIP</button>}
                            {!owned&&<button onClick={()=>{if(!canAfford){notify("Not enough credits!","#ef5350");return;}const nc=coins-salePrice;const newOwned=[...ownedAvatars,featured.id];setCoins(nc);setOwnedAvatars(newOwned);setActiveAvatar(featured.id);checkAchievements(null,null,null,nc,null,newOwned);saveData(nc,collection,questDate,questProgress);notify(`🔥 ${featured.emoji} ${featured.name} unlocked at 40% off!`,"#ff9800");}} disabled={!canAfford} style={{background:canAfford?"linear-gradient(135deg,#ff9800,#ffc04a)":"#1a1a3a",border:"none",borderRadius:"14px",padding:"20px 39px",fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:700,color:canAfford?"#060610":"#3a3a5a",cursor:canAfford?"pointer":"not-allowed",boxShadow:canAfford?"0 0 20px #ff980066":"none"}}>{canAfford?`BUY 💎${salePrice.toLocaleString()}`:"NOT ENOUGH 💎"}</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Level-up exclusive avatars */}
                  <div style={{marginBottom:"63px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"31px"}}>
                      <div style={{height:"1px",flex:1,background:"#00e67633"}}/>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:"#00e676",letterSpacing:"2px",fontWeight:700}}>🏆 LEVEL-UP EXCLUSIVE</div>
                      <div style={{height:"1px",flex:1,background:"#00e67633"}}/>
                    </div>
                    <div className="avatar-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"28px"}}>
                      {LEVEL_AVATARS.map(av=>{
                        const currentLevel=getLevel(xp);
                        const owned=ownedAvatars.includes(av.id);
                        const isActive=activeAvatar===av.id;
                        const locked=currentLevel<av.unlocksAt;
                        const tc=AVATAR_TIER_COLORS["LevelUp"];
                        return(
                          <div key={av.id} style={{background:isActive?tc.bg:"#0a0a1e",border:`2px solid ${isActive?tc.color:owned?tc.border:"#1a1a3a"}`,borderRadius:"28px",padding:"39px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:"15px",opacity:locked?0.5:1,transition:"transform 0.2s"}}>
                            <div style={{fontSize:"67px",filter:locked?"grayscale(1)":"none"}}>{av.emoji}</div>
                            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",color:owned?tc.color:"#c0c4d8",fontWeight:700,textAlign:"center"}}>{av.name}</div>
                            {locked&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",color:"#a0a8c0",background:"#0f0f1a",borderRadius:"6px",padding:"3px 11px"}}>🔒 LVL {av.unlocksAt}</div>}
                            {owned&&!isActive&&<button onClick={()=>{setActiveAvatar(av.id);saveData(coins,collection,questDate,questProgress);notify(`Avatar changed to ${av.name}!`,"#00e676");}} style={{background:`linear-gradient(135deg,${tc.color},#69f0ae)`,border:"none",borderRadius:"11px",padding:"8px 20px",fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700,color:"#060610",cursor:"pointer"}}>EQUIP</button>}
                            {isActive&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"6px",padding:"3px 11px"}}>ACTIVE</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Purchaseable tier sections */}
                  {["Common","Rare","Epic","Legendary"].map(tier=>{
                    const tierAvatars=AVATARS.filter(a=>a.tier===tier);
                    const tc=AVATAR_TIER_COLORS[tier];
                    return(
                      <div key={tier} style={{marginBottom:"63px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"20px",marginBottom:"31px"}}>
                          <div style={{height:"1px",flex:1,background:tc.border}}/>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:tc.color,letterSpacing:"2px",fontWeight:700}}>{tier.toUpperCase()} — 💎{tierAvatars[0].price}</div>
                          <div style={{height:"1px",flex:1,background:tc.border}}/>
                        </div>
                        <div className="avatar-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"28px"}}>
                          {tierAvatars.map(av=>{
                            const owned=ownedAvatars.includes(av.id);
                            const isActive=activeAvatar===av.id;
                            const canAfford=coins>=av.price;
                            return(
                              <div key={av.id} style={{background:isActive?tc.bg:"#0a0a1e",border:`2px solid ${isActive?tc.color:owned?tc.border:"#1a1a3a"}`,borderRadius:"28px",padding:"39px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:"20px",cursor:owned?"pointer":"default",boxShadow:isActive?`0 0 20px ${tc.color}44`:"none",transition:"transform 0.2s"}}
                                onMouseEnter={e=>{if(owned||canAfford)e.currentTarget.style.transform="translateY(-4px)";}}
                                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
                                <div style={{fontSize:"73px",filter:owned?"none":"grayscale(1) opacity(0.4)"}}>{av.emoji}</div>
                                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",color:owned?tc.color:"#c0c4d8",fontWeight:700,textAlign:"center",letterSpacing:"0.5px"}}>{av.name}</div>
                                {isActive&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",color:tc.color,background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:"6px",padding:"3px 11px",letterSpacing:"1px"}}>ACTIVE</div>}
                                {owned&&!isActive&&<button onClick={()=>{setActiveAvatar(av.id);saveData(coins,collection,questDate,questProgress);notify(`Avatar changed to ${av.name}!`,"#ff9800");}} style={{background:`linear-gradient(135deg,${tc.color},${tc.color}bb)`,border:"none",borderRadius:"11px",padding:"10px 22px",fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700,color:"#060610",cursor:"pointer",letterSpacing:"1px"}}>EQUIP</button>}
                                {!owned&&<button onClick={()=>{if(!canAfford){notify("Not enough credits!","#ef5350");return;}const nc=coins-av.price;const newOwned=[...ownedAvatars,av.id];setCoins(nc);setOwnedAvatars(newOwned);setActiveAvatar(av.id);checkAchievements(null,null,null,nc,null,newOwned);saveData(nc,collection,questDate,questProgress);notify(`${av.emoji} ${av.name} unlocked!`,"#ff9800");}} disabled={!canAfford} style={{background:canAfford?`linear-gradient(135deg,${tc.color},${tc.color}bb)`:"#1a1a3a",border:"none",borderRadius:"11px",padding:"10px 22px",fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700,color:canAfford?"#060610":"#3a3a5a",cursor:canAfford?"pointer":"not-allowed",letterSpacing:"1px",boxShadow:canAfford?`0 0 16px ${tc.color}44`:"none"}}>💎 {av.price}</button>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>}

                {/* ══ CARD STORE ══ */}
                {storeTab==="cards"&&(()=>{
                  const alreadyBoughtLeg=collection.some(c=>c.id===dailyLegendary?.id);
                  const alreadyBoughtEpic=collection.some(c=>c.id===dailyEpic?.id);
                  const alreadyBoughtRare=collection.some(c=>c.id===dailyRare?.id);

                  const buyCard=(card,price)=>{
                    if(coins<price){notify("Not enough credits!","#ef5350");return;}
                    const nc=coins-price;
                    const newCol=[...collection];
                    const ex=newCol.find(c=>c.id===card.id);
                    if(ex) ex.count=(ex.count||1)+1;
                    else newCol.push({...card,count:1,acquiredAt:Date.now()});
                    setCoins(nc);
                    setCollection(newCol);
                    checkAchievements(newCol,null,null,nc,null,null);
                    saveData(nc,newCol,questDate,questProgress);
                    notify(`${card.emoji} ${card.name} added to collection!`,RC[card.rarity].color);
                  };

                  const CardOffer=({card,price,label,labelColor,alreadyOwned})=>{
                    if(!card)return null;
                    const cfg=RC[card.rarity];
                    const tc=TYPE_COLORS[card.type]||"#888";
                    const canAfford=coins>=price;
                    return(
                      <div className="card-offer" style={{background:"linear-gradient(160deg,#0a0a14,#0d0d18)",border:`2px solid ${cfg.color}`,borderRadius:"28px",padding:"45px",display:"flex",gap:"45px",alignItems:"flex-start",flexWrap:"nowrap",boxShadow:`0 0 40px ${cfg.glow}`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",inset:0,background:`linear-gradient(160deg,${tc}18 0%,${tc}08 40%,transparent 100%)`,pointerEvents:"none"}}/>
                        {/* Card preview */}
                        <div style={{flexShrink:0,width:"280px"}}>
                          <CardWrapper rarity={card.rarity}>
                            <HeroCard card={card} size="normal" fill showShine/>
                          </CardWrapper>
                        </div>
                        {/* Info */}
                        <div style={{flex:1,minWidth:"336px",zIndex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:"17px",marginBottom:"14px",flexWrap:"wrap"}}>
                            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"15px",color:labelColor,letterSpacing:"2px",background:`${labelColor}22`,border:`1px solid ${labelColor}44`,borderRadius:"8px",padding:"4px 14px",fontWeight:700}}>{label}</div>
                            <div style={{fontFamily:"monospace",fontSize:"21px",color:"#c0c4d8"}}>⏱ Resets in <span style={{color:"#ff9800",fontWeight:700}}>{hLeft}h {mLeft}m</span></div>
                          </div>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"39px",color:"#ffffff",fontWeight:900,marginBottom:"11px"}}>{card.name}</div>
                          <div style={{color:cfg.color,fontFamily:"'Orbitron',monospace",fontSize:"22px",marginBottom:"8px",fontWeight:700}}>{card.rarity}</div>
                          <div style={{background:`${tc}18`,border:`1px solid ${tc}44`,borderRadius:"8px",padding:"6px 17px",display:"inline-block",color:tc,fontFamily:"'Rajdhani',sans-serif",fontSize:"21px",fontWeight:700,marginBottom:"22px"}}>{card.type.toUpperCase()}</div>
                          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"22px",color:"#d0d4e8",lineHeight:1.6,marginBottom:"34px"}}>{card.desc}</div>
                          {/* Stats */}
                          <div style={{display:"flex",gap:"34px",marginBottom:"39px"}}>
                            {[["⚡ PWR",card.power,"#ff5722"],["🛡 DEF",card.defense,"#42a5f5"],["💨 SPD",card.speed,"#ffeb3b"]].map(([l,v,c])=>(
                              <div key={l} style={{textAlign:"center"}}>
                                <div style={{fontSize:"18px",color:c,fontFamily:"'Orbitron',monospace",marginBottom:"3px"}}>{l}</div>
                                <div style={{fontSize:"34px",color:"#fff",fontWeight:900}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          {/* Buy button */}
                          {alreadyOwned?(
                            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"22px",color:"#4caf50",background:"#4caf5022",border:"1px solid #4caf5044",borderRadius:"17px",padding:"22px 39px",display:"inline-block",fontWeight:700}}>✅ ALREADY OWNED</div>
                          ):(
                            <button onClick={()=>buyCard(card,price)} disabled={!canAfford} style={{background:canAfford?`linear-gradient(135deg,${cfg.color},${cfg.color}bb)`:"#1a1a3a",border:"none",borderRadius:"17px",padding:"25px 50px",fontFamily:"'Orbitron',monospace",fontSize:"28px",fontWeight:900,color:canAfford?"#060610":"#3a3a5a",cursor:canAfford?"pointer":"not-allowed",letterSpacing:"1px",boxShadow:canAfford?`0 0 24px ${cfg.glow}`:"none"}}>
                              {canAfford?`💎 ${price.toLocaleString()}`:`NEED ${(price-coins).toLocaleString()} MORE 💎`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  };

                  return(
                    <div style={{display:"flex",flexDirection:"column",gap:"45px"}}>
                      <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"25px",color:"#d0d4e8"}}>
                        Two exclusive cards available today only. Prices are steep — save your credits!
                      </div>
                      <CardOffer card={dailyLegendary} price={LEGENDARY_PRICE} label="✨ TODAY'S LEGENDARY" labelColor="#ff9800" alreadyOwned={alreadyBoughtLeg}/>
                      <CardOffer card={dailyEpic} price={EPIC_PRICE} label="💜 TODAY'S EPIC" labelColor="#cc6dff" alreadyOwned={alreadyBoughtEpic}/>
                      <CardOffer card={dailyRare} price={RARE_PRICE} label="💠 TODAY'S RARE" labelColor="#2196f3" alreadyOwned={alreadyBoughtRare}/>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* AVATAR CHANGE MODAL */}
          {showAvatarModal&&ReactDOM.createPortal(
            <div style={{position:"fixed",inset:0,background:"#000000e8",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
              <div style={{background:"#0a0a1e",border:"1px solid #4fc3f733",borderRadius:"24px",padding:"40px",width:"100%",maxWidth:"900px",maxHeight:"90vh",overflowY:"auto"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"32px"}}>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:"32px",color:"#4fc3f7",letterSpacing:"2px",fontWeight:900}}>CHOOSE AVATAR</div>
                  <button onClick={()=>setShowAvatarModal(false)} style={{background:"transparent",border:"2px solid #2a2a4a",borderRadius:"10px",padding:"10px 22px",color:"#ffffff",cursor:"pointer",fontSize:"22px",fontWeight:700}}>✕</button>
                </div>
                {ownedAvatars.length===1&&ownedAvatars[0]==="a1"&&(
                  <div style={{textAlign:"center",color:"#ffffff",fontFamily:"'Rajdhani',sans-serif",fontSize:"22px",marginBottom:"28px",padding:"20px",background:"#060610",borderRadius:"14px",lineHeight:1.5}}>
                    Visit the 🛒 Store to unlock more avatars!
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"20px"}}>
                  {[...AVATARS,...LEVEL_AVATARS].filter(av=>ownedAvatars.includes(av.id)).map(av=>{
                    const isActive=activeAvatar===av.id;
                    const tc=AVATAR_TIER_COLORS[av.tier]||AVATAR_TIER_COLORS["Common"];
                    return(
                      <div key={av.id} onClick={()=>{
                        setActiveAvatar(av.id);
                        setShowAvatarModal(false);
                        saveData(coins,collection,questDate,questProgress);
                        notify(`Avatar changed to ${av.name}!`,"#ff9800");
                      }} style={{
                        background:isActive?tc.bg:"#060610",
                        border:`2px solid ${isActive?tc.color:"#1a1a3a"}`,
                        borderRadius:"18px",padding:"28px 16px",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:"14px",
                        cursor:"pointer",transition:"transform 0.15s",
                      }}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                        <span style={{fontSize:"72px"}}>{av.emoji}</span>
                        <span style={{fontFamily:"'Orbitron',monospace",fontSize:"16px",color:isActive?tc.color:"#ffffff",fontWeight:700,textAlign:"center"}}>{av.name}</span>
                        {isActive&&<span style={{fontSize:"15px",color:tc.color,fontFamily:"monospace",fontWeight:700}}>✓ ACTIVE</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* QUESTS */}
          {tab==="quests"&&(()=>{
            const diffColors={Easy:{color:"#4caf50",bg:"#4caf5018",border:"#4caf5044"},Medium:{color:"#ff9800",bg:"#ff980018",border:"#ff980044"},Hard:{color:"#f44336",bg:"#f4433618",border:"#f4433644"}};
            return(
              <div style={{padding:"40px 32px",animation:"fadeIn 0.3s ease-out",maxWidth:"900px",margin:"0 auto"}}>
                <button onClick={()=>setTabPersist("home")} style={{background:"transparent",border:"2px solid rgba(255,255,255,0.4)",borderRadius:"9px",padding:"9px 20px",color:"#ffffff",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"13px",letterSpacing:"1.2px",marginBottom:"24px",display:"inline-flex",alignItems:"center",gap:"6px"}}>← BACK</button>
                <div className="quests-title" style={{fontFamily:"'Orbitron',monospace",fontSize:"32px",fontWeight:900,color:"#4caf50",letterSpacing:"2px",marginBottom:"6px"}}>⚡ DAILY QUESTS</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"18px",color:"#d0d4e8",marginBottom:"32px"}}>
                  Complete quests to earn XP and credits. Resets daily.
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:"20px"}}>
                  {todaysQuests.map(q=>{
                    const dc=diffColors[q.diff];
                    const progress=activeQuestProgress[q.id]||0;
                    const target=q.req.n||1;
                    const done=progress>=target;
                    const pct=Math.min((progress/target)*100,100);
                    return(
                      <div className="quest-card" key={q.id} style={{
                        background:done?"#0a1a0a":"#0a0a1e",
                        border:`2px solid ${done?"#4caf50":dc.color}`,
                        borderRadius:"16px",padding:"24px 28px",
                        opacity:done?0.75:1,
                        transition:"opacity 0.3s",
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:"16px",marginBottom:"14px"}}>
                          <div style={{fontSize:"40px",flexShrink:0}}>{q.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"6px",flexWrap:"wrap"}}>
                              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",color:done?"#4caf50":"#ffffff",fontWeight:700}}>{q.task}</div>
                              <div style={{background:dc.bg,border:`1px solid ${dc.border}`,borderRadius:"6px",padding:"3px 10px",fontFamily:"'Orbitron',monospace",fontSize:"12px",color:dc.color,fontWeight:700}}>{q.diff.toUpperCase()}</div>
                              {done&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",color:"#4caf50"}}>✅ COMPLETE</div>}
                            </div>
                            <div style={{display:"flex",gap:"16px",marginBottom:"10px"}}>
                              <span style={{fontFamily:"monospace",fontSize:"16px",color:"#4fc3f7"}}>+{q.xp.toLocaleString()} XP</span>
                              <span style={{fontFamily:"monospace",fontSize:"16px",color:"#ffd700"}}>+{q.credits.toLocaleString()} 💎</span>
                            </div>
                          </div>
                          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"22px",color:done?"#4caf50":dc.color,fontWeight:700,flexShrink:0}}>
                            {progress}/{target}
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{height:"10px",background:"#0f0f24",borderRadius:"5px",border:"1px solid rgba(255,255,255,0.1)"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:done?"#4caf50":`linear-gradient(90deg,${dc.color}88,${dc.color})`,borderRadius:"5px",transition:"width 0.5s",boxShadow:done?"0 0 8px #4caf5066":`0 0 6px ${dc.color}66`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ACHIEVEMENTS */}
          {tab==="achievements"&&(
            <div style={{padding:"60px 48px",animation:"fadeIn 0.3s ease-out",maxWidth:"1100px",margin:"0 auto"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"54px",fontWeight:900,color:"#ffd700",letterSpacing:"2px",marginBottom:"12px"}}>🏆 ACHIEVEMENTS</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"34px",color:"#d0d4e8",marginBottom:"48px"}}>
                {earnedAchievements.length} / {ACHIEVEMENTS.length} unlocked
                <span style={{color:"#ffd700",marginLeft:"16px"}}>
                  💎 {ACHIEVEMENTS.filter(a=>earnedAchievements.includes(a.id)).reduce((s,a)=>s+a.credits,0).toLocaleString()} earned
                </span>
              </div>

              {ACH_FAMILIES.map(family=>{
                const familyAchs=ACHIEVEMENTS.filter(a=>a.family===family);
                const earned=familyAchs.filter(a=>earnedAchievements.includes(a.id));
                const nextTier=familyAchs.find(a=>!earnedAchievements.includes(a.id));
                const cat=familyAchs[0].cat;
                return(
                  <div className="ach-family-card" key={family} style={{marginBottom:"48px",background:"#0a0a1e",borderRadius:"24px",padding:"36px",border:"1px solid #1a1a3a"}}>
                    {/* Family header */}
                    <div style={{display:"flex",alignItems:"center",gap:"21px",marginBottom:"30px"}}>
                      <span style={{fontSize:"54px"}}>{familyAchs[0].icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"31px",color:"#ffffff",fontWeight:700}}>{family}</div>
                        <div style={{fontFamily:"monospace",fontSize:"24px",color:"#c0c4d8",marginTop:"6px"}}>{earned.length}/{familyAchs.length} tiers completed</div>
                      </div>
                      {/* Tier dots */}
                      <div style={{display:"flex",gap:"12px"}}>
                        {familyAchs.map(a=>{
                          const done=earnedAchievements.includes(a.id);
                          return(
                            <div key={a.id} style={{
                              width:"21px",height:"21px",borderRadius:"50%",
                              background:done?"#ffd700":"#1a1a3a",
                              border:`2px solid ${done?"#ffd700":"#2a2a4a"}`,
                              boxShadow:done?"0 0 6px #ffd70088":"none",
                            }}/>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tier list */}
                    <div style={{display:"flex",flexDirection:"column",gap:"18px"}}>
                      {familyAchs.map((ach,i)=>{
                        const done=earnedAchievements.includes(ach.id);
                        const prevDone=i===0||earnedAchievements.includes(familyAchs[i-1].id);
                        const locked=!done&&!prevDone;
                        return(
                          <div className="ach-tier-row" key={ach.id} style={{
                            display:"flex",alignItems:"center",gap:"24px",
                            padding:"21px 27px",borderRadius:"15px",
                            background:done?"#1a1a08":locked?"#060608":"#0d0d18",
                            border:`1px solid ${done?"#ffd70044":locked?"#0f0f18":"#1a1a3a"}`,
                            opacity:locked?0.4:1,
                            transition:"opacity 0.3s",
                          }}>
                            {/* Tier badge */}
                            <div style={{
                              width:"60px",height:"60px",borderRadius:"50%",flexShrink:0,
                              background:done?"linear-gradient(135deg,#ffd700,#ffed4e)":locked?"#0a0a14":"#1a1a2e",
                              border:`2px solid ${done?"#ffd700":locked?"#1a1a3a":"#2a2a4a"}`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              fontFamily:"'Orbitron',monospace",fontSize:"24px",
                              color:done?"#060610":locked?"#2a2a4a":"#6a7090",
                              fontWeight:900,boxShadow:done?"0 0 10px #ffd70066":"none",
                            }}>{ach.tier}</div>

                            {/* Info */}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"26px",color:done?"#ffd700":locked?"#2a2a4a":"#d0d4e8",fontWeight:700,marginBottom:"4px"}}>
                                {locked?"🔒 "+ach.name:ach.name}
                              </div>
                              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"24px",color:locked?"#1a1a3a":"#c0c4d8"}}>{ach.desc}</div>
                            </div>

                            {/* Rewards */}
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px",flexShrink:0}}>
                              <span style={{fontFamily:"monospace",fontSize:"22px",color:done?"#4fc3f7":locked?"#1a1a3a":"#405060"}}>+{ach.xp.toLocaleString()} XP</span>
                              <span style={{fontFamily:"monospace",fontSize:"22px",color:done?"#ffd700":locked?"#1a1a3a":"#504020"}}>+{ach.credits.toLocaleString()} 💎</span>
                            </div>

                            {done&&<div style={{fontSize:"37px",flexShrink:0}}>✅</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CMS */}
          {tab==="cms"&&isGod&&<CardCMS notify={notify}/>}

          {/* BATTLE */}
          {tab==="battle"&&(
            <BattleTab
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
              onBattleComplete={onBattleComplete}
              notify={notify}
              gainXp={gainXp}
              isGod={isGod}
            />
          )}

        </div>
      </div>

      {/* ACHIEVEMENT POPUP - shows one at a time */}
      {pendingAchievements.length>0&&(()=>{
        const id=pendingAchievements[0];
        const ach=ACHIEVEMENTS.find(a=>a.id===id);
        if(!ach)return null;
        const dismiss=()=>setPendingAchievements(q=>q.slice(1));
        return ReactDOM.createPortal(
          <div className="achievement-popup" style={{
            position:"fixed",bottom:"80px",left:"50%",transform:"translateX(-50%)",
            background:"linear-gradient(135deg,#1a1a2e,#16213e)",
            border:"2px solid #ffd700",borderRadius:"18px",
            padding:"20px 24px",zIndex:9998,
            display:"flex",flexDirection:"column",gap:"12px",
            boxShadow:"0 0 40px #ffd70066",animation:"slideDown 0.4s ease-out",
            width:"420px",maxWidth:"90vw",boxSizing:"border-box",
          }}>
            {/* Top row: icon + title + dismiss */}
            <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{fontSize:"40px",flexShrink:0}}>{ach.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#ffd700",letterSpacing:"2px"}}>🏆 ACHIEVEMENT UNLOCKED</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",color:"#ffffff",fontWeight:700,marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ach.name}</div>
              </div>
              <button onClick={dismiss} style={{
                flexShrink:0,background:"#ffd70022",border:"1px solid #ffd70066",
                borderRadius:"8px",padding:"6px 12px",color:"#ffd700",
                cursor:"pointer",fontFamily:"'Orbitron',monospace",
                fontSize:"12px",fontWeight:700,letterSpacing:"1px",
              }}>✕ DISMISS</button>
            </div>
            {/* Bottom row: desc + rewards */}
            <div style={{paddingLeft:"54px"}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"15px",color:"#d0d4e8",marginBottom:"6px"}}>{ach.desc}</div>
              <div style={{display:"flex",gap:"14px"}}>
                <span style={{fontFamily:"monospace",fontSize:"14px",color:"#4fc3f7"}}>+{ach.xp.toLocaleString()} XP</span>
                <span style={{fontFamily:"monospace",fontSize:"14px",color:"#ffd700"}}>+{ach.credits.toLocaleString()} 💎</span>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* LEVEL UP MODAL */}
      {showLevelUp&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"#000000f0",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:"30px"}}>
          <div className="level-up-modal" style={{background:"linear-gradient(160deg,#0a0a1e,#1a1a3a)",border:"2px solid #ff9800",borderRadius:"36px",padding:"60px",maxWidth:"420px",width:"100%",textAlign:"center",animation:"fadeIn 0.4s ease-out",boxShadow:"0 0 60px #ff980044"}}>
            <div style={{fontSize:"122px",animation:"float 2s ease-in-out infinite",marginBottom:"24px"}}>🎉</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:"#ff9800",letterSpacing:"3px",marginBottom:"12px"}}>LEVEL UP!</div>
            <div className="level-up-number" style={{fontFamily:"'Orbitron',monospace",fontSize:"95px",fontWeight:900,color:"#ffffff",lineHeight:1,marginBottom:"12px"}}>{showLevelUp.level}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"27px",color:"#d0d4e8",marginBottom:"36px"}}>
              You earned <span style={{color:"#ff9800",fontWeight:700}}>💎 {showLevelUp.level*50} bonus credits!</span>
            </div>
            {showLevelUp.avatar&&(
              <div style={{background:"#00e67618",border:"1px solid #00e67644",borderRadius:"24px",padding:"30px",marginBottom:"36px"}}>
                <div style={{fontSize:"88px",marginBottom:"12px"}}>{showLevelUp.avatar.emoji}</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",color:"#00e676",fontWeight:700,letterSpacing:"1px",marginBottom:"6px"}}>NEW AVATAR UNLOCKED!</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"27px",color:"#ffffff"}}>{showLevelUp.avatar.name}</div>
              </div>
            )}
            <button onClick={()=>setShowLevelUp(null)} style={{background:"linear-gradient(135deg,#ff9800,#ffc04a)",border:"none",borderRadius:"18px",padding:"21px 60px",fontFamily:"'Orbitron',monospace",fontSize:"24px",fontWeight:700,color:"#060610",cursor:"pointer",letterSpacing:"2px"}}>
              AWESOME!
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* AVATAR CHANGE MODAL */}
      {showAvatarModal&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"#000000e8",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"30px"}}>
          <div style={{background:"#0a0a1e",border:"1px solid #4fc3f733",borderRadius:"45px",padding:"63px",width:"100%",maxWidth:"1020px",maxHeight:"128vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"45px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"41px",color:"#4fc3f7",letterSpacing:"2px"}}>CHOOSE AVATAR</div>
              <button onClick={()=>setShowAvatarModal(false)} style={{background:"transparent",border:"1px solid #2a2a4a",borderRadius:"14px",padding:"9px 27px",color:"#c0c4d8",cursor:"pointer",fontSize:"41px"}}>✕</button>
            </div>
            {ownedAvatars.length===1&&ownedAvatars[0]==="a1"&&(
              <div style={{textAlign:"center",color:"#a0a8c0",fontFamily:"'Rajdhani',sans-serif",fontSize:"36px",marginBottom:"36px",padding:"22px",background:"#060610",borderRadius:"18px"}}>
                Visit the 🛒 Store to unlock more avatars!
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))",gap:"27px"}}>
              {[...AVATARS,...LEVEL_AVATARS].filter(av=>ownedAvatars.includes(av.id)).map(av=>{
                const isActive=activeAvatar===av.id;
                const tc=AVATAR_TIER_COLORS[av.tier]||AVATAR_TIER_COLORS["Common"];
                return(
                  <div key={av.id} onClick={()=>{
                    setActiveAvatar(av.id);
                    setShowAvatarModal(false);
                    saveData(coins,collection,questDate,questProgress);
                    notify(`Avatar changed to ${av.name}!`,"#ff9800");
                  }} style={{
                    background:isActive?tc.bg:"#060610",
                    border:`2px solid ${isActive?tc.color:"#1a1a3a"}`,
                    borderRadius:"27px",padding:"36px 18px",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:"18px",
                    cursor:"pointer",transition:"transform 0.15s",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                    <span style={{fontSize:"102px"}}>{av.emoji}</span>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"24px",color:isActive?tc.color:"#c0c4d8",fontWeight:700,textAlign:"center"}}>{av.name}</span>
                    {isActive&&<span style={{fontSize:"24px",color:tc.color,fontFamily:"monospace"}}>✓ ACTIVE</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <HamburgerNav tab={tab} setTab={setTabPersist} selectedCard={selectedCard} isGod={isGod} onLogout={onLogout}/>
      {openingPack&&<PackAnim cards={openingPack} onDone={onPackDone} packId={selectedPack} collection={collection} onTradeDupes={onTradeDupes}/>}
    </div>
  );
}

/* ── Root ── */
function App(){
  const [state,setState]=useState("loading");
  const [userData,setUserData]=useState(null);
  const [godMode,setGodMode]=useState(()=>localStorage.getItem(GOD_MODE_KEY)==="true");

  const toggleGodMode=()=>{
    const next=!godMode;
    setGodMode(next);
    localStorage.setItem(GOD_MODE_KEY,String(next));
    if(state==="game"&&userData?.uid==="god"){setState("auth");setUserData(null);}
  };

  useEffect(()=>{
    if(godMode){setUserData(GOD_USER);setState("game");return;}
    const unsub=auth.onAuthStateChanged(async(user)=>{
      if(user){
        try{
          const snap=await db.collection("users").doc(user.uid).get();
          const data=snap.data();
          setUserData({uid:user.uid,username:data.username,coins:data.coins,collection:data.collection||[],questDate:data.questDate||"",ownedAvatars:data.ownedAvatars||["a1"],activeAvatar:data.activeAvatar||"a1",xp:data.xp||0,earnedAchievements:data.earnedAchievements||[],packsOpened:data.packsOpened||0,tradesCompleted:data.tradesCompleted||0,questProgress:data.questProgress||{}});
          setState("game");
        }catch(e){setState("auth");}
      }else{setState("auth");}
    });
    return()=>unsub();
  },[godMode]);

  const handleLogin=(uid,username,data)=>{
    setUserData({uid,username,...data});
    setState("game");
  };

  const handleLogout=async()=>{
    if(userData?.uid!=="god")await auth.signOut();
    setUserData(null);
    setState("auth");
  };

  const enterGodMode=()=>{
    setUserData(GOD_USER);
    setState("game");
  };

  if(state==="loading")return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060610",flexDirection:"column",gap:"30px"}}>
      <div style={{fontSize:"109px",animation:"float 2s ease-in-out infinite"}}>🦸</div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"31px",color:"#4fc3f7",letterSpacing:"3px",animation:"glow 2s ease-in-out infinite"}}>CONNECTING</div>
      <Spinner size={24} color="#4fc3f7"/>
    </div>
  );
  if(state==="auth")return <AuthScreen onLogin={handleLogin} godMode={godMode} onToggleGodMode={toggleGodMode} onEnterGodMode={enterGodMode}/>;

  const isGod=userData?.uid==="god";
  return(
    <>
      {isGod&&(
        <div className="god-banner" style={{background:"#ff9800",color:"#060610",padding:"9px 24px",fontFamily:"'Orbitron',monospace",fontSize:"20px",letterSpacing:"2px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"fixed",top:0,left:0,right:0,zIndex:9000}}>
          <span>⚡ GOD MODE ACTIVE — NO DATA IS SAVED</span>
          <button onClick={toggleGodMode} style={{background:"#060610",color:"#ff9800",border:"none",borderRadius:"6px",padding:"4px 15px",fontFamily:"'Orbitron',monospace",fontSize:"17px",cursor:"pointer",letterSpacing:"1px"}}>DISABLE</button>
        </div>
      )}
      <div style={isGod?{paddingTop:"29px"}:{}}>
        <Game key={userData.uid} uid={userData.uid} username={userData.username} initData={{coins:userData.coins,collection:userData.collection,questDate:userData.questDate,ownedAvatars:userData.ownedAvatars||["a1"],activeAvatar:userData.activeAvatar||"a1",xp:userData.xp||0,earnedAchievements:userData.earnedAchievements||[],packsOpened:userData.packsOpened||0,tradesCompleted:userData.tradesCompleted||0,questProgress:userData.questProgress||{}}} onLogout={handleLogout} isGod={isGod}/>
      </div>
    </>
  );
}

// Wait for all scripts to be ready
function startApp(){
  if(typeof firebase === 'undefined' || typeof React === 'undefined' || typeof ReactDOM === 'undefined'){
    setTimeout(startApp, 50);
    return;
  }
  ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
}
startApp();
