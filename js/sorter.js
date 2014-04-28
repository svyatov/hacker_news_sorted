(function () {
    'use strict';

    var Presenter = window.HNS.Presenter;

    window.HNS.Sorter = {
        byPoints: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowB.points - rowA.points; // descending sorting
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive('byPoints');
        },

        byTime: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowA.time - rowB.time; // ascending sorting, 'cause we interested in more fresh news, right?
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive('byTime');
        },

        byComments: function (parsedRows, footerRows) {
            parsedRows.sort(function (rowA, rowB) {
                return rowB.comments - rowA.comments; // descending sorting
            });

            Presenter.showNewSorting(parsedRows, footerRows);
            Presenter.showWhatSortingIsActive('byComments');
        }
    };

})();