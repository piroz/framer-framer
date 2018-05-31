const assert = require("assert");

const iframer = require("../");

describe("instagram", function() {
    describe('iframe', function () {
      it('create test', async() => {
        
        let iframe = await iframer.instagram("https://www.instagram.com/p/BjK7ElIDdWg/");
        assert.notEqual(iframe.match(/^<iframe[^≥]*>[^<]*<\/iframe>/i), null);
      });
    });
});