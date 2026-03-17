/* ═══════════════════════════════════════════════════════════════════
   BATTLE ENGINE  —  Session 1: Combat Engine
   Pure JS / no React / no Firebase.
   All functions are exported as globals for use by battle-ui.js.
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. TYPE SYSTEM ─────────────────────────────────────────────── */

const BATTLE_TYPE_MAP = {
  Brawler:'Melee',    Tank:'Melee',         Alien:'Melee',
  Speedster:'Agility',Flier:'Agility',      Stealth:'Agility',
  Blaster:'Energy',   Elemental:'Energy',   Cosmic:'Energy',
  Tech:'Intelligence',Gadgets:'Intelligence',Brainiac:'Intelligence',
  Healer:'Magic',     Mystic:'Magic',       Shapeshifter:'Magic',
};

// Advantage cycle: Melee(0) → Agility(1) → Energy(2) → Intelligence(3) → Magic(4) → Melee
const BATTLE_CYCLE = ['Melee','Agility','Energy','Intelligence','Magic'];

function battleCategory(type){ return BATTLE_TYPE_MAP[type]||null; }

function getTypeMultiplier(atkType, defType){
  const a = BATTLE_CYCLE.indexOf(battleCategory(atkType));
  const d = BATTLE_CYCLE.indexOf(battleCategory(defType));
  if(a<0||d<0) return 1.0;
  const next = (a+1)%5;
  const prev = (a+4)%5;
  if(d===next) return 1.5;              // strong against
  if(d===prev||d===a) return 0.75;      // weak against (prev in cycle or same)
  return 1.0;                           // neutral
}

/* ── 2. HP & EFFECTIVE STATS ────────────────────────────────────── */

function calcMaxHp(card){
  return Math.round(100 + card.defense * 0.5);
}

// Effective stats account for mid-battle modifiers (Fortify, Apex Predator, etc.)
function effPower(bc){
  let p = bc.power;
  if(bc._apexMult>1) p = Math.round(p * bc._apexMult);
  return p;
}
function effDefense(bc){
  let d = bc.defense + bc._fortifyBonus;
  if(bc._apexMult>1) d = Math.round(bc.defense * bc._apexMult) + bc._fortifyBonus;
  return d;
}
function effSpeed(bc){
  // Apex Predator speed increase applies from the following round — tracked via _apexSpeedNext
  let s = bc.speed;
  if(bc._apexSpeedMult>1) s = Math.round(s * bc._apexSpeedMult);
  return s;
}

/* ── 3. BATTLE CARD INIT ────────────────────────────────────────── */

function initBattleCard(card, fullDeck){
  const bc = {
    ...card,
    hp:       calcMaxHp(card),
    maxHp:    calcMaxHp(card),
    ability:  card.ability || null,

    // ── one-time flags ──
    _shieldUsed:      false,   // Shield Up
    _smokeUsed:       false,   // Smoke Screen
    _adaptableUsed:   false,   // Adaptable
    _secondWindUsed:  false,   // Second Wind
    _lastStandUsed:   false,   // Last Stand
    _lastStandActive: false,   // Last Stand +50% atk active

    // ── stack counters ──
    _unstoppableLeft: 3,       // Unstoppable attacks remaining
    _fortifyBonus:    0,       // Fortify defence accumulator
    _momentumStacks:  0,       // Momentum kill streak
    _apexMult:        1,       // Apex Predator power/defence multiplier
    _apexSpeedMult:   1,       // Apex Predator speed (applied next round)

    // ── active DoT / debuffs on this card ──
    _bleedRoundsLeft: 0,
    _bleedDmgPerRound:0,
    _dominateDebuff:  false,   // Dominate −25% atk

    // ── bonus flags set at entry or deck-assembly ──
    _packTactics:     false,   // Pack Tactics +15% dmg
    _reboundBonus:    false,   // Rebound +15% dmg
  };

  // Pack Tactics: check at deck-assembly time
  if(bc.ability==='Pack Tactics' && fullDeck){
    const ownCat = battleCategory(bc.type);
    bc._packTactics = fullDeck.some(c => c.id!==bc.id && battleCategory(c.type)===ownCat);
  }

  return bc;
}

/* ── 4. SIDE STATE INIT ─────────────────────────────────────────── */

function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5); }

function initSideState(deck){
  const cards = shuffle(deck).map(c => initBattleCard(c, deck));
  // active=cards[0], hand=cards[1-4], deck=cards[5-9]
  return {
    active:   cards[0],
    hand:     cards.slice(1,5),
    deck:     cards.slice(5),
    defeated: [],
    attackMult:       1.0,  // Intimidate debuff (−15%)
    intimidated:      false,
    pendingRebound:   false, // next card entering this side gets +15% dmg (Rebound)
    pendingDominate:  false, // next card entering this side gets −25% atk (Dominate)
  };
}

/* ── 5. IMMUNITY HELPER ─────────────────────────────────────────── */

function isImmune(bc){ return bc.ability==='Immunity'; }

/* ── 6. ENTRY EFFECTS ───────────────────────────────────────────── */
// Called whenever a card becomes the active card on 'side'.

function applyEntryEffects(bc, side, opponentSide, log){
  // Rebound bonus (set by previous card on same side)
  if(side.pendingRebound){
    bc._reboundBonus = true;
    side.pendingRebound = false;
    log.push({type:'ABILITY',ability:'Rebound',card:bc.name,side:side===opponentSide?'ai':'player',
      effect:'+15% damage this card'});
  }
  // Dominate debuff (set by opponent's last kill)
  if(side.pendingDominate && !isImmune(bc)){
    bc._dominateDebuff = true;
    side.pendingDominate = false;
    log.push({type:'ABILITY',ability:'Dominate',card:bc.name,side:side===opponentSide?'ai':'player',
      effect:'−25% attack this card'});
  }
  // Intimidate: if THIS card has Intimidate, debuff the opponent side
  if(bc.ability==='Intimidate' && !opponentSide.intimidated){
    opponentSide.attackMult *= 0.85;
    opponentSide.intimidated = true;
    log.push({type:'ABILITY',ability:'Intimidate',card:bc.name,
      effect:'Opponent attack −15% for remainder of battle'});
  }
}

/* ── 7. DRAW ────────────────────────────────────────────────────── */

function drawCard(side){
  if(side.deck.length>0){ side.hand.push(side.deck.shift()); return true; }
  return false;
}

/* ── 8. AI CARD SELECTION ───────────────────────────────────────── */
// Returns the card the AI will play from its hand given the opponent's active type.

function aiSelectCard(hand, opponentActiveType){
  if(!hand.length) return null;
  const totalStat = c => c.power + c.defense + c.speed;

  // Priority 1: type advantage
  const adv = hand.filter(c => getTypeMultiplier(c.type,opponentActiveType)===1.5);
  if(adv.length) return adv.reduce((b,c)=>totalStat(c)>totalStat(b)?c:b);

  // Priority 2: not weak to opponent
  const notWeak = hand.filter(c => getTypeMultiplier(c.type,opponentActiveType)!==0.75);
  if(notWeak.length) return notWeak.reduce((b,c)=>totalStat(c)>totalStat(b)?c:b);

  // Priority 3: all cards weak — highest stat
  return hand.reduce((b,c)=>totalStat(c)>totalStat(b)?c:b);
}

/* ── 9. EXECUTE ONE ATTACK ──────────────────────────────────────── */
// Follows the PRD resolution order:
//   1. type multiplier (+ ability modifiers)
//   2. damage = power × multiplier
//   3. defence reduction
//   4. damage floor (min 1)
//   5. on-damage triggers (Counterstrike, Bleed, Drain)
//   6. on-defeat check   → resolved by caller
//   7. post-round        → resolved by caller
//
// Returns { damage, killed }

function executeAttack(atk, def, atkSide, defSide, log){

  /* ─ Step 1: type multiplier ─ */
  let mult = getTypeMultiplier(atk.type, def.type);

  // Adaptable (defender): first type-advantage attack → neutral, one-time
  if(def.ability==='Adaptable' && !def._adaptableUsed && mult===1.5){
    def._adaptableUsed = true;
    mult = 1.0;
    log.push({type:'ABILITY',ability:'Adaptable',card:def.name,effect:'Type advantage reduced to neutral'});
  }
  // Unstoppable (attacker): first 3 attacks ignore type disadvantage
  if(atk.ability==='Unstoppable' && atk._unstoppableLeft>0 && mult===0.75){
    atk._unstoppableLeft--;
    mult = 1.0;
    log.push({type:'ABILITY',ability:'Unstoppable',card:atk.name,
      effect:`Type disadvantage ignored (${atk._unstoppableLeft} left)`});
  }
  // Overwhelm (attacker): type advantage → ×2.0 instead of ×1.5
  if(atk.ability==='Overwhelm' && mult===1.5){
    mult = 2.0;
    log.push({type:'ABILITY',ability:'Overwhelm',card:atk.name,effect:'Type advantage ×2.0'});
  }

  /* ─ Step 2-3: base damage ─ */
  let atkPow = effPower(atk);

  // Attacker debuffs
  atkPow = Math.round(atkPow * atkSide.attackMult);              // Intimidate
  if(atk._dominateDebuff && !isImmune(atk)){                    // Dominate
    atkPow = Math.round(atkPow * 0.75);
  }

  const defVal = effDefense(def) * 0.5;

  /* ─ Step 4: damage floor ─ */
  let dmg = Math.max(1, Math.round(atkPow * mult - defVal));

  /* ─ Attacker outgoing modifiers ─ */
  if(atk.ability==='Adrenaline' && atk.hp < atk.maxHp*0.3)
    dmg = Math.ceil(dmg*1.2);
  if(atk.ability==='Momentum' && atk._momentumStacks>0)
    dmg = Math.ceil(dmg*(1+atk._momentumStacks*0.1));
  if(atk.ability==='Pack Tactics' && atk._packTactics)
    dmg = Math.ceil(dmg*1.15);
  if(atk._reboundBonus)
    dmg = Math.ceil(dmg*1.15);
  if(atk._lastStandActive)
    dmg = Math.ceil(dmg*1.5);
  if(atk.ability==='Execute' && def.hp < def.maxHp*0.25)
    dmg = dmg*2;
  if(atk.ability==='Opportunist' && def.hp < def.maxHp*0.4)
    dmg = Math.ceil(dmg*1.2);

  /* ─ Defender incoming modifiers ─ */
  // Grit: −15% damage when HP < 50%
  if(def.ability==='Grit' && def.hp < def.maxHp*0.5 && !isImmune(def))
    dmg = Math.ceil(dmg*0.85);
  // Shield Up: first attack −30%, one-time
  if(def.ability==='Shield Up' && !def._shieldUsed){
    def._shieldUsed = true;
    dmg = Math.ceil(dmg*0.7);
    log.push({type:'ABILITY',ability:'Shield Up',card:def.name,effect:'First attack reduced 30%'});
  }
  // Smoke Screen: first attack 50% miss
  if(def.ability==='Smoke Screen' && !def._smokeUsed){
    def._smokeUsed = true;
    if(Math.random()<0.5){
      log.push({type:'ATTACK',attacker:atk.name,defender:def.name,
        damage:0,missed:true,typeMultiplier:mult,
        hpBefore:def.hp,hpAfter:def.hp,defenderMaxHp:def.maxHp});
      return {damage:0,killed:false};
    }
  }

  /* ─ Overwhelming Force: bonus damage ignoring defence (added after floor) ─ */
  let bonus = 0;
  if(atk.ability==='Overwhelming Force'){
    bonus = Math.max(1, Math.round(def.maxHp*0.1));
    dmg += bonus;
  }

  /* ─ Apply damage ─ */
  const hpBefore = def.hp;
  def.hp = Math.max(0, def.hp - dmg);

  log.push({
    type:'ATTACK',
    attacker:atk.name, attackerSide: atkSide._label,
    defender:def.name, defenderSide: defSide._label,
    damage:dmg, bonusDamage:bonus, typeMultiplier:mult,
    hpBefore, hpAfter:def.hp, defenderMaxHp:def.maxHp,
    missed:false,
  });

  /* ─ Step 5: on-damage triggers ─ */
  // Counterstrike (defender): 25% chance reflect ½ damage
  if(def.ability==='Counterstrike' && Math.random()<0.25){
    const reflected = Math.max(1, Math.floor(dmg*0.5));
    atk.hp = Math.max(0, atk.hp - reflected);
    log.push({type:'ABILITY',ability:'Counterstrike',card:def.name,
      effect:`Reflected ${reflected} dmg`,hpAfter:atk.hp});
  }
  // Bleed (attacker): apply DoT to defender (one instance, refreshes)
  if(atk.ability==='Bleed' && !isImmune(def)){
    def._bleedRoundsLeft  = 2;
    def._bleedDmgPerRound = Math.max(1, Math.round(def.maxHp*0.08));
    log.push({type:'ABILITY',ability:'Bleed',card:atk.name,
      effect:`Bleed applied to ${def.name} (${def._bleedDmgPerRound}/round × 2)`});
  }
  // Drain (attacker): heal 25% of damage dealt
  if(atk.ability==='Drain'){
    const heal = Math.max(1, Math.round(dmg*0.25));
    atk.hp = Math.min(atk.maxHp, atk.hp + heal);
    log.push({type:'ABILITY',ability:'Drain',card:atk.name,effect:`Drained +${heal} HP`});
  }

  /* ─ Death check ─ */
  if(def.hp<=0){
    // Second Wind: survive killing blow, restore 20% HP
    if(def.ability==='Second Wind' && !def._secondWindUsed){
      def._secondWindUsed = true;
      def.hp = Math.ceil(def.maxHp*0.2);
      log.push({type:'ABILITY',ability:'Second Wind',card:def.name,
        effect:`Survived! HP restored to ${def.hp}`});
      return {damage:dmg, killed:false};
    }
    // Last Stand: survive with 1 HP, gain +50% attack
    if(def.ability==='Last Stand' && !def._lastStandUsed){
      def._lastStandUsed  = true;
      def._lastStandActive= true;
      def.hp = 1;
      log.push({type:'ABILITY',ability:'Last Stand',card:def.name,
        effect:'Survived with 1 HP! +50% attack'});
      return {damage:dmg, killed:false};
    }
    log.push({type:'DEFEAT',card:def.name,byCard:atk.name});
    return {damage:dmg, killed:true};
  }

  return {damage:dmg, killed:false};
}

/* ── 10. ON-KILL TRIGGERS ───────────────────────────────────────── */

function resolveKill(killer, killerSide, opponentSide, log){
  // Fortify: +8 defence (no HP change)
  if(killer.ability==='Fortify'){
    killer._fortifyBonus += 8;
    log.push({type:'ABILITY',ability:'Fortify',card:killer.name,
      effect:`Defence +8 (total bonus: +${killer._fortifyBonus})`});
  }
  // Momentum: +10% damage per consecutive kill
  if(killer.ability==='Momentum'){
    killer._momentumStacks++;
    log.push({type:'ABILITY',ability:'Momentum',card:killer.name,
      effect:`Damage +10% (${killer._momentumStacks} stack${killer._momentumStacks>1?'s':''})`});
  }
  // Apex Predator: Power/Defence/Speed each +8% per kill
  //   - Defence boost does not retroactively change HP
  //   - Speed takes effect from the following round (_apexSpeedMult applied at round start)
  if(killer.ability==='Apex Predator'){
    killer._apexMult = 1 + (killer._apexMult-1) + 0.08; // add 8% per stack
    killer._apexSpeedMult = killer._apexMult;            // speed for next round
    const pct = Math.round((killer._apexMult-1)*100);
    log.push({type:'ABILITY',ability:'Apex Predator',card:killer.name,
      effect:`All stats +${pct}% (speed applies next round)`});
  }
  // Dominate: next card opponent plays gets −25% attack
  if(killer.ability==='Dominate'){
    opponentSide.pendingDominate = true;
    log.push({type:'ABILITY',ability:'Dominate',card:killer.name,
      effect:"Next opponent card: −25% attack"});
  }
}

/* ── 11. ON-DEFEAT TRIGGERS ─────────────────────────────────────── */

function resolveDefeat(bc, side, log){
  // Rebound: next friendly card gets +15% damage
  if(bc.ability==='Rebound'){
    side.pendingRebound = true;
    log.push({type:'ABILITY',ability:'Rebound',card:bc.name,
      effect:'Next friendly card: +15% damage'});
  }
  // Momentum: stacks reset when this card is defeated
  if(bc.ability==='Momentum' && bc._momentumStacks>0){
    bc._momentumStacks = 0;
  }
  side.defeated.push(bc);
}

/* ── 12. CARD REPLACEMENT ───────────────────────────────────────── */
// Returns true if a new card was played, false if no cards remain.
// playerCardChoice(hand) → chosen card | null, used by the UI in Session 3.
// If not provided (simulation mode) the player auto-selects like AI would.

function handleReplacement(side, opponentSide, isPlayer, playerCardChoice, log){
  let next = null;
  let fromDeck = false;

  if(side.hand.length>0){
    if(isPlayer && playerCardChoice){
      next = playerCardChoice(side.hand);
    } else {
      next = aiSelectCard(side.hand, opponentSide.active.type);
    }
    side.hand = side.hand.filter(c=>c.id!==next.id);
  } else if(side.deck.length>0){
    next = side.deck.shift();
    fromDeck = true;
    log.push({type:'FORCED_DRAW',side:isPlayer?'player':'ai',card:next.name});
  } else {
    return false; // no cards left — battle over
  }

  side.active = next;
  applyEntryEffects(next, side, opponentSide, log);
  log.push({type:'CARD_ENTER',side:isPlayer?'player':'ai',
    card:next.name,rarity:next.rarity,hp:next.hp,maxHp:next.maxHp});
  return true;
}

/* ── 13. POST-ROUND TRIGGERS ────────────────────────────────────── */

function resolvePostRound(playerSide, aiSide, log){
  for(const [side,label] of [[playerSide,'player'],[aiSide,'ai']]){
    const bc = side.active;
    if(!bc) continue;
    // Bleed tick
    if(bc._bleedRoundsLeft>0){
      const dmg = bc._bleedDmgPerRound;
      bc.hp = Math.max(0, bc.hp-dmg);
      bc._bleedRoundsLeft--;
      log.push({type:'ABILITY',ability:'Bleed',card:bc.name,
        effect:`Bleed tick −${dmg} HP (${bc._bleedRoundsLeft} round${bc._bleedRoundsLeft!==1?'s':''} left)`,
        hpAfter:bc.hp, maxHp:bc.maxHp});
    }
    // Resilience: recover 5 HP
    if(bc.ability==='Resilience'){
      const heal = Math.min(5, bc.maxHp-bc.hp);
      if(heal>0){
        bc.hp += heal;
        log.push({type:'ABILITY',ability:'Resilience',card:bc.name,
          effect:`+${heal} HP`,hpAfter:bc.hp,maxHp:bc.maxHp});
      }
    }
  }
}

/* ── 14. BLEED DEATH CHECK ──────────────────────────────────────── */
// Called after resolvePostRound; returns true if battle ended.

function checkBleedDeaths(playerSide, aiSide, playerCardChoice, log){
  for(const [side,opSide,isPlayer] of [
    [playerSide, aiSide,   true ],
    [aiSide,     playerSide,false],
  ]){
    if(side.active && side.active.hp<=0){
      log.push({type:'DEFEAT',card:side.active.name,byCard:'Bleed'});
      resolveDefeat(side.active, side, log);
      const replaced = handleReplacement(side, opSide, isPlayer, playerCardChoice, log);
      if(!replaced){
        log.push({type:'BATTLE_END',winner:isPlayer?'ai':'player',reason:'bleed_lethal'});
        return true;
      }
    }
  }
  return false;
}

/* ── 15. FULL BATTLE SIMULATION ─────────────────────────────────── */
//
// playerDeck / aiDeck: arrays of card objects (from ALL_CARDS, with .ability field).
// playerCardChoice: optional fn(hand[]) → card, for UI-driven play (Session 3).
//   When omitted (simulation mode) the player auto-selects using AI logic.
//
// Returns:
//   { winner: 'player'|'ai', hasTenacity: bool, log: BattleEvent[] }

function runBattle(playerDeck, aiDeck, playerCardChoice){
  const log = [];

  const pSide = initSideState(playerDeck);  pSide._label = 'player';
  const aSide = initSideState(aiDeck);      aSide._label = 'ai';

  // Apply entry effects for the two opening active cards
  applyEntryEffects(pSide.active, pSide, aSide, log);
  applyEntryEffects(aSide.active, aSide, pSide, log);

  log.push({
    type:'BATTLE_START',
    playerActive:{name:pSide.active.name,rarity:pSide.active.rarity,
      hp:pSide.active.hp,maxHp:pSide.active.maxHp},
    aiActive:{name:aSide.active.name,rarity:aSide.active.rarity,
      hp:aSide.active.hp,maxHp:aSide.active.maxHp},
  });

  let round = 0;
  const SAFETY_CAP = 300; // should never be reached — battles always progress (min 1 dmg/round)

  while(round < SAFETY_CAP){
    round++;

    // Draw phase (each side draws if hand < 5)
    if(pSide.hand.length<5) drawCard(pSide);
    if(aSide.hand.length<5) drawCard(aSide);

    log.push({
      type:'ROUND_START', round,
      playerHp:pSide.active.hp, playerMaxHp:pSide.active.maxHp,
      aiHp:aSide.active.hp,     aiMaxHp:aSide.active.maxHp,
    });

    // Determine attack order for this round
    const pSpd = effSpeed(pSide.active);
    const aSpd = effSpeed(aSide.active);
    const playerFirst = pSpd>aSpd ? true : aSpd>pSpd ? false : Math.random()<0.5;

    const [first,  fSide,  fOpp ] = playerFirst ? [pSide.active,pSide,aSide] : [aSide.active,aSide,pSide];
    const [second, sSide,  sOpp ] = playerFirst ? [aSide.active,aSide,pSide] : [pSide.active,pSide,aSide];

    // ── First attacker ──
    const r1 = executeAttack(first, second, fSide, fOpp, log);

    if(r1.killed){
      resolveKill(first, fSide, fOpp, log);
      resolveDefeat(second, sSide, log);
      const survived = handleReplacement(sSide, fSide, sSide===pSide, playerCardChoice, log);
      if(!survived){
        log.push({type:'BATTLE_END',winner:sSide===pSide?'ai':'player'});
        break;
      }
    } else {
      // ── Second attacker ──
      const r2 = executeAttack(second, first, sSide, sOpp, log);

      if(r2.killed){
        resolveKill(second, sSide, sOpp, log);
        resolveDefeat(first, fSide, log);
        const survived = handleReplacement(fSide, sSide, fSide===pSide, playerCardChoice, log);
        if(!survived){
          log.push({type:'BATTLE_END',winner:fSide===pSide?'ai':'player'});
          break;
        }
      }
    }

    // Check if Counterstrike killed the attacker mid-round
    for(const [side,opSide,isPlayer] of [[pSide,aSide,true],[aSide,pSide,false]]){
      if(side.active && side.active.hp<=0 && !log.find(e=>e.type==='BATTLE_END')){
        log.push({type:'DEFEAT',card:side.active.name,byCard:'Counterstrike'});
        resolveDefeat(side.active, side, log);
        const survived = handleReplacement(side, opSide, isPlayer, playerCardChoice, log);
        if(!survived){
          log.push({type:'BATTLE_END',winner:isPlayer?'ai':'player'});
        }
      }
    }

    if(log.find(e=>e.type==='BATTLE_END')) break;

    // ── Post-round: Bleed ticks + Resilience heals ──
    resolvePostRound(pSide, aSide, log);

    if(checkBleedDeaths(pSide, aSide, playerCardChoice, log)) break;
  }

  // Safety cap fallback (should not occur)
  if(round>=SAFETY_CAP && !log.find(e=>e.type==='BATTLE_END')){
    log.push({type:'BATTLE_END',winner:'ai',reason:'safety_cap'});
  }

  const endEvent = log.find(e=>e.type==='BATTLE_END');
  const winner   = endEvent ? endEvent.winner : 'ai';

  return {
    winner,
    hasTenacity: playerDeck.some(c=>c.ability==='Tenacity'),
    log,
  };
}

/* ── 16. BATTLE REWARD CALCULATION ─────────────────────────────── */

const BATTLE_REWARDS = {
  1:{name:'Rookie',  winCredits:50,  winXp:100, lossCredits:10, lossXp:25},
  2:{name:'Scrapper',winCredits:100, winXp:150, lossCredits:15, lossXp:35},
  3:{name:'Fighter', winCredits:200, winXp:250, lossCredits:20, lossXp:50},
  4:{name:'Elite',   winCredits:350, winXp:375, lossCredits:30, lossXp:75},
  5:{name:'Champion',winCredits:600, winXp:500, lossCredits:50, lossXp:100},
};

// streak: current win streak BEFORE this battle
function calcBattleRewards(tier, winner, streak){
  const t = BATTLE_REWARDS[tier] || BATTLE_REWARDS[1];
  if(winner==='player'){
    const mult = streak>=2 ? 2 : 1; // ×2 after 3rd consecutive win (streak was ≥2 before)
    return {credits: t.winCredits*mult, xp: t.winXp, streakBonus: mult===2};
  }
  return {credits: t.lossCredits, xp: t.lossXp, streakBonus: false};
}

/* ── 17. COOLDOWN HELPERS ───────────────────────────────────────── */

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour in ms

// Returns true if the card is on cooldown given the cardCooldowns map
function isCardOnCooldown(cardId, cardCooldowns){
  const ts = cardCooldowns && cardCooldowns[cardId];
  return ts ? Date.now() - ts < COOLDOWN_MS : false;
}

// Returns how many ms remain on the cooldown (0 if not on cooldown)
function cooldownRemaining(cardId, cardCooldowns){
  const ts = cardCooldowns && cardCooldowns[cardId];
  if(!ts) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now()-ts));
}

// Returns true if rarity gets a cooldown after battle
function hasBattleCooldown(rarity){
  return rarity==='Legendary' || rarity==='Epic';
}

/* ── 18. AI STRATEGIC ACTIONS ───────────────────────────────────── */
// Returns the best hand card for AI to swap to, or null if no swap warranted.
// Swaps when active HP ≤ 35% and a better option exists in hand.

function aiSwapTarget(aSide, pSide){
  if(!aSide.active||aSide.hand.length===0||!pSide.active) return null;
  const hpPct=aSide.active.hp/aSide.active.maxHp;
  if(hpPct>0.35) return null;
  // Prefer a card with type advantage vs opponent's active
  const adv=aSide.hand.filter(c=>getTypeMultiplier(c.type,pSide.active.type)===1.5);
  if(adv.length) return adv.reduce((b,c)=>c.hp>b.hp?c:b);
  // At very low HP (≤20%), swap to healthiest card available
  if(hpPct<=0.2){
    const best=aSide.hand.reduce((b,c)=>c.hp>b.hp?c:b);
    if(best.hp>aSide.active.hp) return best;
  }
  return null;
}

// Executes an AI proactive swap. Returns true if a swap occurred.
function executeAIProactiveSwap(aSide,pSide,log){
  const target=aiSwapTarget(aSide,pSide);
  if(!target) return false;
  const prev=aSide.active;
  aSide.hand=aSide.hand.filter(c=>c.id!==target.id);
  aSide.hand.push(prev);
  aSide.active=target;
  applyEntryEffects(target,aSide,pSide,log);
  log.push({type:'AI_SWAP',card:target.name,prev:prev.name});
  return true;
}

/* ── 19. ABILITY POOL (for random assignment in Session 4) ──────── */

const ABILITY_POOL = {
  Common:    ['Grit','Opportunist','Resilience','Shield Up','Tenacity'],
  Uncommon:  ['Smoke Screen','Adrenaline','Pack Tactics','Adaptable','Rebound'],
  Rare:      ['Counterstrike','Fortify','Bleed','Intimidate','Momentum'],
  Epic:      ['Unstoppable','Execute','Drain','Second Wind','Overwhelm'],
  Legendary: ['Apex Predator','Immunity','Last Stand','Overwhelming Force','Dominate'],
};

// Randomly assigns one ability to every card in the ALL_CARDS array.
// Called once from God Mode in Session 4 to populate ALL_CARDS[].ability.
function assignAbilities(cards){
  return cards.map(card => {
    const pool = ABILITY_POOL[card.rarity];
    if(!pool) return card;
    const ability = pool[Math.floor(Math.random()*pool.length)];
    return {...card, ability};
  });
}
