/* ── Spinner ── */
function Spinner({size=24,color="#4fc3f7"}){
  return <div style={{width:size,height:size,border:`2px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>;
}

/* ── MissingCard (silhouette for unowned cards) ── */
function MissingCard({card}){
  const cfg=RC[card.rarity];
  const typeIcon=TYPE_ICONS[card.type]||"?";
  return(
    <div style={{
      position:"relative",width:"100%",aspectRatio:"201/290",
      borderRadius:"14px",flexShrink:0,overflow:"hidden",
      background:"linear-gradient(160deg,#07070d,#0a0a12)",
      border:`1.5px solid ${cfg.color}44`,
      animation:`${({Common:"flash-common",Uncommon:"flash-uncommon",Rare:"flash-rare",Epic:"flash-epic",Legendary:"flash-legendary"})[card.rarity]} ${({Common:"3s",Uncommon:"2.5s",Rare:"2s",Epic:"1.5s",Legendary:"1s"})[card.rarity]} ease-in-out infinite`,
      display:"flex",flexDirection:"column",
      padding:"10px 10px 12px",userSelect:"none",
    }}>
      {/* Redacted stripe texture */}
      <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 6px,rgba(255,255,255,0.018) 6px,rgba(255,255,255,0.018) 7px)",pointerEvents:"none"}}/>
      {/* Rarity colour tint */}
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at 50% 40%,${cfg.color}0e 0%,transparent 70%)`,pointerEvents:"none"}}/>
      {/* Top row: card number + rarity pip */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:2,marginBottom:"6px"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:`${cfg.color}77`,letterSpacing:"1px"}}>#{String(card.id).padStart(3,"0")}</div>
        <div style={{width:"10px",height:"10px",borderRadius:"50%",background:cfg.color,boxShadow:`0 0 6px ${cfg.color}`,opacity:0.7}}/>
      </div>
      {/* Centre: blurred type watermark + redaction bars */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",zIndex:2,position:"relative"}}>
        {/* Type icon — faint watermark */}
        <div style={{fontSize:"52px",opacity:0.07,filter:"blur(2px)",position:"absolute"}}>{typeIcon}</div>
        {/* Redaction bars */}
        <div style={{width:"70%",height:"10px",borderRadius:"3px",background:`${cfg.color}22`,border:`1px solid ${cfg.color}33`}}/>
        <div style={{width:"50%",height:"8px",borderRadius:"3px",background:`${cfg.color}18`,border:`1px solid ${cfg.color}22`}}/>
        <div style={{width:"60%",height:"8px",borderRadius:"3px",background:`${cfg.color}18`,border:`1px solid ${cfg.color}22`}}/>
      </div>
      {/* Bottom: rarity label */}
      <div style={{zIndex:2,display:"flex",justifyContent:"center",marginTop:"8px"}}>
        <div style={{
          background:`${cfg.color}14`,border:`1px solid ${cfg.color}44`,
          borderRadius:"5px",padding:"3px 10px",
          fontFamily:"'Orbitron',monospace",fontSize:"10px",
          color:`${cfg.color}99`,fontWeight:700,letterSpacing:"1px",
        }}>{card.rarity.toUpperCase()}</div>
      </div>
    </div>
  );
}

/* ── HeroCard ── */
// Rarity gem shapes for bottom-right corner
const RARITY_GEMS={
  Common:   {shape:"circle",  color:"#b0b8c8"},
  Uncommon: {shape:"diamond", color:"#5ddb6a"},
  Rare:     {shape:"diamond", color:"#2196f3"},
  Epic:     {shape:"star",    color:"#cc6dff"},
  Legendary:{shape:"star",    color:"#ff9800"},
};

function RarityGem({rarity,size=10}){
  const g=RARITY_GEMS[rarity]||RARITY_GEMS.Common;
  if(g.shape==="circle") return <div style={{width:size,height:size,borderRadius:"50%",background:g.color,boxShadow:`0 0 ${size}px ${g.color}`}}/>;
  if(g.shape==="diamond") return(
    <div style={{width:size,height:size,background:g.color,transform:"rotate(45deg)",boxShadow:`0 0 ${size}px ${g.color}`}}/>
  );
  // star
  return(
    <svg width={size*1.4} height={size*1.4} viewBox="0 0 24 24">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={g.color} style={{filter:`drop-shadow(0 0 ${size/2}px ${g.color})`}}/>
    </svg>
  );
}

function HeroCard({card,size="normal",onClick,selected,showShine=false,fill=false}){
  const cfg=RC[card.rarity];
  const tc=TYPE_COLORS[card.type]||"#888";

  // Size presets — header, image, stats, footer zones
  const D={
    tiny:  {w:103,h:140, r:7,  nmSz:"7px",  numSz:"5px",  bdSz:"8px",  stSz:"7px",  stBar:2,  alSz:"5px",  imgH:"44%", pad:"3px",  gemSz:5},
    small: {w:138,h:186, r:9,  nmSz:"9px",  numSz:"6px",  bdSz:"10px", stSz:"8px",  stBar:2,  alSz:"6px",  imgH:"45%", pad:"4px",  gemSz:6},
    normal:{w:201,h:269, r:13, nmSz:"13px", numSz:"7px",  bdSz:"11px", stSz:"9px",  stBar:2,  alSz:"7px",  imgH:"46%", pad:"6px",  gemSz:7},
    large: {w:253,h:339, r:16, nmSz:"15px", numSz:"8px",  bdSz:"13px", stSz:"11px", stBar:3,  alSz:"8px",  imgH:"47%", pad:"7px",  gemSz:8},
    xlarge:{w:360,h:482, r:22, nmSz:"19px", numSz:"12px", bdSz:"18px", stSz:"14px", stBar:4,  alSz:"11px", imgH:"47%", pad:"10px", gemSz:11},
  }[size]||{w:201,h:269,r:13,nmSz:"13px",numSz:"7px",bdSz:"11px",stSz:"9px",stBar:2,alSz:"7px",imgH:"46%",pad:"6px",gemSz:7};

  // fill mode scales relative to 5-col grid width
  const fw="calc((100vw - var(--sidebar-w)) / var(--card-col))";
  const fNm  = fill?`calc(${fw} * 0.085)`:D.nmSz;
  const fNum = fill?`calc(${fw} * 0.044)`:D.numSz;
  const fBd  = fill?`calc(${fw} * 0.072)`:D.bdSz;
  const fSt  = fill?`calc(${fw} * 0.072)`:D.stSz;
  const fAl  = fill?`calc(${fw} * 0.054)`:D.alSz;
  const fPad = fill?`calc(${fw} * 0.048)`:D.pad;
  const fR   = fill?`calc(${fw} * 0.065)`:D.r;
  const fImgH= fill?"46%":D.imgH;
  const fGem = fill?9:D.gemSz;
  const fStBar= fill?5:D.stBar;
  const fEm  = fill?`calc(${fw} * 0.24)`:({tiny:"26px",small:"34px",normal:"52px",large:"68px",xlarge:"96px"})[size];

  // Pokémon-style gradient: vibrant type colour at top, nearly black at bottom
  const typeGrad=`linear-gradient(180deg, ${tc}70 0%, ${tc}45 25%, ${tc}18 55%, #6a6a7a18 80%, #8890a8 100%)`;

  // Type pattern
  const patternFn=TYPE_PATTERNS[card.type];
  const patternSvg=patternFn?patternFn(tc):null;
  const patternUrl=patternSvg?`url("data:image/svg+xml,${encodeURIComponent(patternSvg)}")`:null;

  const rarityAnim={Common:"flash-common",Uncommon:"flash-uncommon",Rare:"flash-rare",Epic:"flash-epic",Legendary:"flash-legendary"}[card.rarity];
  const rarityDur={Common:"3s",Uncommon:"2.5s",Rare:"2s",Epic:"1.5s",Legendary:"1s"}[card.rarity];
  const idleAnim=""; // idle animations applied to wrapper instead

  const showStats=size!=="tiny";
  const showAlliance=size!=="tiny";
  const imgSrc=card.imageUrl||null;

  return(
    <div onClick={onClick} className={onClick?"card-hover":""} style={{
      position:fill?"absolute":"relative",
      top:fill?"0":"auto",
      left:fill?"0":"auto",
      right:fill?"0":"auto",
      bottom:fill?"0":"auto",
      width:fill?"100%":D.w,
      height:fill?"100%":D.h,
      borderRadius:fill?fR:D.r,
      flexShrink:0,
      background:"linear-gradient(180deg,#0a0a14 0%,#1a1a24 60%,#2a2a38 100%)",
      border:`2px solid ${selected?"#ffffff":cfg.border}`,
      animation:selected?"none":`${rarityAnim} ${rarityDur} ease-in-out infinite${idleAnim}`,
      cursor:onClick?"pointer":"default",
      display:"flex",flexDirection:"column",
      padding:fill?fPad:D.pad,
      userSelect:"none",overflow:"hidden",
      boxSizing:"border-box",
    }}>

      {/* ── Background layers ── */}
      {/* Strong type colour wash */}
      <div style={{position:"absolute",inset:0,background:typeGrad,pointerEvents:"none",zIndex:1}}/>
      {/* Type pattern texture — more opaque than before */}
      {patternUrl&&<div style={{position:"absolute",top:0,left:0,right:0,height:"60%",backgroundImage:patternUrl,backgroundSize:"50px 50px",backgroundRepeat:"repeat",pointerEvents:"none",zIndex:1,opacity:0.5}}/>}
      {/* Subtle scanlines */}
      <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)",pointerEvents:"none",zIndex:2}}/>
      {/* Shine sweep */}
      {showShine&&(()=>{
        const shines={
          Legendary:"linear-gradient(105deg,transparent 20%,rgba(255,200,50,0.38) 40%,rgba(255,240,120,0.55) 50%,rgba(255,200,50,0.38) 60%,transparent 80%)",
          Epic:"linear-gradient(105deg,transparent 20%,rgba(200,100,255,0.38) 40%,rgba(230,150,255,0.55) 50%,rgba(200,100,255,0.38) 60%,transparent 80%)",
          Rare:"linear-gradient(105deg,transparent 20%,rgba(80,180,255,0.38) 40%,rgba(140,210,255,0.55) 50%,rgba(80,180,255,0.38) 60%,transparent 80%)",
        };
        const spd=card.rarity==="Legendary"?"1.8s":card.rarity==="Epic"?"2.2s":"3s";
        return(
          <>
            <div style={{position:"absolute",top:0,left:"-100%",width:"60%",height:"100%",background:shines[card.rarity]||shines.Rare,animation:`shimmer ${spd} ease-in-out infinite`,pointerEvents:"none",zIndex:5}}/>
            {card.rarity==="Legendary"&&<div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(255,200,50,0.10) 0%,transparent 55%)",pointerEvents:"none",zIndex:2}}/>}
            {card.rarity==="Epic"&&<div style={{position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(180,80,255,0.10) 0%,transparent 55%)",pointerEvents:"none",zIndex:2}}/>}
          </>
        );
      })()}

      {/* ── HEADER: name+number (left) + PWR score + type icon (right) ── */}
      <div style={{position:"relative",width:"100%",zIndex:4,marginBottom:fill?"0.5%":"1px",flexShrink:0,paddingTop:fill?"1%":"2px"}}>
        {/* Left: card number + name */}
        <div style={{width:"100%"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:fill?fNum:D.numSz,color:`${cfg.color}cc`,letterSpacing:"1px",lineHeight:1,marginBottom:"1px"}}>
            #{String(card.id).padStart(3,"0")}
          </div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:fill?`calc(${fw}*0.07)`:D.nmSz,color:"#ffffff",fontWeight:700,lineHeight:1.1,textShadow:"0 1px 6px rgba(0,0,0,0.9)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"clip",marginTop:fill?"2%":"2px"}}>
            {card.name}
          </div>
        </div>
        {/* Right: type icon + total power — absolutely positioned so name gets full width */}
        <div style={{position:"absolute",top:fill?"3%":"3px",right:fill?"3%":"4px",display:"flex",alignItems:"center",gap:"3px",zIndex:5}}>
          <div style={{
            width:fill?`calc(${fw}*0.13)`:D.bdSz,
            height:fill?`calc(${fw}*0.13)`:D.bdSz,
            minWidth:"18px",minHeight:"18px",
            borderRadius:"50%",
            background:`${tc}30`,
            border:`1.5px solid ${tc}`,
            boxShadow:`0 0 6px ${tc}66`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:fill?`calc(${fw}*0.07)`:D.bdSz,
            lineHeight:1,
            flexShrink:0,
          }}>
            {TYPE_ICONS[card.type]||"🦸"}
          </div>
        </div>
      </div>

      {/* ── IMAGE WINDOW ── */}
      <div style={{
        width:"100%",height:D.imgH,flexShrink:0,
        borderRadius:"6px",
        overflow:"hidden",
        position:"relative",
        zIndex:4,
        border:`2px solid ${cfg.color}cc`,
        boxShadow:`0 0 10px ${cfg.color}44, inset 0 0 12px rgba(0,0,0,0.5)`,
        background:"#000",
        marginBottom:fill?"2%":"4px",
        willChange:"transform",
        transform:"translateZ(0)",
      }}>
        {imgSrc?(
          <>
            <img src={imgSrc} alt={card.name}
              style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",display:"block",
                imageRendering:"-webkit-optimize-contrast",
                willChange:"transform",
                transform:"translateZ(0)",
              }}
              onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}
            />
            <div style={{display:"none",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",fontSize:fill?fEm:({tiny:"26px",small:"34px",normal:"52px",large:"68px",xlarge:"96px"})[size],filter:`drop-shadow(0 0 12px ${tc})`}}>
              {card.emoji||"🦸"}
            </div>
          </>
        ):(
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:fill?fEm:({tiny:"26px",small:"34px",normal:"52px",large:"68px",xlarge:"96px"})[size],filter:`drop-shadow(0 0 14px ${tc}) drop-shadow(0 0 4px #000)`}}>
            {card.emoji||"🦸"}
          </div>
        )}
        {/* Inner frame top-highlight */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(255,255,255,0.06) 0%,transparent 30%)",pointerEvents:"none"}}/>
      </div>

      {/* ── STATS with bars ── */}
      {showStats&&(
        <div style={{
          width:"100%",zIndex:4,flexShrink:0,
          background:"rgba(0,0,0,0.65)",
          borderRadius:"6px",
          border:"1px solid rgba(255,255,255,0.18)",
          borderTop:`2px solid ${cfg.color}66`,
          padding:fill?"1.5% 3%":"2px 5px",
          display:"flex",flexDirection:"column",
          gap:fill?"0.5%":"1px",
          marginBottom:fill?"4%":"8px",
        }}>
          {[["PWR",card.power,"#ff6b40"],["DEF",card.defense,"#4db8ff"],["SPD",card.speed,"#ffe040"]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:"4px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:fill?`calc(${fw}*0.038)`:D.numSz,color:c,width:"20%",flexShrink:0,textAlign:"left",opacity:0.9,letterSpacing:"0.3px"}}>{l}</div>
              <div style={{flex:1,height:`${fStBar}px`,background:"rgba(0,0,0,0.5)",borderRadius:"2px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{width:`${v}%`,height:"100%",background:`linear-gradient(90deg,${c}88,${c})`,borderRadius:"2px",transition:"width 0.5s"}}/>
              </div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:fill?fSt:D.stSz,color:"#ffffff",fontWeight:700,width:"16%",textAlign:"right",textShadow:"0 1px 3px #000",flexShrink:0}}>{v}</div>
            </div>
          ))}
          {/* Total power divider + score */}
          <div style={{borderTop:`1px solid rgba(255,255,255,0.1)`,marginTop:fill?"1%":"2px",paddingTop:fill?"1%":"2px",display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:fill?`calc(${fw}*0.038)`:D.numSz,color:`${cfg.color}88`,letterSpacing:"1px"}}>TOTAL PWR</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:fill?`calc(${fw}*0.085)`:D.stSz,color:cfg.color,fontWeight:900,textShadow:`0 0 8px ${cfg.color}66`,lineHeight:1}}>{card.power+card.defense+card.speed}</div>
          </div>
        </div>
      )}



    </div>
  );
}

/* ── Card wrapper — single source of truth for fill-mode card containers ── */
function CardWrapper({width="100%",rarity,onClick,className,flyAnim,zIndex,contain,background,flexShrink,children}){
  const idleAnim=rarity==="Legendary"?"legendaryFloat 3s ease-in-out infinite":rarity==="Epic"?"epicPulse 2.5s ease-in-out infinite":"none";
  return(
    <div className={className} onClick={onClick} style={{position:"relative",width:width,aspectRatio:"201/290",borderRadius:"13px",overflow:"hidden",animation:flyAnim||idleAnim,zIndex:zIndex,contain:contain,background:background,flexShrink:flexShrink}}>
      {children}
    </div>
  );
}

/* ── Pack animation ── */
// Rarity vibration patterns (ms: [vibrate, pause, vibrate, ...])
const RARITY_VIBRATION={
  Common:[30],
  Uncommon:[40,20,40],
  Rare:[60,30,60],
  Epic:[80,30,80,30,80],
  Legendary:[100,40,200,40,100,40,200],
};
// Rarity sound via Web Audio API
function playRaritySound(rarity){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const configs={
      Common:    [{f:300,t:0,d:0.08},{f:200,t:0.1,d:0.1}],
      Uncommon:  [{f:400,t:0,d:0.1},{f:500,t:0.12,d:0.15}],
      Rare:      [{f:500,t:0,d:0.1},{f:650,t:0.12,d:0.15},{f:800,t:0.28,d:0.2}],
      Epic:      [{f:600,t:0,d:0.1},{f:800,t:0.12,d:0.1},{f:1000,t:0.25,d:0.1},{f:1200,t:0.38,d:0.25}],
      Legendary: [{f:200,t:0,d:0.08},{f:400,t:0.1,d:0.08},{f:600,t:0.2,d:0.1},{f:900,t:0.32,d:0.1},{f:1200,t:0.45,d:0.15},{f:1500,t:0.62,d:0.4}],
    };
    const notes=configs[rarity]||configs.Common;
    notes.forEach(({f,t,d})=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.type=rarity==="Legendary"?"sine":"square";
      osc.frequency.setValueAtTime(f,ctx.currentTime+t);
      gain.gain.setValueAtTime(rarity==="Legendary"?0.15:0.08,ctx.currentTime+t);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+t+d);
      osc.start(ctx.currentTime+t);
      osc.stop(ctx.currentTime+t+d+0.05);
    });
  }catch(e){}
}

function PackAnim({cards,onDone,packId,collection,onTradeDupes}){
  const [current,setCurrent]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const [flashColor,setFlashColor]=useState(null);
  const [traded,setTraded]=useState(false);
  const done=current>=cards.length;
  const card=cards[current];

  const triggerEffects=(rarity)=>{
    // Vibration
    if(navigator.vibrate){
      navigator.vibrate(RARITY_VIBRATION[rarity]||[30]);
    }
    // Sound
    playRaritySound(rarity);
    // Screen flash removed
  };

  const flip=()=>{
    if(!flipped){
      setFlipped(true);
      triggerEffects(card.rarity);
      return;
    }
    if(current<cards.length-1){setCurrent(c=>c+1);setFlipped(false);}
    else{setCurrent(cards.length);}
  };

  const overlay=(
    <div onClick={!done?flip:undefined} style={{
      position:"fixed",top:0,left:0,width:"100vw",height:"100vh",
      background:"#000000f5",zIndex:9999,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      gap:"34px",cursor:done?"default":"pointer",userSelect:"none",
    }}>
      {/* Screen flash overlay */}
      {flashColor&&(
        <div style={{
          position:"absolute",inset:0,
          background:flashColor,
          zIndex:10,
          pointerEvents:"none",
          animation:"flashLegendary 0.8s ease-out forwards",
          borderRadius:0,
        }}/>
      )}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
        <div className="pack-title" style={{fontFamily:"'Orbitron',monospace",color:"#4fc3f7",fontSize:"39px",letterSpacing:"4px",animation:"glow 2s ease-in-out infinite"}}>PACK OPENED!</div>
        {packId&&<div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",color:PACKS[packId].color,letterSpacing:"2px"}}>{PACKS[packId].emoji} {PACKS[packId].name.toUpperCase()}</div>}
      </div>

      {!done&&<>
        {/* Progress dots */}
        <div style={{display:"flex",gap:"14px"}}>
          {cards.map((_,i)=>{
            const cfg=RC[cards[i].rarity];
            return <div key={i} style={{
              width:"17px",height:"17px",borderRadius:"50%",
              background: i<current ? cfg.color : i===current ? cfg.color : "#2a2a4a",
              opacity: i<current ? 0.4 : 1,
              boxShadow: i===current ? `0 0 8px ${cfg.color}` : "none",
              transition:"all 0.3s",
            }}/>;
          })}
        </div>

        {/* Card face — hidden until flipped */}
        <div className="pack-card-area" style={{position:"relative",width:"281px",aspectRatio:"201/290"}}>
          {!flipped&&(
            <div style={{
              position:"absolute",inset:0,borderRadius:"20px",overflow:"hidden",
              background:"linear-gradient(145deg,#0a0a1e 0%,#12122e 40%,#0d0d28 100%)",
              border:"2px solid #3a2a6a",
              animation:"flyInBottom 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
              cursor:"pointer",
            }}>
              {/* Hexagonal tile pattern */}
              <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.12}} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="hex" x="0" y="0" width="28" height="32" patternUnits="userSpaceOnUse">
                    <polygon points="14,2 24,8 24,20 14,26 4,20 4,8" fill="none" stroke="#8866ff" strokeWidth="0.8"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hex)"/>
              </svg>
              {/* Radial glow centre */}
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,#4a2a8a44 0%,transparent 70%)"}}/>
              {/* Corner ornaments */}
              {[[8,8,"rotate(0)"],[8,8,"rotate(90) translate(0,-269)"],[-8,-8,"rotate(180) translate(-281,-269)"],[-8,-8,"rotate(270) translate(-281,0)"]].map(([x,y,t],i)=>(
                <svg key={i} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",opacity:0.5}} viewBox="0 0 281 269">
                  <g transform={t}>
                    <circle cx="20" cy="20" r="14" fill="none" stroke="#7744cc" strokeWidth="1.2"/>
                    <line x1="34" y1="20" x2="48" y2="20" stroke="#7744cc" strokeWidth="0.8"/>
                    <line x1="20" y1="34" x2="20" y2="48" stroke="#7744cc" strokeWidth="0.8"/>
                  </g>
                </svg>
              ))}
              {/* Centre logo area */}
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"12px"}}>
                <div style={{
                  width:"72px",height:"72px",borderRadius:"50%",
                  background:"linear-gradient(135deg,#1a0a3a,#2a1060)",
                  border:"2px solid #7744cc",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  boxShadow:"0 0 20px #7744cc88",
                }}>
                  <span style={{fontSize:"36px",filter:"drop-shadow(0 0 8px #aa66ff)"}}>🦸</span>
                </div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"13px",color:"#9966ff",letterSpacing:"3px",fontWeight:700}}>HERO CARDS</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"10px",color:"#5533aa",letterSpacing:"4px"}}>TAP TO REVEAL</div>
              </div>
              {/* Shimmer sweep */}
              <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 35%,rgba(150,100,255,0.08) 50%,transparent 65%)",animation:"shimmer 2.5s ease-in-out infinite"}}/>
            </div>
          )}
          {flipped&&(()=>{
            const flyAnim=card.rarity==="Legendary"?"flyInBottom 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards":
                          card.rarity==="Epic"?"flyInLeft 0.45s cubic-bezier(0.175,0.885,0.32,1.275) forwards":
                          "flyInBottom 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards";
            const cfg=RC[card.rarity];
            return(
              <div style={{position:"relative"}}>
                {/* Legendary particle burst rings */}
                {card.rarity==="Legendary"&&[...Array(8)].map((_,i)=>(
                  <div key={i} style={{
                    position:"absolute",top:"50%",left:"50%",
                    width:"20px",height:"20px",
                    borderRadius:"50%",
                    background:cfg.color,
                    transform:"translate(-50%,-50%)",
                    animation:`particleBurst 0.7s ease-out ${i*0.05}s forwards`,
                    transformOrigin:`${Math.cos(i/8*Math.PI*2)*80}px ${Math.sin(i/8*Math.PI*2)*80}px`,
                  }}/>
                ))}
                {/* Rarity glow behind card */}
                {["Legendary","Epic"].includes(card.rarity)&&(
                  <div style={{
                    position:"absolute",inset:"-20px",
                    background:`radial-gradient(ellipse at center, ${cfg.color}55 0%, transparent 70%)`,
                    borderRadius:"24px",
                    animation:"rarityPulse 1s ease-in-out infinite",
                    zIndex:0,
                  }}/>
                )}
                <CardWrapper className="pack-card-inner" width="281px" flyAnim={flyAnim} zIndex={1}>
                  <HeroCard card={card} size="normal" fill showShine={["Legendary","Epic","Rare"].includes(card.rarity)}/>
                </CardWrapper>
              </div>
            );
          })()}
        </div>

        {flipped&&(()=>{
          const isDupe=collection.some(c=>c.id===card.id);
          const dupeCredits=DUPE_CREDITS[card.rarity];
          return(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"14px"}}>
              {isDupe&&(
                <div style={{background:"#1a1a1a",border:"2px solid #ff6b35",borderRadius:"11px",padding:"7px 25px",display:"flex",alignItems:"center",gap:"11px"}}>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",color:"#ff6b35",letterSpacing:"2px",fontWeight:700}}>DUPLICATE</span>
                  <span style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",color:"#ffa060"}}>+{dupeCredits} 💎</span>
                </div>
              )}
              <div style={{
                fontFamily:"'Orbitron',monospace",fontSize:"25px",fontWeight:700,
                color:RC[card.rarity].color,letterSpacing:"2px",
                textShadow:`0 0 12px ${RC[card.rarity].color}`,
              }}>{card.rarity.toUpperCase()}</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"21px",color:"#d0d4e8"}}>
                {current<cards.length-1?"Tap for next card →":"Tap to see all cards"}
              </div>
            </div>
          );
        })()}
        {!flipped&&(
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"21px",color:"#a0a8c0"}}>
            Card {current+1} of {cards.length}
          </div>
        )}
      </>}

      {/* Summary screen */}
      {done&&<>
        {(()=>{
          const dupes=cards.filter(c=>collection.some(col=>col.id===c.id));
          const totalDupeCredits=dupes.reduce((sum,c)=>sum+DUPE_CREDITS[c.rarity],0);
          return(<>
            <div style={{display:"flex",flexDirection:"row",flexWrap:"wrap",gap:"12px",justifyContent:"center",maxWidth:"700px",padding:"0 20px"}}>
              {cards.map((c,i)=>{
                const isDupe=collection.some(col=>col.id===c.id);
                return(
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                    {isDupe&&(
                      <div style={{background:"#ff6b35ee",borderRadius:"6px",padding:"3px 10px",fontFamily:"'Orbitron',monospace",fontSize:"11px",color:"#fff",fontWeight:700,letterSpacing:"1px",whiteSpace:"nowrap"}}>DUPE</div>
                    )}
                    <HeroCard card={c} size="small" showShine={["Legendary","Epic","Rare"].includes(c.rarity)&&!isDupe}/>
                    <span style={{fontFamily:"'Orbitron',monospace",fontSize:"14px",color:isDupe?"#ff6b35":RC[c.rarity].color}}>{isDupe?`+${DUPE_CREDITS[c.rarity]}💎`:c.rarity[0]}</span>
                  </div>
                );
              })}
            </div>
            {totalDupeCredits>0&&(
              traded
                ?<div style={{background:"#1a2a1a",border:"1px solid #4caf5066",borderRadius:"14px",padding:"14px 34px",fontFamily:"'Orbitron',monospace",fontSize:"16px",color:"#81c784",letterSpacing:"1px"}}>✓ Traded! +{totalDupeCredits} 💎</div>
                :<button onClick={()=>{onTradeDupes(dupes);setTraded(true);}} style={{background:"linear-gradient(135deg,#ff6b35,#ff9060)",border:"none",borderRadius:"14px",padding:"14px 34px",fontFamily:"'Orbitron',monospace",fontSize:"16px",fontWeight:700,color:"#fff",cursor:"pointer",letterSpacing:"1px",boxShadow:"0 0 18px #ff6b3566"}}>Trade duplicates for +{totalDupeCredits} 💎</button>
            )}
          </>);
        })()}
        <button onClick={onDone} style={{
          background:"linear-gradient(135deg,#4fc3f7,#00e5ff)",border:"none",borderRadius:"20px",
          padding:"22px 78px",fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:700,
          color:"#060610",cursor:"pointer",letterSpacing:"2px",
          boxShadow:"0 0 28px #4fc3f766",animation:"powerUp 1.5s ease-in-out infinite",
        }}>CONTINUE →</button>
      </>}
    </div>
  );
  return ReactDOM.createPortal(overlay, document.body);
}

/* ── CMS Card Editor ── */
function CardCMS({onSave,notify}){
  const [cards,setCards]=useState(()=>JSON.parse(JSON.stringify(ALL_CARDS)));
  const [search,setSearch]=useState("");
  const [editId,setEditId]=useState(null);
  const [draft,setDraft]=useState(null);
  const [filterRarity,setFilterRarity]=useState("All");
  const [filterPack,setFilterPack]=useState(0);
  const [filterType,setFilterType]=useState("All");
  const [saved,setSaved]=useState(false);
  const [uploadingImage,setUploadingImage]=useState(false);

  const types=["Speedster","Brainiac","Blaster","Tank","Healer","Stealth","Elemental","Tech","Mystic","Brawler","Flier","Shapeshifter","Cosmic","Alien","Gadgets"];
  const rarities=["Common","Uncommon","Rare","Epic","Legendary"];

  const openEdit=(card)=>{setDraft({...card});setEditId(card.id);};
  const closeEdit=()=>{setEditId(null);setDraft(null);};

  const saveEdit=async()=>{
    if(!draft)return;
    let finalDraft={...draft,id:Number(draft.id),power:Number(draft.power),defense:Number(draft.defense),speed:Number(draft.speed)};
    // Auto-migrate base64 image to Storage on save
    if(finalDraft.imageUrl&&finalDraft.imageUrl.startsWith("data:")){
      try{
        setUploadingImage(true);
        const res=await fetch(finalDraft.imageUrl);
        const blob=await res.blob();
        const ext=blob.type.split("/")[1]||"png";
        const path=`card-images/card_${finalDraft.id}.${ext}`;
        const ref=storage.ref(path);
        await ref.put(blob);
        const url=await ref.getDownloadURL();
        finalDraft={...finalDraft,imageUrl:url};
      }catch(err){console.error("Image migration failed:",err);}
      finally{setUploadingImage(false);}
    }
    const updated=cards.map(c=>c.id===finalDraft.id?finalDraft:c);
    setCards(updated);
    // Persist to ALL_CARDS in memory so rest of app sees changes
    updated.forEach((c,i)=>{ Object.assign(ALL_CARDS[i],c); });
    closeEdit();
    notify("Card updated!","#4caf50");
  };

  const exportCards=()=>{
    const blob=new Blob([JSON.stringify(cards,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="herocards_data.json";a.click();
    URL.revokeObjectURL(url);
    notify("Exported cards JSON!","#4fc3f7");
  };

  let filtered=[...cards];
  if(filterRarity!=="All")filtered=filtered.filter(c=>c.rarity===filterRarity);
  if(filterPack!==0)filtered=filtered.filter(c=>c.pack===filterPack);
  if(filterType!=="All")filtered=filtered.filter(c=>c.type===filterType);
  if(search)filtered=filtered.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||String(c.id).includes(search));

  const inputStyle={background:"#060610",border:"1px solid #1a2040",borderRadius:"8px",padding:"11px 14px",color:"#e8e8f0",fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",outline:"none",width:"100%"};
  const labelStyle={fontFamily:"'Orbitron',monospace",fontSize:"13px",color:"#c0c4d8",letterSpacing:"2px",marginBottom:"6px",display:"block"};

  return(
    <div style={{padding:"28px 34px",animation:"fadeIn 0.3s ease-out"}}>

      {/* Edit modal */}
      {editId&&draft&&ReactDOM.createPortal(
        <div style={{position:"fixed",inset:0,background:"#000000e0",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"28px"}}>
          <div style={{background:"#0a0a1e",border:"1px solid #ff9800aa",borderRadius:"22px",padding:"48px",width:"100%",maxWidth:"1100px",maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"31px"}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",color:"#ff9800",letterSpacing:"2px"}}>EDITING CARD #{String(draft.id).padStart(3,"0")}</div>
              <button onClick={closeEdit} style={{background:"transparent",border:"1px solid #2a2a4a",borderRadius:"8px",padding:"6px 17px",color:"#c0c4d8",cursor:"pointer",fontSize:"20px"}}>✕</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
              {/* ID */}
              <div>
                <label style={labelStyle}>CARD NUMBER</label>
                <input style={inputStyle} type="number" value={draft.id} onChange={e=>setDraft(d=>({...d,id:e.target.value}))}/>
              </div>
              {/* Emoji */}
              <div>
                <label style={labelStyle}>EMOJI</label>
                <input style={inputStyle} value={draft.emoji} onChange={e=>setDraft(d=>({...d,emoji:e.target.value}))}/>
              </div>
              {/* Name - full width */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={labelStyle}>NAME</label>
                <input style={inputStyle} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/>
              </div>
              {/* Type */}
              <div>
                <label style={labelStyle}>TYPE</label>
                <select style={{...inputStyle,cursor:"pointer"}} value={draft.type} onChange={e=>setDraft(d=>({...d,type:e.target.value}))}>
                  {types.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Rarity */}
              <div>
                <label style={labelStyle}>RARITY</label>
                <select style={{...inputStyle,cursor:"pointer"}} value={draft.rarity} onChange={e=>setDraft(d=>({...d,rarity:e.target.value}))}>
                  {rarities.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {/* Pack */}
              <div>
                <label style={labelStyle}>PACK</label>
                <select style={{...inputStyle,cursor:"pointer"}} value={draft.pack} onChange={e=>setDraft(d=>({...d,pack:Number(e.target.value)}))}>
                  <option value={1}>Infinite Waves</option>
                  <option value={2}>Shrouded Mysteries</option>
                </select>
              </div>
              {/* Alliance */}
              <div>
                <label style={labelStyle}>ALLIANCE</label>
                <select style={{...inputStyle,cursor:"pointer"}} value={draft.alliance||"Hero"} onChange={e=>setDraft(d=>({...d,alliance:e.target.value}))}>
                  {["Hero","Villain","Anti-Hero"].map(a=><option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {/* Stats */}
              {[["POWER","power"],["DEFENSE","defense"],["SPEED","speed"]].map(([label,key])=>(
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input style={inputStyle} type="number" min="1" max="100" value={draft[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))}/>
                </div>
              ))}
              {/* Desc - full width */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={labelStyle}>DESCRIPTION</label>
                <textarea style={{...inputStyle,height:"101px",resize:"vertical"}} value={draft.desc} onChange={e=>setDraft(d=>({...d,desc:e.target.value}))}/>
              </div>
              {/* Hero Image - full width */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={labelStyle}>HERO IMAGE</label>
                {/* Upload button */}
                <div style={{display:"flex",gap:"14px",alignItems:"center",marginBottom:"11px"}}>
                  <label style={{
                    background:uploadingImage?"#1a2040":"linear-gradient(135deg,#4fc3f7,#00e5ff)",border:"none",borderRadius:"11px",
                    padding:"13px 25px",fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:700,
                    color:uploadingImage?"#4fc3f7":"#060610",cursor:uploadingImage?"not-allowed":"pointer",letterSpacing:"1px",flexShrink:0,
                  }}>
                    {uploadingImage?"⏳ UPLOADING...":"📁 UPLOAD IMAGE"}
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                      const file=e.target.files[0];
                      if(!file)return;
                      if(file.size>5*1024*1024){alert("Image must be under 5MB");return;}
                      setUploadingImage(true);
                      try{
                        const ext=file.name.split('.').pop();
                        const path=`card-images/card_${draft.id}_${Date.now()}.${ext}`;
                        const ref=storage.ref(path);
                        await ref.put(file);
                        const url=await ref.getDownloadURL();
                        setDraft(d=>({...d,imageUrl:url}));
                        notify("Image uploaded!","#4caf50");
                      }catch(err){
                        console.error(err);
                        alert("Upload failed: "+err.message);
                      }finally{
                        setUploadingImage(false);
                      }
                    }}/>
                  </label>
                  <span style={{color:"#c8d0e0",fontSize:"15px",fontFamily:"monospace"}}>or paste a URL below</span>
                </div>
                <input style={inputStyle} value={(draft.imageUrl&&!draft.imageUrl.startsWith("data:"))?draft.imageUrl:""} placeholder="https://i.imgur.com/... (or use Upload button above)" onChange={e=>setDraft(d=>({...d,imageUrl:e.target.value.trim()||undefined}))}/>
                {draft.imageUrl&&(
                  <div style={{marginTop:"14px",display:"flex",alignItems:"center",gap:"17px",background:"#0a0a20",borderRadius:"11px",padding:"14px"}}>
                    <img
                      src={draft.imageUrl}
                      alt="preview"
                      style={{width:"101px",height:"101px",objectFit:"cover",objectPosition:"top",borderRadius:"8px",border:"1px solid #2a2a4a",flexShrink:0}}
                      onError={e=>{e.target.style.opacity="0.2";}}
                    />
                    <div style={{flex:1,fontSize:"15px",color:"#d0d4e8",fontFamily:"monospace",lineHeight:1.6}}>
                      {draft.imageUrl.startsWith("data:")
                        ? `⚠ Legacy base64 — re-upload to move to Storage`
                        : draft.imageUrl.includes("firebasestorage")
                          ? "✓ Stored in Firebase Storage"
                          : "✓ URL set"}
                      <br/>
                      <span style={{color:"#a0a8c0",fontSize:"14px"}}>Replaces emoji on card</span>
                    </div>
                    <button onClick={()=>setDraft(d=>({...d,imageUrl:undefined}))} style={{background:"transparent",border:"1px solid #ef535044",borderRadius:"8px",padding:"7px 17px",color:"#ef5350",cursor:"pointer",fontFamily:"monospace",fontSize:"15px",flexShrink:0}}>✕ Remove</button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div style={{margin:"18px 0",display:"flex",justifyContent:"center"}}>
              <HeroCard card={{...draft,id:Number(draft.id),power:Number(draft.power),defense:Number(draft.defense),speed:Number(draft.speed)}} size="normal"/>
            </div>

            <div style={{display:"flex",gap:"14px",justifyContent:"flex-end"}}>
              <button onClick={closeEdit} style={{background:"transparent",border:"1px solid #2a2a4a",borderRadius:"11px",padding:"14px 31px",color:"#c0c4d8",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"15px",letterSpacing:"1px"}}>CANCEL</button>
              <button onClick={saveEdit} style={{background:"linear-gradient(135deg,#4caf50,#00e676)",border:"none",borderRadius:"11px",padding:"14px 31px",fontFamily:"'Orbitron',monospace",fontSize:"15px",fontWeight:700,color:"#060610",cursor:"pointer",letterSpacing:"1px"}}>SAVE CHANGES</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"25px",flexWrap:"wrap",gap:"14px"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"20px",color:"#ff9800",letterSpacing:"2px"}}>⚡ CARD EDITOR — {cards.length} CARDS</div>
        <div style={{display:"flex",gap:"11px",flexWrap:"wrap"}}>
          {cards.filter(c=>c.imageUrl&&c.imageUrl.startsWith("data:")).length>0&&(
            <button onClick={async()=>{
              const base64Cards=cards.filter(c=>c.imageUrl&&c.imageUrl.startsWith("data:"));
              if(!auth.currentUser){
                alert("Please sign out of God Mode and log in with your real account before migrating images.");
                return;
              }
              notify(`Migrating ${base64Cards.length} images to Firebase Storage...`,"#ff9800");
              let migrated=0;
              const updated=[...cards];
              for(const card of base64Cards){
                try{
                  const res=await fetch(card.imageUrl);
                  const blob=await res.blob();
                  const ext=blob.type.split("/")[1]||"png";
                  const path=`card-images/card_${card.id}.${ext}`;
                  const ref=storage.ref(path);
                  await ref.put(blob);
                  const url=await ref.getDownloadURL();
                  const idx=updated.findIndex(c=>c.id===card.id);
                  updated[idx]={...updated[idx],imageUrl:url};
                  Object.assign(ALL_CARDS[idx],{imageUrl:url});
                  migrated++;
                }catch(err){console.error("Failed card",card.id,err);}
              }
              setCards(updated);
              notify(`✓ Migrated ${migrated} images to Firebase Storage!`,"#4caf50");
            }} style={{background:"linear-gradient(135deg,#ff9800,#ffc04a)",border:"none",borderRadius:"11px",padding:"11px 22px",color:"#060610",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"14px",letterSpacing:"1px",fontWeight:700}}>
              ☁ MIGRATE {cards.filter(c=>c.imageUrl&&c.imageUrl.startsWith("data:")).length} IMAGES TO STORAGE
            </button>
          )}
          <button onClick={exportCards} style={{background:"transparent",border:"1px solid #4fc3f744",borderRadius:"11px",padding:"11px 22px",color:"#4fc3f7",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"14px",letterSpacing:"1px"}}>⬇ EXPORT JSON</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:"11px",flexWrap:"wrap",marginBottom:"14px"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or ID..." style={{...inputStyle,width:"308px",fontSize:"18px"}}/>
        <select style={{...inputStyle,width:"auto",cursor:"pointer",fontSize:"18px"}} value={filterRarity} onChange={e=>setFilterRarity(e.target.value)}>
          <option value="All">All Rarities</option>
          {rarities.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select style={{...inputStyle,width:"auto",cursor:"pointer",fontSize:"18px"}} value={filterPack} onChange={e=>setFilterPack(Number(e.target.value))}>
          <option value={0}>All Packs</option>
          <option value={1}>Infinite Waves</option>
          <option value={2}>Shrouded Mysteries</option>
        </select>
        <select style={{...inputStyle,width:"auto",cursor:"pointer",fontSize:"18px"}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          {types.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{fontSize:"17px",color:"#c0c4d8",fontFamily:"monospace",marginBottom:"22px"}}>{filtered.length} cards shown</div>

      {/* Card table */}
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'Rajdhani',sans-serif",fontSize:"20px"}}>
          <thead>
            <tr style={{borderBottom:"1px solid #1a1a3a"}}>
              {["#","EMOJI","NAME","TYPE","RARITY","ALLIANCE","PACK","PWR","DEF","SPD",""].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left",fontFamily:"'Orbitron',monospace",fontSize:"13px",color:"#c0c4d8",letterSpacing:"1.5px",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(card=>{
              const cfg=RC[card.rarity];
              const tc=TYPE_COLORS[card.type]||"#888";
              return(
                <tr key={card.id} style={{borderBottom:"1px solid #0f0f24",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#0d0d22"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"13px 14px",color:"#c0c4d8",fontFamily:"monospace",fontSize:"17px"}}>#{String(card.id).padStart(3,"0")}</td>
                  <td style={{padding:"13px 14px"}}>
                    {card.imageUrl?(
                      <img src={card.imageUrl.replace(/\/file\/d\/([^/]+)\/.*/,"https://drive.google.com/uc?export=view&id=$1")} alt="" style={{width:"45px",height:"45px",objectFit:"cover",objectPosition:"top",borderRadius:"6px",verticalAlign:"middle"}} onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="inline";}} />
                    ):null}
                    <span style={{fontSize:"28px",display:card.imageUrl?"none":"inline"}}>{card.emoji}</span>
                  </td>
                  <td style={{padding:"13px 14px",color:"#e8e8f0",fontWeight:600}}>{card.name}</td>
                  <td style={{padding:"13px 14px"}}><span style={{color:tc,fontFamily:"monospace",fontSize:"17px",fontWeight:600}}>{card.type}</span></td>
                  <td style={{padding:"13px 14px"}}><span style={{color:cfg.color,fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700}}>{card.rarity}</span></td>
                  <td style={{padding:"13px 14px"}}>
                    {(()=>{const a=ALLIANCE_COLORS[card.alliance]||ALLIANCE_COLORS["Hero"];return<span style={{color:a.color,fontFamily:"'Orbitron',monospace",fontSize:"14px",fontWeight:700}}>{a.icon} {card.alliance||"Hero"}</span>})()}
                  </td>
                  <td style={{padding:"13px 14px",color:"#c0c4d8",fontSize:"17px"}}>{card.pack===1?"🌊":"🌑"}</td>
                  <td style={{padding:"13px 14px",color:"#ff7a50",fontFamily:"monospace"}}>{card.power}</td>
                  <td style={{padding:"13px 14px",color:"#60c4ff",fontFamily:"monospace"}}>{card.defense}</td>
                  <td style={{padding:"13px 14px",color:"#ffe566",fontFamily:"monospace"}}>{card.speed}</td>
                  <td style={{padding:"13px 14px"}}>
                    <button onClick={()=>openEdit(card)} style={{background:"#ff980018",border:"1px solid #ff980055",borderRadius:"8px",padding:"7px 20px",color:"#ff9800",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:"14px",letterSpacing:"1px",whiteSpace:"nowrap"}}>EDIT</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({tab,setTab,selectedCard,collection,isGod=false}){
  const items=[{id:"home",icon:"🏠",l:"Home"},{id:"collection",icon:"📋",l:"Collection"},{id:"store",icon:"🛒",l:"Store"},{id:"quests",icon:"⚡",l:"Quests"},{id:"achievements",icon:"🏆",l:"Achievements"},{id:"battle",icon:"⚔️",l:"Battle"},...(isGod?[{id:"cms",icon:"✏️",l:"Card Editor"}]:[])];
  return(
    <div className="sidebar" style={{flexDirection:"column",width:"354px",flexShrink:0,background:"#08081a",borderRight:"1px solid #12122a",padding:"25px 0px",position:"sticky",top:"57px",height:"calc(100vh - 57px)",overflowY:"auto"}}>
      {items.map(it=><button key={it.id} onClick={()=>setTab(it.id)} style={{display:"flex",alignItems:"center",gap:"17px",padding:"20px 29px",background:tab===it.id?"#4fc3f711":"transparent",border:"none",borderLeft:tab===it.id?"3px solid #4fc3f7":"3px solid transparent",color:tab===it.id?"#4fc3f7":"#d0d4e8",fontFamily:"'Rajdhani',sans-serif",fontSize:"25px",letterSpacing:"1.2px",cursor:"pointer",transition:"all 0.2s",width:"100%",textAlign:"left",fontWeight:600}}><span style={{fontSize:"25px"}}>{it.icon}</span>{it.l}</button>)}
      <div style={{margin:"20px 16px 0",borderTop:"1px solid #12122a",paddingTop:"16px"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"17px",color:"#d0d4e8",letterSpacing:"2.3px",marginBottom:"20px"}}>RARITY</div>
        {Object.entries(RC).reverse().map(([r,c])=><div key={r} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}><div style={{width:"11px",height:"11px",borderRadius:"50%",background:c.color,flexShrink:0}}/><span style={{color:c.color,fontFamily:"'Rajdhani',sans-serif",fontSize:"21px",fontWeight:600}}>{r}</span><span style={{color:"#c0c4d8",fontSize:"20px",fontFamily:"monospace",marginLeft:"auto"}}>{c.chance}%</span></div>)}
      </div>
      <div style={{margin:"14px 16px 0"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:"17px",color:"#d0d4e8",letterSpacing:"2.3px",marginBottom:"13px"}}>PROGRESS</div>
        <div style={{fontSize:"21px",color:"#a0a8c0",fontFamily:"monospace"}}>{collection.length}/{ALL_CARDS.length}</div>
        <div style={{height:"4px",background:"#12122a",borderRadius:"3px",marginTop:"8px"}}><div style={{width:`${(collection.length/ALL_CARDS.length)*100}%`,height:"100%",background:"linear-gradient(90deg,#4fc3f7,#00e5ff)",borderRadius:"3px",transition:"width 0.5s"}}/></div>
      </div>
    </div>
  );
}

/* ── Bottom nav ── */
function BottomNav({tab,setTab,selectedCard,isGod=false,onLogout}){
  const [open,setOpen]=useState(false);
  const items=[{id:"home",icon:"🏠",l:"Home"},{id:"collection",icon:"📋",l:"Cards"},{id:"store",icon:"🛒",l:"Store"},{id:"quests",icon:"⚡",l:"Quests"},{id:"achievements",icon:"🏆",l:"Achievements"},{id:"battle",icon:"⚔️",l:"Battle"},...(isGod?[{id:"cms",icon:"✏️",l:"Card Editor"}]:[])];
  return(
    <div className="bottom-nav">
      <button className="hamburger-btn" onClick={()=>setOpen(o=>!o)} aria-label="Menu">
        {open?"✕":"☰"}
      </button>
      {open&&<div className="hamburger-backdrop" onClick={()=>setOpen(false)}/>}
      <div className="hamburger-drawer" style={{transform:open?"translateX(0)":"translateX(-100%)"}}>
        <div style={{padding:"16px 24px 14px",borderBottom:"1px solid #12122a",marginBottom:"6px"}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:"18px",fontWeight:900,letterSpacing:"3px",color:"#4fc3f7"}}>MENU</div>
        </div>
        {items.map(it=><button key={it.id} onClick={()=>{setTab(it.id);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:"16px",padding:"17px 24px",background:tab===it.id?"#4fc3f711":"transparent",border:"none",borderLeft:tab===it.id?"3px solid #4fc3f7":"3px solid transparent",color:tab===it.id?"#4fc3f7":"#d0d4e8",fontFamily:"'Rajdhani',sans-serif",fontSize:"22px",letterSpacing:"1px",cursor:"pointer",width:"100%",textAlign:"left",fontWeight:600}}><span style={{fontSize:"22px"}}>{it.icon}</span>{it.l}</button>)}
        <div style={{padding:"16px 24px 0",borderTop:"1px solid #12122a",marginTop:"12px"}}>
          <button onClick={()=>{onLogout();setOpen(false);}} style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 0",background:"transparent",border:"none",color:"#c8ccde",fontFamily:"'Rajdhani',sans-serif",fontSize:"20px",cursor:"pointer",width:"100%",letterSpacing:"1px",fontWeight:600}}>🚪 SIGN OUT</button>
        </div>
      </div>
    </div>
  );
}

/* ── Auth screen ── */
function AuthScreen({onLogin,godMode,onToggleGodMode,onEnterGodMode}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const friendlyError=(code)=>{
    const map={
      "auth/email-already-in-use":"Email already registered.",
      "auth/invalid-email":"Invalid email address.",
      "auth/weak-password":"Password must be at least 6 characters.",
      "auth/user-not-found":"No account found with that email.",
      "auth/wrong-password":"Incorrect password.",
      "auth/invalid-credential":"Incorrect email or password.",
      "auth/too-many-requests":"Too many attempts. Try again later.",
      "auth/network-request-failed":"Network error. Check your connection.",
    };
    return map[code]||"Something went wrong. Try again.";
  };

  const handle=async()=>{
    if(!email){setError("Enter your email.");return;}
    if(!password){setError("Enter your password.");return;}
    if(mode==="register"&&!username.trim()){setError("Enter a username.");return;}
    if(mode==="register"&&username.trim().length<3){setError("Username must be 3+ characters.");return;}
    setLoading(true);setError("");
    try{
      if(mode==="register"){
        // Check username not taken
        const snap=await db.collection("usernames").doc(username.trim().toLowerCase()).get();
        if(snap.exists){setError("Username already taken.");setLoading(false);return;}
        const cred=await auth.createUserWithEmailAndPassword(email,password);
        await db.collection("usernames").doc(username.trim().toLowerCase()).set({uid:cred.user.uid});
        await db.collection("users").doc(cred.user.uid).set({
          username:username.trim(),
          coins:350,
          collection:[],
          questDate:"",
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        });
        onLogin(cred.user.uid,username.trim(),{coins:350,collection:[],questDate:""});
      }else{
        const cred=await auth.signInWithEmailAndPassword(email,password);
        const snap=await db.collection("users").doc(cred.user.uid).get();
        const data=snap.data();
        onLogin(cred.user.uid,data.username,{coins:data.coins,collection:data.collection||[],questDate:data.questDate||""});
      }
    }catch(e){
      setError(friendlyError(e.code));
      setLoading(false);
    }
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"39px",background:"#060610"}}>
      <div style={{fontSize:"104px",animation:"float 3s ease-in-out infinite",marginBottom:"20px"}}>🦸</div>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:"45px",fontWeight:900,color:"#4fc3f7",letterSpacing:"3.4px",animation:"glow 3s ease-in-out infinite",marginBottom:"7px"}}>HERO CARDS</div>
      <div style={{fontSize:"20px",color:"#d0d4e8",letterSpacing:"3.4px",fontFamily:"monospace",marginBottom:"52px"}}>SUPERHERO COLLECTION</div>

      <div style={{width:"100%",maxWidth:"360px",background:"#0a0a1e",borderRadius:"22px",padding:"39px",border:"1px solid #12122a"}}>
        <div style={{display:"flex",marginBottom:"32px",borderRadius:"13px",overflow:"hidden",border:"1px solid #12122a"}}>
          {["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setError("");}} style={{flex:1,padding:"14px",background:mode===m?"#4fc3f7":"transparent",border:"none",color:mode===m?"#060610":"#d0d4e8",fontFamily:"'Orbitron',monospace",fontSize:"18px",cursor:"pointer",letterSpacing:"1.2px",fontWeight:700}}>{m==="login"?"SIGN IN":"REGISTER"}</button>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"17px"}}>
          {mode==="register"&&<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username (shown in game)" onKeyDown={e=>e.key==="Enter"&&handle()}/>}
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" onKeyDown={e=>e.key==="Enter"&&handle()}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"Password (min 6 chars)":"Password"} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          {error&&<div style={{color:"#ef5350",fontSize:"20px",fontFamily:"monospace",textAlign:"center",lineHeight:1.5}}>{error}</div>}
          <button onClick={handle} disabled={loading} style={{background:loading?"#a0a8c0":"linear-gradient(135deg,#4fc3f7,#00e5ff)",border:"none",borderRadius:"13px",padding:"21px",fontFamily:"'Orbitron',monospace",fontSize:"22px",fontWeight:700,color:"#060610",cursor:loading?"not-allowed":"pointer",letterSpacing:"2.3px",marginTop:"7px",display:"flex",alignItems:"center",justifyContent:"center",gap:"13px"}}>
            {loading?<><Spinner size={16} color="#4fc3f7"/><span>LOADING...</span></>:(mode==="login"?"ENTER":"CREATE ACCOUNT")}
          </button>
        </div>
      </div>
      <div style={{marginTop:"22px",fontSize:"17px",color:"#a0a8c0",fontFamily:"monospace",textAlign:"center"}}>
        Syncs across all your devices · Secured by Firebase
      </div>

      {/* God mode section */}
      <div style={{marginTop:"52px",width:"100%",maxWidth:"360px"}}>
        <div style={{borderTop:"1px solid #0f0f24",paddingTop:"20px",display:"flex",flexDirection:"column",alignItems:"center",gap:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"21px",color:"#d0d4e8",letterSpacing:"2.3px"}}>GOD MODE</span>
            {/* Toggle switch */}
            <div onClick={onToggleGodMode} style={{width:"71px",height:"39px",borderRadius:"20px",background:godMode?"#ff9800":"#a0a8c0",border:`1px solid ${godMode?"#ff9800":"#c0c4d8"}`,cursor:"pointer",position:"relative",transition:"all 0.2s",flexShrink:0}}>
              <div style={{position:"absolute",top:"3px",left:godMode?"22px":"3px",width:"25px",height:"25px",borderRadius:"50%",background:godMode?"#060610":"#c8ccde",transition:"left 0.2s"}}/>
            </div>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:"21px",color:godMode?"#ff9800":"#d0d4e8",letterSpacing:"1.2px"}}>{godMode?"ON":"OFF"}</span>
          </div>
          {godMode&&(
            <button onClick={onEnterGodMode} style={{background:"linear-gradient(135deg,#ff6b00,#ff9800)",border:"none",borderRadius:"13px",padding:"18px 52px",fontFamily:"'Orbitron',monospace",fontSize:"20px",fontWeight:700,color:"#060610",cursor:"pointer",letterSpacing:"2.3px",animation:"pulse 2s ease-in-out infinite"}}>
              ⚡ ENTER AS GOD
            </button>
          )}
          {godMode&&<div style={{fontSize:"20px",color:"#ff980099",fontFamily:"monospace",textAlign:"center",lineHeight:1.6}}>All 200 cards unlocked · 99999 credits<br/>No login required · Nothing is saved</div>}
          {!godMode&&<div style={{fontSize:"17px",color:"#a0a8c0",fontFamily:"monospace",textAlign:"center"}}>Enable to test without logging in</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Main Game ── */
