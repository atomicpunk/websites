function Intro() {
    "use strict";

    var self = this;

    function init()
    {
        var e = document.getElementById("main_page");
        e.className = "intro";
    }

    init();
}

if (!window.addEventListener) {
    window.attachEvent("onclick", function () {
        var main = new Intro();
    });
} else {
    window.addEventListener('load', function () {
        "use strict";
        var main = new Intro();
    });
}
