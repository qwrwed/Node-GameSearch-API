const fs = require("fs");

module.exports = {

    getSingleComponent: function (objectArray, component) {
        //get array containing, for all elements in object array, only the specified component's value
        let result = [];
        for (let i = 0; i < objectArray.length; i++) {
            result.push(objectArray[i][component]);
        }
        return(result);
    },

    getMultipleComponents: function (objectArray, componentList) {
        //get array containing, for all elements in object array, an object containing the specified components (keys and values)
        let result = [];
        for (let i = 0; i < objectArray.length; i++) {
            let element = {};
            for (let j = 0; j < componentList.length; j++) {
                element[componentList[j]] = objectArray[i][componentList[j]];
            }
            result.push(element);
        }
        return(result);
    },

    findComponent: function (objectArray, key, value) {
        // return first element in objectArray where key-value pair matches the one provided
        if (typeof(objectArray) !== "undefined") {
            return (objectArray.find(x => x[key] === value));
        }
    },

    saveJSONData:function (fileName, data_json) {
        //write JSON data to file
        fs.writeFile("./" + fileName, JSON.stringify(data_json, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log(`File ${fileName} has been created`);
        });
    },

    fields: {
        games: [
            /*
            The order of fields in this array is the order in which they will be shown (in forms, content etc).
            Fields can be added or removed here to automatically modify all instances of all fields client- and server-side.
            - id: Field name as it is known in this program. Used in JSON attibutes and HTML element id.
            - query: Field name as it is known to the API (attibutes are sent when the API would otherwise return a number).
            - label: Field name as it should be shown to the user (e.g. with capitalisation).
            - html: HTML content associated with the field to inject into the page.
            */
            {id: "name", query: "name", label: "Name", html: "<h1>$</h1>", required: true},
            {id: "platforms", query: "platforms.*", label: "Platforms", html: "Platforms: $<br>", required: true, isEntity: true},
            {id: "genres", query: "genres.*", label: "Genres", html: "Genres: $<br>", required: true},
            {id: "age_rating", query: "age_ratings.*", label: "PEGI Age Rating", html: "PEGI Age Rating: $<br>", required: true},
            {id: "cover", query: "cover.*", label: "Image URL", html: "<img src=$><br>", required: false},
            {id: "summary", query: "summary", label: "Summary", html: "Summary: $<br>", required: false},
            {id: "storyline", query: "storyline", label: "Plot", html: "Plot: $<br>", required: false}
        ],
        platforms: [
            {id: "name", query: "name", label: "Name", html: "<h1>$</h1>", required: true},
            {id: "abbreviation", query: "abbreviation", label: "Abbreviation", html: "Abbreviation: $<br>", required: false},
            {id: "alternative_name", query: "alternative_name", label: "Alternative Name", html: "Alternative Name: $<br>", required: false},
            {id: "summary", query: "summary", label: "Summary", html: "<br>Description: $<br>", required: true},
        ]
    }
};

