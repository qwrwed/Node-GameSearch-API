const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('client'));

const fetch = require("node-fetch");

const sample = require('./sample_data.json');

let data_list;

async function initData(){
    let data_raw;

    let response = await fetch('http://www.recipepuppy.com/api/?i=potato');

    if (response.ok) {
        data_raw = await response.text();
    } else {
        throw new Error('404 Remote Page Not Found')
    }

    const data_parsed = JSON.parse(data_raw);
    const data = data_parsed.results;

    return(data)
}

function stringifyEntry(entry){
    s = "";
    s += `Title: ${entry.title} <br>`;
    s += `Ingredients: ${entry.ingredients} <br>`;
    s += `Link: <a href ='${entry.href}'>${entry.href}</a><br>`;
    s += `<img src='${entry.thumbnail}'><br>`;
    return(s)

}

//data_list = sample;
initData().then(data => data_list = data);

app.get('/search', async function (req, resp){

    const key = req.query.key;

    let entry;
    let resp_list = [];
    for (i = 0; i < data_list.length; i++){
        entry = data_list[i];
        if (entry.title.toLowerCase().includes(key)) {
            resp_list.push(entry)
        }
    }
    resp.send(resp_list);

});

app.post('/add', async function(req, resp){

    data_list.push(req.body);

    let s = `Entry received:<br><br>`;
    s += stringifyEntry(req.body);
    resp.send(s);

});

module.exports = app;