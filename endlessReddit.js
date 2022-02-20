function getNextUrl(){
    var nextBtn = document.querySelector(".nav-buttons .next-button a");
    var nextPageUrl = nextBtn.getAttribute("href");
    console.log("next:",nextPageUrl);
    return nextPageUrl;
}

function fetchNextPage(){
    fetchCt++;
    if(fetchCt>5){console.log("maxed");return;}

    console.log("fetching...");
    var textResult = "";
    // fetch returns a promise which resolves to a response whose body is a ReadableStream
    fetch(getNextUrl()).then(res=>res.body).then(bod=>handleFetchResponse(bod,textResult));
}

function handleFetchResponse(resp,textBuff){
    console.log("fetched");

    var decoder = new TextDecoder();
    var reader = resp.getReader();
    reader.read().then(function readTextFromStream({done,value}){ // {done,value} required param names
        if(done){
            console.log("read");
            appendNextSiteTable(textBuff);
            return;
        }

        var decodedText = decoder.decode(value);
        textBuff += decodedText;

        return reader.read().then(readTextFromStream);
    });
}

function appendNextSiteTable(text){
    var prevSiteTable = document.querySelector(`.siteTable-page${fetchCt}`);
    var navBtns = prevSiteTable.querySelector(".nav-buttons");
    navBtns.remove();

    var parser = new DOMParser();
    var nextPageDoc = parser.parseFromString(text,"text/html");
    var nextSiteTable = nextPageDoc.getElementById("siteTable");
    nextSiteTable.classList.add(`siteTable-page${fetchCt+1}`);

    prevSiteTable.after(nextSiteTable);
    console.log("appended");

    attachEventHandlers(nextSiteTable);
}

function attachEventHandlers(siteEl){

    $(siteEl).on("click",".expando-button",(e)=>{
        function createExpando(thing,expanded){
            if(thing.data("expando")) return;
            thing.data("expando",true);
            var view = new LinkExpando({
                el: thing[0],
                autoexpanded: expanded
            });
        }

        var thingy = $(e.target).closest(".thing");
        createExpando(thingy,false);

        /* $(e.target).toggleClass("expanded collapsed");
        $(e.target).thing().find(".expando").toggle(); */
    });
}

var fetchCt = 0;
document.getElementById("siteTable").classList.add("siteTable-page1");
fetchNextPage();


//https://github.com/reddit-archive/reddit/blob/master/r2/r2/public/static/js/expando.js