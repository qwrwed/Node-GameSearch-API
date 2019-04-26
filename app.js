const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('client'));

const utilities = require("./utilities");
const { getSingleComponent, getMultipleComponents, findComponent, fields } = utilities;


const fetch_initial_data = require("./fetch_initial_data");

async function initData(){
    let data_json = await fetch_initial_data();
    //saveJSONData("igdb_backup.json", data_json); //create backup

    let entry;
    let ratings = {
        1: "3+",
        2: "7+",
        3: "12+",
        4: "16+",
        5: "18+",
        6: "Pending",
    };
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

        let pegiRating = findComponent(entry.age_ratings, "category", 2);
        if (typeof(pegiRating) !== "undefined"){
            entry.age_rating = ratings[pegiRating.rating];
        } else {
            entry.age_rating = "None Set"
        }

        entry.user_submitted = false;
    }
    return(data_json)
}


// Initialise the data list, once
// This will set data_list to be a Promise that contains the list of data
// This Promise will be resolved by the middleware app.use() when it is needed
let data_list = (async () =>{
    return(await initData());
})();

// Ensure promise containing data_list is resolved for any request
app.use(async function (req, res, next) {
    data_list = await data_list;
    next()
});

//GET method to list/search
app.get('/games/search', async function (req, resp) {

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
app.get('/games/entry', async function (req, resp){
    //Response provided as JSON
    resp.send(data_list[req.query.id]);
});


app.get('/games/getFieldInfo', function(req ,resp){
    if (typeof(req.query) === "undefined") {
        resp.send(fields)
    } else {
        let components = req.query.components.split(",");
        if (!components.includes("id")) {
            components.unshift("id");
        }
        resp.send(getMultipleComponents(fields, components))
    }
});


app.get('/*', function(req, resp){
    resp.status(404);
    resp.statusMessage = 'The requested resource does not exist.';
    resp.send()
});


function parseField(key, value) {
    const requiredUserInputFields = ["name"]; //fields that cannot be empty; require user input
    const multiFields = ["platforms", "genres"];

    const requiresValue = findComponent(fields, "id", key).required;

    if ((value === "" || typeof(value) === "undefined") && requiresValue) {
        if (!requiredUserInputFields.includes(key)) {
            return  "None Set"; // if field requires value but not user input, give it a value
        }
        // if field requires user input but none given, nothing is returned as the parsed value is undefined
    } else if (multiFields.includes(key)) {
        return value.split(", ")
    } else {
        return value
    }

}

//POST method to add new
//TODO: Add authentication
app.post('/games/add', async function(req, resp){
    //console.log(data_list)
    const fields = req.body;

    let validRequest = true;
    let invalidFields = [];
    let entry = {};
    let parsedField;

    for (let i = 0; i < fields.length; i++) {
        parsedField = parseField(fields[i].id, fields[i].value);
        if (typeof(parsedField) === "undefined") {
            validRequest = false;
            invalidFields.push(fields[i].label);
        } else {
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