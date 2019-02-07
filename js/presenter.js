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
  const cssActiveClass = "hns_active_sorting";

  const resetButton = function(button) {
    button.classList.remove(cssActiveClass);
  };

  const highlightButton = function(button) {
    button.classList.add(cssActiveClass);
  };

  window.HNS.Presenter = {
    addSortButtons: function() {
      const placement = Dom.getButtonsPlacement();

      if (null === placement) {
        return false;
      }

      const sortButtonsHtml =
        "Sort by: " +
        '<span id="hns_sort_by_points">P</span> ' +
        '<span id="hns_sort_by_time">T</span> ' +
        '<span id="hns_sort_by_comments">C</span>' +
        " | ";

      placement.innerHTML = sortButtonsHtml + placement.innerHTML;

      return true;
    },

    showNewSorting: function(parsedRows, footerRows) {
      const linksTable = Dom.getLinksTable();
      const linksTableBody = Dom.getLinksTableBody(linksTable);
      const sortedRowsFragment = document.createDocumentFragment();
      const sortedLinksTableBody = sortedRowsFragment.appendChild(document.createElement("tbody"));

      parsedRows.forEach(function(rowSet) {
        sortedLinksTableBody.appendChild(rowSet.title);
        sortedLinksTableBody.appendChild(rowSet.info);
        sortedLinksTableBody.appendChild(rowSet.delimiter);
      });

      footerRows.forEach(function(row) {
        sortedLinksTableBody.appendChild(row);
      });

      linksTable.replaceChild(sortedRowsFragment, linksTableBody);
    },

    showWhatSortingIsActive: function(sortingType) {
      resetButton(Dom.getSortByPointsButton());
      resetButton(Dom.getSortByTimeButton());
      resetButton(Dom.getSortByCommentsButton());

      switch (sortingType) {
        case HNS.byPointsCode:
          highlightButton(Dom.getSortByPointsButton());
          break;
        case HNS.byTimeCode:
          highlightButton(Dom.getSortByTimeButton());
          break;
        case HNS.byCommentsCode:
          highlightButton(Dom.getSortByCommentsButton());
          break;
      }
    }
  };
})();
