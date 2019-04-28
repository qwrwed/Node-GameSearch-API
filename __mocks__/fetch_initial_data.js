

module.exports = async function (){
    try {
        return(require("./games._data.json"));
    } catch(e) {
        console.log("\nError loading mock dataset: " + e.message);
    }

};
