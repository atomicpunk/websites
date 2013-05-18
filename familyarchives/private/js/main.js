function PhotoList() {
    "use strict";

    var self = this;

    function init()
    {
        var html = "";
        for(var i = 1; i <= total; i++)
        {
            html += '<a href="photo.html?image=scan'+i+'.jpg"><img src="th-scan'+i+'.jpg"/></a>';
        }
        var e = document.getElementById("main_page");
        e.innerHTML = html;

    }

    init();
}

window.addEventListener('load', function () {
    "use strict";
    var main = new PhotoList();
});

