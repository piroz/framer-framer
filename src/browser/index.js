const browser = async (url) => {

    const puppeteer = require("puppeteer");

    try {
        const browser = await puppeteer.launch({
            headless: true
        });

        const page = await browser.newPage();

        await page.goto(url);
        await page.waitForSelector("iframe");

        const iframe = await page.evaluate(() => {
            return document.querySelector("iframe").outerHTML;
        });

        await browser.close();

        return iframe;
    } catch (e) {
        throw e;
    }
}

module.exports = {
    browser: browser
};