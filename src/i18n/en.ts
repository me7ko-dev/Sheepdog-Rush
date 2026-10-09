// English texts (the main language of the game).
// To add a new text: add a key here, then the same key in bg.ts.
export const en = {
  appTitle: 'Sheepdog Rush',
  tagline: 'Herd the flock before time runs out!',
  play: 'Play',
  levels: 'Levels',
  level: 'Level {n}',
  back: 'Back',
  language: 'Language',

  hintDrag: 'Hold and drag - the dog runs to your finger!',
  hintGoal: 'Herd all sheep into the barn yard',
  paused: 'Paused',
  resume: 'Resume',
  restart: 'Restart',
  menu: 'Menu',

  winTitle: 'Well done!',
  loseTitle: "Time's up!",
  loseText: '{n} sheep still out in the meadow',
  yourTime: 'Time: {t}',
  next: 'Next',
  retry: 'Try again',
  allDone: 'You finished all levels! More coming soon.',

  level_1: 'First Steps',
  level_2: 'Bushy Meadow',
  level_3: 'River Crossing',
  level_4: 'Hay Maze',
  level_5: 'Two Bridges',
  level_6: 'Rocky Hills',
  level_7: 'River Bend',
  level_8: 'The Wolf',
  level_9: 'Wolf Woods',
  level_10: 'Big Roundup',

  wolfWarning: 'Watch out - a wolf! Chase it away!',
  wolfTitle: 'Oh no!',
  loseWolf: 'The wolf got too close to a sheep!',
  hintBlack: 'Black sheep are stubborn - they like to wander off.',
  loading: 'Loading the farm...',
};

export type StringKey = keyof typeof en;
