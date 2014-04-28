(function() {
    'use strict';

    window.nodeList2Array = function (nodeList) {
        var arr = [],
            i = 0,
            n = nodeList.length;

        for (; i < n; i++) {
            arr.push(nodeList[i]);
        }

        return arr;
    };
})();