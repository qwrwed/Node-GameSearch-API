

module.exports = async function (limit){
    try {
        const input = require("./games_data.json");
        let output = [];
        if (typeof(limit) === "undefined" || limit === 0){
            output = input;
        } else {
            for (let i = 0; i < limit; i++){
                output.push(input[i]);
            }
        }
        return(output);
    } catch(e) {
        console.log("\nError loading mock dataset: " + e.message);
    }

};
