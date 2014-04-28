(function () {
    'use strict';

    var Dom = window.HNS.Dom,
        cssActiveClass = 'hns_active_sorting';

    var resetButton = function (button) {
        button.classList.remove(cssActiveClass);
    };

    var highlightButton = function (button) {
        button.classList.add(cssActiveClass);
    };

    window.HNS.Presenter = {
        addSortButtons: function () {
            var placement = Dom.getButtonsPlacement();

            if (null === placement) {
                return false;
            }

            var sortButtonsHtml =
                'Sort by: ' +
                '<span id="hns_sort_by_points">P</span> ' +
                '<span id="hns_sort_by_time">T</span> ' +
                '<span id="hns_sort_by_comments">C</span>' +
                ' | ';

            placement.innerHTML = sortButtonsHtml + placement.innerHTML;

            return true;
        },

        showNewSorting: function (parsedRows, footerRows) {
            var linksTable = Dom.getLinksTable(),
                linksTableBody = Dom.getLinksTableBody(linksTable),
                sortedRowsFragment = document.createDocumentFragment(),
                sortedLinksTableBody = sortedRowsFragment.appendChild(document.createElement('tbody'));

            parsedRows.forEach(function (rowSet) {
                sortedLinksTableBody.appendChild(rowSet.title);
                sortedLinksTableBody.appendChild(rowSet.info);
                sortedLinksTableBody.appendChild(rowSet.delimiter);
            });

            footerRows.forEach(function (row) {
                sortedLinksTableBody.appendChild(row);
            });

            linksTable.replaceChild(sortedRowsFragment, linksTableBody);
        },

        showWhatSortingIsActive: function (sortingType) {
            resetButton(Dom.getSortByPointsButton());
            resetButton(Dom.getSortByTimeButton());
            resetButton(Dom.getSortByCommentsButton());

            switch (sortingType) {
                case 'byPoints':   highlightButton(Dom.getSortByPointsButton()); break;
                case 'byTime':     highlightButton(Dom.getSortByTimeButton()); break;
                case 'byComments': highlightButton(Dom.getSortByCommentsButton()); break;
            }
        }
    };

})();