const assert = require("assert");

const iframer = require("../");

describe("facebook", function() {
    describe('iframe', function () {
      it('create test', async() => {
        
        let iframe = await iframer.facebook("https://www.facebook.com/techcrunch/posts/10156898174202952");
        assert.notEqual(iframe.match(/^<iframe[^≥]*>[^<]*<\/iframe>/i), null);
      });
    });
});