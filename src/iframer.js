const {
    serve
  } = require("./server");
  const {
    browser
  } = require("./browser");
  
  const facebook = async (url) => {
  
    let server = await serve();
  
    let port = server.address().port;
  
    let path = "http://localhost:" + port + "/fb/" + encodeURIComponent(url);
  
    let iFrameElement = await browser(path);
  
    server.close();
  
    return iFrameElement;
  };
  
  module.exports = {
    facebook: facebook
  };