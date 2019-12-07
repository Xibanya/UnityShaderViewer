var VIEWER_ID = "shader";
var VIEWER_CLASSES = "prettyprint linenums";
var RESULTS_ID = "search-results";
var INPUT_FIELD_ID = "shader_url";
var TOGGLE_ID = "results-toggle"
var zeroResults = []
var noResultsMsg;
var resultsContainer;
var inputField;
var toggleButton;
var targetNode;
var matches = 0;
var SNIPPET_SIZE = 150;

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
        document.getElementById(VIEWER_ID).innerHTML = request.responseText;
        document.getElementById(VIEWER_ID).className = "prettyprint";
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
    var target = document.getElementById(INPUT_FIELD_ID).value;
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

function DisplayBuiltinInclude()
{
    GetRequiredNodes();
    if (targetNode != null)
    {
        targetNode.classList = VIEWER_CLASSES;
        var includeName = inputField.value;
        //get text from DB
        if (db != null)
        {
            var stmt = db.prepare(`SELECT * FROM ${INCLUDES_TABLE} WHERE Name=:val`);
            var result = stmt.getAsObject({':val' : includeName});
            var jsonResult = JSON.parse(JSON.stringify(result));
            stmt.free();
            if (jsonResult != null && jsonResult.File != null)
            {
                DisplayFile(jsonResult.File, includeName, jsonResult.Extension);
            }
            else VerboseLog(`No File text for Include ${includeName}`);
        }
        else VerboseLog("DB is null");
    }
    else VerboseLog(`No DOM element with id ${VIEWER_ID}`);
}
function DisplayFile(shaderFile, shaderName, extension)
{
    if (targetNode != null)
    {
        targetNode.innerHTML = shaderFile;
        isSource = true;
        SetTitle(shaderName);
        sourceName = shaderName + extension;
       
        PR.prettyPrint();
        MakeLinks();
        LinkIncludes();
        AddFooter();
    }
}

function InputSearch()
{
    if (CanSearch())
    {
        var result = db.exec(`SELECT Name FROM ${INCLUDES_TABLE} WHERE File IS NOT NULL`);
        var table = JSON.parse(JSON.stringify(result));
       
        if (table != null)
        {
            var includeName = inputField.value;
            table[0].values.forEach(row => {
                if (CaseInsensitiveMatch(row[0], includeName)) 
                {
                    matches++;
                    AddIncludeLink(row[0]);
                }
            });
            VerboseLog(`${matches} matches for ${includeName}`);
            if (matches > 0) HideNoResultsMsg();
        }
        if (table == null || matches == 0)
        {
            zeroResults.push(includeName);
            ShowNoResultsMsg();
        }
    }
}
function FullTextSearch()
{
    if (CanSearch())
    {
       ShowResults();
        var includeName = inputField.value;
        var result = db.exec(
            `SELECT Name, File, Extension FROM ${INCLUDES_TABLE} ` + 
            `WHERE File LIKE '%${includeName}%';`);
        var table = JSON.parse(JSON.stringify(result));
        matches = 0;
        if (table != null && includeName.length > 3)
        {
            if (table[0] != null && table[0].values != null)
            {
                table[0].values.forEach(row => {
                AddPreview(row, includeName);
                });
            }
            if (matches == 0) ShowNoResultsMsg();
            else HideNoResultsMsg();
        }
        else HideNoResultsMsg();
    }
}

function AddPreview(row, userInput)
{
    var regex = new RegExp(userInput, "i");
   
    var shaderName = row[0];
    var shaderFile = row[1];
    var shaderExt = row[2];

    if (shaderFile.match(regex))
    {
        matches++;
        HideNoResultsMsg();
        var allEx = new RegExp(userInput, "ig");
        let result = shaderFile.match(allEx);
        VerboseLog(`${shaderName} has ${result.length} matches`);
        var newNode = AddIncludeLink(shaderName);
        var matchNumber = document.createElement('p');
        matchNumber.classList = "preview";
        newNode.appendChild(matchNumber);
        matchNumber.innerText = `${result.length} matches`;

        var matchStartPosition = shaderFile.match(regex).index;
        var matchEndPosition = matchStartPosition + shaderFile.match(regex)[0].toString().length;
        var originalTextFoundByRegex = shaderFile.substring(matchStartPosition, matchEndPosition);

        var snippetStartPosition = matchStartPosition - SNIPPET_SIZE;
        if (snippetStartPosition < 0) snippetStartPosition = 0;
        var snippetEndPosition = matchEndPosition + SNIPPET_SIZE;
        if (snippetStartPosition > shaderFile.length) snippetStartPosition = shaderFile.length - 1;
        var snippetText = shaderFile.substring(snippetStartPosition, snippetEndPosition);
        if (snippetStartPosition > 3) snippetText = "<i> . . . </i>" + snippetText;
        if (snippetEndPosition < shaderFile.length - 3) snippetText += "<i> . . . </i>";

        var fileLink = `<span class="highlight" id="${originalTextFoundByRegex}">${originalTextFoundByRegex}</span>`;
       var linkFile = shaderFile.replace(regex, fileLink);

        var uniqueID = `${originalTextFoundByRegex}-link`;
        var highlightTag = `<a class="highlight" id="${uniqueID}">${originalTextFoundByRegex}</a>`;
        snippetText = snippetText.replace(regex, highlightTag);

        var preview = document.createElement('pre');
        preview.classList = "preview";
        newNode.appendChild(preview);
        preview.innerHTML = snippetText;
        var highlightLink = document.getElementById(uniqueID);
        SubscribeLink(highlightLink, shaderName, shaderFile, shaderExt);
    }
}

function CanSearch()
{
    GetRequiredNodes();
    resultsContainer.innerHTML = "";
    var includeName = inputField.value;
    if (includeName != null && includeName != "" && db != null)
    {
        if (!zeroResults.includes(includeName))
        {
            return true;
        }
        else ShowNoResultsMsg();
    }
    else HideNoResultsMsg();
    return false;
}

function AddListItem()
{
    GetRequiredNodes();
    var newListItem = document.createElement('li');
    resultsContainer.appendChild(newListItem);
    return newListItem;
}
function AddIncludeLink(cgInclude)
{
    var newListItem = AddListItem();
    var newLink = document.createElement('a');
    newListItem.appendChild(newLink);
    newLink.id = cgInclude;
    newLink.href = '';
    newLink.innerText = newLink.id;
    newLink.onclick = function() 
    {
        HideResults();
        inputField.value = cgInclude;
        DisplayBuiltinInclude();
        inputField.value = '';
        return false;
    }
    return newListItem;
}

function SubscribeLink(link, shaderName, shaderFile, extension)
{
    if (shaderFile != null && shaderName != null)
    {
        if (extension == null) extension = ".cginc";
        link.onclick = function()
        {
            HideResults();
            DisplayFile(shaderFile, shaderName, extension);
            return false;
        }
    }
}

function NoResultsString() { return `No results for ${inputField.value}`; }
function ShowNoResultsMsg() 
{
    noResultsMsg.innerText = NoResultsString();
    noResultsMsg.classList = "feedback";
}
function HideNoResultsMsg() { noResultsMsg.classList = "feedback hidden"; }
function CaseInsensitiveMatch(entry, input) { return entry.toLowerCase().includes(input.toLowerCase()); }
function GetRequiredNodes()
{
    if (targetNode == null) targetNode = document.getElementById(VIEWER_ID);
    if (resultsContainer == null) resultsContainer = document.getElementById(RESULTS_ID);
    if (inputField == null) inputField = document.getElementById(INPUT_FIELD_ID);
    if (toggleButton == null) toggleButton = document.getElementById(TOGGLE_ID);
    CreateNoResultsMsg();
}

function ResultsHidden() { return resultsContainer.parentNode.classList.contains("hidden");}
function HideResults() 
{ 
    resultsContainer.parentNode.classList = "directory search-container hidden"; 
    toggleButton.innerText = "Show Results";
}
function ShowResults() 
{ 
    resultsContainer.parentNode.classList = "directory search-container"; 
    toggleButton.innerText = "Hide Results";
}
function ToggleResults()
{
    if (ResultsHidden()) ShowResults();
    else HideResults();
}

function CreateNoResultsMsg()
{
    if (noResultsMsg == null)
    {
        noResultsMsg = document.createElement('div');
        InsertAfter(noResultsMsg, resultsContainer);
        noResultsMsg.innerText = "No results";
        noResultsMsg.classList = "feedback hidden";
    }
}
