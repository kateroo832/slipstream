/* Exercise-snack database for the Move tab.
 * spice: 0 = gentle (flare-day safe) · 1 = moderate · 2 = spicy
 * min: honest time estimate in minutes
 * hm: hypermobility cue (control over range — never passive end-range stretch)
 * cat: gentle | mobility | core | legs | power | combo
 */
const Moves = (() => {
  const DB = [
    // ---- gentle (flare-day safe) ----
    { id: 'ankle-pumps', cat: 'gentle', spice: 0, min: 1, name: 'Ankle circles + calf pumps', dose: '30s each side', cue: 'Seated or standing. Wake the lower legs up gently.' },
    { id: 'cat-cow', cat: 'gentle', spice: 0, min: 1, name: 'Cat-cow, slow', dose: '8 slow reps', cue: 'Move through the spine like syrup.', hm: 'Stay in the comfortable middle range — no slumping to end range.' },
    { id: 'pelvic-tilts', cat: 'gentle', spice: 0, min: 1, name: 'Lying pelvic tilts', dose: '10 slow', cue: 'Press the low back gently to the floor, release. Tiny move, real core.' },
    { id: 'breath-brace', cat: 'gentle', spice: 0, min: 1, name: 'Breath + brace', dose: '5 slow breaths', cue: 'Inhale into the belly; exhale and gently tense the core like a soft corset. This is the foundation of everything.' },
    { id: 'glute-squeeze', cat: 'gentle', spice: 0, min: 1, name: 'Standing glute squeezes', dose: '10 × 5s holds', cue: 'Squeeze like you\'re holding a winning lottery ticket.' },
    { id: 'wall-angels', cat: 'gentle', spice: 0, min: 2, name: 'Wall angels', dose: '8 slow', cue: 'Back against the wall, arms slide up and down. Shoulder blades do the work.', hm: 'Only as far as stays easy — control is the goal, not range.' },
    { id: 'blade-squeeze', cat: 'gentle', spice: 0, min: 1, name: 'Shoulder-blade squeezes', dose: '2×10', cue: 'Pull the blades down and together. No shrugging.' },
    { id: 'weight-shifts', cat: 'gentle', spice: 0, min: 1, name: 'Standing weight shifts', dose: '30s', cue: 'Rock side to side, let your balance wake up.' },
    { id: 'heel-taps', cat: 'gentle', spice: 0, min: 1, name: 'Seated heel taps', dose: '2×12', cue: 'Sit tall, alternate tapping heels out and back.' },
    // ---- mobility & control (hypermobility gold) ----
    { id: 'hip-cars', cat: 'mobility', spice: 0, min: 2, name: 'Hip circles (CARs)', dose: '5 each way, per side', cue: 'Standing, hold the counter; draw the biggest slow circle your knee can.', hm: 'Perfect for hypermobility — builds control at the range you already own.' },
    { id: 'shoulder-cars', cat: 'mobility', spice: 0, min: 2, name: 'Shoulder circles (CARs)', dose: '5 each way, per side', cue: 'Arm straight, trace a slow, owned circle. Nothing floppy.' },
    { id: 'reach-throughs', cat: 'mobility', spice: 0, min: 2, name: 'Quadruped reach-throughs', dose: '8 per side', cue: 'On all fours, thread one arm under, rotate the mid-back, return.' },
    { id: 'ninety-switch', cat: 'mobility', spice: 1, min: 2, name: '90/90 hip switches', dose: '8 slow', cue: 'Sitting, knees at 90°, rotate both legs side to side with control. Hover the hands to make it spicy.' },
    { id: 'tib-raises', cat: 'mobility', spice: 0, min: 1, name: 'Tibialis raises', dose: '15 reps', cue: 'Heels planted, lift the toes quick, lower slow. Shin armor for stairs.' },
    // ---- core ----
    { id: 'dead-bug', cat: 'core', spice: 1, min: 2, name: 'Dead bug', dose: '2×6 per side, slow', cue: 'Low back glued down; opposite arm and leg reach away.', hm: 'Keep the ribs from flaring — small range, big control.' },
    { id: 'bird-dog', cat: 'core', spice: 1, min: 2, name: 'Bird dog', dose: '2×6 per side', cue: 'Reach long, hold 3 seconds, let nothing wobble.' },
    { id: 'plank', cat: 'core', spice: 1, min: 2, name: 'Forearm plank (knees fine)', dose: '2 × 15–30s', cue: 'Hips level, glutes squeezed.', hm: 'Muscles hold you up, not joints — don\'t hang on the shoulders.' },
    { id: 'side-plank', cat: 'core', spice: 1, min: 2, name: 'Side plank from knees', dose: '15–20s per side', cue: 'Shoulders stacked, hips lifted and pressed forward.' },
    { id: 'bridge-march', cat: 'core', spice: 1, min: 2, name: 'Glute bridge + march', dose: '2×6 per side', cue: 'Bridge up, hold, march slowly without the hips dipping.' },
    { id: 'knee-elbow', cat: 'core', spice: 1, min: 2, name: 'Standing knee-to-elbow', dose: '2×10 per side', cue: 'Cross-body crunch standing up — obliques plus balance.' },
    { id: 'hollow-tuck', cat: 'core', spice: 2, min: 2, name: 'Tucked hollow hold', dose: '2 × 15s', cue: 'Knees bent, low back pressed down, shoulders hovering.' },
    { id: 'slow-climbers', cat: 'core', spice: 2, min: 2, name: 'Slow mountain climbers', dose: '2 × 20s', cue: 'Plank position, slow deliberate knee drives. The core runs this show.' },
    // ---- leg strength ----
    { id: 'sit-to-stand', cat: 'legs', spice: 1, min: 3, name: 'Sit-to-stands', dose: '2×8', cue: 'No hands if you can. Slow down, strong up. This IS the stairs exercise in disguise.' },
    { id: 'wall-sit', cat: 'legs', spice: 1, min: 2, name: 'Wall sit', dose: '2 × 20–30s', cue: 'Slide down toward thighs-parallel. Breathe.', hm: 'Press through the whole foot; don\'t snap the knees back when you stand.' },
    { id: 'step-ups', cat: 'legs', spice: 1, min: 3, name: 'Bottom-stair step-ups', dose: '2×8 per side', cue: 'Drive through the heel on the stair. Literal stair training.' },
    { id: 'tempo-squat', cat: 'legs', spice: 1, min: 3, name: 'Tempo squats to a chair', dose: '10 reps, 3s down', cue: 'Lower for a slow 3-count, tap the chair, stand tall.', hm: 'Stop at the chair — depth is earned, not fallen into.' },
    { id: 'split-squat', cat: 'legs', spice: 2, min: 3, name: 'Split squats (hold the counter)', dose: '6 per side', cue: 'Long stance; the back knee drops straight down.' },
    { id: 'calf-raises', cat: 'legs', spice: 1, min: 2, name: 'Slow calf raises', dose: '2×12', cue: 'Up quick-ish, down on a 3-count. Stair springs.' },
    { id: 'glute-bridge', cat: 'legs', spice: 0, min: 2, name: 'Glute bridge', dose: '2×12', cue: 'Squeeze at the top for 2 seconds. Ribs down.' },
    { id: 'clamshells', cat: 'legs', spice: 0, min: 2, name: 'Clamshells', dose: '12 per side', cue: 'Side-lying, feet together, top knee opens. Hips stay stacked.' },
    { id: 'sl-balance', cat: 'legs', spice: 1, min: 2, name: 'Single-leg balance + reach', dose: '6 per side', cue: 'Stand on one leg, hinge and reach forward, return tall.', hm: 'Soft knee the whole time — balance work is hypermobility gold.' },
    { id: 'lateral-sink', cat: 'legs', spice: 1, min: 2, name: 'Lateral step + sink', dose: '8 per side', cue: 'Step wide, sink into that hip, push back to standing.' },
    // ---- stair power ----
    { id: 'power-stands', cat: 'power', spice: 2, min: 3, name: 'Power sit-to-stands', dose: '2×6', cue: 'Slow 3-count down… then explode up. The stair-sprint secret.' },
    { id: 'quick-stepups', cat: 'power', spice: 2, min: 3, name: 'Quick step-ups + knee drive', dose: '2×6 per side', cue: 'Step up fast, drive the floating knee high. The rail is allowed.' },
    { id: 'heel-pops', cat: 'power', spice: 2, min: 2, name: 'Heel-raise pops', dose: '2×10', cue: 'Pop up onto the toes quickly, lower slow. Power without impact.' },
    { id: 'march-ramp', cat: 'power', spice: 2, min: 2, name: 'March → high-knees ramp', dose: '20s march, 20s high knees, ×2', cue: 'Start easy, finish bouncy. Scale the bounce to what your joints like today.' },
    { id: 'stair-flight', cat: 'power', spice: 2, min: 3, name: 'One brisk flight', dose: 'Up briskly, down easy, ×2', cue: 'The actual goal, in miniature.' },
    { id: 'squat-pop', cat: 'power', spice: 2, min: 2, name: 'Squat to toe-pop', dose: '8 reps', cue: 'Shallow squat, rise fast all the way onto the toes. No jumping, all power.' },
    { id: 'stepback-knee', cat: 'power', spice: 2, min: 3, name: 'Step-back lunge → knee drive', dose: '6 per side', cue: 'Flow one into the next; counter-hand for balance.' },
    // ---- combos (for bigger windows) ----
    { id: 'combo-legs', cat: 'combo', spice: 2, min: 5, name: 'Mini circuit: legs', dose: '2 rounds — 8 chair squats · 20s plank · 10 bridges', cue: 'Move steadily, rest between rounds as needed.' },
    { id: 'combo-stairs', cat: 'combo', spice: 2, min: 5, name: 'Stair circuit', dose: '3 rounds — 1 flight + 8 calf raises + 15s wall sit', cue: 'Brisk but never breathless-dizzy. Rail allowed, always.' },
    { id: 'combo-core', cat: 'combo', spice: 1, min: 5, name: 'Core trio', dose: '2 rounds — 6 dead bugs/side · 6 bird dogs/side · 15s side plank/side', cue: 'Slow is the whole point.' },
  ];

  const CAT_LABELS = { gentle: 'Gentle', mobility: 'Control & mobility', core: 'Core', legs: 'Leg strength', power: 'Stair power', combo: 'Mini circuit' };

  function byId(id) { return DB.find(e => e.id === id) || null; }

  /* Pick one exercise for the chosen window. Flare → gentle only.
   * Non-flare picks are weighted toward the stairs mission (legs/power/core). */
  function pick(budget, flare, banned, recent) {
    let pool = DB.filter(e => !banned.includes(e.id) && e.min <= budget);
    if (flare) pool = pool.filter(e => e.spice === 0);
    if (!pool.length) return null;
    // prefer meatier options for bigger windows
    const meaty = pool.filter(e => e.min >= Math.ceil(budget / 2.5));
    if (meaty.length) pool = meaty;
    // avoid the last few shown
    const fresh = pool.filter(e => !recent.includes(e.id));
    if (fresh.length) pool = fresh;
    // mission weighting: double the odds of legs/power/core when not flaring
    if (!flare) {
      const boosted = pool.filter(e => e.cat === 'legs' || e.cat === 'power' || e.cat === 'core' || e.cat === 'combo');
      pool = pool.concat(boosted);
    }
    return pool[(Math.random() * pool.length) | 0];
  }

  return { DB, byId, pick, CAT_LABELS };
})();
