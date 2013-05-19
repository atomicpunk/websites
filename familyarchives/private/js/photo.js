function Photo() {
    "use strict";

    var self = this;
    this.photolist = new PhotoList();

/*
    function exifDone(oImg)
    {
    }

    function exifLoad()
    {
    }

    function loadImage(filename)
    {
    }
*/

    function init()
    {
        if(location.search.indexOf("?image=") != 0)
            return;
        self.loadImage(location.search.substr(7));

        document.getElementById("prevbtn").addEventListener('click', function () {
            self.prev();
        });

        document.getElementById("nextbtn").addEventListener('click', function () {
            self.next();
        });
    }

    init();
}

Photo.prototype.next = function() {
    var newimg = this.photolist.next(this.img);
    this.loadImage(newimg);
    console.log(newimg);
}

Photo.prototype.prev = function() {
    var newimg = this.photolist.prev(this.img);
    this.loadImage(newimg);
    console.log(newimg);
}

Photo.prototype.loadImage = function(filename) {
    this.img = filename;
    this.file = "images/"+this.img;
    var e = document.getElementById("photoview");
    e.innerHTML = '<center><img src="'+this.file+'" height="100%" exif="true"/></center>';

    var aImages = document.getElementsByTagName("img");
    for (var i = 0; i < aImages.length; i++)
    {
        if(aImages[i].getAttribute("src") == this.file)
        {
            EXIF.getData(aImages[i], this.exifDone);
            break;
        }
    }
}

Photo.prototype.exifDone = function(oImg) {
    var uc = oImg.exifdata.UserComment;
    var usercomment = "";
    for (var i = 0; i < uc.length; i++)
    {
        usercomment += String.fromCharCode(uc[i]);
    }
    var e = document.getElementById("caption");
    e.innerText = usercomment;
}

window.addEventListener('load', function () {
    "use strict";
    var main = new Photo();
});
