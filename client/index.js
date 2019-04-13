

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

function stringifyEntry(entry) {

    let s = "";
    //console.log(entry);
    s += `<h1>${entry.name}</h1>`;
    s += `Platforms: ${getComponent(entry.platforms, "name").join(", ")}<br>`;
    s += `Genres: ${getComponent(entry.genres, "name").join(", ")}<br>`;
    s += `<img src="https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.cover.image_id}.jpg"><br>`;
    //s += `<img src='${entry.cover.url}'><br>`;

    /*
    const order = [0, 2, 1];
    entryKeys = Object.keys(entry);
    console.log(entryKeys.length)
    let foo = [ ...Array(entryKeys.length).keys() ].slice(order.length);
    order.push(...foo)
    console.log(order)
    //console.log(entry);
    //console.log(entryKeys)


    let s = "";
    for (let i = 0; i < order.length; i++) {
        key = entryKeys[order[i]];
        console.log(key)
        s += `${capitalise(key)}: `;
        if (typeof(entry[key]) === "object") {
            for (let j = 0; j < entry[key].length; j++) {

                if (j > 0) {
                    s += ", ";
                }
                s += entry[key][j].name;
            }
        } else {
            s += entry[key];
        }
        s += `<br>`
        //s += `Title: ${entry.title} <br>`;
        //s += `Ingredients: ${entry.ingredients} <br>`;
        //s += `Link: <a href ='${entry.href}'>${entry.href}</a><br>`;
        //s += `<img src='${entry.thumbnail}'><br>`;
    }*/
    return(s)
}




function defineLinks(data_list) {
    for (i=0;i<data_list.length;i++) {
            document.getElementById(`entry_${i}`).addEventListener("click", async function (event) {
            event.preventDefault();
            const id = event.target.id.replace("entry_", "");
            try {

                const response = await fetch(`http://127.0.0.1:8090/entry?id=${id}`);

                if (response.ok) {

                    let s;

                    const entry = await response.json();
                    //const entry = JSON.parse(body);
                    //console.log(entry)
                    s = stringifyEntry(entry)
                    document.getElementById('content').innerHTML = s;

                } else {
                    throw new Error('404 Not Found')
                }
            } catch (e) {
                console.log(e);
                alert(e);
            }

        })
    }
}

document.addEventListener('DOMContentLoaded', async function() {

    const searchForm = document.getElementById("searchForm");
    searchForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        const key = searchForm[0].value;

        try {

            const response = await fetch(`http://127.0.0.1:8090/search?key=${key}`);
            if (response.ok) {

                let s;
                if (key === ""){
                    s = `Showing all results:<br><br>`
                } else {
                    s = `Showing results for search "${key}":<br><br>`
                }

                const body = await response.text();
                const data_list = JSON.parse(body);

                for (i = 0; i < data_list.length; i++){
                    s += `<a href ="http://127.0.0.1:8090/entry?id=${i}" id="entry_${i}" >${data_list[i].name}</a><br>`;
                }
                document.getElementById('content').innerHTML = s;

                defineLinks(data_list);

            } else {
                throw new Error('404 Not Found')
            }
        } catch (e) {
            console.log(e);
            alert(e);
        }
    });




    const addForm = document.getElementById("addForm");
    //console.log(addForm.hasOwnProperty("tatle"))
    addForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        let formData = {};
        let labels = document.getElementsByTagName('label');
        let id;

        for (let i = 0; i < labels.length; i++) {
            id = labels[i].htmlFor;
            if (addForm.hasOwnProperty(id)) {
                formData[id] = {
                    value: addForm[i].value,
                    label: labels[i].innerHTML
                }
            }
        }

        try {
            let response = await fetch("http://127.0.0.1:8090/add",{
                method: "POST",
                //Content-type needs to be correct:
                headers:{'Content-Type': 'application/json'},
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                const body = await response.text();
                const resp = JSON.parse(body);

                let s = `Entry received:<br>`;
                s += stringifyEntry(resp);

                document.getElementById('content').innerHTML = s;
            } else {
                throw new Error(response.status + " " + response.statusText)
            }
        } catch (e) {
            console.log(e);
            alert(e);
        }

    });


});