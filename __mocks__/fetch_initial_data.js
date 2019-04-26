

module.exports = async function (){
    try {
        data_json = require("./games._data.json");
        return(data_json)
    } catch(e) {
        console.log("\nError loading mock dataset: " + e.message);
    }

};
