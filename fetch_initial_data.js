const fetch = require("node-fetch");
const { getSingleComponent, fields} = require("./utilities");

//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i=potato'
//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i='
const primaryDataLocation = "https://api-v3.igdb.com/games";
//const primaryDataLocation = "https://notareallocation_qnhgbgfdfvdvbhgfgbdf";
const api_key = "***REMOVED***";
const secondaryDataLocation = "./igdb_backup.json";

module.exports = async function (entity){
    const fieldsString = getSingleComponent(fields[entity], "query").join(", ");
    const game_limit = 50;
    let request_body = `fields ${fieldsString}; where platforms = (48, 49); sort popularity desc; limit ${game_limit};`;
    let data_json_games;

    //  let request_body = `fields *; sort popularity desc; limit ${limit};`;
    try {

        let response = await fetch(primaryDataLocation, {
        //let response = await fetch("https://api-v3.igdb.com/platforms", {
            headers: {
                "user-key": api_key,
                Accept: "application/json"
            },
            method:"POST",
            body: request_body
        });

        if (response.ok) {
            data_json_games = await response.json();
        } else {
            throw new Error("404 Remote Page Not Found");
        }

    } catch(e) {
        console.log("\nError: " + e.message);
        try {
            data_json_games = require(secondaryDataLocation);
            console.log("\nUsing backup dataset instead.");
        } catch(e) {
            console.log("\nAdditional error loading backup dataset: " + e.message);
            console.log("Server program will now exit.\n");
            process.exit(1);
        }

    }


    // uncomment to update backup (do not run in nodemon mode)
    //require("./utilities").saveJSONData("igdb_backupdhfjbdrhjbfhrdj.json", data_json_games);

    return(data_json_games);
};
