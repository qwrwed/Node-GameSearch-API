"use strict";

const root_url = "http://127.0.0.1:8090";

/* UTILITY FUNCTIONS */

// general-purpose GET function to avoid repetition of code
async function genericGet(fetchURL) {
    try {
        const response = await fetch(fetchURL);
        if (response.ok) {
            return await response.json(); // immediately read as JSON
        } else {
            let err = new Error;
            err.message = `Error ${response.status}: ${response.statusText}`;
            throw err;
        }
    } catch (e) {
        if (e.message === "NetworkError when attempting to fetch resource.") {
            e.message = "Error: Could not connect to server."; // replace with clearer message
            alert(e.message);
        }
        alert(e.message);
    }
}

// get list for given entity with optional search term
async function getList(entity, key){
    if (typeof(key) === "undefined") {
        key = "";
    }
    return await genericGet(`${root_url}/search?entity=${entity}&key=${key}`);
}

// get data, then format it as HTML, then define link behaviours
async function search(key, entity) {
    // if showing all results, hide the link that returns user to all results
    const returnDiv = document.getElementById("returnDiv");
    if (key !== "") {
        returnDiv.style.display = "block";
    } else {
        returnDiv.style.display = "none";
    }

    const body = await getList(entity, key);
    let s = body.text;
    let data_list = body.data;

    // place links in page
    for (let i = 0; i < data_list.length; i++){
        s += `<a href ="${root_url}/entity=${entity}&entry?id=${data_list[i].id}" id="${entity}_entry_${data_list[i].id}" >${data_list[i].name}</a><br>`;
    }
    document.getElementById("content").innerHTML = s;

    // define event listeners
    defineLinks(data_list, entity);
}

// define event listeners for each link in some list
function defineLinks(data_list, entity) {
    // get list of all HTML element IDs from the list of data objects
    const id_list = getComponent(data_list, "id");

    // iterate through each element ID
    for (let i = 0; i < id_list.length; i++) {

        // register the click event listener for the current element id
        document.getElementById(`${entity}_entry_${id_list[i]}`).addEventListener("click", async function (event) {
            event.preventDefault(); // do not redirect or refresh

            // get the id number from the full, descriptive element id (e.g. "32" from "games_entry_32")
            const id_selected = event.target.id.replace(`${entity}_entry_`, "");

            // when link is clicked, get the entry as JSON
            const entry = await genericGet(`${root_url}/entry?entity=${entity}&id=${id_selected}`);

            // from this JSON, get HTML string, and data about any referenced entities
            const {string, REData} = await stringifyEntry(entry, entity);

            // inject the entry HTML string into the page
            document.getElementById("content").innerHTML = string;

            // show the return button (it is hidden when listing all instances)
            document.getElementById("returnDiv").style.display = "block";

            // for any referenced entities (e.g. list of platforms for a specific game), define those referenced links too
            // these links will only be defined as needed, when the initial link is clicked
            for (let referencedEntity in REData) {
                if (REData.hasOwnProperty(referencedEntity)) {
                    defineLinks(REData[referencedEntity], referencedEntity);
                }
            }
        });
    }
}

// on entity refresh, get field information to put in the sidebar form, and do an empty search with the new entity
async function refreshEntity(entity) {
    await refreshSidebar(entity);
    search("", entity);
    return genericGet(`${root_url}/getFieldInfo?entity=${entity}&components=label,isEntity`);
}


// list specific attribute/compmonent of every element in input
function getComponent(object, component) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        // push only this component to the output for each element of the object
        result.push(object[i][component]);
    }
    return(result);
}

// apply HTML formatting to display a single entry data object to user
async function stringifyEntry(entry, entity) {
    // initialise HTML string
    let string = "";

    // get field info JSON object
    // contains ids for getting information from JSON entry
    // also contains HTML strings pre-formatted to take this information according to the data type (header, image, etc.)
    let fieldInfo = await genericGet(`${root_url}/getFieldInfo?entity=${entity}`);

    let fieldValue; // raw data (generally string or array)
    let fieldValueString; // data converted to string form


    // RE stands for "referenced entity"

    // object will contain all referenced entity types as keys, with arrays of all corresponding instances as values
    let REData = {};

    // iterate through each field
    for (let i = 0; i < fieldInfo.length; i++) {
        // get the raw data
        fieldValue = entry[fieldInfo[i].id];

        // if the field's data isn't empty, add it to HTML string; otherwise, skip to next field
        if (!(typeof(fieldValue) === "undefined" || fieldValue === "")) {

            // if the field itself was defined as an entity type, set up the relationships (links) for it
            if (fieldInfo[i].isEntity === true) {

                // type of entity (e.g. "platforms")
                const REType = fieldInfo[i].id;

                // name of entity, data object containing entity, id of entity respectively
                let REName, REInstance, REID;

                // get whole list of all instances of this entity type
                let REList = (await getList(REType)).data;

                // initialise list containing the html that will display each instance
                let REHTML = [];

                // initialise array of corresponding instances for this entity type
                REData[REType] = [];

                // iterate through array of user-chosen instances of this entity
                for (let j = 0; j < fieldValue.length; j++) {

                    // define name, instance object and ID
                    REName = fieldValue[j];
                    REInstance = REList.find(element => element.name === REName);
                    REID = REInstance.id;

                    // add instance HTML to returned HTML array and instance object to returned data object
                    REHTML.push(`<a href ="${root_url}/entry?entity=${REType}&id=${REID}" id="${REType}_entry_${REID}" >${REName}</a>`);
                    REData[REType].push(REInstance);
                }
                // set fieldValue to list of instance HTML strings
                fieldValue = REHTML;
            }
            // convert array to string if necessary
            if (Array.isArray(fieldValue)) {
                fieldValueString = fieldValue.join(", ");
            } else {
                fieldValueString = fieldValue;
            }

            // append the prebuilt string from the server (with the data inserted) to the HTML string
            string += fieldInfo[i].html.replace("$", fieldValueString);
        }
    }
    // return built HTML string, and referenced entity data that will be used to add event listeners to this HTML after
    return({string, REData});
}

// get all selected values from a "multiselect" HTML input element (source: https://stackoverflow.com/a/5867262)
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

/* AUTHENTICATION */
// webAuth object for auth0 authentication
// does not contain any sensitive information, so it can be distributed in this file without compromising security
const webAuth = new auth0.WebAuth({ // eslint-disable-line
    clientID: "jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY",
    domain: "dev-mvcjlscb.eu.auth0.com",
    responseType: "token id_token",
    audience: "http://127.0.0.1:8090", // not an actual URL, but this identifier cannot be changed after creation
    redirectUri: `${root_url}`,
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


async function refreshSidebar(entity) {

    const fieldInfo = await genericGet(`${root_url}/getFieldInfo?entity=${entity}&components=label,isEntity`);

    // construct HTML form string
    let formString = "";
    for (let i = 0; i < fieldInfo.length; i++) {
        // if entity, use a select input so the user can only choose from pre-existing instances of that entity
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
            // if not entity, just use a normal text input
            formString += `<input id="${fieldInfo[i].id}" name="${fieldInfo[i].id}" placeholder="${fieldInfo[i].label}"><br>`;
        }
    }
    formString += "<input id=\"addButton\" type=\"submit\" value=\"Submit Entry\">";

    // display constructed HTML form (includes initialisation of select input)
    document.getElementById("addForm").innerHTML = formString;
    $(".selectpicker").selectpicker();

    return fieldInfo;
}

/* MAIN */

// set up DOM interactivity when fully loaded
document.addEventListener("DOMContentLoaded",  async function() {

    // get token on load (if it exists)
    accessToken = await getAccessToken();
    let entity;

    // get list of entity types from server to populate dropdown entity select list
    let entityNames = await genericGet(`${root_url}/getFieldInfo`);
    const entitySelect = document.getElementById("entitySelect");
    let fieldInfo;

    // initialise values and content
    for (let value in entityNames) {
        if (entityNames.hasOwnProperty(value)) {
            //create new list option and add it to list
            let option = document.createElement("option");
            option.value = value;
            option.text = entityNames[value];
            entitySelect.add(option);

            // also, if entity type has not yet been set, set it and update page as appropriate
            if (typeof(entity) === "undefined") {
                entity = value;
                fieldInfo = refreshEntity(entity);
            }
        }
    }

    // add event listener to react to entity change
    entitySelect.addEventListener("change", async function(event){
        entity = event.target.value;
        fieldInfo = refreshEntity(entity);
    });

    // define DOM element references
    const loginButton = document.getElementById("loginButton");
    const searchForm = document.getElementById("searchForm");
    const sidebarCheckbox = document.getElementById("sidebar-checkbox");
    const sidebarButton = document.getElementById("sidebar-button");
    const returnLink = document.getElementById("returnLink");

    // define link to return user to list of all results
    returnLink.addEventListener("click", function(event){
        event.preventDefault();   // do not redirect or refresh
        search("", entity);
    });

    // define behaviour for submission of user search
    searchForm.addEventListener("submit", async function (event) {
        event.preventDefault();   // do not redirect or refresh
        search(searchForm[0].value, entity);
    });

    // determine button attributes and actions based on whether user is logged in (has token) or not
    let logInOutFunction; // which function to run when user clicks login/logout
    if (accessToken) {
        loginButton.value = "Logout";
        sidebarButton.className = sidebarButton.className.replace(" disabled", "");
        sidebarCheckbox.disabled = false; // allow toggling sidebar display
        logInOutFunction = function(){ // set function to logout
            webAuth.logout({
                returnTo: `${root_url}`,
                client_id: "jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY"
            });
        };
    } else {
        loginButton.value = "Login";
        sidebarButton.className += " disabled";
        sidebarCheckbox.checked = false;
        sidebarCheckbox.disabled = true;
        logInOutFunction = function(){ // set function to login
            webAuth.authorize();
        };
    }

    // log in or out, depending on presence of accessToken and corresponding result above
    loginButton.addEventListener("click",  logInOutFunction);

    // listen for user's request for the sidebar (contains entry form)
    sidebarCheckbox.addEventListener("click", async function () {

        // refresh sidebar with relevant entity's addForm
        fieldInfo = await refreshSidebar(entity);

        // get reference to updated form as JS object...
        const addForm = document.getElementById("addForm");

        // ...and define its submission behaviour
        addForm.addEventListener("submit", async function (event) {
            event.preventDefault();  // do not redirect or refresh

            // create array of JSON objects to send to server: one for each field
            let formData = [];
            let value, formField;
            for (let i = 0; i < fieldInfo.length; i++) {

                // get user input/choice for each field, and add it to the formData object
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
                let response = await fetch(`${root_url}/add`,{
                    method: "POST",
                    // ensure correct content type, authorisation token and entity type are provided
                    headers:{
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + accessToken,
                        entity: entity
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    // show the "Back" button
                    document.getElementById("returnDiv").style.display = "block";

                    //get submitted entry back from server as JSON
                    const resp = await response.json();

                    // from this JSON, get HTML string, and data about any referenced entities
                    const {string, REData} = await stringifyEntry(resp, entity);

                    // inject the entry HTML string into the page
                    let s = "Entry received:<br>";
                    s += string;
                    document.getElementById("content").innerHTML = s;

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