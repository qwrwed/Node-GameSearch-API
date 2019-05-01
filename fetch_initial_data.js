const fetch = require("node-fetch");
const { fields, getSingleComponent } = require("./utilities");

const primaryDataLocation = "https://api-v3.igdb.com/games";
const API_KEY = process.env.API_KEY; // not distributable
const secondaryDataLocation = "./igdb_backup.json";

// export the function itself
module.exports = async function (game_limit, useBackup){

    // get the query from the fields information object and use it to query external API for data (https://api-docs.igdb.com/)
    const fieldsString = getSingleComponent(fields.games.data, "query").join(", ");API_KEY;
    let request_body = `fields ${fieldsString}; where platforms = (48, 49); sort popularity desc; limit ${game_limit};`;
    let data_json_games;

    try {
        let response = await fetch(primaryDataLocation, {
            headers: {
                "user-key": API_KEY,
                Accept: "application/json"
            },
            method:"POST",
            body: request_body
        });

        if (response.ok) {
            data_json_games = await response.json();
        } else {
            throw new Error("404 Remote Resource Not Found");
        }

    } catch(e) {
        // if anything goes wrong, use the locally-saved backup of the same format
        console.log("\nError: " + e.message);
        if (useBackup !== false){
            try {
                data_json_games = require(secondaryDataLocation);
                console.log("\nUsing backup dataset instead.");
            } catch(e) {
                console.log("\nAdditional error loading backup dataset: " + e.message);
                console.log("Program will now exit.\n");
                process.exit(1);
            }
        } else {
            console.log("Could not access dataset.");
            console.log("Program will now exit.\n");
            process.exit(1);
        }
    }


    // the following line can be uncommented to update the backup (do not run this in nodemon mode)
    //require("./utilities").saveJSONData("igdb_backup.json", data_json_games);

    return(data_json_games);
};
