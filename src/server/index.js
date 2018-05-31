function serve() {
    return new Promise((resolve, reject) => {
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

            let server = app.listen(listenPort, () => {
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