/**
 * Hacker News Sorted extension for Google Chrome
 * Copyright (C) 2014 Leonid Svyatov <leonid@svyatov.ru>
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