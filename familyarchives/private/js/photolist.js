function PhotoList(elem) {
    "use strict";

    var self = this;
    this.element = elem;
    this.list = [];

    function get_dirlist(url)
    {
        var http;
        if(window.XMLHttpRequest)
            http = new XMLHttpRequest();
        else
            http = new ActiveXObject('microsoft.XMLHTTP');
        http.open('GET', url, true);
        http.onreadystatechange =
            function()
            {
                if(http.readyState == 4)
                {
                    parse_dirlist(http.responseText);
                }
                return(true);
            };
         http.send(null);
    }

    function parse_dirlist(pagetext)
    {
        var n;
        var data = new String(pagetext);
        var html = "";
        while((n = data.search('<a href="')) >= 0)
        {
            data = data.substr(n+9);
            var e = data.search('"');
            if(e >= 0)
            {
                var img = data.substr(0, e);
                if(img.substr(img.length - 4).toLowerCase() == ".jpg")
                {
                    var newline = 
                        '<div class="thumb">' +
                        '<a href="photo.html?image='+img+'"><img src="thumbs/'+img+'"/></a>' +
                        '</div>';
                    html += newline;
                    self.list[self.list.length] = img;
                }
            }
        }
        if(self.element)
        {
            var e = document.getElementById(self.element);
            e.innerHTML = html;
        }
    }

    function init()
    {
        get_dirlist("images/");
    }

    init();
}

PhotoList.prototype.next = function(current) {
    var newimg = "";
    for(var i = 0; i < this.list.length; i++)
    {
        if(this.list[i] == current)
        {
            var n = (i + 1 + this.list.length)%this.list.length;
            newimg = this.list[n];
        }
    }
    return newimg;
}

PhotoList.prototype.prev = function(current) {
    var newimg = "";
    for(var i = 0; i < this.list.length; i++)
    {
        if(this.list[i] == current)
        {
            var n = (i - 1 + this.list.length)%this.list.length;
            newimg = this.list[n];
        }
    }
    return newimg;
}

