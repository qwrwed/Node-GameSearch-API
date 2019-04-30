
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

//JSON web tokens, used for authentication
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("client"));

//auth0 authentication
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://dev-mvcjlscb.eu.auth0.com/.well-known/jwks.json"
    }),
    audience: "http://127.0.0.1:8090",
    issuer: "https://dev-mvcjlscb.eu.auth0.com/",
    algorithms: [ "RS256" ],
});

// get utility functions from separate file
const { getSingleComponent, getMultipleComponents, findComponent, fields } = require("./utilities");



// process the initial data
async function initData(){

    // get unprocessed initial data from separate file
    let data_json_games = await require("./fetch_initial_data")("games");
    let data_json_platforms = [];
    for (let i = 0; i < data_json_games.length; i++){
        let platforms = data_json_games[i].platforms;
        for (let j = 0; j < platforms.length; j++){
            if (!data_json_platforms.some( elem => {
                return JSON.stringify(platforms[j]) === JSON.stringify(elem);
            })){
                data_json_platforms.push(platforms[j]);
            }
        }
    }

    let entry;
    let ratings = {
        1: "3+",
        2: "7+",
        3: "12+",
        4: "16+",
        5: "18+",
        6: "Pending",
    };
    let fields_games = fields["games"];
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
    let fields_platforms = fields["platforms"];
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
    return(await initData());
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
    let info_full;
    let info_search = "";
    let entry, entryName;
    let resp_list = [];

    if (typeof(key) === "undefined") {
        key = "";
    }

    if (typeof(entity) === "undefined") {
        entity = "games";
    }

    let data_list_entity = await data_list[entity];

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

    let info_entity = entity.slice(0, entity.length-1)// turn plural into single

    if (key !== ""){
        info_search = ` for search "${key}"`;
    }

    if (resp_list.length === 0) {
        info_full = `No ${info_entity} results found${info_search}.<br><br>`;
    } else {
        info_full = `Showing all ${info_entity} results${info_search}:<br><br>`;
    }

    //Response provided as JSON
    resp.send({
        text: info_full,
        data: resp_list
    });

});

//GET method for individual details
app.get("/entry", async function (req, resp){
    //Response provided as JSON
    resp.send(data_list[req.query.entity][req.query.id]);
});


app.get("/getFieldInfo", function(req ,resp){
    if (typeof(req.query.components) === "undefined") {
        resp.send(fields[req.query.entity]);
    } else {
        let components = req.query.components.split(",");
        if (!components.includes("id")) {
            components.unshift("id");
        }
        resp.send(getMultipleComponents(fields[req.query.entity], components));
    }
});


app.get("/*", function(req, resp){
    resp.status(404);
    resp.statusMessage = "The requested resource does not exist.";
    resp.send();
});


function parseField(key, value, entity) {
    const requiredUserInputFields = ["name"]; //fields that cannot be empty; require user input
    const multiFields = ["platforms", "genres"];

    const requiresValue = findComponent(fields[entity], "id", key).required;

    if ((value === "" || typeof(value) === "undefined") && requiresValue) {
        if (!requiredUserInputFields.includes(key)) {
            return  "None Set"; // if field requires value but not user input, give it a value
        }
        // if field requires user input but none given, nothing is returned as the parsed value is undefined
    } else if (multiFields.includes(key) && !Array.isArray(value)) {
        return value.split(", ");
    } else {
        return value;
    }

}

//POST method to add new
app.post("/add", checkJwt, async function(req, resp){
    const input = req.body;
    const entity = req.headers.entity;


    console.log(input);
    let validRequest = true;
    let invalidFields = [];
    let entry = {};
    let parsedField;

    for (let i = 0; i < input.length; i++) {
        parsedField = parseField(input[i].id, input[i].value, entity);
        if (typeof(parsedField) === "undefined") {
            validRequest = false;
            invalidFields.push(input[i].label);
        } else {
            entry[input[i].id] = parsedField;
        }
    }

    if (validRequest) {
        entry.user_submitted = true;
        data_list[entity].unshift(entry);
        //Response provided as JSON
        resp.send(entry);
    } else {
        resp.status(400);
        resp.statusMessage = "Invalid Request: Invalid value(s) for field(s): " + invalidFields;
        resp.send();
    }

});

module.exports = app;