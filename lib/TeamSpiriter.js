const { promisify } = require('util');
const fs = require('fs');
const puppeteer = require('puppeteer');
const dateFns = require('date-fns');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

class TeamSpiriter {
  static async create(options) {
    options = Object.assign({}, options || {});
    const dedicatedPartialUrl = options.dedicatedNumber ? '-' + options.dedicatedNumber : '';
    const baseUrl = `https://teamspirit${dedicatedPartialUrl}.cloudforce.com`;
    const cookiesFilePath = options.cookiesFilePath || './teamspirit.cookie';
    const headlessPuppeteer = (options.headlessPuppeteer === false) ? false : true;

    const browser = await puppeteer.launch({ headless: headlessPuppeteer });
    return new TeamSpiriter(browser, baseUrl, options.username, options.password, cookiesFilePath);
  }

  constructor(browser, baseUrl, username, password, cookiesFilePath) {
    this._browser = browser;
    this._baseUrl = baseUrl;
    this._username = username;
    this._password = password;
    this._cookiesFilePath = cookiesFilePath;
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
    const page = await this._openPage();
    await page.goto(this._baseUrl + '/home/home.jsp', { waitUntil: 'networkidle2' });
    await page.waitFor(tabSelector);
    await page.click(tabSelector);
    await page.waitFor(dateSelector);
    await page.click(dateSelector);
    await page.waitFor(dialogSelector)

    const startTimeSelector = '#startTime';
    await this._setTimeToPage(page, startTimeSelector, startTimeStr, overwriteStartTime);
    const endTimeSelector = '#endTime';
    await this._setTimeToPage(page, endTimeSelector, endTimeStr, overwriteEndTime);
    // TODO: Set #startRest1 and #endRest1

    // TODO: Just screenshot for now
    // await page.click('#dlgInpTimeOk');
    // await page.waitFor('div#dialogInputTime')
    await page.screenshot({ path: 'record_work_time.png' });
    await page.close();
    console.log(`Recorded work time: ${startTimeStr}(overwrite:${overwriteStartTime}) - ${endTimeStr}(overwrite:${overwriteEndTime})`);
  }

  async _openPage() {
    const page = await this._browser.newPage();
    await page.goto(this._baseUrl, { waitUntil: 'networkidle2' });
    const cookiesData = await readFileAsync(this._cookiesFilePath, 'utf8').catch((() => console.log('Starting new session')));
    if (cookiesData) {
      const cookiesJson = JSON.parse(cookiesData);
      await page.setCookie(...cookiesJson);
      console.log('Session has been loaded');
      return page;
    }

    // New session
    await page.type('#username', this._username);
    await page.type('#password', this._password);
    await page.click('#Login');
    // Save session cookies
    const cookiesObject = await page.cookies(this._baseUrl).then(this._modifyCookies);
    const cookiesStr = await JSON.stringify(cookiesObject);
    await writeFileAsync(this._cookiesFilePath, cookiesStr).catch((err) => {
      console.log(err);
      throw new Error('Failed to save cookies');
    });
    console.log('Successful to save cookies');
    return page;
  }

  async _modifyCookies(cookies) {
    // NOTE: The 'session' field in cookie should be set to false
    let modifiedCookies = cookies.slice();
    for (let i = 0; i < modifiedCookies.length; i++) {
      modifiedCookies[i].session = false;
    }
    return modifiedCookies;
  }

  async _setTimeToPage(page, selector, timeStr, overwrite) {
    let current = await page.$eval(selector, e => e.value);
    if (current === "" || overwrite) {
      await page.evaluate((s, v) => {
        document.querySelector(s).value = v;
      }, selector, timeStr);
    }
  }
}

module.exports = TeamSpiriter;
