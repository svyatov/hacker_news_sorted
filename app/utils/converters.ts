export const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

export const stringToNumber = (string: string): number => {
  const number = parseInt(string, 10);

  if (isNaN(number)) {
    return 0;
  }

  return number;
};
