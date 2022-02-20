console.log("ext");
const url = browser.runtime.getURL("endlessReddit.js");
console.log("url:",url);

const endlessRedditScript = document.createElement("script");
endlessRedditScript.src = url;
document.body.append(endlessRedditScript);