
"use strict";

const request = require("supertest");
const app = require("../app");

jest.mock("../fetch_initial_data");

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


//entity 1: games
describe("Test \"games\" entity requests", () => {
    //entity has GET method to list/search
    //response provided as JSON
    test("GET /search successfully returns JSON", () => {
        //fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))
        return request(app)
            .get("/search?entity=games")
            .expect(200)
            .expect("Content-type", /json/);
    });

    test("GET first /entry includes all required details", () => {
        return request(app)
            .get("/entry?entity=games&id=0")
            .expect(checkGameEntryDetails);
    });

    test("Unauthenticated POST /add attempt is rejected with error 401", () => {
        return request(app)
            .post("/add", {
                method: "POST",
                headers:{
                    "Content-Type": "application/json",
                    entity: "games"
                },
                body: JSON.stringify({})
            })
            .expect(401);
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
            .expect("Content-type", /json/);
    });

    test("GET first /entry includes all required details", () => {
        return request(app)
            .get("/entry?entity=platforms&id=0")
            .expect(checkPlatformEntryDetails);
    });

    test("Unauthenticated POST /add attempt is rejected with error 401", () => {
        return request(app)
            .post("/add", {
                method: "POST",
                headers:{
                    "Content-Type": "application/json",
                    entity: "platforms"
                },
                body: JSON.stringify({})
            })
            .expect(401);
    });
});
