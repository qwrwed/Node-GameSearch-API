const fetchInitialData = require("./fetch_initial_data");
const fs = require("fs");

// run this file to manually make a backup.json file
const fileName = "igdb_backup.json";


const game_limit = 50; // number of games to request from external API (max 50)


function saveJSONData(fileName, data_json) {
    //write JSON data to file
    //only used rarely to make backups; it is not used in the course of a normal program run
    fs.writeFile("./" + fileName, JSON.stringify(data_json, null, 4), (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(`File ${fileName} has been created`);
    });
}

(async function(){
    let data_json_games = await fetchInitialData(game_limit, false);
    saveJSONData(fileName, data_json_games);
})();


