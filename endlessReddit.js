function getNextUrl(){
    const nextBtn = document.querySelector(".nav-buttons .next-button a");
    const nextPageUrl = nextBtn.getAttribute("href");
    console.log("next:",nextPageUrl);
    return nextPageUrl;
}

function fetchNextPage(){
    fetchCt++;
    if(fetchCt>=5){console.log("maxed");return;}

    console.log("fetching...");
    const textResult = "";
    // fetch returns a promise which resolves to a response whose body is a ReadableStream
    fetch(getNextUrl()).then(res=>res.body).then(bod=>handleFetchResponse(bod,textResult));
}

function handleFetchResponse(resp,textBuff){
    console.log("fetched");

    const decoder = new TextDecoder();
    const reader = resp.getReader();
    reader.read().then(function readTextFromStream({done,value}){ // {done,value} required param names
        if(done){
            console.log("read");
            appendNextSiteTable(textBuff);
            return;
        }

        const decodedText = decoder.decode(value);
        textBuff += decodedText;

        return reader.read().then(readTextFromStream);
    });
}

function appendNextSiteTable(text){
    const prevSiteTable = document.querySelector(`.siteTable-page${fetchCt}`);
    const navBtns = prevSiteTable.querySelector(".nav-buttons");
    navBtns.remove();

    const parser = new DOMParser();
    const nextPageDoc = parser.parseFromString(text,"text/html");
    const nextSiteTable = nextPageDoc.getElementById("siteTable");
    nextSiteTable.classList.add(`siteTable-page${fetchCt+1}`);

    prevSiteTable.after(nextSiteTable);
    console.log("appended");

    registerEventHandlers(nextSiteTable);
    console.log("registered")

    scrollLocked = false;
}

function registerEventHandlers(siteEl){
    $(siteEl).on("click",".expando-button",(e)=>{
        const thingy = $(e.target).closest(".thing");
        if(thingy.data("expando")) return;
        thingy.data("expando",true);
        new ExpandoController({
            el: thingy[0],
            autoexpanded: false
        });
    });
}

const ExpandoController = Backbone.View.extend({
    buttonSelector: '.expando-button',
    expandoSelector: '.expando',
    expanded: false,

    events: {
        'click .expando-button': 'toggleExpando'
    },

    constructor: function() {
        Backbone.View.prototype.constructor.apply(this, _.toArray(arguments));
        this.toggleExpando();
    },

    initialize: function() {
        this.$button = this.$el.find(this.buttonSelector);
        this.$expando = this.$el.find(this.expandoSelector);
  
        this.cachedHTML = this.$expando.data('cachedhtml');
        this.loaded = !!this.cachedHTML;
        this.id = this.$el.thing_id();
        this.isNSFW = false;//this.$el.hasClass('over18');
        this.linkType = this.$el.hasClass('self') ? 'self' : 'link';
        this.autoexpanded = this.options.autoexpanded;
  
        if (this.autoexpanded) {
            this.loaded = true;
            this.cachedHTML = this.$expando.html();
        }
  
        const $e = $.Event('expando:create', { expando: this });
        $(document.body).trigger($e);
  
        if ($e.isDefaultPrevented()) { return; }
  
        $(document).on('hide_thing_' + this.id, function() {
            this.toggleExpando()
        }.bind(this));
  
        // expando events
        let linkURL = this.$el.children('.entry').find('a.title').attr('href');
  
        if (/^\//.test(linkURL)) {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            linkURL = protocol + '//' + hostname + linkURL;
        }
  
        // event context
        const eventData = {
            linkIsNSFW: this.isNSFW,
            linkType: this.linkType,
            linkURL: linkURL
        };
        
        // note that hyphenated data attributes will be converted to camelCase
        const thingData = this.$el.data();
  
        if ('fullname' in thingData) {
            eventData.linkFullname = thingData.fullname;
        }
  
        if ('timestamp' in thingData) {
            eventData.linkCreated = thingData.timestamp;
        }
  
        if ('domain' in thingData) {
            eventData.linkDomain = thingData.domain;
        }
  
        if ('authorFullname' in thingData) {
            eventData.authorFullname = thingData.authorFullname;
        }
  
        if ('subreddit' in thingData) {
            eventData.subredditName = thingData.subreddit;
        }
  
        if ('subredditFullname' in thingData) {
            eventData.subredditFullname = thingData.subredditFullname;
        }
  
        this._expandoEventData = eventData;
    },

    toggleExpando: function(e) {  
        this.$button.toggleClass("expanded collapsed");
        this.expanded = !this.expanded;
        this.expanded ? this.show() : this.$expando.hide();
    },

    show: function() {
        if (!this.loaded) {
            return $.request('expando', { link_id: this.id }, function(res) {
                const expandoHTML = $.unsafe(res);
                this.cachedHTML = expandoHTML;
                this.loaded = true;
                this.show();
            }.bind(this), false, 'html', true);
        }
  
        const $e = $.Event('expando:show', { expando: this });
        this.$el.trigger($e); //
  
        if ($e.isDefaultPrevented()) { return; }
  
        if (!this.autoexpanded) {
            this.$expando.html(this.cachedHTML);
        }
  
        if (!this._expandoEventData.provider) {
            // this needs to be deferred until the actual embed markup is available.
            const $media = this.$expando.children();
    
            if ($media.is('iframe')) {
                this._expandoEventData.provider = 'embedly';
            } else {
                this._expandoEventData.provider = 'reddit';
            }
        }
  
        this.$expando.removeClass('expando-uninitialized');
        this.$expando.show();
    },
  
    // called when accepting expanded NSFW content
    fireExpandEvent: function() {
        return;
    },
});

document.getElementById("siteTable").classList.add("siteTable-page1");

let fetchCt = 0;
let scrollLocked = false;
window.addEventListener("scroll",()=>{
    if(scrollLocked) return;
    if(window.scrollMaxY - window.scrollY < .5 * document.getElementById("siteTable").clientHeight){
        scrollLocked = true;
        fetchNextPage();
    }
});


//https://github.com/reddit-archive/reddit/blob/master/r2/r2/public/static/js/expando.js