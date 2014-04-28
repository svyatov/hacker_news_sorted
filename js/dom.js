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

    window.HNS.Dom = {
        getButtonsPlacement: function () {
            return document.querySelector('body > center > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(3) > span');
        },

        getSortByPointsButton: function() {
            return document.getElementById('hns_sort_by_points');
        },

        getSortByTimeButton: function() {
            return document.getElementById('hns_sort_by_time');
        },

        getSortByCommentsButton: function() {
            return document.getElementById('hns_sort_by_comments');
        },

        getLinksTable: function () {
            return document.querySelector('body > center > table > tbody > tr:nth-child(3) > td > table');
        },

        getLinksTableBody: function (linksTable) {
            return linksTable.querySelector('tbody');
        },

        getTitleRows: function (linksTableBody) {
            return linksTableBody.querySelectorAll('tr:nth-child(3n+1)');
        },

        getInfoRows: function (linksTableBody) {
            return linksTableBody.querySelectorAll('tr:nth-child(3n+2)');
        },

        getDelimiterRows: function (linksTableBody) {
            return linksTableBody.querySelectorAll('tr:nth-child(3n+3)');
        },

        getPointsElement: function (infoRow) {
            return infoRow.querySelector('td.subtext > span');
        },

        getTimeText: function (infoRow) {
            return document.evaluate('.//td[2]/text()[2]', infoRow, null, XPathResult.STRING_TYPE, null).stringValue;
        },

        getCommentsElement: function(infoRow) {
            return infoRow.querySelector('td.subtext > a:nth-child(3)');
        }
    };

})();