function Intro() {
    "use strict";

    var self = this;

    function init()
    {
        var e = document.getElementById("main_page");
        e.className = "intro";
        var myWidth = window.innerWidth;
        var myHeight = window.innerHeight;
		if(myWidth < 1300) {
			var items = document.getElementsByClassName('enterdiv');
			for (var i = 0; i < items.length; i++) {
				items[i].style.display="none";
			}
		}
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
