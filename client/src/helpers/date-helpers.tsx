export const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);


export const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);


export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();