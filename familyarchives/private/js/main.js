
if (!window.addEventListener) {
    window.attachEvent("onclick", function () {
        var main = new PhotoList("main_page");
    });
} else {
    window.addEventListener('load', function () {
        "use strict";
        var main = new PhotoList("main_page");
    });
}
