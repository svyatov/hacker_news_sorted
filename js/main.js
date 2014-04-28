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

    var HNS = window.HNS,
        Dom = HNS.Dom,
        Parser = HNS.Parser,
        Sorter = HNS.Sorter,
        Converter = HNS.Converter,
        Presenter = HNS.Presenter;

    var linksTable = Dom.getLinksTable();

    if (null === linksTable) {
        return;
    }

    if (false === Presenter.addSortButtons()) {
        return;
    }

    var linksTableBody   = Dom.getLinksTableBody(linksTable),
        titleRows        = Converter.nodeList2Array(Dom.getTitleRows(linksTableBody)),
        infoRows         = Converter.nodeList2Array(Dom.getInfoRows(linksTableBody)),
        delimiterRows    = Converter.nodeList2Array(Dom.getDelimiterRows(linksTableBody)),
        footerRows       = [titleRows.pop(), infoRows.pop()],
        parsedRows       = [];

    for (var i = 0, n = titleRows.length; i < n; i++) {
        parsedRows.push({
            title:     titleRows[i],
            info:      infoRows[i],
            delimiter: delimiterRows[i],
            points:    Parser.getPoints(infoRows[i]),
            time:      Parser.getTime(infoRows[i]),
            comments:  Parser.getComments(infoRows[i])
        });
    }

    Sorter.byPoints(parsedRows, footerRows);

    var activeLinkCode = HNS.byPointsCode;

    Dom.getSortByPointsButton().addEventListener('click', function () {
        if (activeLinkCode !== HNS.byPointsCode) {
            Sorter.byPoints(parsedRows, footerRows);
            activeLinkCode = HNS.byPointsCode;
        }
    }, false);

    Dom.getSortByTimeButton().addEventListener('click', function () {
        if (activeLinkCode !== HNS.byTimeCode) {
            Sorter.byTime(parsedRows, footerRows);
            activeLinkCode = HNS.byTimeCode;
        }
    }, false);

    Dom.getSortByCommentsButton().addEventListener('click', function () {
        if (activeLinkCode !== HNS.byCommentsCode) {
            Sorter.byComments(parsedRows, footerRows);
            activeLinkCode = HNS.byCommentsCode;
        }
    }, false);

})();