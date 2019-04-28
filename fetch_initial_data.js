const fetch = require("node-fetch");

const utilities = require("./utilities");
const { getSingleComponent, fields } = utilities;

//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i=potato'
//const primaryDataLocation = 'http://www.recipepuppy.com/api/?i='
const primaryDataLocation = "https://api-v3.igdb.com/games";
//const primaryDataLocation = "https://notareallocation_qnhgbgfdfvdvbhgfgbdf";
const api_key = "***REMOVED***";
const secondaryDataLocation = "./igdb_backup.json";

module.exports = async function (){
    const fieldsString = getSingleComponent(fields, "query").join(", ");
    const limit = 50;
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
            throw new Error("404 Remote Page Not Found");
        }
    } catch(e) {
        console.log("\nError: " + e.message);
        try {
            data_json = require(secondaryDataLocation);
            console.log("\nUsing backup dataset instead.");
        } catch(e) {
            console.log("\nAdditional error loading backup dataset: " + e.message);
            console.log("Server program will now exit.\n");
            process.exit(1);
        }

    }
    return(data_json);
};
