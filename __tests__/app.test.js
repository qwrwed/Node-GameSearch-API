
"use strict";

const request = require("supertest");
const appJS = require("../app");
const app = appJS.app;
jest.mock("../fetch_initial_data");
jest.mock("../checkJwt");

const { fields } = require("../utilities");


function checkGameEntryDetails(res){
    return checkEntryDetails(res, "games");
}


function checkPlatformEntryDetails(res){
    return checkEntryDetails(res, "platforms");
}

function checkEntryDetails(res, entity){
    const jContent = res.body;
    if (typeof jContent !== "object"){
        throw new Error("Entry response is not an object.");
    }
    for (let i = 0; i < fields[entity].length; i++) {
        if (fields[entity][i].required) {
            if (typeof(jContent[fields[entity][i].id]) === "undefined"){
                throw new Error(`Entry response does not contain essential field "${fields[entity][i].id}."`);
            }
        }
    }
}

describe("Test GET and POST to nonexistent endpoints", () => {
    test("invalid GET returns 404 error and empty body", () => {
        return request(app)
            .get("/nonexistent_test_path")
            .expect(404)
            .expect({});
    });

    test("invalid POST returns 404 error and empty body", () => {
        return request(app)
            .post("/nonexistent_test_path")
            .expect(404)
            .expect({});
    });
});


describe("Test unauthorised POST", () => {
    test("unauthenticated POST /add attempt is rejected with code 401", () => {
        const body = JSON.stringify([
            {"id":"name","label":"Name","value":"Sample Game"},
            {"id":"platforms","label":"Platforms","value":["PC (Microsoft Windows)","PlayStation 4"]},
            {"id":"genres","label":"Genres","value":"Sample Genre 1, Sample Genre 2"},
            {"id":"age_rating","label":"PEGI Age Rating","value":"18+"},
            {"id":"cover","label":"Image URL","value":"http://www.bfegy.com/cdn/7/2010/151/ps4-game-cover-template_147726.jpg"},
            {"id":"summary","label":"Summary","value":"Sample Summary"},
            {"id":"storyline","label":"Plot","value":"Sample Plot"}
        ]);
        return request(app)
            .post("/add")
            .set("entity", "games")
            .set("Content-Type", "application/json",)
            .set("Authorization", false)
            .send(body)
            .expect(401);
    });
});


//entity 1: games
describe("Test \"games\" entity requests", () => {
    //entity has GET method to list/search
    //response provided as JSON
    test("GET /search successfully (code 200) returns JSON", () => {
        //fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))
        return request(app)
            .get("/search?entity=games")
            .expect(200)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "games");
    });

    test("GET first /entry includes all required details", () => {
        return request(app)
            .get("/entry?entity=games&id=0")
            .expect(200)
            .expect(checkGameEntryDetails)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "games");

    });

    test("authenticated POST /add attempt is accepted with code 201, returns JSON", () => {
        const body = JSON.stringify([
            {"id":"name","label":"Name","value":"Sample Game"},
            {"id":"platforms","label":"Platforms","value":["PC (Microsoft Windows)","PlayStation 4"]},
            {"id":"genres","label":"Genres","value":"Sample Genre 1, Sample Genre 2"},
            {"id":"age_rating","label":"PEGI Age Rating","value":"18+"},
            {"id":"cover","label":"Image URL","value":"http://www.bfegy.com/cdn/7/2010/151/ps4-game-cover-template_147726.jpg"},
            {"id":"summary","label":"Summary","value":"Sample Summary"},
            {"id":"storyline","label":"Plot","value":"Sample Plot"}
        ]);
        return request(app)
            .post("/add")
            .set("entity", "games")
            .set("Content-Type", "application/json",)
            .set("Authorization", true)
            .send(body)
            .expect(201)
            .expect("Content-type", /json/);
    });
});

//entity 2: platforms
describe("Test \"platforms\" entity requests", () => {
    //entity has GET method to list/search
    //response provided as JSON
    test("GET /search successfully returns JSON", () => {
        //fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))
        return request(app)
            .get("/search?entity=platforms")
            .expect(200)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "platforms");
    });

    test("GET /search with query successfully returns JSON", () => {
        //fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))
        return request(app)
            .get("/search?entity=platforms&key=\"t\"")
            .expect(200)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "platforms");
    });

    test("GET first /entry includes all required details", () => {
        return request(app)
            .get("/entry?entity=platforms&id=0")
            .expect(200)
            .expect(checkPlatformEntryDetails)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "platforms");
    });

    test("authenticated full POST /add attempt is accepted with code 201, returns JSON", () => {
        const body = JSON.stringify([
            {"id": "name", "label": "Name", "value": "Sample Platform"},
            {"id": "abbreviation", "label": "Abbreviation", "value": "SP"},
            {"id": "alternative_name", "label": "Alternative Name", "value": "SamPlat"},
            {"id": "summary", "label": "Description", "value": "Sample Summary"},
        ]);
        return request(app)
            .post("/add")
            .set("entity", "platforms")
            .set("Content-Type", "application/json",)
            .set("Authorization", true)
            .send(body)
            .expect(201)
            .expect("Content-type", /json/);
    });

});

// empty entity
describe("Test undefined entity requests", () => {
    test("GET /search successfully returns JSON of default entity (games)", () => {
        return request(app)
            .get("/search")
            .expect(200)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "games");
    });

    test("GET first /entry includes all required details of default entity (games)", () => {
        return request(app)
            .get("/entry?id=0")
            .expect(200)
            .expect(checkPlatformEntryDetails)
            .expect("Content-type", /json/)
            .expect("api-entity-type", "games");
    });

    test("authenticated POST /add attempt is rejected with code 400", () => {
        const body = JSON.stringify([
            {"id":"name","label":"Name","value":"Sample Platform"},
            {"id":"abbreviation", "label": "Abbreviation", "value": "SP"},
            {"id":"alternative_name","label":"Alternative Name", "value": "SamPlat"},
            {"id":"summary","label":"Description","value":"Sample Summary"},
        ]);
        return request(app)
            .post("/add")
            .set("Content-Type", "application/json")
            .set("Authorization", true)
            .send(body)
            .expect(400);
    });
});

// test getFieldInfo
describe("Test getFieldInfo request", () => {
    test("GET /getFieldInfo without query successfully returns JSON", () => {
        return request(app)
            .get("/getFieldInfo")
            .expect(200)
            .expect("Content-type", /json/);
    });

    test("GET /getFieldInfo with only entity query (no components) successfully returns JSON", () => {
        return request(app)
            .get("/getFieldInfo?entity=games")
            .expect(200)
            .expect("Content-type", /json/);
    });

    test("GET /getFieldInfo with entity and components query successfully returns JSON", () => {
        return request(app)
            .get("/getFieldInfo?entity=games&components=name")
            .expect(200)
            .expect("Content-type", /json/);
    });
});

describe("Coverage tests", () => {

    test("GET /getFieldInfo with entity and components (including id) successfully returns JSON", () => {
        return request(app)
            .get("/getFieldInfo?entity=games&components=name,id")
            .expect(200)
            .expect("Content-type", /json/);
    });

    test("authenticated POST /add with empty data returns 400", () => {
        return request(app)
            .post("/add")
            .set("entity", "platforms")
            .set("Content-Type", "application/json",)
            .set("Authorization", true)
            .expect(400);
    });
    test("authenticated POST /add with missing essential values returns 400", () => {
        const body = JSON.stringify([
            {"id":"name","label":"Name","value":""},
        ]);
        return request(app)
            .post("/add")
            .set("entity", "games")
            .set("Content-Type", "application/json",)
            .set("Authorization", true)
            .send(body)
            .expect(400);

    });

    test("authenticated POST /add with missing non-essential values returns 201", () => {
        const body = JSON.stringify([
            {"id":"name","label":"Name","value":"Sample Game"},
            {"id":"platforms","label":"Platforms","value":[]},
            {"id":"genres","label":"Genres","value":""},
            {"id":"age_rating","label":"PEGI Age Rating","value":""},
            {"id":"cover","label":"Image URL","value":""},
            {"id":"summary","label":"Summary","value":"Sample Description <br> for testing HTML sanitization"},
            {"id":"storyline","label":"Plot","value":""}
        ]);
        return request(app)
            .post("/add")
            .set("entity", "games")
            .set("Content-Type", "application/json",)
            .set("Authorization", true)
            .send(body)
            .expect(201)
            .expect("Content-type", /json/);

    });

    test("GET nonexistent /entry returns 404 ", () => {
        return request(app)
            .get("/entry?id=NaN")
            .expect(404);
    });

});