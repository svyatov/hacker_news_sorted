import { DAYS_REGEX, HOURS_REGEX, MINUTES_REGEX } from '~app/constants';

export const stringToNumber = (string: string): number => {
  const number = parseInt(string, 10);

  if (isNaN(number)) {
    return 0;
  }

  return number;
};

export const relativeTimeToMinutes = (timeText: string): number => {
  if (timeText.length < 1) {
    return 0;
  }

  if (MINUTES_REGEX.test(timeText)) {
    return stringToNumber(timeText);
  }

  if (HOURS_REGEX.test(timeText)) {
    return stringToNumber(timeText) * 60;
  }

  if (DAYS_REGEX.test(timeText)) {
    return stringToNumber(timeText) * 1440;
  }

  return 0;
};
