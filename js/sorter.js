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