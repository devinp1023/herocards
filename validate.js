const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');

// Extract babel script using indexOf (not regex - file too large)
const startTag = '<script type="text/babel">';
const start = html.indexOf(startTag) + startTag.length;
const end = html.indexOf('</script>', start);
const script = html.slice(start, end);

if(!script.length){ console.error('No babel script found — run: node build.js'); process.exit(1); }
console.log(`Script length: ${script.length} chars`);
// Source files (for reference — validate.js checks the built index.html)
// Edit: src/data.js | src/components.js | src/game.js | src/battle-engine.js | src/battle-ui.js
// Build: node build.js  →  then re-run: node validate.js

let passed=0, failed=0;
function check(name, condition, detail=''){
  if(condition){ console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}${detail?': '+detail:''}`); failed++; }
}
const nodeCheck=check;

console.log('\n=== STRUCTURE ===');
check('ALL_CARDS', script.includes('const ALL_CARDS=['));
check('200 cards', (script.match(/"id":\d+/g)||[]).length >= 200);
check('RC defined', script.includes('const RC={'));
check('PACKS defined', script.includes('const PACKS={'));
check('TYPE_COLORS', script.includes('const TYPE_COLORS={'));
check('ACHIEVEMENTS', script.includes('const ACHIEVEMENTS='));
check('ACH_FAMILIES', script.includes('ACH_FAMILIES'));
check('DAILY_QUESTS', script.includes('const DAILY_QUESTS='));

console.log('\n=== COMPONENTS ===');
['HeroCard','PackAnim','MissingCard','Sidebar','BottomNav','AuthScreen','CardCMS','Game','App','Spinner'].forEach(c=>check(c, script.includes(`function ${c}(`)));

console.log('\n=== FIREBASE ===');
check('initializeApp', script.includes('firebase.initializeApp'));
check('apps guard', script.includes('firebase.apps.length'));
check('auth + db + storage', script.includes('let auth, db, storage'));
check('startApp retry', script.includes('setTimeout(startApp'));

console.log('\n=== CSS ===');
check('No boxStealth', !script.includes('boxStealth'));
check('No textStealth', !script.includes('textStealth'));
check('flyInBottom anim', html.includes('flyInBottom'));
check('flashLegendary anim', html.includes('flashLegendary'));

console.log('\n=== BALANCE ===');
const b = script.count = (s,c)=>(s.match(new RegExp('\\'+c,'g'))||[]).length;
const ob=({'{':1}),cb=({'}':1});
const brace=(script.match(/{/g)||[]).length-(script.match(/}/g)||[]).length;
const paren=(script.match(/\(/g)||[]).length-(script.match(/\)/g)||[]).length;
check('Balanced braces', brace===0, `diff:${brace}`);
check('Balanced parens', paren===0, `diff:${paren}`);

console.log('\n=== FEATURES ===');
check('Pack opening', script.includes('buyPack'));
check('Firebase auth', script.includes('onAuthStateChanged'));
check('God mode', script.includes('GOD_MODE_KEY'));
check('Card CMS', script.includes('function CardCMS'));
check('Duplicates', script.includes('DUPE_CREDITS'));
check('Sort', script.includes('sortBy'));
check('Pack filter', script.includes('packFilter'));
check('Trade', script.includes('tradeCard'));
check('Portal', script.includes('ReactDOM.createPortal'));
check('Missing cards', script.includes('function MissingCard'));
check('Store', script.includes('tab==="store"'));
check('Quests', script.includes('tab==="quests"'));
check('Achievements tab', script.includes('tab==="achievements"'));
check('Tiered achievements', script.includes('ACH_FAMILIES'));
check('XP system', script.includes('XP_THRESHOLDS'));
check('Level-up modal', script.includes('showLevelUp'));
check('Daily quests', script.includes('getTodaysQuests'));
check('Pack drama effects', script.includes('playRaritySound'));
check('Vibration', script.includes('navigator.vibrate'));
check('Flash effect', script.includes('flashColor'));
check('Firebase Storage', script.includes('storage.ref('));
check('Avatar store', script.includes('const AVATARS='));
check('Featured deal', script.includes('FEATURED DEAL'));
check('ReactDOM.createRoot', script.includes('ReactDOM.createRoot'));

console.log('\n=== BATTLE SYSTEM ===');
// Engine constants
check('BATTLE_TYPE_MAP', script.includes('BATTLE_TYPE_MAP'));
check('BATTLE_REWARDS', script.includes('BATTLE_REWARDS'));
check('ABILITY_POOL', script.includes('ABILITY_POOL'));
// Engine functions
check('runBattle', script.includes('function runBattle('));
check('calcBattleRewards', script.includes('function calcBattleRewards('));
check('isCardOnCooldown', script.includes('function isCardOnCooldown('));
check('getTypeMultiplier', script.includes('function getTypeMultiplier('));
// UI constants
check('DECK_SIZE', script.includes('DECK_SIZE'));
check('BATTLE_RARITY_LIMITS', script.includes('BATTLE_RARITY_LIMITS'));
check('TIER_INFO', script.includes('TIER_INFO'));
// UI components
check('BattleTab', script.includes('function BattleTab('));
check('DeckBuilder', script.includes('function DeckBuilder('));
check('BattleResult', script.includes('function BattleResult('));
// Game integration
check('battleDeck state', script.includes('battleDeck,setBattleDeck'));
check('battleCooldowns state', script.includes('battleCooldowns,setBattleCooldowns'));
check('onBattleComplete', script.includes('const onBattleComplete='));
check('Battle tab render', script.includes('tab==="battle"'));
check('Battle nav item', script.includes('"battle"') && script.includes('"⚔️"'));
// CSS
check('battle-tray-fixed CSS', html.includes('battle-tray-fixed'));

console.log(`\n${'='.repeat(30)}`);
console.log(`RESULT: ${passed} passed, ${failed} failed`);
if(failed>0) process.exit(1);

console.log('\n=== HOOKS SAFETY ===');
nodeCheck('No React.useState in render', !script.includes('React.useState('));
nodeCheck('No React.useEffect in render', !script.includes('React.useEffect('));

console.log('\n=== CSS SAFETY ===');
nodeCheck('No style:undefined values', !script.includes('inset:undefined') && !script.includes('height:undefined'));
nodeCheck('No spread in JSX styles', !script.includes('...(fill?{') && !script.includes('...(isGod?{'));
