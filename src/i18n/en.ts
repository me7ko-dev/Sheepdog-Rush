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

  hintDrag: 'Drag your finger - the dog runs there!',
  hintGoal: 'Push all sheep into the pen',
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
  comingSoon: 'More levels coming soon',

  level_1: 'First Steps',
  level_2: 'Bushy Meadow',
  level_3: 'River Crossing',
};

export type StringKey = keyof typeof en;
