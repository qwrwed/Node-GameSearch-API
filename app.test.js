
'use strict';

const request = require('supertest');
const app = require('./app');


describe('GET /search', () => {

    test('GET /search succeeds', (done) => {
        request(app).get('/search').then((response) => {
            expect(response.statusCode).toBe(200);
            done();
        });
    });


});
