(function () {
    'use strict';

    window.HNS.Dom = {
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
        },

        getButtonsPlacement: function () {
            return document.querySelector('body > center > table > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(3) > span');
        }
    };

})();