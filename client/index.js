"use strict";

/*tab interactivity*/
/*
function openTab(event, tabName) {
    //create array of tab-content (div) elements
    const tabContent = document.getElementsByClassName("tabContent");

    //iterate through each tab-content element
    for (let i = 0; i < tabContent.length; i++) {
        if (tabContent[i].id === tabName){
            //display chosen tab-content element
            tabContent[i].style.display = "block";
        } else {
            //prevent all other tab-content elements from displaying
            tabContent[i].style.display = "none";
        }
    }

    //create array of tab-button (button) elements
    const tabButtons = document.getElementsByClassName("tabButton");

    //iterate through each tab-button element
    for (let i = 0; i < tabButtons.length; i++) {
        //remove "active" designation from all tab-buttons
        tabButtons[i].className = tabButtons[i].className.replace(" active", "");
    }

    //add "active" designation to active tab-button
    event.currentTarget.className += " active";
}
 */


/* exported toggleSidebar */
//rename CSS elements
function toggleSidebar() {
    // get moving elements and put in array
    const button = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const movingElements = [button, sidebar];

    // define which string to replace with which
    let searchValue, replaceValue;
    if (sidebar.className === "sidebar sidebarOn") {
        searchValue = "sidebarOn";
        replaceValue = "sidebarOff";
    } else {
        searchValue = "sidebarOff";
        replaceValue = "sidebarOn";
    }

    // replace classnames of all moving objects as above
    for (let i = 0; i < movingElements.length; i++) {
        movingElements[i].className = movingElements[i].className.replace(searchValue, replaceValue);
    }
}


// utility function; list specific attribute/compmonent of every element in input
function getComponent(object, component) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        result.push(object[i][component]);
    }
    return(result);
}

// utility function: apply HTML formatting to display a single entry data object to user
async function stringifyEntry(entry, entity) {
    // initialise HTML string
    let s = "";

    // get field info JSON object
    // contains ids for getting information from JSON entry
    // also contains HTML strings pre-formatted according to the data type (header, image, etc.)
    let fieldInfo = await genericGet({
        fetchURL: `http://127.0.0.1:8090/getFieldInfo?entity=${entity}`,
        responseOkFunction: async function(response) {
            return await response.json();
        }
    });

    let fieldValue; // raw data (generally string or array)
    let fieldValueString; // data converted to string form

    let RETypeList = [];
    let REData = {};

    // iterate through each field
    for (let i = 0; i < fieldInfo.length; i++) {
        // get the raw data
        fieldValue = entry[fieldInfo[i].id];

        // if the field's data isn't empty, add it to HTML string; otherwise, skip to next field
        if (!(typeof(fieldValue) === "undefined" || fieldValue === "")) {
            if (fieldInfo[i].isEntity === true) {
                //RE stands for "referenced entity"
                const REType = fieldInfo[i].id;
                RETypeList.push(REType); // will be returned for use in defineLinks after string is put on page

                let REName, REInstance, REID;
                let REList = (await getList(REType)).data;
                let REHTML = [];
                REData[REType] = [];


                for (let j = 0; j < fieldValue.length; j++) {
                    REName = fieldValue[j];

                    REInstance = REList.find(element => element.name === REName);

                    REID = REInstance.id;
                    REHTML.push(`<a href ="http://127.0.0.1:8090/entry?entity=${REType}&id=${REID}" id="${REType}_entry_${REID}" >${REName}</a>`);
                    REData[REType].push(REInstance);
                }
                fieldValue = REHTML;
            }
            // convert array to string if necessary
            if (Array.isArray(fieldValue)) {
                fieldValueString = fieldValue.join(", ");
            } else {
                fieldValueString = fieldValue;
            }

            // append the prebuilt string from the server (with the data inserted) to the HTML string
            s += fieldInfo[i].html.replace("$", fieldValueString);
            s += "\n"; // for readability when using console.log(s)
        }
    }
    return({"string": s, "REData": REData});
}

// utility function: general-purpose GET function to avoid repetition of code
async function genericGet(params) {
    try {
        const response = await fetch(params.fetchURL);
        if (response.ok) {
            return params.responseOkFunction(response);
        } else {
            let err = new Error;
            err.message = `Error ${response.status}: ${response.statusText}`;
            throw err;
        }
    } catch (e) {
        if (e.message === "NetworkError when attempting to fetch resource.") {
            e.message = "Error: Could not connect to server.";
            alert(e.message);
        }
        alert(e.message);
    }
}

// define event listeners for each link returned from search
function defineLinks(data_list, entity) {
    // get list of all html element IDs from the list of data objects
    const id_list = getComponent(data_list, "id");

    // iterate through each element ID
    for (let i = 0; i < id_list.length; i++) {

        // register the click event listener for the current element id
        document.getElementById(`${entity}_entry_${id_list[i]}`).addEventListener("click", async function (event) {
            event.preventDefault(); // do not redirect or refresh

            // get the id number from the full, descriptive element id (e.g. "32" from "entry_32")
            const id_selected = event.target.id.replace(`${entity}_entry_`, "");

            // when link is clicked, get the entry as JSON
            const entry = await genericGet({
                fetchURL: `http://127.0.0.1:8090/entry?entity=${entity}&id=${id_selected}`,
                responseOkFunction: async function(response){
                    return await response.json();
                }
            });

            // from this JSON, get HTML string, and data about any referenced entities
            const {string, REData} = await stringifyEntry(entry, entity);

            // inject the entry HTML string into the page
            document.getElementById("content").innerHTML = string;

            // show the "Back" button
            document.getElementById("returnDiv").style.display = "block";

            // for any referenced entities (e.g. list of platforms for a specific game), define those links too
            for (let referencedEntity in REData) {
                if (REData.hasOwnProperty(referencedEntity)) {
                    defineLinks(REData[referencedEntity], referencedEntity);
                }
            }


        });
    }
}

async function getList(entity, key){

    if (typeof(key) === "undefined") {
        key = "";
    }
    return await genericGet({
        fetchURL: `http://127.0.0.1:8090/search?entity=${entity}&key=${key}`,
        responseOkFunction: async function(response) {
            return await response.json();
        }
    });
}
async function search(key, entity) {
    const returnDiv = document.getElementById("returnDiv");
    if (key !== "") {
        returnDiv.style.display = "block";
    } else {
        returnDiv.style.display = "none";
    }
    // when search function is run, perform a GET request with search key as query
    // then, use HTML to construct a list of links from the response and put it into the "content" <div>
    // finally, run defineLinks() to define the behaviour for each link when clicked
    const body = await getList(entity, key);
    let s = body.text;
    let data_list = body.data;

    for (let i = 0; i < data_list.length; i++){
        s += `<a href ="http://127.0.0.1:8090/entity=${entity}&entry?id=${data_list[i].id}" id="${entity}_entry_${data_list[i].id}" >${data_list[i].name}</a><br>`;
    }
    document.getElementById("content").innerHTML = s;
    defineLinks(data_list, entity);
}

// webAuth object for auth0 authentication
// does not contain any sensitive information, and so can be distributed in this file without compromising security
const webAuth = new auth0.WebAuth({ // eslint-disable-line
    clientID: "jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY",
    domain: "dev-mvcjlscb.eu.auth0.com",
    responseType: "token id_token",
    audience: "http://127.0.0.1:8090",
    redirectUri: "http://127.0.0.1:8090",
    scope: "openid profile",
});

// initialise access token in main scope
let accessToken;

// define function for determining access token
function getAccessToken(){
    return new Promise((resolve) => {
        webAuth.parseHash((err, authResult) => {
            if (authResult && authResult.accessToken && authResult.idToken) {
                window.location.hash = "";
                resolve(authResult.accessToken);
            } else {
                resolve(false);
            }
        });
    });}

// set up DOM interactivity when fully loaded
document.addEventListener("DOMContentLoaded",  async function() {
    // get token on load (if it exists)
    accessToken = await getAccessToken();
    let entity = "games";

    // define DOM element references
    const loginButton = document.getElementById("loginButton");
    /*
    const searchForm = document.getElementById("searchForm");
     */
    const getFormCheckbox = document.getElementById("sidebar-checkbox");
    const getFormLabel = document.getElementById("sidebar-button");
    const returnLink = document.getElementById("returnLink");
    returnLink.addEventListener("click", function(event){
        event.preventDefault();   // do not redirect or refresh
        search("", entity);
    });

    // perform initial search to populate page on load
    search("", entity);

    // when search query is submitted, listen for user search via form
    searchForm.addEventListener("submit", async function (event) {
        event.preventDefault();   // do not redirect or refresh
        search(searchForm[0].value, entity);
    });

    // determine button attributes and actions based on whether user is logged in (has token) or not
    let logInOutFunction; // function to run when user clicks login/logout
    if (accessToken) {
        loginButton.value = "Logout";
        getFormCheckbox.value = "Add Entry";
        getFormCheckbox.disabled = false;
        getFormLabel.className = getFormCheckbox.className.replace(" disabled", "");
        logInOutFunction = function(){
            webAuth.logout({
                returnTo: "http://127.0.0.1:8090",
                client_id: "jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY"
            });
        };
    } else {
        loginButton.value = "Login";
        getFormCheckbox.value = "Add Entry";
        //getFormCheckbox.disabled = true;
        //getFormLabel.className += " disabled";
        logInOutFunction = function(){
            webAuth.authorize();
        };
    }

    console.log(getFormCheckbox.className)

    // log in or out, depending on presence of accessToken and corresponding result above
    loginButton.addEventListener("click",  logInOutFunction);

    // listen for user's request for the entry form

    getFormCheckbox.addEventListener("click", async function () {
        // get information about fields to construct HTML form string with
        let fieldInfo = await genericGet({
            fetchURL: `http://127.0.0.1:8090/getFieldInfo?entity=${entity}&components=label,isEntity`,
            responseOkFunction: async function(response){
                return response.json();
            }
        });

        // construct HTML form string
        let formString = "<form id=\"addForm\">";
        for (let i = 0; i < fieldInfo.length; i++) {
            if (fieldInfo[i].isEntity) {
                formString +=   `<select
                                    id=${fieldInfo[i].id}
                                    class="selectpicker"
                                    multiple data-live-search="true"
                                    data-style="btn-default"
                                    data-selected-text-format="count > 2"
                                    data-width = 100%
                                    title="Platforms"
                                >`;
                let choiceList = (await getList(fieldInfo[i].id)).data;
                for (let j = 0; j < choiceList.length; j++) {
                    formString += `<option value="${choiceList[j].name}">${choiceList[j].name}</option>\n`;
                }
                formString += "</select><br>";
            } else {
                formString += `<input id="${fieldInfo[i].id}" name="${fieldInfo[i].id}" placeholder="${fieldInfo[i].label}"><br>`;
            }
        }
        formString += "<input id=\"addButton\" type=\"submit\" value=\"Submit Entry\">";
        formString += "</form>";

        // display constructed HTML form
        document.getElementById("sidebar").innerHTML = formString;
        $(".selectpicker").selectpicker();

        // get reference to form as JS object and define submission behaviour
        const addForm = document.getElementById("addForm");
        addForm.addEventListener("submit", async function (event) {
            event.preventDefault();  // do not redirect or refresh

            // source: https://stackoverflow.com/a/5867262
            function getAllSelectedValues(element) {
                let result = [];
                const options = element && element.options;
                let opt;
                for (let i = 0, iLen = options.length; i < iLen; i++) {
                    opt = options[i];
                    if (opt.selected) {
                        result.push(opt.value || opt.text);
                    }
                }
                return result;
            }

            // create array of JSON objects to send to server: one for each field
            let formData = [];
            let value, formField;
            for (let i = 0; i < fieldInfo.length; i++) {
                formField = document.getElementById(fieldInfo[i].id);

                if (formField.className === "selectpicker") {
                    value = getAllSelectedValues(formField);
                } else {
                    value = formField.value;
                }

                formData.push({
                    id: fieldInfo[i].id,
                    label: fieldInfo[i].label,
                    value: value
                });
            }

            // try to POST, alerting/printing any caught error
            try {
                // POST to server with authentication token
                let response = await fetch("http://127.0.0.1:8090/add",{
                    method: "POST",
                    //Content-type needs to be correct:
                    headers:{
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + accessToken,
                        entity: entity
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    //get submitted entry back from server as JSON
                    const resp = await response.json();

                    // from this JSON, get HTML string, and data about any referenced entities
                    const {string, REData} = await stringifyEntry(resp, entity);

                    let s = "Entry received:<br>";
                    s += string;

                    // inject the entry HTML string into the page
                    document.getElementById("content").innerHTML = s;

                    // show the "Back" button
                    document.getElementById("returnDiv").style.display = "block";

                    // for any referenced entities (e.g. list of platforms for a specific game), define those links too
                    for (let referencedEntity in REData) {
                        if (REData.hasOwnProperty(referencedEntity)) {
                            defineLinks(REData[referencedEntity], referencedEntity);
                        }
                    }

                    // clear the form
                    addForm.reset();
                    $(".selectpicker").selectpicker("refresh");
                } else {
                    throw new Error(response.status + " " + response.statusText);
                }
            } catch (e) {
                alert(e);
            }
        });
    });
});