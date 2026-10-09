import type { StringKey } from './en';

// Български превод. TypeScript ще покаже грешка, ако липсва ключ от en.ts.
export const bg: Record<StringKey, string> = {
  appTitle: 'Sheepdog Rush',
  tagline: 'Прибери стадото, преди времето да свърши!',
  play: 'Играй',
  levels: 'Нива',
  level: 'Ниво {n}',
  back: 'Назад',
  language: 'Език',

  hintDrag: 'Задръж и плъзни - кучето тича към пръста ти!',
  hintGoal: 'Прибери всички овце в двора на хамбара',
  paused: 'Пауза',
  resume: 'Продължи',
  restart: 'Отначало',
  menu: 'Меню',

  winTitle: 'Браво!',
  loseTitle: 'Времето свърши!',
  loseText: '{n} овце останаха на поляната',
  yourTime: 'Време: {t}',
  next: 'Напред',
  retry: 'Опитай пак',
  allDone: 'Мина всички нива! Очаквай още скоро.',

  level_1: 'Първи стъпки',
  level_2: 'Храстите',
  level_3: 'През реката',
  level_4: 'Лабиринт от сено',
  level_5: 'Два моста',
  level_6: 'Скалисти хълмове',
  level_7: 'Завоят на реката',
  level_8: 'Вълкът',
  level_9: 'Вълча гора',
  level_10: 'Голямото прибиране',

  wolfWarning: 'Внимание - вълк! Прогони го!',
  wolfTitle: 'О, не!',
  loseWolf: 'Вълкът стигна до една овца!',
  hintBlack: 'Черните овце са инатливи - обичат да се отделят.',
  loading: 'Зареждаме фермата...',
};
