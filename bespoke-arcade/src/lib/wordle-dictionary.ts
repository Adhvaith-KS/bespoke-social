/**
 * Wordle dictionary and validation utilities.
 * Contains a curated list of valid 5-letter words plus company/ML vocabulary.
 * The answer word is never sent to the client — only checked server-side.
 */

// A starter list of common 5-letter words for guess validation.
// In production, this would be the full Wordle dictionary (~12k words).
// For now, we use a substantial subset plus company/ML vocab.
const COMMON_WORDS = new Set([
  // Common English 5-letter words (subset)
  'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alert','alien','align','alive','allow',
  'alone','along','alter','angel','anger','angle','angry','anime','ankle','apart',
  'apple','apply','arena','argue','arise','armor','army','array','arrow','aside',
  'asset','atlas','audio','audit','avoid','awake','award','aware','badly','baker',
  'based','basic','basin','basis','batch','beach','beard','beast','began','begin',
  'being','below','bench','berry','birth','black','blade','blame','blank','blast',
  'blaze','bleed','blend','bless','blind','blink','bliss','block','blood','bloom',
  'blown','blues','blunt','blurs','board','boost','booth','bound','brain','brand',
  'brave','bread','break','breed','brick','bride','brief','bring','broad','broke',
  'brook','brown','brush','buddy','build','built','bunch','burst','buyer','cabin',
  'cable','camel','candy','cargo','carry','catch','cause','cedar','chain','chair',
  'chalk','champ','chaos','charm','chart','chase','cheap','check','cheek','cheer',
  'chess','chest','chief','child','chill','china','choir','chunk','civic','civil',
  'claim','clash','class','clean','clear','clerk','click','cliff','climb','cling',
  'clips','clock','clone','close','cloth','cloud','coach','coast','color','comet',
  'comic','coral','could','count','court','cover','crack','craft','crane','crash',
  'crazy','cream','creek','crest','crime','cross','crowd','crown','crude','crush',
  'cubic','curry','curve','cycle','daily','dance','debug','decay','delay','delta',
  'dense','depth','derby','devil','digit','dirty','disco','dodge','doing','donor',
  'doubt','dough','draft','drain','drake','drama','drank','drawn','dream','dress',
  'dried','drift','drill','drink','drive','drops','drove','drugs','drunk','dryer',
  'dummy','dusty','dying','eager','eagle','early','earth','eight','elder','elect',
  'elite','email','ember','empty','enemy','enjoy','enter','entry','equal','error',
  'essay','event','every','exact','exams','exist','extra','faint','fairy','faith',
  'false','fancy','fatal','fault','feast','fence','ferry','fetch','fever','fewer',
  'fiber','field','fifth','fifty','fight','final','first','fixed','flags','flame',
  'flash','flask','flesh','flies','flight','float','flock','flood','floor','flour',
  'fluid','flush','flute','focus','foggy','force','forge','forms','forth','found',
  'fox','frame','frank','fraud','fresh','front','frost','froze','fruit','fully',
  'fungi','funny','gamma','gauge','gears','genes','genre','ghost','giant','given',
  'gland','glass','gleam','glide','globe','glory','gloss','glove','going','grace',
  'grade','grain','grand','grant','graph','grasp','grass','grave','great','greed',
  'green','greet','grief','grind','groan','groom','gross','group','grove','grown',
  'guard','guess','guest','guide','guild','guilt','guise','gulch','gym','habit',
  'happy','harsh','haste','haven','heart','heavy','hedge','hello','hence','herbs',
  'highs','hilly','hinge','hobby','holds','holly','honey','honor','hoped','horns',
  'horse','hotel','house','human','humid','humor','hurry','hyper','ideal','image',
  'imply','inbox','index','indie','infer','inner','input','inter','intro','issue',
  'ivory','jewel','joins','joint','joker','jolly','judge','juice','jumbo','jumps',
  'karma','kayak','keeps','key','kicks','kings','knack','kneel','knife','knock',
  'known','label','labor','lanes','large','laser','later','laugh','layer','leads',
  'leaky','learn','least','leave','legal','lemon','level','lever','light','liked',
  'limit','linen','liner','links','lions','lived','liver','llama','lobby','local',
  'lodge','logic','login','looks','loops','loose','lotus','loved','lover','lower',
  'loyal','lucky','lunar','lunch','lyric','macro','magic','major','maker','manga',
  'manor','maple','march','marks','marsh','match','mayor','means','media','melon',
  'mercy','merge','merit','merry','messy','metal','meter','micro','might','mills',
  'miner','minor','minus','mixed','model','money','month','moral','motif','motor',
  'motto','mount','mouse','mouth','moved','mover','movie','multi','music','naive',
  'named','naval','nerve','never','newly','night','noble','noise','north','noted',
  'novel','nurse','nylon','oasis','occur','ocean','offer','olive','onset','opera',
  'optic','orbit','order','organ','other','ought','outer','outdo','owned','owner',
  'oxide','ozone','paced','paint','pairs','panel','panic','parse','party','pasta',
  'paste','patch','patio','pause','peace','peach','pearl','penny','perks','petty',
  'phase','phone','photo','piano','picks','piece','pilot','pinch','pitch','pixel',
  'pizza','place','plaid','plain','plane','plant','plate','plaza','plead','pluck',
  'plumb','plume','plump','plunge','plush','point','polar','porch','poser','pound',
  'power','press','price','pride','prime','print','prior','prize','probe','prone',
  'proof','prose','proud','prove','proxy','pulse','punch','pupil','purge','purse',
  'pussy','queen','query','quest','queue','quick','quiet','quota','quote','radar',
  'radio','raise','rally','range','rapid','rated','ratio','reach','react','reads',
  'ready','realm','rebel','refer','reign','relax','relay','remix','renew','reply',
  'reset','ridge','rifle','right','rigid','risky','rival','river','roast','robot',
  'rocky','rogue','roman','roses','rough','round','route','rover','royal','rugby',
  'ruins','ruler','rumor','rural','sadly','saint','salad','sales','salon','salty',
  'sandy','sauce','sauna','saves','scale','scare','scarf','scene','scent','scope',
  'score','scout','scrap','seeds','sense','serve','setup','seven','shade','shaft',
  'shake','shall','shame','shape','share','shark','sharp','shear','sheep','sheer',
  'sheet','shelf','shell','shift','shine','shirt','shock','shoes','shook','shoot',
  'shore','short','shout','shown','sides','siege','sight','sigma','sigma','signs',
  'silly','since','sixth','sixty','sized','skill','skull','slate','slave','sleep',
  'slick','slide','slope','small','smart','smell','smile','smith','smoke','snake',
  'solar','solid','solve','sonic','sorry','sound','south','space','spare','spark',
  'spawn','speak','speed','spend','spent','spice','spill','spine','spoke','spoon',
  'sport','spray','squad','stack','staff','stage','stake','stale','stall','stamp',
  'stand','stare','start','state','stays','steak','steal','steam','steel','steep',
  'steer','stems','stick','stiff','still','stock','stomp','stone','stood','store',
  'storm','story','stove','strap','straw','stray','strip','stuck','study','stuff',
  'style','suite','sunny','super','surge','sushi','swamp','swarm','swear','sweep',
  'sweet','swept','swift','swing','swiss','sword','sworn','swung','syrup','table',
  'taken','tales','tasks','taste','taxes','teach','teams','tears','teens','tempo',
  'tends','tenor','tenth','terms','tests','thank','theft','theme','thick','thief',
  'thing','think','third','thorn','those','three','threw','throw','thumb','tight',
  'timer','times','tired','titan','title','toast','today','token','tonal','topic',
  'torch','total','touch','tough','tours','tower','towns','toxic','trace','track',
  'trade','trail','train','trait','trash','treat','trend','trial','tribe','trick',
  'tried','trims','trips','troop','truck','truly','trump','trunk','trust','truth',
  'tubes','tulip','tumor','tuned','tuner','turbo','turns','tutor','twice','twist',
  'typed','types','ultra','uncle','under','undue','union','unite','unity','until',
  'upper','upset','urban','usage','usher','using','usual','utter','vague','valid',
  'value','valve','vapor','vault','venue','verse','video','vigor','vinyl','viral',
  'visit','vista','vital','vivid','vocal','vodka','voice','voter','vowel','wages',
  'wagon','waist','walks','walls','waste','watch','water','watts','waves','weary',
  'weave','wedge','weeks','weigh','weird','whale','wheat','wheel','where','which',
  'while','white','whole','whose','wider','width','winds','wings','wiped','wired',
  'witch','woman','women','woods','words','works','world','worry','worse','worst',
  'worth','would','wound','wraps','wrath','write','wrote','yacht','yield','young',
  'yours','youth','zebra','zones',
]);

// Company / ML vocabulary additions for Bespoke Labs
const ML_VOCAB = new Set([
  'model','train','epoch','batch','layer','token','embed','nodes','prune','decay',
  'pixel','parse','query','agent','stack','cache','quota','scope','debug','fetch',
  'merge','build','clone','forge','bench','chain','graph','input','label','noise',
  'prior','probe','proxy','queue','relay','reset','scale','sigma','solve','spawn',
  'state','sweep','torch','trace','tuned','ultra','valid','vapor','voxel','yield',
  'blobs','cloud','coded','coder','craft','crypt','datum','dense','drift','grids',
  'hyper','index','infer','lingo','loops','macro','micro','mined','miner','mutex',
  'naive','nerds','nodes','numpy','pixel','pulls','regex','rerun','rungs','shard',
  'shell','sigma','slack','snaps','spark','spine','stats','stems','surge','tasks',
  'tests','think','tiers','tools','typed','types','units','usage','users','vault',
  'votes','wired','wires','works',
  // Bespoke-specific
  'pokes','spoke','baste','beast','blaze','bling','brain','charm','chief','chirp',
]);

// Combined set for validation
const ALL_VALID_WORDS = new Set([...COMMON_WORDS, ...ML_VOCAB]);

/**
 * Check if a 5-letter word is valid for guessing.
 */
export function isValidWord(word: string): boolean {
  return ALL_VALID_WORDS.has(word.toLowerCase());
}

/**
 * Evaluate a guess against the answer.
 * Returns an array of letter statuses: 'correct' | 'present' | 'absent'
 */
export type LetterStatus = 'correct' | 'present' | 'absent';

export function evaluateGuess(
  guess: string,
  answer: string
): LetterStatus[] {
  const g = guess.toLowerCase().split('');
  const a = answer.toLowerCase().split('');
  const result: LetterStatus[] = new Array(5).fill('absent');
  const answerLetterCounts: Record<string, number> = {};

  // Count letters in answer
  for (const letter of a) {
    answerLetterCounts[letter] = (answerLetterCounts[letter] || 0) + 1;
  }

  // First pass: mark correct (green)
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) {
      result[i] = 'correct';
      answerLetterCounts[g[i]]--;
    }
  }

  // Second pass: mark present (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] !== 'correct' && answerLetterCounts[g[i]] > 0) {
      result[i] = 'present';
      answerLetterCounts[g[i]]--;
    }
  }

  return result;
}

/**
 * Generate the emoji grid for sharing.
 */
export function generateEmojiGrid(
  guesses: string[],
  answer: string
): string {
  return guesses
    .map((guess) => {
      const result = evaluateGuess(guess, answer);
      return result
        .map((status) => {
          switch (status) {
            case 'correct': return '🟩';
            case 'present': return '🟨';
            case 'absent': return '⬛';
          }
        })
        .join('');
    })
    .join('\n');
}

export { ALL_VALID_WORDS };
