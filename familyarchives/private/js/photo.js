function Photo() {
    "use strict";

    var self = this;

    function exifDone(oImg)
    {
        var uc = oImg.exifdata.UserComment;
        var usercomment = "";
        for (var i = 0; i < uc.length; i++)
        {
            usercomment += String.fromCharCode(uc[i]);
        }
        var e = document.getElementById("caption");
        e.innerText = usercomment;
    }

    function init()
    {
        if(location.search.indexOf("?image=") != 0)
            return;
        self.file = "photos/"+location.search.substr(7);
        var e = document.getElementById("photoview");
        e.innerHTML = '<center><img src="'+self.file+'" width="96%" exif="true"/></center>';
        var aImages = document.getElementsByTagName("img");
        for (var i = 0; i < aImages.length; i++)
        {
            if(aImages[i].getAttribute("src") == self.file)
            {
                EXIF.getData(aImages[i], exifDone);
                break;
            }
        }
    }

    init();
}
