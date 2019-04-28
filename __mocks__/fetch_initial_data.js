

module.exports = async function (){
    try {
        return(require("./games_data.json"));
    } catch(e) {
        console.log("\nError loading mock dataset: " + e.message);
    }

};
