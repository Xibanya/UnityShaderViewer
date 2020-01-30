var DIRECTORY_CLASS = "directory";
var SHADER_DIRECTORY_ID = "shader-directory";
var INCLUDE_DIRECTORY_ID = "includes-directory";
var PRETTYPRINT_CLASS = "prettyprint";
var LINENUMS_CLASS = "linenums";
var INCLUDES_TABLE = "Includes";
var DEFINITIONS_TABLE = "Definitions";
var SHADERS_TABLE = "Shaders";
var DIRECTORIES_TABLE = "Directories";
var FILE_NAME = 1;
var FILE_PATH = 2;
var EXTENSION = 3;
var VERSION = 4;
var DEFAULT_VERSION = "2019.1.6f1";
var isSource = false;
var sourceName = null;
var versionNumber = DEFAULT_VERSION;

var SCRIPTS_PATH = "https://xibanya.github.io/UnityShaderViewer/Scripts/";

var STYLE_PATH = "https://xibanya.github.io/UnityShaderViewer/Styles/Style.css";
var STYLE_ID = "MainStyle";

var LIBRARY_PATH = "https://xibanya.github.io/UnityShaderViewer/Library/";

var SQL_SCRIPT_ID = "SQLScript";
var SQL_SCRIPT = "sql-wasm.js";
var SQL_PATH = "https://kripken.github.io/sql.js/dist/";
var DB_PATH = "https://xibanya.github.io/UnityShaderViewer/Data/Definitions.db";
var db = null;

var URL_INDEX = `<a href="https://xibanya.github.io/UnityShaderViewer/"><i class="fa fa-home"></i></a>`;
var URL_REPO = `<a href="https://github.com/Xibanya/UnityShaderViewer"><i class="fa fa-github"></i></a>`;
var URL_T = `<a href="https://twitter.com/ManuelaXibanya"><i class="fa fa-twitter"></i></a>`;
var URL_P = `<a href="https://www.patreon.com/teamdogpit"><i class="fa fab fa-patreon"></i></a>`;
var EXTERNAL_LINKS = `${URL_REPO} ${URL_T} ${URL_P}`;

AddScript(SQL_PATH + SQL_SCRIPT, SQL_SCRIPT_ID);

var INCLUDES_DIRECTORIES = '{ "Directories":[' +
'{ "ID": 1, "Name": "CGIncludes", "Path": "BuiltinShaders/CGIncludes/", "ElementID": "includes-directory" },' +
'{ "ID": 2, "Name": "Default Resources", "Path": "BuiltinShaders/DefaultResources/", "ElementID": "other-includes-directory" },' +
'{ "ID": 3, "Name": "Post Processing", "Path": "PostProcessing/", "ElementID": "ppv2-includes-directory" }]}';

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
        AddStyle(STYLE_PATH, STYLE_ID);
        window.setTimeout(function(){
            if (db != null)
            {
                VerboseLog("Loaded DB");
                IncludesDirectory();
                ShaderDirectory();
                LinkIncludes();
                MakeLinks();
                FindIfSource();
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
        directoryTable = JSON.parse(INCLUDES_DIRECTORIES);
        for (var i = 0; i < directoryTable.Directories.length; i++)
        {
            var row = directoryTable.Directories[i];
            if (row.ID == 1) 
            {
                var header = HeaderBefore(3, row.Name, directory);
                var accent = document.createElement('div');
                accent.className = "accent";
                InsertAfter(accent, header);
            }
            else
            {
                var lastDirectory = document.getElementById(directoryTable.Directories[i - 1].ElementID);
                var header = HeaderAfter(3, row.Name,  lastDirectory);
                var accent = document.createElement('div');
                accent.className = "accent";
                InsertAfter(accent, header);
                var newSection = DirectoryAfter(row.ElementID, accent);
            }
            var includes = db.exec(
                `SELECT ID, Name, URL, Extension FROM ${INCLUDES_TABLE} WHERE URL IS ` + 
                `'${row.Path}' ORDER BY Name ASC`);
            GenerateDirectory(includes, row.ElementID);
        }
    }
}
function ShaderDirectory()
{
    var directory = document.getElementById(SHADER_DIRECTORY_ID);
    if (directory != null)
    {
        var header = HeaderBefore(3, "Default Resources", directory);
        var accent = document.createElement('div');
        accent.className = "accent";
        InsertAfter(accent, header);
        var shaders = db.exec(
            `SELECT * FROM ${SHADERS_TABLE} WHERE FilePath Like ` + 
            "'BuiltinShaders/DefaultResources/%' ORDER BY FilePath, FileName ASC");
            GenerateDirectory(shaders, SHADER_DIRECTORY_ID);
        
        var otherHeader = HeaderAfter(3, "Default Resources Extra", directory);
        var accent2 = document.createElement('div');
        accent2.className = "accent";
        InsertAfter(accent2, otherHeader);

        var otherDirectoryID = "other-shaders-directory";
        DirectoryAfter(otherDirectoryID, accent2);
       
        var otherShaders = db.exec(
            `SELECT * FROM ${SHADERS_TABLE} WHERE FilePath NOT Like ` + 
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
            var addLinenums = node.classList.contains(LINENUMS_CLASS)? true : false;
            var increment = 0;
            var NAME = 1;
            var FILE_PATH = 2;
            var directoryList = DirectoryList(addLinenums);
            table = JSON.parse(JSON.stringify(sqlTable));
            table[0].values.forEach(row => {
                    var listItem = ListItem(directoryList, increment);
                    var link = DirectoryLink(row);
                    listItem.appendChild(link);
                    if (elementID.includes("shader")) 
                    {
                        if (window.location.href.includes(row[FILE_PATH] + row[FILE_NAME])) 
                        {
                            isSource = true;
                            sourceName = row[0];
                            SetTitle(row[0]);
                        }
                        listItem.innerHTML += " " + row[0];
                    }
                    else if (elementID.includes("includes")) listItem.innerHTML += row[EXTENSION];
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
    if (addLinenums) listContainer.className = LINENUMS_CLASS;
    return listContainer;
}
function ListItem(parentNode, increment)
{
    var listItem = document.createElement('li');
    parentNode.appendChild(listItem);
    if (parentNode.classList.contains(LINENUMS_CLASS))
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
            var stmt = db.prepare(`SELECT * FROM ${DEFINITIONS_TABLE} WHERE Field=:val`);
            var result = stmt.getAsObject({':val' : field});
            var jsonResult = JSON.parse(JSON.stringify(result));
            if (jsonResult.Field != null) 
            {
                stmt = db.prepare(`SELECT URL FROM ${INCLUDES_TABLE} WHERE Name=:val`);
                var includePath = stmt.getAsObject({':val' : jsonResult.Include});
                var includeResult = JSON.parse(JSON.stringify(includePath));
                var page = LIBRARY_PATH + includeResult.URL + jsonResult.Include + ".html"
                if (jsonResult.Include != jsonResult.Field) page += "#" + jsonResult.Field;
                VerboseLog(`Creating link to ${page}`);
                var newTag = `<a href="${page}">${jsonResult.Field}</a>`;
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
    var includesTable = db.exec(`SELECT ID, Name, URL, Extension FROM ${INCLUDES_TABLE}`);
    var nodes = document.getElementsByClassName("str");
    for (var i = 0; i < nodes.length; i++) 
    {
        table = JSON.parse(JSON.stringify(includesTable));
        table[0].values.forEach(row => {
            var displayName = row[FILE_NAME] + row[EXTENSION];
            if (nodes[i].innerText.includes(displayName))
            {
                var page = LIBRARY_PATH + row[FILE_PATH] + row[FILE_NAME];
                var newTag = `<a href=\"${page}.html\">${displayName}</a>`;
                findAndReplace(displayName, newTag, nodes[i]);
            }
        });
    }
} 
function FindIfSource()
{
    var fileName = location.href.split("/").slice(-1) + '';
    var arr = fileName.split(".");
    fileName = arr[0];
    if (fileName.includes("#")) fileName = fileName.split("#")[0];
    VerboseLog("file name " + fileName);

    //check if this is an include
    var stmt = db.prepare(`SELECT Name, Extension, Version FROM ${INCLUDES_TABLE} WHERE Name=:val`);
    var result = stmt.getAsObject({':val' : fileName});
    var jsonResult = JSON.parse(JSON.stringify(result));
    stmt.free();
    if (jsonResult != null && jsonResult.Name != null)
    {
        VerboseLog(jsonResult);
        isSource = true;
        sourceName = jsonResult.Name + jsonResult.Extension;
        if (jsonResult.Version != null && jsonResult.Version != "") versionNumber = jsonResult.Version;
        SetTitle(jsonResult.Name);
    }

    //check if this is a shader
    if (!isSource)
    {
        var shQ = db.prepare(`SELECT * FROM ${SHADERS_TABLE} WHERE FileName=:val`);
        var r = shQ.getAsObject({':val' : fileName});
        var shResult = JSON.parse(JSON.stringify(r));
        shQ.free();
         
        if (shResult != null && shResult.FileName != null)
        {
            VerboseLog(shResult);
            isSource = true;
            sourceName = shResult.ShaderName;
            if (shResult.Version != null && shResult.Version != "") versionNumber = shResult.Version;
            SetTitle(shResult.FileName);
        }
    }

    AddFooter();
}
function SetTitle(titleText)
{
    var title = document.getElementsByTagName('title')[0];
    if (title == null)
    {
        var head = document.getElementsByTagName('head')[0];
        title = document.createElement('title');
        head.appendChild(title);
    }
    title.innerText = titleText;
}
function AddFooter()
{
    var body = document.getElementsByTagName('body')[0];
    var footer = document.getElementById('footer');
    if (footer == null)
    {
        var space = document.getElementById('footer-spacer');
        if (space == null)
        {
            space = document.createElement('div');
            body.appendChild(space);
            space.classList = "space";
            space.id = "footer-spacer";
        }
        footer = document.createElement('footer');
        body.appendChild(footer);
        footer.id = 'footer';
    }
    var sourceText = document.getElementById('footer-source');
    if (sourceText == null)
    {
        sourceText = document.createElement('span');
        sourceText.id = "footer-source";
        footer.appendChild(sourceText);
    }
    sourceText.classList = isSource? "source" : "hidden";
    if (isSource)
    {
        sourceText.innerHTML = `${sourceName} ` +
        `<a href="https://unity3d.com/get-unity/download/archive">v.${versionNumber}</a>`;
    }
    else SetTitle("Shader Viewer Directory");

    var footerText = document.getElementById('footer-center');
    if (footerText == null)
    {
        footerText = document.createElement('span');
        footerText.id = "footer-center";
        footerText.classList = "center";
        footer.appendChild(footerText);
    }
    footerText.innerHTML = URL_INDEX;
    
    var linkText = document.getElementById('footer-links');
    if (linkText == null)
    {
        linkText = document.createElement('span');
        linkText.id = "footer-links";
        footer.appendChild(linkText);
        linkText.innerHTML = EXTERNAL_LINKS;
    }
    linkText.classList = isSource? "links" : "";
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
function HeaderInto(size, title, referenceNode)
{
    var newID = `${title}-header`;
    referenceNode.innerHTML += `<h${size} id="${newID}">${title}</h${size}>`;
    return document.getElementById(newID);
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
    var directory = document.createElement('div');
    directory.id = uniqueID;
    directory.className = DIRECTORY_CLASS;
    InsertAfter(directory, referenceNode);
    return directory;
}
function URLVars() 
{
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
var searchedParams = [];
function GetParam(parameter, defaultvalue)
{
    if (!searchedParams.includes(parameter)) searchedParams.push(parameter);
    var urlparameter = defaultvalue;
    if(window.location.href.indexOf(parameter) > -1){
        urlparameter = URLVars()[parameter];
        }
    return urlparameter;
}
var logMode = GetParam("log", "Empty");
function Verbose()
{
    if (logMode == null || logMode == "Empty")
    {
        if (!searchedParams.includes("log")) verbose = GetParam("log", "Empty");
        else if (!searchedParams.includes("log")) verbose = GetParam("log", "Empty");
    }
    return logMode != null && logMode.includes("erbose");
}
//write log if logMode is Verbose
function VerboseLog(message)
{
    if (Verbose()) console.log(message);
}