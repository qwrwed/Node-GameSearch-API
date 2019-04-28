
"use strict";

const request = require("supertest");
const app = require("./app");

jest.mock("./fetch_initial_data");

const { fields } = require("./utilities");

function checkEntryDetails(res){
    const jContent = res.body;
    if (typeof jContent !== "object"){
        throw new Error("Entry response is not an object.");
    }
    for (let i = 0; i < fields.length; i++) {
        if (fields[i].required) {
            if (typeof(jContent[fields[i].id]) === "undefined"){
                throw new Error(`Entry response does not contain essential field "${fields[i].id}."`);
            }
        }
    }
}


describe("Test invalid GET", () => {
    test("invalid GET returns 404 error and empty body", () => {
        return request(app)
            .get("/nonexistent_test_path")
            .expect(404)
            .expect({});
    });
});


//test entity 1: games
describe("Test GET /games/search", () => {
    //entity has GET method to list/search
    //response provided as JSON
    test("GET /games/search successfully returns JSON", () => {
        //fetch.mockResponseOnce(JSON.stringify({ data: '12345' }))
        return request(app)
            .get("/games/search")
            .expect(200)
            .expect("Content-type", /json/);
    });
});

describe("Test GET /games/entry", () => {
    test("GET first entry includes all necessary details", () => {
        return request(app)
            .get("/games/entry?id=0")
            .expect(checkEntryDetails);
    });
});

//test POST
//test entity 2: platforms

