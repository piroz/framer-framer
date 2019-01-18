let server;

function serve() {

    return new Promise((resolve, reject) => {
        
        if (server != null) {
            return resolve(server);
        }

        try {
            const express = require("express");
            const app = express();
            const listenPort = 8080;

            app.set('views', __dirname + '/views');
            app.set('view engine', 'ejs');

            app.get("/fb/:url/:locale?/:version?", function (req, res) {

                let url = req.params.url;

                let locale = req.params.locale || "en_US";

                let version = req.params.version || "v3.0";

                res.render("facebook", {
                    url: url,
                    locale: locale,
                    version: version
                });
            });

            app.get("/instagram/:url/:version?", function (req, res) {

                let url = req.params.url;

                let version = req.params.version || 8;

                res.render("instagram", {
                    url: url,
                    version: version
                });
            });

            server = app.listen(listenPort, () => {
                return resolve(server);
            });
        } catch (e) {
            return reject(e);
        }
    });
};

module.exports = {
    serve: serve
};