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

    var byPointsCode   = 'byPoints',
        byTimeCode     = 'byTime',
        byCommentsCode = 'byComments',
        activeLinkCode = byPointsCode;

    Dom.getSortByPointsButton().addEventListener('click', function () {
        if (activeLinkCode !== byPointsCode) {
            Sorter.byPoints(parsedRows, footerRows);
            activeLinkCode = byPointsCode;
        }
    }, false);

    Dom.getSortByTimeButton().addEventListener('click', function () {
        if (activeLinkCode !== byTimeCode) {
            Sorter.byTime(parsedRows, footerRows);
            activeLinkCode = byTimeCode;
        }
    }, false);

    Dom.getSortByCommentsButton().addEventListener('click', function () {
        if (activeLinkCode !== byCommentsCode) {
            Sorter.byComments(parsedRows, footerRows);
            activeLinkCode = byCommentsCode;
        }
    }, false);

})();