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

  hintDrag: 'Плъзни пръст - кучето тича натам!',
  hintGoal: 'Вкарай всички овце в кошарата',
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
  comingSoon: 'Още нива очаквай скоро',

  level_1: 'Първи стъпки',
  level_2: 'Храстите',
  level_3: 'През реката',
};
