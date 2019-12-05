// ------------ displaying user-loaded shader ------------//
var target = getUrlParam(
    'target',
    'Empty'
);
if (target != null && target != "Empty")
{
var request = new XMLHttpRequest();
request.onreadystatechange = function() 
{
    if (request.readyState == 4 && request.status == 200) 
    {
        document.getElementById("shader").innerHTML = request.responseText;
        document.getElementById("shader").className = "prettyprint";
        PR.prettyPrint();
        MakeLinks();
    }
};
request.open("GET", target, true);
request.responseType = 'text';
request.send();
}
function LoadShader()
{
    var target = document.getElementById("shader_url").value;
    var destination = "https://xibanya.github.io/UnityShaderViewer/Tools/Viewer.html?target=" + target;
    self.location.replace(destination);
}
// ----- URI PARAMETERS -----//
function getUrlVars() 
{
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function getUrlParam(parameter, defaultvalue)
{
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
        urlparameter = getUrlVars()[parameter];
        }
    return urlparameter;
}
/////////////////////////////////

//adapted from https://j11y.io/snippets/find-and-replace-text-with-javascript/
function findAndReplace(searchText, replacement, searchNode) 
{
    if (!searchText || typeof replacement === 'undefined') {
        // Throw error here if you want...
        return;
    }
    var regex = typeof searchText === 'string' ?
                new RegExp(`\\b${searchText}\\b`, 'g') : searchText,
        childNodes = (searchNode || document.body).childNodes,
        cnLength = childNodes.length,
        excludes = 'html,head,style,title,link,meta,script,object,iframe';
    while (cnLength--) {
        var currentNode = childNodes[cnLength];
        if (currentNode.nodeType === 1 &&
            (excludes + ',').indexOf(currentNode.nodeName.toLowerCase() + ',') === -1) {
            arguments.callee(searchText, replacement, currentNode);
        }
        if (currentNode.nodeType !== 3 || !regex.test(currentNode.data) ) {
            continue;
        }
        var parent = currentNode.parentNode,
            frag = (function(){
                var html = currentNode.data.replace(regex, replacement),
                    wrap = document.createElement('div'),
                    frag = document.createDocumentFragment();
                wrap.innerHTML = html;
                while (wrap.firstChild) {
                    frag.appendChild(wrap.firstChild);
                }
                return frag;
            })();
        parent.insertBefore(frag, currentNode);
        parent.removeChild(currentNode);
    }
};