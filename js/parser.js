(function () {
    'use strict';

    var Dom = window.HNS.Dom,
        Converter = window.HNS.Converter;

    window.HNS.Parser = {
        getPoints: function (infoRow) {
            var pointsElement = Dom.getPointsElement(infoRow);

            if (null !== pointsElement) {
                return Converter.string2Number(pointsElement.innerText);
            }

            return 0;
        },

        getTime: function (infoRow) {
            var timeText = Dom.getTimeText(infoRow);
            return Converter.relativeTime2Minutes(timeText);
        },

        getComments: function (infoRow) {
            var commentsElement = Dom.getCommentsElement(infoRow);

            if (null !== commentsElement) {
                return Converter.string2Number(commentsElement.innerText);
            }

            return 0;
        }
    };
})();