var DIRECTORY_CLASS = "directory";
var SHADER_DIRECTORY_ID = "shader-directory";
var INCLUDE_DIRECTORY_ID = "includes-directory";
var PRETTYPRINT_CLASS = "prettyprint";
var FILE_NAME = 1;
var FILE_PATH = 2;

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

window.setTimeout(function() {
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
        }
        window.setTimeout(function(){
            if (db != null)
            {
                console.log("Loaded DB");
                IncludesDirectory();
                ShaderDirectory();
                LinkIncludes();
                MakeLinks();
                AddStyle(STYLE_PATH, STYLE_ID);
            }
            else console.log("DB Null");
        }, 200);
    };
        dbRequest.send();
    });
}, 200);
   
function IncludesDirectory()
{
    var directory = document.getElementById(INCLUDE_DIRECTORY_ID);
    if (directory != null)
    {
        var header = HeaderBefore(3, "CGIncludes", directory);

        var includes = db.exec(
            "SELECT * FROM Includes WHERE URL IS" +
            "'BuiltinShaders/CGIncludes/' ORDER BY Name ASC");
        GenerateDirectory(includes, INCLUDE_DIRECTORY_ID);

        var otherHeader = HeaderAfter(3, "DefaultResources", directory);
      
        var otherDirectoryID = "other-includes-directory";
        DirectoryAfter(otherDirectoryID, otherHeader);

        var otherIncludes = db.exec(
            "SELECT * FROM Includes WHERE URL IS NOT " + 
            "'BuiltinShaders/CGIncludes/' ORDER BY Name ASC");
        GenerateDirectory(otherIncludes, otherDirectoryID);
    }
}
function ShaderDirectory()
{
    var directory = document.getElementById(SHADER_DIRECTORY_ID);
    if (directory != null)
    {
        var header = HeaderBefore(3, "Default Resources", directory);

        var shaders = db.exec(
            "SELECT * FROM Shaders WHERE FilePath Like " + 
            "'BuiltinShaders/DefaultResources/%' ORDER BY FilePath, FileName ASC");
            GenerateDirectory(shaders, SHADER_DIRECTORY_ID);
        
        var otherHeader = HeaderAfter(3, "Default Resources Extra", directory);
       
        var otherDirectoryID = "other-shaders-directory";
        DirectoryAfter(otherDirectoryID, otherHeader);
       
        var otherShaders = db.exec(
            "SELECT * FROM Shaders WHERE FilePath NOT Like " + 
            "'BuiltinShaders/DefaultResources/%' ORDER BY FilePath, FileName ASC");
            GenerateDirectory(otherShaders, otherDirectoryID);
    }
}

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
               var directoryList = DirectoryList(addLinenums);
               table = JSON.parse(JSON.stringify(sqlTable));
               table[0].values.forEach(row => {
                       var listItem = ListItem(directoryList, increment);
                       var link = DirectoryLink(row);
                       listItem.appendChild(link);
                       if (elementID.includes("shader")) listItem.innerHTML += " " + row[0];
                       else if (elementID.includes("includes")) listItem.innerHTML += " " + row[3];
                       increment++;
               });
               node.appendChild(directoryList);
           }
       }
   }
function DirectoryLink(row)
{
    var link = document.createElement('a');
    link.href = LIBRARY_PATH + row[FILE_PATH] + row[FILE_NAME] + ".html";
    link.innerText = row[FILE_NAME];
    return link;
}
function DirectoryList(addLinenums)
{
    var listContainer = document.createElement(addLinenums? 'ol' : 'ul');
    if (addLinenums) listContainer.className = "linenums";
    return listContainer;
}
function ListItem(parentNode, increment)
{
    var listItem = document.createElement('li');
    parentNode.appendChild(listItem);
    if (parentNode.classList.contains("linenums"))
    {
        listItem.className = `${increment}`;
    }
    return listItem
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
    //puts links on known Includes
    function LinkIncludes()
    {
        var includesTable = db.exec("SELECT * FROM Includes");
        var nodes = document.getElementsByClassName("str");
        var i;
        var NAME = 1;
        var FILE_PATH = 2;
        var EXTENSION = 3;
        for (i = 0; i < nodes.length; i++) 
        {
            table = JSON.parse(JSON.stringify(includesTable));
            table[0].values.forEach(row => {
                var displayName = row[NAME] + row[EXTENSION];
                if (nodes[i].innerText.includes(displayName))
                {
                    var page = LIBRARY_PATH + row[FILE_PATH] + row[NAME] + ".html";
                    var newTag = "<a href=\"" + page + "\">" + displayName + "</a>";
                    findAndReplace(displayName, newTag, nodes[i]);
                }
            });
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
function InsertAfter(newNode, referenceNode) 
{
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}
function HeaderBefore(size, title, referenceNode)
{
    var header = document.createElement('h' + size);
    header.innerText = title
    referenceNode.parentNode.insertBefore(header, referenceNode);
    return header;
}
function HeaderAfter(size, title, referenceNode)
{
    var header = document.createElement('h' + size);
    header.innerText = title
    InsertAfter(header, referenceNode);
    return header;
}
function DirectoryAfter(uniqueID, referenceNode)
{
    var directory = document.createElement('pre');
    directory.id = uniqueID;
    directory.className = DIRECTORY_CLASS;
    InsertAfter(directory, referenceNode);
    return directory;
}
