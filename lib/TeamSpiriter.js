const fs = require('fs');
const puppeteer = require('puppeteer');
const dateFns = require('date-fns');

class TeamSpiriter {
  static async create(options) {
    options = Object.assign({}, options || {});
    const dedicatedPartialUrl = options.dedicatedNumber ? '-' + options.dedicatedNumber : '';
    const baseUrl =`https://teamspirit${dedicatedPartialUrl}.cloudforce.com`;
    const cookiesFilePath = options.cookiesFilePath || './teamspirit.cookie';
    const headlessPuppeteer = (options.headlessPuppeteer === false) ? false : true;
    const browser = await puppeteer.launch({ headless: headlessPuppeteer });
    const page = await browser.newPage();
    const previousSession = fs.existsSync(cookiesFilePath);
    // TODO: Make this steps to the other function
    if (previousSession) {
      const cookieJson = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      await page.setCookie(...cookieJson);
      console.log('Session has been loaded in the browser');
    } else {
      await page.goto(baseUrl, { waitUntil: 'networkidle2' });
      await page.type('#username', options.username);
      await page.type('#password', options.password);
      await page.click('#Login');

      // Save session cookies
      // const cookiesObject = await page.cookies(baseUrl);
      const cookiesObject = await this.modifyCookies(await page.cookies(baseUrl));
      const cookiesStr = await JSON.stringify(cookiesObject)
      fs.writeFile(cookiesFilePath, cookiesStr, function (err, data) {
        if (err) console.log(err);
        console.log("Successfully Written to File.");
      });
    }
    await page.screenshot({ path: 'example.png' });
    return new TeamSpiriter(browser, page, { baseUrl: baseUrl });
  }

  static async modifyCookies(cookies) {
    // NOTE: The 'session' field in cookie should be set to false
    let modifiedCookies = cookies.slice();
    for (let i = 0; i < modifiedCookies.length; i++) {
      modifiedCookies[i].session = false;
    }
    return modifiedCookies;
  }

  constructor(browser, page, options) {
    this.browser = browser;
    this.page = page;
    this.baseUrl = options.baseUrl;
  }

  async recordWorkTime(startTime, endTime, overwriteStartTime, overwriteEndTime) {
    const startTimeStr = dateFns.format(startTime, 'HH:mm');
    const endTimeStr = dateFns.format(endTime, 'HH:mm');
    // const dateStr = dateFns.format(endTime, 'YYYY-MM-DD');
    // TODO: 2018-07-02 is dummy date
    const dateStr = '2018-07-02';
    const tabSelector = 'li.wt-勤務表';
    const dateSelector = "td#ttvTimeSt" + dateStr;
    const dialogSelector = 'div#dialogInputTime';
    await this.page.goto(this.baseUrl + '/home/home.jsp', { waitUntil: 'networkidle2' });
    await this.page.waitFor(tabSelector);
    await this.page.click(tabSelector);
    await this.page.waitFor(dateSelector);
    await this.page.click(dateSelector);
    await this.page.waitFor(dialogSelector)

    const startTimeSelector = '#startTime';
    await this.setTimeToPage(startTimeSelector, startTimeStr, overwriteStartTime);
    const endTimeSelector = '#endTime';
    await this.setTimeToPage(endTimeSelector, endTimeStr, overwriteEndTime);
    // TODO: Set #startRest1 and #endRest1

    // TODO: Just screenshot for now
    // await page.click('#dlgInpTimeOk');
    // await page.waitFor('div#dialogInputTime')
    await this.page.screenshot({ path: 'record_work_time.png' });
  }

  async setTimeToPage(selector, timeStr, overwrite) {
    let current = await this.page.$eval(selector, e => e.value);
    if (current === "" || overwrite) {
      await this.page.evaluate((s, v) => {
        document.querySelector(s).value = v;
      }, selector, timeStr);
    }
  }
}

module.exports = TeamSpiriter;
