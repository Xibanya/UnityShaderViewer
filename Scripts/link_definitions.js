var DIRECTORY_CLASS = "directory";
var SHADER_DIRECTORY_ID = "shader-directory";
var INCLUDE_DIRECTORY_ID = "includes-directory";
var PRETTYPRINT_CLASS = "prettyprint";
var SQL_PATH = "hhttps://xibanya.github.io/UnityShaderViewer/Scripts/sql-wasm.js";
var DB_PATH = "https://xibanya.github.io/UnityShaderViewer/Data/Definitions.db";
var LIBRARY_PATH = "https://xibanya.github.io/UnityShaderViewer/Library/";
var STYLE_PATH = "https://xibanya.github.io/UnityShaderViewer/Styles/Style.css";
var db = null;

AddStyle(STYLE_PATH);
AddScript(SQL_PATH);

initSqlJs({ locateFile: filename => `https://xibanya.github.io/UnityShaderViewer/Scripts/${filename}` }).then(function (SQL) {  
    var dbRequest = new XMLHttpRequest();
    dbRequest.open('GET', DB_PATH, true);
    dbRequest.responseType = 'arraybuffer';

    dbRequest.onload = function(e) 
    {
        if (db == null)
        {
            var uInt8Array = new Uint8Array(this.response);
            db = new SQL.Database(uInt8Array);
            console.log("Loaded DB");
        }
        if (db != null)
        {
            var includes = db.exec("SELECT * FROM Includes");
            GenerateDirectory(includes, INCLUDE_DIRECTORY_ID);
            var shaders = db.exec("SELECT * FROM Shaders");
            GenerateDirectory(shaders, SHADER_DIRECTORY_ID);
            MakeLinks();
        }
    };
        dbRequest.send();
    });
   function GenerateDirectory(sqlTable, elementID)
   {
       if (sqlTable != null)
       {
           var node = document.getElementById(elementID);
           if (node != null)
           {
               var addLinenums = node.classList.contains("linenums")? true : false;
               var increment = 0;
               var NAME = 1;
               var FILE_PATH = 2;
               var directoryList = addLinenums? "<ol class=\"linenums\">" : "<ul>";
               table = JSON.parse(JSON.stringify(sqlTable));
               table[0].values.forEach(row => {
                       var page = LIBRARY_PATH + row[FILE_PATH] + row[NAME] + ".html";
                       var newTag = "<a href=\"" + page + "\">" + row[NAME] + "</a>";
                       var listItem = addLinenums?  "<li class=\"" + increment + "\">" : "<li>";
                       newTag = listItem + newTag + "</li>"
                       directoryList += newTag;
                       increment++;
               }); 
               directoryList += addLinenums? "</ol>" : "</ul>";
               node.innerHTML = directoryList;
           }
       }
   }
    
    function MakeShaderDirectory()
    {
        var shaderTable = db.exec("SELECT * FROM Shaders");
        var nodes = document.getElementsByClassName(DIRECTORY_CLASS);
        var i;
        var NAME = 0;
        var SHADER_PATH = 1;
        var FILE_PATH = 2;
        for (i = 0; i < nodes.length; i++) 
        {
            table = JSON.parse(JSON.stringify(shaderTable));
            table[0].values.forEach(row => {
                if (nodes[i].innerText.includes(row[NAME]))
                {
                    var page = LIBRARY_PATH + row[FILE_PATH] + row[NAME] + ".html";
                    var newTag = "<a href=\"" + page + "\">" + row[NAME]+ "</a>";
                    console.log(newTag);
                    findAndReplace(row[NAME], newTag, nodes[i]);
                }
            });
        }
    }
    
    function MakeIncludesDirectory()
    {
        var includesTable = db.exec("SELECT * FROM Includes");
        var nodes = document.getElementsByClassName(PRETTYPRINT_CLASS);
        var i;
        var NAME = 1;
        var FILE_PATH = 2;
        for (i = 0; i < nodes.length; i++) 
        {
            table = JSON.parse(JSON.stringify(includesTable));
            table[0].values.forEach(row => {
                if (nodes[i].innerText.includes(row[NAME]))
                {
                    var page = LIBRARY_PATH + row[FILE_PATH] + row[NAME] + ".html";
                    var newTag = "<a href=\"" + page + "\">" + row[NAME]+ "</a>";
                    findAndReplace(row[NAME], newTag, nodes[i]);
                }
            });
        }
    }
    function MakeLinks()
    {
        var replaced = [];
        var nodes = document.getElementsByTagName("span");
        var i;
        for (i = 0; i < nodes.length; i++) 
        {
            var field = nodes[i].textContent;
            if (field != null && !replaced.includes(field))
            {
                var stmt = db.prepare("SELECT * FROM Definitions WHERE Field=:val");
                var result = stmt.getAsObject({':val' : field});
                var jsonResult = JSON.parse(JSON.stringify(result));
                if (jsonResult.Field != null) 
                {
                    stmt = db.prepare("SELECT URL FROM Includes WHERE Name=:val");
                    var includePath = stmt.getAsObject({':val' : jsonResult.Include});
                    var includeResult = JSON.parse(JSON.stringify(includePath));
                    var page = LIBRARY_PATH + includeResult.URL + jsonResult.Include + ".html#" + jsonResult.Field;
                    var newTag = "<a href=\"" + page + "\">" + jsonResult.Field + "</a>";
                    findAndReplace(jsonResult.Field, newTag);
                }
                stmt.free();
                replaced.push(field);
            }
        }
    }

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
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
function getUrlParam(parameter, defaultvalue){
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
        urlparameter = getUrlVars()[parameter];
        }
    return urlparameter;
}

// ---- UTILS ---- //
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

function AddStyle(path)
{
    var existing = document.getElementById("MainStyle");
    if (existing == null)
    {
        var head = document.getElementsByTagName('head')[0];
        var link = document.createElement('link');
        link.rel = 'stylesheet';  
        link.type = 'text/css'; 
        link.id = "MainStyle"
        link.href = path;
        head.appendChild(link);  
    }
}
function AddScript(path)
{
    var existing = document.getElementById("SQLScript");
    if (existing == null)
    {
        var head = document.getElementsByTagName('head')[0];
        var newScript = document.createElement('script');
        newScript.src = path;
        newScript.id = "SQLScript";
        head.appendChild(newScript);  
        setTimeout(null, 300); //give this a chance to load before trying to access the DB
    }
}
