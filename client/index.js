

/*tab interactivity*/
function openTab(event, tabName) {
    //create array of tab-content (div) elements
    const tabContent = document.getElementsByClassName("tabContent")

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
    const tabButtons = document.getElementsByClassName("tabButton")

    //iterate through each tab-button element
    for (let i = 0; i < tabButtons.length; i++) {
        //remove "active" designation from all tab-buttons
        tabButtons[i].className = tabButtons[i].className.replace(" active", "")
    }

    //add "active" designation to active tab-button
    event.currentTarget.className += " active";
}

//rename CSS elements
function toggleSidebar() {
    // get moving elements and put in array
    const button = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const search = document.getElementById("searchContainer");
    const movingElements = [button, sidebar, search];

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
    for (i = 0; i < movingElements.length; i++) {
        movingElements[i].className = movingElements[i].className.replace(searchValue, replaceValue);
    }
}


// utility function; list specific attribute/compmonent of every element in input
function getComponent(object, component) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        result.push(object[i][component])
    }
    return(result)
}

// utility function: apply HTML formatting to display a single entry data object to user
async function stringifyEntry(entry, entity) {
    // initialise HTML string
    let s = "";

    // get field info JSON object
    // contains ids for getting information from JSON entry
    // also contains HTML strings pre-formatted according to the data type (header, image, etc.)
    let fieldInfo = await genericGet({
        fetchURL: `http://127.0.0.1:8090/${entity}/getFieldInfo?components=html,label,required`,
        responseOkFunction: async function(response) {
            return await response.json();
        }
    });

    let fieldValue; // raw data (generally string or array)
    let fieldValueString; // data converted to string form

    // iterate through each field
    for (let i = 0; i < fieldInfo.length; i++) {
        // get the raw data
        fieldValue = entry[fieldInfo[i].id];

        // if the field's data isn't empty, add it to HTML string; otherwise, skip to next field
        if (!(typeof(fieldValue) === "undefined" || fieldValue === "")) {

            // convert array to string if necessary
            if (Array.isArray(fieldValue)) {
                fieldValueString = fieldValue.join(", ");
            } else {
                fieldValueString = fieldValue;
            }

            // append the prebuilt string from the server (with the data inserted) to the HTML string
            s += fieldInfo[i].html.replace("$", fieldValueString);
            s += "\n" // for readability when using console.log(s)
        }
    }
    return(s)
}

// utility function: general-purpose GET function to avoid repetition of code
async function genericGet(params) {
    try {
        const response = await fetch(params.fetchURL);
        if (response.ok) {
            return params.responseOkFunction(response)
        } else {
            let err = new Error;
            err.message = `Error ${response.status}: ${response.statusText}`;
            throw err;
        }
    } catch (e) {
        if (e.message === "NetworkError when attempting to fetch resource.") {
            e.message = `Error: Could not connect to server.`;
            alert(e.message);
        }
        alert(e.message)
    }
}

// define event listeners for each link returned from search
function defineLinks(data_list, entity) {
    // get list of all html element IDs from the list of data objects
    const id_list = getComponent(data_list, "id");

    // iterate through each element ID
    for (let i = 0; i < id_list.length; i++) {

        // register the click event listener for the current element id
        document.getElementById(`entry_${id_list[i]}`).addEventListener("click", async function (event) {
            event.preventDefault(); // do not redirect or refresh

            // get the id number from the full, descriptive element id (e.g. "32" from "entry_32")
            const id_selected = event.target.id.replace("entry_", "");

            // if clicked, perform a GET request, format the response into a HTML string, and put it into the "content" div
            genericGet({
                fetchURL: `http://127.0.0.1:8090/${entity}/entry?id=${id_selected}`,
                responseOkFunction: async function(response){
                    const entry = await response.json();
                    document.getElementById('content').innerHTML = await stringifyEntry(entry, entity);
                }
            });
        })
    }
}

async function search(key, entity) {
    // when search function is run, perform a GET request with search key as query
    // then, use HTML to construct a list of links from the response and put it into the "content" <div>
    // finally, run defineLinks() to define the behaviour for each link when clicked
    genericGet({
        fetchURL: `http://127.0.0.1:8090/${entity}/search?key=${key}`,
        responseOkFunction: async function(response) {
            const body = await response.json();

            let s = body.text;
            let data_list = body.data;

            for (let i = 0; i < data_list.length; i++){
                s += `<a href ="http://127.0.0.1:8090/${entity}/entry?id=${data_list[i].id}" id="entry_${data_list[i].id}" >${data_list[i].name}</a><br>`;
            }
            document.getElementById('content').innerHTML = s;
            defineLinks(data_list, entity);
        }
    });
}

// webAuth object for auth0 authentication
// does not contain any sensitive information, and so can be distributed in this file without compromising security
const webAuth = new auth0.WebAuth({
    clientID: 'jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY',
    domain: 'dev-mvcjlscb.eu.auth0.com',
    responseType: 'token id_token',
    audience: 'http://127.0.0.1:8090',
    redirectUri: 'http://127.0.0.1:8090',
    scope: 'openid profile',
});

// initialise access token in main scope
let accessToken;

// define function for determining access token
function getAccessToken(){
    return new Promise((resolve, reject) => {
        webAuth.parseHash((err, authResult) => {
            if (authResult && authResult.accessToken && authResult.idToken) {
                resolve(authResult.accessToken)
            } else {
                resolve(false);
            }
    });
})}

// set up DOM interactivity when fully loaded
document.addEventListener('DOMContentLoaded',  async function() {

    // define DOM element references
    const searchForm = document.getElementById("searchForm");
    const loginButton = document.getElementById("loginButton");
    const getFormButton = document.getElementById("getFormButton");

    // perform initial search to populate page on load
    search("", "games");

    // when search query is submitted, search again using form value as key
    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();   // do not redirect or refresh
        search(searchForm[0].value, "games");
    });

    // determine button attributes and actions based on whether user is logged in (has token) or not
    let logInOutFunction; // function to run when user clicks login/logout
    accessToken = await getAccessToken();
    if (accessToken) {
        loginButton.value = "Logout";
        getFormButton.value = "Add Entry";
        getFormButton.disabled = false;
        logInOutFunction = function(){
            webAuth.logout({
                returnTo: 'http://127.0.0.1:8090',
                client_id: 'jwjvlApldvpaiQq1BQRwYR9Fahj7IqcY'
            });
        }
    } else {
        loginButton.value = "Login";
        getFormButton.value = "Add Entry (requires login)";
        getFormButton.disabled = true;
        logInOutFunction = function(){
            webAuth.authorize();
        }
    }

    // log in or out, depending on presence of accessToken and corresponding result above
    loginButton.addEventListener("click",  logInOutFunction);

    // listen for user's request for the entry form
    getFormButton.addEventListener("click", async function (event) {
        // get information about fields to construct HTML form string with
        let fieldInfo = await genericGet({
            fetchURL: `http://127.0.0.1:8090/games/getFieldInfo?components=label`,
            responseOkFunction: async function(response){
                return response.json();
            }
        });

        // construct HTML form string
        let formString = `<form id="addForm">`;
        for (let i = 0; i < fieldInfo.length; i++) {
            formString += `<input id="${fieldInfo[i].id}" name="${fieldInfo[i].id}" placeholder="${fieldInfo[i].label}"><br>`;
        }
        formString += `<input id="addButton" type="submit" value="Submit Entry">`;
        formString += `</form>`;

        // display constructed HTML form
        document.getElementById("sidebarForm").innerHTML = formString;

        // get reference to form as JS object and define submission behaviour
        const addForm = document.getElementById("addForm");
        addForm.addEventListener("submit", async function (event) {
            event.preventDefault();  // do not redirect or refresh

            // create array of JSON objects to send to server: one for each field
            let formData = [];
            for (let i = 0; i < fieldInfo.length; i++) {
                formData.push({
                    id: fieldInfo[i].id,
                    label: fieldInfo[i].label,
                    value: document.getElementById(fieldInfo[i].id).value
                });
            }

            // try to POST, alerting/printing any caught error
            try {
                // POST to server with authentication token
                let response = await fetch("http://127.0.0.1:8090/games/add",{
                    method: "POST",
                    //Content-type needs to be correct:
                    headers:{
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + accessToken
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    // display submitted entry (returned from the server and formatted)
                    const resp = await response.json();

                    let s = `Entry received:<br>`;
                    s += await stringifyEntry(resp, "games");

                    document.getElementById('content').innerHTML = s;

                    // clear the form
                    addForm.reset();
                } else {
                    throw new Error(response.status + " " + response.statusText)
                }
            } catch (e) {
                console.log(e);
                alert(e);
            }
        });
    });
});