

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


function stringifyEntry(entry){
    s = "";
    s += `Title: ${entry.title} <br>`;
    s += `Ingredients: ${entry.ingredients} <br>`;
    s += `Link: <a href ='${entry.href}'>${entry.href}</a><br>`;
    s += `<img src='${entry.thumbnail}'><br>`;
    return(s)

}

document.addEventListener('DOMContentLoaded', function() {

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
                    s += stringifyEntry(data_list[i]);
                    s += `<br>`;
                }
                document.getElementById('content').innerHTML = s;
            } else {
                throw new Error('404 Not Found')
            }
        } catch (e) {
            console.log(e);
            alert(e);
        }
    });

    const addForm = document.getElementById("addForm");

    addForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        let validEntry = true;
        let formData = {};
        for (let i = 0; i < addForm.length-1; i++) {
            if (addForm[i].value === "") {
                validEntry = false
            } else {
                formData[addForm[i].id] = addForm[i].value;
            }
        }
        if (validEntry === true) {
            try {
                let response = await fetch("http://127.0.0.1:8090/add",{
                    method: "POST",
                    headers:{'Content-Type': 'application/json'},
                    body: JSON.stringify(formData)
                });
                if (response.ok) {
                    let resp_text = await response.text();
                    document.getElementById('content').innerHTML = resp_text;
                } else {
                    throw new Error('404 Not Found')
                }
            } catch (e) {
                console.log(e);
                alert(e);
            }
        } else {
            document.getElementById('content').innerHTML = "Entry not received: You must fill all fields before submitting.";
        }

    });


});