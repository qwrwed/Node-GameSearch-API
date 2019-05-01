
//bypass authorisation for mocking purposes, but only if header says to

let checkJwt = function(req, res, next){
    if (req.headers.authorization === "true") {
        next();
    } else {
        res.status(401).send();
        return next("Unauthorised user");
    }
};

module.exports = { checkJwt };