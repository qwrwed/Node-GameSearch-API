
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const fetchInitialData = require("./fetch_initial_data");
const { checkJwt } = require("./checkJwt");



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("client"));

// get utility functions from separate file
const { getSingleComponent, getMultipleComponents, findComponent, fields } = require("./utilities");
const supportedEntities = Object.keys(fields);
const defaultEntity = supportedEntities[0];

/* ADDING ENTITIES */

/*
To add more entities to this program, expand the fields object in utilities.js with the relevant information (see existing for examples)
For a fully independent object, the methods used in fetch_initial_data.js can be copied and edited (same way as "games")
For an object referenced by pre-existing data, it's query in the fields object must be defined to make sure it's included
It can then be processed in the same way as "platforms"
The entities are only hard-coded into this setup phase; after a successful setup, the rest of the code will
automatically be compatible with all entities.
*/

// process the initial data
async function initData(){
    const game_limit = 50; // number of games to request from external API (max 50)

    // get unprocessed initial games data from separate script
    let data_json_games = await fetchInitialData(game_limit);
    let data_json_platforms = [];

    // iterate through this games data
    for (let i = 0; i < data_json_games.length; i++){
        let platforms = data_json_games[i].platforms;
        if (typeof(platforms) !== "undefined") {
            // for each game, iterate through its platforms
            for (let j = 0; j < platforms.length; j++) {
                // for each platform, add to platforms data if not already added
                if (!data_json_platforms.some(elem => {
                    return JSON.stringify(platforms[j]) === JSON.stringify(elem);
                })) {
                    data_json_platforms.push(platforms[j]);
                }
            }
        }
    }

    // translations for ratings codes aren't included in the JSON data, so they must be looked up from here
    let ratings = {
        1: "3+",
        2: "7+",
        3: "12+",
        4: "16+",
        5: "18+",
        6: "Pending",
    };

    let entry;
    let fields_games = fields.games.data;

    // process games data
    for (let i = 0; i < data_json_games.length; i++){
        entry = data_json_games[i];

        // parse and replace components of each entry where necessary
        if (typeof(entry.cover) !== "undefined"){
            entry.cover = `https://images.igdb.com/igdb/image/upload/t_cover_big/${entry.cover.image_id}.jpg`;
        }
        if (typeof(entry.genres) !== "undefined"){
            entry.genres = getSingleComponent(entry.genres, "name");
        }
        if (typeof(entry.platforms) !== "undefined"){
            entry.platforms = getSingleComponent(entry.platforms, "name");
        }

        let pegiRating = findComponent(entry.age_ratings, "category", 2);
        if (typeof(pegiRating) !== "undefined"){
            entry.age_rating = ratings[pegiRating.rating];
        }

        for (let j = 0; j < fields_games.length; j++){
            if (fields_games[j].required && typeof(entry[fields_games[j].id]) === "undefined"){
                entry[fields_games[j].id] = "None Set";
            }
        }
        entry.user_submitted = false;
    }

    // process platforms data
    let fields_platforms = fields["platforms"].data;
    for (let i = 0; i < data_json_platforms.length; i++){
        entry = data_json_platforms[i];

        for (let j = 0; j < fields_platforms.length; j++){
            if (fields_platforms[j].required && typeof(entry[fields_platforms[j].id]) === "undefined"){
                entry[fields_platforms[j].id] = "None Set";
            }
        }

        entry.user_submitted = false;
    }

    let data_json = {
        games: data_json_games,
        platforms: data_json_platforms
    };
    return(data_json);
}


// Initialise the data list, once
// This will set data_list to be a Promise that contains the list of data
// This Promise will be resolved by the middleware app.use() when it is needed
let data_list = (async () =>{
    return(initData());
})();

// Ensure promise containing data_list is resolved for any request
app.use(async function (req, res, next) {
    data_list = await data_list;
    next();
});

//GET method to list/search
app.get("/search", async function (req, resp) {

    let key = req.query.key;
    let entity = req.query.entity;
    let entry, entryName;
    let resp_list = [];

    if (typeof(key) === "undefined") {
        key = "";
    }

    if (!supportedEntities.includes(req.query.entity)) {
        entity = defaultEntity;
    }

    let data_list_entity = await data_list[entity];

    // iterate through list and only add when search matches
    for (let i = 0; i < data_list_entity.length; i++) {
        entry = data_list_entity[i];
        entryName = entry.name;
        if (entryName.toLowerCase().includes(key.toLowerCase())) {

            if (entry.user_submitted === true) {
                entryName = "*" + entryName;
            }
            resp_list.push({
                id: i,
                name: entryName
            });
        }
    }

    // construct information string to return along with list
    let info_entity = entity.slice(0, entity.length-1); // turn plural into single (e.g. "games" -> "game")
    let info_search = "";
    let info_full = "";
    if (key !== ""){
        info_search = ` for search "${key}"`;
    }
    if (resp_list.length === 0) {
        info_full = `No ${info_entity} results found${info_search}.<br><br>`;
    } else {
        info_full += `<small> asterisks (*) indicate user-submitted content</small><br>`;
        info_full += `Showing all ${info_entity} results${info_search}<br>`;
        info_full += `<br>`
    }

    // provide response as JSON
    resp.set("api-entity-type", entity);
    resp.send({
        text: info_full,
        data: resp_list
    });

});


// GET method for individual details
app.get("/entry", async function (req, resp){
    let entity = req.query.entity;
    if (!supportedEntities.includes(req.query.entity)) {
        entity = defaultEntity;
    }
    resp.set("api-entity-type", entity);
    resp.send(data_list[entity][req.query.id]);
});

// GET information about fields for entities
app.get("/getFieldInfo", function(req ,resp){
    if (!supportedEntities.includes(req.query.entity)) {
        // if undefined/unsupported entity, assume client needs field names
        let entityNames = {};
        for (let field in fields) {
            // cannot test else case here without modifying prototype, so ignore branch
            /* istanbul ignore else */
            if (fields.hasOwnProperty(field)) {
                entityNames[field] = fields[field].name;
            }
        }
        resp.send(entityNames);
    } else if (typeof(req.query.components) === "undefined") {
        // otherwise, send them field data for their queried entity
        // if no components specified, send list as it is
        resp.send(fields[req.query.entity].data);
    } else {
        // otherwise, only send the components queried
        let components = req.query.components.split(",");
        if (!components.includes("id")) {
            components.unshift("id");
        }
        resp.send(getMultipleComponents(fields[req.query.entity].data, components));
    }
});

// send custom 404 error message for any invalid paths
app.get("/*", function(req, resp){
    resp.status(404);
    resp.statusMessage = "The requested resource does not exist.";
    resp.send();
});

// return validated form of field value, depending on the field type and entity type
function parseField(key, value, entity) {
    const multiFields = ["platforms", "genres"];
    const requiresValue = findComponent(fields[entity].data, "id", key).required;

    if (typeof(value) === "string") { value = escapeHtml(value); } // sanitize input
    
    if ((value === "" || typeof(value) === "undefined") && requiresValue) {
        value = "None Set"; // if field requires value but not user input, give it a value
        // if field requires user input but none given, nothing is returned as the parsed value is undefined
    } else if (multiFields.includes(key) && !Array.isArray(value)) {
        value = value.split(", ");
    }
    return value;
}

function escapeHtml(text) {
    // source: https://stackoverflow.com/a/4835406
    var map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


//POST method to add new
app.post("/add", checkJwt, async function(req, resp){

    const input = req.body;
    const entity = req.headers.entity;
    let entry = {};
    let invalidFields = [];

    let validRequest = true;
    if (!supportedEntities.includes(entity)) {
        resp.statusMessage = "Invalid Request: invalid entity type";
        validRequest = false;
    } else if (!Array.isArray(input)){
        resp.statusMessage = "Invalid Request: empty body";
        validRequest = false;
    } else {


        // determine each required field exists
        const requiredUserInputFields = ["name"]; //fields that cannot be empty; require user input
        for (let i = 0; i < requiredUserInputFields.length; i++) {
            const foundComponent = findComponent(input, "id", requiredUserInputFields[i]);
            if (typeof (foundComponent) === "undefined" || foundComponent.value === "") {
                validRequest = false;
                invalidFields.push(requiredUserInputFields[i]);
                resp.statusMessage = "Invalid Request: Missing value(s) for field(s): " + invalidFields;
            }
        }
    }
    if (validRequest) {
        // parse each field and add to object, collecting information about invalid fields as necessary
        for (let i = 0; i < input.length; i++) {
            entry[input[i].id] = parseField(input[i].id, input[i].value, entity);
        }
    }

    if (validRequest) {
        // set user-submitted flag, add the new entry to the start of the data list and send it back to the user
        entry.user_submitted = true;
        data_list[entity].unshift(entry);
        resp.set("api-entity-type", entity);
        resp.status(201);
        resp.send(entry);
    } else {
        resp.status(400);
        resp.send();
    }
});

module.exports = { app };