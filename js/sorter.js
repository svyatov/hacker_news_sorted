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
        Presenter = HNS.Presenter;

    window.HNS.Sorter = {
        byPoints: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowB.points - rowA.points; // descending sorting
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive(HNS.byPointsCode);
        },

        byTime: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowA.time - rowB.time; // ascending sorting, 'cause we interested in more fresh news, right?
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive(HNS.byTimeCode);
        },

        byComments: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowB.comments - rowA.comments; // descending sorting
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive(HNS.byCommentsCode);
        }
    };

})();