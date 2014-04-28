(function () {
    'use strict';

    var minutesRegex = /minute/,
        hoursRegex = /hour/,
        daysRegex = /day/;

    window.HNS.Converter = {
        nodeList2Array: function (nodeList) {
            var arr = [],
                i = 0,
                n = nodeList.length;

            for (; i < n; i++) {
                arr.push(nodeList[i]);
            }

            return arr;
        },

        string2Number: function (string) {
            var number = parseInt(string, 10);

            if (isNaN(number)) {
                number = 0;
            }

            return number;
        },

        relativeTime2Minutes: function (timeText) {
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