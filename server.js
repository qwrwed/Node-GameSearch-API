const { app } = require("./app");
const port = 8090; // allow configuration
console.log(`\nServer running at port ${port}`);
app.listen(port);