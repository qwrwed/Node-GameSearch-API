
//JSON web tokens, used for authentication
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");

//auth0 authentication
const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://dev-mvcjlscb.eu.auth0.com/.well-known/jwks.json"
    }),
    audience: "http://127.0.0.1:8090",
    issuer: "https://dev-mvcjlscb.eu.auth0.com/",
    algorithms: [ "RS256" ],
});

module.exports = { checkJwt };