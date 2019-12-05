var DIRECTORY_CLASS = "directory";
var SHADER_DIRECTORY_ID = "shader-directory";
var INCLUDE_DIRECTORY_ID = "includes-directory";
var PRETTYPRINT_CLASS = "prettyprint";

var SCRIPTS_PATH = "https://xibanya.github.io/UnityShaderViewer/Scripts/";

var STYLE_PATH = "https://xibanya.github.io/UnityShaderViewer/Styles/Style.css";
var STYLE_ID = "MainStyle";

var LIBRARY_PATH = "https://xibanya.github.io/UnityShaderViewer/Library/";

var SQL_SCRIPT_ID = "SQLScript";
var SQL_SCRIPT = "sql-wasm.js";
var SQL_PATH = "https://kripken.github.io/sql.js/dist/";
var DB_PATH = "https://xibanya.github.io/UnityShaderViewer/Data/Definitions.db";
var db = null;

AddScript(SQL_PATH + SQL_SCRIPT, SQL_SCRIPT_ID);

initSqlJs({ locateFile: filename => SQL_PATH + `${filename}` }).then(function (SQL) {  
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
            var includes = db.exec("SELECT * FROM Includes ORDER BY Name ASC");
            GenerateDirectory(includes, INCLUDE_DIRECTORY_ID);
            var shaders = db.exec("SELECT * FROM Shaders ORDER BY ShaderPath ASC");
            GenerateDirectory(shaders, SHADER_DIRECTORY_ID);
            MakeLinks();
        }
    };
        dbRequest.send();
    });

    //add style after adding the sql script as it's less important
    AddStyle(STYLE_PATH, STYLE_ID);

    //generate links to members of the provided table within the DOM element of the specified ID
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
                   var page = LIBRARY_PATH + includeResult.URL + jsonResult.Include + ".html";
                   if (jsonResult.Include != jsonResult.Field) page += "#" + jsonResult.Field;
                   console.log("adding link to " + page);
                   var newTag = "<a href=\"" + page + "\">" + jsonResult.Field + "</a>";
                   findAndReplace(jsonResult.Field, newTag);
               }
               stmt.free();
               replaced.push(field);
           }
       }
   }  

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

function AddStyle(path, uniqueID)
{
    var existing = document.getElementById(uniqueID);
    if (existing == null)
    {
        var head = document.getElementsByTagName('head')[0];
        var link = document.createElement('link');
        link.rel = 'stylesheet';  
        link.type = 'text/css'; 
        link.id = uniqueID;
        link.href = path;
        head.appendChild(link);  
    }
}

function AddScript(path, uniqueID)
{
    var existing = document.getElementById(uniqueID);
    if (existing == null)
    {
        var head = document.getElementsByTagName('head')[0];
        var newScript = document.createElement('script');
        newScript.src = path;
        newScript.id = uniqueID;
        head.appendChild(newScript);
    }
}   
   