/**
 * BFS Word Ladder Solver
 * Finds shortest path between two 4-letter words, changing one letter at a time.
 * Every intermediate word must be a real 4-letter word from the dictionary.
 */

// 4-letter word dictionary for the ladder solver
const FOUR_LETTER_WORDS = new Set([
  // Common 4-letter words
  'able','ache','acid','acre','aged','aide','aims','also','arch','area',
  'army','arts','asks','auto','away','axle','back','bade','bait','bake',
  'bald','bale','ball','band','bane','bang','bank','bare','bark','barn',
  'base','bash','bask','bass','bate','bath','bays','bead','beak','beam',
  'bean','bear','beat','beds','beef','been','beer','bell','belt','bend',
  'bent','best','beta','bias','bike','bile','bill','bind','bird','bite',
  'bits','bled','blew','blob','bloc','blog','blot','blow','blue','blur',
  'boar','boat','body','bold','bolt','bomb','bond','bone','book','boom',
  'boot','bore','born','boss','both','bout','bowl','bows','bred','brew',
  'brim','buck','buds','buff','bugs','bulk','bull','bump','bunk','burn',
  'burr','bust','busy','buzz','byte','cafe','cage','cake','calf','call',
  'calm','came','camp','cane','cape','caps','card','care','cart','case',
  'cash','cast','cats','cave','cell','chat','chef','chin','chip','chop',
  'cite','city','clad','claim','clam','clan','clap','clay','clip','clod',
  'clog','clone','clot','club','clue','coal','coat','cock','code','coil',
  'coin','coke','cold','cole','colt','comb','come','cone','cook','cool',
  'cope','copy','cord','core','cork','corn','cost','coup','cove','crab',
  'crew','crop','crow','crud','cube','cuff','cult','cups','curb','cure',
  'curl','cute','daft','dale','dame','damn','damp','dare','dark','darn',
  'dart','dash','data','date','dawn','days','dead','deaf','deal','dean',
  'dear','debt','deck','deed','deem','deep','deer','demo','dent','deny',
  'desk','dial','dice','diet','digs','dime','dine','dire','dirt','disc',
  'dish','disk','dive','dock','does','dole','doll','dome','done','doom',
  'door','dose','dots','dove','down','doze','drag','draw','drew','drip',
  'drop','drum','dual','dubs','duck','dude','duel','dues','duff','duke',
  'dull','dumb','dump','dune','dunk','dusk','dust','duty','dyed','each',
  'earl','earn','ears','ease','east','easy','echo','edge','edit','eels',
  'eggs','else','emit','ends','envy','epic','even','ever','evil','exam',
  'exec','exit','eyed','eyes','face','fact','fade','fail','fair','fake',
  'fall','fame','fang','fans','fare','farm','fast','fate','fawn','fear',
  'feat','feed','feel','feet','fell','felt','fend','fern','fest','feud',
  'fiat','file','fill','film','find','fine','fire','firm','fish','fist',
  'fits','five','flag','flak','flan','flap','flat','flaw','flay','flea',
  'fled','flee','flew','flex','flip','flit','flog','flop','flow','flue',
  'flux','foam','foci','foes','foil','fold','folk','fond','font','food',
  'fool','foot','ford','fore','fork','form','fort','foul','four','fowl',
  'fray','free','from','fuel','full','fume','fund','furl','fury','fuse',
  'fuss','gait','gale','gall','game','gang','gape','gaps','garb','gash',
  'gasp','gate','gave','gaze','gear','gems','gene','germ','gets','gift',
  'gigs','gilt','girl','gist','give','glad','glen','glib','glow','glue',
  'glum','glut','gnaw','goat','gods','goes','gold','golf','gone','good',
  'gore','gory','gown','grab','gram','gray','grew','grid','grim','grin',
  'grip','grit','grog','grow','grub','gulf','gull','gums','gunk','guns',
  'gust','guts','guys','hack','hade','hail','hair','hale','half','hall',
  'halt','hams','hand','hang','hank','hare','hark','harm','harp','hash',
  'haste','hate','haul','have','hawk','haze','hazy','head','heal','heap',
  'hear','heat','heck','heed','heel','held','hell','helm','help','hens',
  'herb','herd','here','hero','hers','hewn','hick','hide','high','hike',
  'hill','hilt','hind','hint','hire','hits','hive','hoax','hobs','hock',
  'hoed','hoes','hogs','hold','hole','home','hone','hood','hook','hoop',
  'hope','hops','horn','hose','host','hour','howl','hubs','hued','hues',
  'huff','huge','hugs','hull','hump','hung','hunk','hunt','hurl','hurt',
  'hush','husk','huts','hymn','icon','idea','idle','idol','ills','inch',
  'info','into','ions','iris','iron','isle','item','jack','jade','jail',
  'jams','jars','java','jaws','jazz','jean','jeer','jerk','jest','jets',
  'jilt','jive','jobs','jock','join','joke','jolt','jots','joys','jump',
  'june','junk','jury','just','keen','keep','kegs','kelp','kept','keys',
  'kick','kids','kill','kind','king','kiss','kite','kits','knee','knew',
  'knit','knob','knot','know','lace','lack','lacy','laid','lake','lame',
  'lamp','land','lane','laps','lard','lark','lash','lass','last','late',
  'lawn','laws','lays','lazy','lead','leaf','leak','lean','leap','left',
  'lend','lens','lent','less','lest','levy','liar','lice','lick','lied',
  'lien','lieu','life','lift','like','limb','lime','limp','line','link',
  'lint','lion','lips','list','live','load','loaf','loam','loan','lobe',
  'lock','lode','loft','loge','logo','logs','lone','long','look','loom',
  'loop','loot','lord','lore','lose','loss','lost','lots','loud','love',
  'luck','lull','lump','lure','lurk','lush','lust','lute','mace','made',
  'mail','main','make','male','mall','malt','mane','many','maps','mare',
  'mark','mars','mart','mash','mask','mass','mast','mate','math','maze',
  'mead','meal','mean','meat','meek','meet','meld','melt','memo','mend',
  'menu','mere','mesh','mess','mice','mild','mile','milk','mill','mime',
  'mind','mine','mint','mire','miss','mist','mite','mitt','moan','moat',
  'mock','mode','moist','mold','mole','molt','monk','mood','moon','moor',
  'mope','more','morn','moss','most','moth','move','much','muck','muds',
  'muff','mugs','mule','mull','mung','murk','muse','mush','must','mute',
  'myth','nail','name','nape','navy','near','neat','neck','need','nest',
  'nets','news','next','nice','nick','nine','node','none','nook','norm',
  'nose','note','noun','nude','null','numb','nuts','oafs','oaks','oath',
  'obey','odds','odor','offs','ogle','oils','oily','okay','omen','omit',
  'once','ones','only','onto','ooze','open','opts','oral','orca','ores',
  'ours','oust','outs','oven','over','owed','owes','owls','owns','pace',
  'pack','pact','pads','page','paid','pail','pain','pair','pale','palm',
  'pane','pang','pans','pant','pare','park','part','pass','past','path',
  'pave','pawn','pays','peak','peal','pear','peas','peat','peck','peek',
  'peel','peer','pegs','pelt','pend','pens','pent','peon','perk','perm',
  'pest','pets','pick','pier','pigs','pike','pile','pill','pine','pink',
  'pins','pint','pipe','piss','pits','pity','plan','play','plea','pled',
  'plod','plot','plow','ploy','plug','plum','plus','pods','poem','poet',
  'poke','pole','poll','polo','pomp','pond','pony','pool','poop','poor',
  'pope','pops','pore','pork','port','pose','posh','post','pour','pout',
  'pray','prep','prey','prim','prod','prop','pros','prow','pubs','puck',
  'puff','pull','pulp','pump','puns','punk','puns','pure','push','puts',
  'putt','quiz','race','rack','raft','rage','rags','raid','rail','rain',
  'rake','ramp','rams','rang','rank','rant','raps','rare','rash','rasp',
  'rate','rats','rave','rays','raze','read','real','ream','reap','rear',
  'reed','reef','reel','rein','rely','rend','rent','rest','rich','ride',
  'rift','rigs','rile','rill','rime','rind','ring','rink','riot','ripe',
  'rise','risk','rite','road','roam','roar','robe','rock','rode','role',
  'roll','romp','roof','room','root','rope','rose','rote','rout','rove',
  'rows','rubs','rude','rues','ruff','rugs','ruin','rule','rump','rung',
  'runs','runt','ruse','rush','rust','ruts','sack','safe','sage','said',
  'sail','sake','sale','salt','same','sand','sane','sang','sank','sash',
  'save','saws','says','scab','scam','scan','scar','seal','seam','sear',
  'seas','seat','sect','seed','seek','seem','seen','seep','self','sell',
  'send','sent','sept','sere','sets','sewn','shed','shim','shin','ship',
  'shod','shoe','shoo','shop','shot','show','shun','shut','sick','side',
  'sigh','sign','silk','sill','silo','silt','sine','sing','sink','sips',
  'sire','site','sits','size','skid','skim','skin','skip','skit','slab',
  'slag','slam','slap','slat','slaw','slay','sled','slew','slid','slim',
  'slit','slob','slop','slot','slow','slug','slum','slur','smog','snap',
  'snip','snob','snot','snow','snub','snug','soak','soap','soar','sobs',
  'sock','soda','sofa','soft','soil','sold','sole','solo','some','song',
  'soon','soot','sore','sort','soul','soup','sour','sown','span','spar',
  'spec','sped','spin','spit','spot','spry','spud','spun','spur','stab',
  'stag','star','stay','stem','step','stew','stir','stop','stow','stub',
  'stud','stun','such','suck','sued','suit','sulk','sums','sung','sunk',
  'sure','surf','swan','swap','sway','swim','swum','tabs','tack','tact',
  'tags','tail','take','tale','talk','tall','tame','tang','tank','tape',
  'taps','tare','tarn','tarp','tart','task','taxa','taxi','team','tear',
  'teas','teem','teen','tell','temp','tend','tens','tent','term','tern',
  'test','text','than','that','them','then','they','thin','this','thou',
  'thud','thug','thus','tick','tide','tidy','tied','tier','ties','tiff',
  'tile','till','tilt','time','tine','tins','tiny','tips','tire','toad',
  'toed','toes','toil','told','toll','tomb','tome','tone','tons','took',
  'tool','tops','tore','torn','tort','toss','tour','tout','town','toys',
  'trap','tray','tree','trek','trim','trio','trip','trod','trot','true',
  'tube','tubs','tuck','tuft','tugs','tuna','tune','turf','turn','tusk',
  'tuft','twin','type','ugly','undo','unit','unto','upon','urge','used',
  'user','uses','vain','vale','vane','vary','vase','vast','vats','veal',
  'veil','vein','vent','verb','vest','veto','vial','vice','vied','view',
  'vile','vine','visa','void','volt','vote','vows','wade','wage','wail',
  'wait','wake','walk','wall','wand','wane','want','ward','warm','warn',
  'warp','wart','wary','wash','wasp','wave','wavy','waxy','ways','weak',
  'wean','wear','webs','weds','weed','week','weep','weld','well','welt',
  'went','wept','were','west','what','when','whom','wick','wide','wife',
  'wild','will','wilt','wily','wimp','wind','wine','wing','wink','wins',
  'wipe','wire','wise','wish','wisp','with','wits','woke','wold','wolf',
  'womb','wont','wood','woof','wool','word','wore','work','worm','worn',
  'wort','wove','wrap','wren','writ','yank','yard','yarn','yawl','yawn',
  'year','yell','yelp','yoke','your','zeal','zero','zest','zinc','zone',
  'zoom',
]);

/**
 * Check if two words differ by exactly one letter.
 */
function differsByOne(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
    if (diff > 1) return false;
  }
  return diff === 1;
}

/**
 * Get the index of the changed letter between two words.
 */
export function getChangedIndex(a: string, b: string): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
}

/**
 * Find all valid neighbors (words differing by exactly one letter).
 */
function getNeighbors(word: string, dictionary: Set<string>): string[] {
  const neighbors: string[] = [];
  const letters = word.split('');
  
  for (let i = 0; i < letters.length; i++) {
    const original = letters[i];
    for (let c = 97; c <= 122; c++) {
      const char = String.fromCharCode(c);
      if (char === original) continue;
      letters[i] = char;
      const candidate = letters.join('');
      if (dictionary.has(candidate)) {
        neighbors.push(candidate);
      }
    }
    letters[i] = original;
  }
  
  return neighbors;
}

export interface LadderResult {
  found: boolean;
  path: string[];
  par: number;
}

/**
 * BFS solver: find shortest path from start to target.
 */
export function solveLadder(start: string, target: string): LadderResult {
  const s = start.toLowerCase();
  const t = target.toLowerCase();
  
  if (!FOUR_LETTER_WORDS.has(s)) {
    return { found: false, path: [], par: 0 };
  }
  if (!FOUR_LETTER_WORDS.has(t)) {
    return { found: false, path: [], par: 0 };
  }
  if (s === t) {
    return { found: true, path: [s], par: 0 };
  }

  const visited = new Set<string>([s]);
  const queue: string[][] = [[s]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    
    const neighbors = getNeighbors(current, FOUR_LETTER_WORDS);
    
    for (const neighbor of neighbors) {
      if (neighbor === t) {
        const fullPath = [...path, neighbor];
        return {
          found: true,
          path: fullPath,
          par: fullPath.length - 1, // par = number of steps (not including start)
        };
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return { found: false, path: [], par: 0 };
}

/**
 * Validate that a word is in the 4-letter dictionary.
 */
export function isValid4LetterWord(word: string): boolean {
  return FOUR_LETTER_WORDS.has(word.toLowerCase());
}

/**
 * Check if moving from `prev` to `next` is a valid ladder step.
 */
export function isValidStep(prev: string, next: string): boolean {
  return (
    isValid4LetterWord(next) &&
    differsByOne(prev.toLowerCase(), next.toLowerCase())
  );
}

export { FOUR_LETTER_WORDS };
