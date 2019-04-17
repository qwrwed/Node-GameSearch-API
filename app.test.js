
'use strict';

const request = require('supertest');
const app = require('./app');


describe('Test GET /search', () => {

    test('GET /search succeeds', () => {
        return request(app)
            .get('/search')
            .expect(200);
    });

    test('GET /search returns JSON', () => {
        return request(app)
            .get('/search')
            .expect('Content-type', /json/);
    });


});
