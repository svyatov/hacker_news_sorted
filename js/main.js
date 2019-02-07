/**
 * Hacker News Sorted extension for Google Chrome
 * Copyright (C) 2014,2019 Leonid Svyatov <leonid@svyatov.ru>
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

(function() {
  "use strict";

  const HNS = window.HNS;
  const Dom = HNS.Dom;
  const Parser = HNS.Parser;
  const Sorter = HNS.Sorter;
  const Presenter = HNS.Presenter;

  const linksTable = Dom.getLinksTable();

  if (null === linksTable) {
    return;
  }

  if (false === Presenter.addSortButtons()) {
    return;
  }

  const linksTableBody = Dom.getLinksTableBody(linksTable);
  const titleRows = Array.from(Dom.getTitleRows(linksTableBody));
  const infoRows = Array.from(Dom.getInfoRows(linksTableBody));
  const delimiterRows = Array.from(Dom.getDelimiterRows(linksTableBody));
  const footerRows = [titleRows.pop(), infoRows.pop()];

  const parsedRows = titleRows.map(function(_row, idx) {
    return {
      title: titleRows[idx],
      info: infoRows[idx],
      delimiter: delimiterRows[idx],
      points: Parser.getPoints(infoRows[idx]),
      time: Parser.getTime(infoRows[idx]),
      comments: Parser.getComments(infoRows[idx])
    };
  });

  Sorter.byPoints(parsedRows, footerRows);

  let activeLinkCode = HNS.byPointsCode;

  Dom.getSortByPointsButton().addEventListener(
    "click",
    function() {
      if (activeLinkCode === HNS.byPointsCode) return;

      Sorter.byPoints(parsedRows, footerRows);
      activeLinkCode = HNS.byPointsCode;
    },
    false
  );

  Dom.getSortByTimeButton().addEventListener(
    "click",
    function() {
      if (activeLinkCode === HNS.byTimeCode) return;

      Sorter.byTime(parsedRows, footerRows);
      activeLinkCode = HNS.byTimeCode;
    },
    false
  );

  Dom.getSortByCommentsButton().addEventListener(
    "click",
    function() {
      if (activeLinkCode === HNS.byCommentsCode) return;

      Sorter.byComments(parsedRows, footerRows);
      activeLinkCode = HNS.byCommentsCode;
    },
    false
  );
})();
