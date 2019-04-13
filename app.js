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
const api_key = "***REMOVED***";
const secondaryDataLocation = "./sample_data.json";

let data_list;

async function initData(){

    try {

        let response = await fetch(primaryDataLocation, {
            headers: {
                "user-key": api_key,
                Accept: "application/json"
            },
            method:"POST",
            //body:`fields name; search "halo";`
            //body:`fields name; search "*";`
            //body: `fields *; where platforms = 48; sort popularity desc; limit 50;`
            body: `fields id, name, summary, storyline, platforms.name, genres.name, cover.image_id; where platforms = (48, 49); sort popularity desc; limit 10;`
            //body: `fields name; where platforms = (48, 49); sort popularity desc; limit 50;`

        });

        let data_json;
        if (response.ok) {
            data_json = await response.json();
        } else {
            throw new Error('404 Remote Page Not Found')
        }

        return (data_json)
    } catch(e) {
        console.log("Error: " + e.message);
        console.log("Using backup dataset instead.");
        return(require(secondaryDataLocation));
    }
}


//initialise the data
initData().then(data => data_list = data);


//GET method to list/search
app.get('/search', async function (req, resp){

    const key = req.query.key;
    let entry;
    let resp_list = [];

    for (i = 0; i < data_list.length; i++){
        entry = data_list[i];
        //console.log(entry)
        if (entry.name.toLowerCase().includes(key)) {
            resp_list.push({name : entry.name})
        }
    }

    //Response provided as JSON
    resp.send(resp_list);

});

//GET method for individual details
app.get('/entry', async function (req, resp){
    //Response provided as JSON
    resp.send(data_list[req.query.id]);
});

function validateField(key, value) {
    //key passed in to allow specific checks for specific fields
    let valid = true;
    if (value === "" || typeof(value) === "undefined") {
        valid = false;
    }
    return(valid)
}

app.get('/test', (req, res) => {
    //console.log(res)
    /*
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, Content-Type, Accept"
    )*/
    fetch("https://api-v3.igdb.com/games", {
        headers: {
            "user-key": api_key,
            Accept: "application/json"
        },
        method:"POST",
        //body:`fields name; search "halo";`
        //body:`fields name; search "*";`
        //body: `fields *; where platforms = 48; sort popularity desc; limit 50;`
        body: `fields id, name, summary, storyline, platforms.name, genres.name; where platforms = (48, 49); sort popularity desc; limit 50;`
        //body: `fields name; where platforms = (48, 49); sort popularity desc; limit 50;`

    })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            //console.log(response.length)
            res.send(response);
        })
        .catch((err)=>{
            console.log(err);
        })
});

//POST method to add new
//TODO: Add authentication
app.post('/add', async function(req, resp){
    const body = req.body;
    let validRequest = true;
    let invalidFields = [];
    let entry = {};
    for (let field in body) {
        if (!validateField(field, body[field].value)) {
            validRequest = false;
            invalidFields.push(body[field].label);
        } else {
            entry[field] = body[field].value;
        }
    }

    if (validRequest) {
        data_list.push(entry);
        //Response provided as JSON
        resp.send(entry);
    } else {
        resp.status(400);
        resp.statusMessage = `Invalid Request: Invalid value(s) for field(s): ${invalidFields}`;
        resp.send();
    }

});

module.exports = app;