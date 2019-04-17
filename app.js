const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('client'));

const fetch = require("node-fetch");
//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i=potato'
//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i='
const primaryDataLocation = "https://api-v3.igdb.com/games";
//const primaryDataLocation = "https://notareallocation_qnhgbgfdfvdvbhgfgbdf";
const api_key = "***REMOVED***";
const secondaryDataLocation = "./sample_data.json";



function getSingleComponent(object, component) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        result.push(object[i][component])
    }
    return(result)
}

function getMultipleComponents(object, componentList) {
    let result = [];
    for (let i = 0; i < object.length; i++) {
        let element = {};
        for (let j = 0; j < componentList.length; j++) {
            element[componentList[j]] = object[i][componentList[j]];
        }
        result.push(element);
    }
    return(result)
}

let fields = [
    /*
    The order of fields in this array is the order in which they will be shown (in forms, content etc).
    Fields can be added or removed here to automatically modify all instances of all fields client- and server-side.
    - id: Field name as it is known in this program. Used in JSON attibutes and HTML element id.
    - query: Field name as it is known to the API (attibutes are sent when the API would otherwise return a number).
    - label: Field name as it should be shown to the user (e.g. with capitalisation).
    - html: HTML content associated with the field to inject into the page.
    */
    {id: "name", query: "name", label: "Name", html: `<h1>$</h1>`},
    {id: "platforms", query: "platforms.name", label: "Platforms", html: `Platforms: $<br>`},
    {id: "genres", query: "genres.name", label: "Genres", html: `Genres: $<br>`},
    {id: "cover", query: "cover.image_id", label: "Image URL", html: `<img src=$><br>`},
    {id: "summary", query: "summary", label: "Summary", html: `Summary: $<br>`},
    {id: "storyline", query: "storyline", label: "Plot", html: `Plot: $<br>`},
];

async function initData(){
    console.log("---STARTING---")
    const fieldsString = getSingleComponent(fields, "query").join(", ");
    const limit = 10;
    const request_body = `fields ${fieldsString}; where platforms = (48, 49); sort popularity desc; limit ${limit};`;
    let data_json;

    try {
        let response = await fetch(primaryDataLocation, {
            headers: {
                "user-key": api_key,
                Accept: "application/json"
            },
            method:"POST",
            body: request_body
        });

        if (response.ok) {
            data_json = await response.json();
        } else {
            throw new Error('404 Remote Page Not Found')
        }
    } catch(e) {
        console.log("Error: " + e.message);
        console.log("Using backup dataset instead.");
        data_json = require(secondaryDataLocation);
    }

    let entry;
    for (let i = 0; i < data_json.length; i++){
        entry = data_json[i];
        // parse and replace components of each entry where necessary
        if (typeof(entry.cover) !== "undefined"){
            entry.cover = `https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.cover.image_id}.jpg`;
        }
        if (typeof(entry.genres) !== "undefined"){
            entry.genres = getSingleComponent(entry.genres, "name")
        }
        if (typeof(entry.platforms) !== "undefined"){
            entry.platforms = getSingleComponent(entry.platforms, "name")
        }
        entry.user_submitted = false;
    }
    return (data_json)
    //return ([{id: 1},{id: 2}])
}


//initialise the data
let data_list = (async () =>{
    return(await initData());
})();


//GET method to list/search
app.get('/search', async function (req, resp) {

    data_list = await data_list
    //console.log(await data_list)
    let key = req.query.key;
    let info_full;
    let info_search = '';
    let entry, entryName;
    let resp_list = [];

    if (typeof(key) === "undefined") {
        key = "";
    }

    for (let i = 0; i < await data_list.length; i++) {
        entry = data_list[i];
        entryName = entry.name;
        if (entryName.toLowerCase().includes(key.toLowerCase())) {

            if (entry.user_submitted === true) {
                entryName = "*" + entryName;
            }
            resp_list.push({
                id: i,
                name: entryName
            })
        }
    }

    if (key !== ""){
        info_search = ` for search "${key}"`
    }

    if (resp_list.length === 0) {
        info_full = `No results found${info_search}.<br><br>`
    } else {
        info_full = `Showing all results${info_search}:<br><br>`
    }

    //Response provided as JSON
    resp.send({
        text: info_full,
        data: resp_list
    });

});

//GET method for individual details
app.get('/entry', async function (req, resp){
    //Response provided as JSON
    resp.send(data_list[req.query.id]);
});


app.get('/getFieldInfo', function(req ,resp){
    let components = req.query.components.split(",");
    if (!components.includes("id")){
        components.unshift("id");
    }

    resp.send(getMultipleComponents(fields, components))
});

app.get('/*', function(req, resp){
    resp.status(404);
    resp.statusMessage = 'The requested resource does not exist.';
    resp.send()
});


function parseField(key, value) {
    const requiredValueFields = ["name"]; //fields that cannot be empty
    const requiredDisplayFields = ["platforms", "genres"] //fields that must be displayed even if empy
    const multiFields = ["platforms", "genres"];


    if (value === "" || typeof(value) === "undefined") {
        if (requiredDisplayFields.includes(key)) {
            return "None Set"
        } else return !requiredValueFields.includes(key); //return true if valid empty, false if invalid empty
        // if the key is required but absent, nothing is returned as the parsed value is undefined
    } else if (multiFields.includes(key)) {
        return value.split(", ")
    } else {
        return value
    }

}

//POST method to add new
//TODO: Add authentication
app.post('/add', async function(req, resp){
    const fields = req.body;

    let validRequest = true;
    let invalidFields = [];
    let entry = {};
    let parsedField;

    for (let i = 0; i < fields.length; i++) {
        parsedField = parseField(fields[i].id, fields[i].value);
        if (parsedField === false) {
            validRequest = false;
            invalidFields.push(fields[i].label);
        } else if (!(parsedField === true)) {
            entry[fields[i].id] = parsedField;
        }
    }

    if (validRequest) {
        entry.user_submitted = true;
        data_list.unshift(entry);
        //Response provided as JSON
        resp.send(entry);
    } else {
        resp.status(400);
        resp.statusMessage = "Invalid Request: Invalid value(s) for field(s): " + invalidFields;
        resp.send();
    }

});

module.exports = app;