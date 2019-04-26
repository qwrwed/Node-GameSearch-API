

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

function toggleSidebar() {
    const button = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("sidebar");
    const search = document.getElementById("searchContainer");
    const movingElements = [button, sidebar, search];
    let searchValue, replaceValue;
    if (sidebar.className === "sidebar sidebarOn") {
        searchValue = "sidebarOn";
        replaceValue = "sidebarOff";
    } else {
        searchValue = "sidebarOff";
        replaceValue = "sidebarOn";
    }

    for (i = 0; i < movingElements.length; i++) {
        movingElements[i].className = movingElements[i].className.replace(searchValue, replaceValue);
    }
}

function capitalise(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getComponent(object, component) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        result.push(object[i][component])
    }
    return(result)
}

async function stringifyEntry(entry, entity) {
    let s = "";
    let fieldInfo = await genericGet({
        fetchURL: `http://127.0.0.1:8090/${entity}/getFieldInfo?components=html,label,required`,
        responseOkFunction: async function(response) {
            return await response.json();
        }
    });


    let fieldValueString;
    let fieldValue;
    for (let i = 0; i < fieldInfo.length; i++) {
        fieldValue = entry[fieldInfo[i].id];
        if (!(typeof(fieldValue) === "undefined" || fieldValue === "")) {
            if (Array.isArray(fieldValue)) {
                fieldValueString = fieldValue.join(", ");
            } else {
                fieldValueString = fieldValue;
            }
            s += fieldInfo[i].html.replace("$", fieldValueString);
            s += "\n"
        }
    }
    return(s)
}




function defineLinks(data_list, entity) {
    const id_list = getComponent(data_list, "id");

    for (let i = 0; i < id_list.length; i++) {
        document.getElementById(`entry_${id_list[i]}`).addEventListener("click", async function (event) {

            event.preventDefault();
            const id_selected = event.target.id.replace("entry_", "");

            genericGet({
                fetchURL: `http://127.0.0.1:8090/${entity}/entry?id=${id_selected}`,
                responseOkFunction: async function(response){
                    const entry = await response.json();
                    let entryHTML = await stringifyEntry(entry, entity);
                    document.getElementById('content').innerHTML = entryHTML;
                }
            });

        })
    }
}

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

async function search(key, entity) {
    genericGet({
        fetchURL: `http://127.0.0.1:8090/${entity}/search?key=${key}`,
        //fetchURL: `http://thiswebsitedoesntexist.xctfrvgybuhyinjmkljnhbgvfctr`,

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

document.addEventListener('DOMContentLoaded', async function() {
    search("", "games");
    const searchForm = document.getElementById("searchForm");
    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const key = searchForm[0].value;
        search(key, "games")
    });

    const getFormButton = document.getElementById("getFormButton");

    getFormButton.addEventListener("click", async function (event) {
        genericGet({
            fetchURL: `http://127.0.0.1:8090/games/getFieldInfo?components=label`,
            responseOkFunction: async function(response){
                let fieldInfo = await response.json();

                let formString = `<form id="addForm">`;
                for (let i = 0; i < fieldInfo.length; i++) {
                    formString += `<input id="${fieldInfo[i].id}" name="${fieldInfo[i].id}" placeholder="${fieldInfo[i].label}"><br>`;
                }
                formString += `<input id="addButton" type="submit" value="Add Entry">`;
                formString += `</form>`;
                document.getElementById("sidebar").innerHTML = formString;

                const addForm = document.getElementById("addForm");
                addForm.addEventListener("submit", async function (event) {
                    event.preventDefault();

                    let formData = [];

                    for (let i = 0; i < fieldInfo.length; i++) {
                        formData.push({
                            id: fieldInfo[i].id,
                            label: fieldInfo[i].label,
                            value: document.getElementById(fieldInfo[i].id).value
                        });
                    }

                    console.log(formData)
                    //console.log(formData);

                    try {
                        let response = await fetch("http://127.0.0.1:8090/games/add",{
                            method: "POST",
                            //Content-type needs to be correct:
                            headers:{'Content-Type': 'application/json'},
                            body: JSON.stringify(formData)
                        });
                        if (response.ok) {
                            const body = await response.text();
                            const resp = JSON.parse(body);

                            let s = `Entry received:<br>`;
                            s += await stringifyEntry(resp, "games");
                            //console.log(s);

                            document.getElementById('content').innerHTML = s;
                        } else {
                            throw new Error(response.status + " " + response.statusText)
                        }
                    } catch (e) {
                        console.log(e);
                        alert(e);
                    }

                });

            }
        })
    });

});