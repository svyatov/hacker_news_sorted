/* global nodeList2Array:false */

(function () {
    'use strict';

    var linksTable = document.querySelector('body > center > table > tbody > tr:nth-child(3) > td > table');

    if (null === linksTable) {
        return;
    }

    var linksTableBody   = linksTable.querySelector('tbody'),
        titleRows        = nodeList2Array(linksTableBody.querySelectorAll('tr:nth-child(3n+1)')),
        infoRows         = nodeList2Array(linksTableBody.querySelectorAll('tr:nth-child(3n+2)')),
        delimiterRows    = nodeList2Array(linksTableBody.querySelectorAll('tr:nth-child(3n+3)')),
        rowBeforeMoreRow = titleRows.pop(),
        moreRow          = infoRows.pop(),
        sortedRows       = [];

    for (var i = 0, n = titleRows.length; i < n; i++) {
        var points = 0,
            pointsElement = infoRows[i].querySelector('td.subtext > span');

        if (null !== pointsElement) {
            points = parseInt(pointsElement.innerText, 10);
        }

        sortedRows.push({
            title: titleRows[i],
            info: infoRows[i],
            delimiter: delimiterRows[i],
            points: points
        });
    }

    sortedRows.sort(function (rowA, rowB) {
        return rowB.points - rowA.points; // descending sorting
    });

    var sortedRowsFragment = document.createDocumentFragment(),
        sortedLinksTableBody = sortedRowsFragment.appendChild(document.createElement('tbody'));

    sortedRows.forEach(function (rowSet) {
        sortedLinksTableBody.appendChild(rowSet.title);
        sortedLinksTableBody.appendChild(rowSet.info);
        sortedLinksTableBody.appendChild(rowSet.delimiter);
    });
    sortedLinksTableBody.appendChild(rowBeforeMoreRow);
    sortedLinksTableBody.appendChild(moreRow);

    linksTable.replaceChild(sortedRowsFragment, linksTableBody);
})();