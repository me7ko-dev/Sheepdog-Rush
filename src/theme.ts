// Colors and sizes used by the menus. Change them here to restyle the whole game.
export const theme = {
  sky: '#8FD3F4',
  grass: '#7CCB5B',
  grassDark: '#4E9A3A',
  cream: '#FFF8E7',
  creamDark: '#E9C98B',
  text: '#5B3A1A',
  textLight: '#8A6A47',
  white: '#FFFFFF',
  overlay: 'rgba(40, 30, 10, 0.55)',
  gold: '#FFC83D',
  goldDark: '#E09B00',
  starEmpty: '#D9CBB0',
  buttons: {
    green: { bg: '#5BBA47', edge: '#3E8E2E' },
    orange: { bg: '#FF9F1C', edge: '#C8740A' },
    blue: { bg: '#3FA7D6', edge: '#2A7CA3' },
    red: { bg: '#EF476F', edge: '#B32D50' },
  },
  radius: 18,
};

export type ButtonColor = keyof typeof theme.buttons;
