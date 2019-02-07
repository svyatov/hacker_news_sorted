/**
 * Hacker News Sorted extension for Google Chrome
 * Copyright (C) 2014,2019 Leonid Svyatov <leonid@svyatov.ru>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 **/

(function() {
  "use strict";

  const minutesRegex = /minute/;
  const hoursRegex = /hour/;
  const daysRegex = /day/;

  window.HNS.Converter = {
    string2Number: function(string) {
      let number = parseInt(string, 10);

      if (isNaN(number)) {
        number = 0;
      }

      return number;
    },

    relativeTime2Minutes: function(timeText) {
      if (timeText.length < 1) {
        return 0;
      }

      if (minutesRegex.test(timeText)) {
        return this.string2Number(timeText);
      }

      if (hoursRegex.test(timeText)) {
        return this.string2Number(timeText) * 60;
      }

      if (daysRegex.test(timeText)) {
        return this.string2Number(timeText) * 1440;
      }

      return 0;
    }
  };
})();
