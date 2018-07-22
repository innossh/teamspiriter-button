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
    const timeout = options.timeout || 120000;

    const browser = await puppeteer.launch({ headless: headlessPuppeteer, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
    return new TeamSpiriter(browser, baseUrl, options.username, options.password, cookiesFilePath, timeout);
  }

  constructor(browser, baseUrl, username, password, cookiesFilePath, timeout) {
    this._browser = browser;
    this._baseUrl = baseUrl;
    this._username = username;
    this._password = password;
    this._cookiesFilePath = cookiesFilePath;
    this._timeout = timeout;
  }

  async startWork(startTime, overwrite) {
    const startTimeStr = dateFns.format(startTime, 'HH:mm');
    const dateStr = dateFns.format(startTime, 'YYYY-MM-DD');
    const page = await this._openPageDialog(dateStr);
    const result = await this._setStartTimeToPage(page, startTimeStr, overwrite);
    if (!result) {
      console.log('Start time has already been recorded. Nothing changed.');
      return result;
    }

    await this._saveAndClosePage(page);
    console.log(`Recorded start time: ${startTimeStr}(overwrite:${overwrite})`);
    return result;
  }

  async endWork(endTime, overwrite) {
    const endTimeStr = dateFns.format(endTime, 'HH:mm');
    const dateStr = dateFns.format(endTime, 'YYYY-MM-DD');
    const page = await this._openPageDialog(dateStr);
    const result = await this._setEndTimeToPage(page, endTimeStr, overwrite);
    if (!result) {
      console.log('End time has already been recorded. Nothing changed.');
      return result;
    }

    await this._saveAndClosePage(page);
    console.log(`Recorded end time: ${endTimeStr}(overwrite:${overwrite})`);
    return result;
  }

  async recordWorkTime(startTime, endTime, overwriteStartTime, overwriteEndTime) {
    const startTimeStr = dateFns.format(startTime, 'HH:mm');
    const endTimeStr = dateFns.format(endTime, 'HH:mm');
    const dateStr = dateFns.format(endTime, 'YYYY-MM-DD');
    const page = await this._openPageDialog(dateStr);
    const resultIn = await this._setStartTimeToPage(page, startTimeStr, overwriteStartTime);
    const resultOut = await this._setEndTimeToPage(page, endTimeStr, overwriteEndTime);
    // TODO: Set #startRest1 and #endRest1
    if (!resultIn && !resultOut) {
      console.log('Work time has already been recorded. Nothing changed.');
      return result;
    }

    await this._saveAndClosePage(page);
    console.log(`Recorded work time: ${startTimeStr}(overwrite:${overwriteStartTime}) - ${endTimeStr}(overwrite:${overwriteEndTime})`);
  }

  async _openPageDialog(dateStr) {
    const tabSelector = 'li#\\30 1r28000000KHhu_Tab';
    const dateSelector = "td#ttvTimeSt" + dateStr;
    const dialogSelector = 'div#dialogInputTime';
    const page = await this._openPage();
    await page.goto(this._baseUrl + '/home/home.jsp', { waitUntil: 'networkidle2', timeout: this._timeout });
    await page.waitFor(tabSelector, { timeout: this._timeout });
    await page.click(tabSelector);
    await page.waitFor(dateSelector, { timeout: this._timeout });
    await page.click(dateSelector);
    await page.waitFor(dialogSelector, { timeout: this._timeout })
    return page;
  }

  async _openPage() {
    const page = await this._browser.newPage();
    await page.goto(this._baseUrl, { waitUntil: 'networkidle2', timeout: this._timeout });
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

  async _saveAndClosePage(page) {
    await page.click('#dlgInpTimeOk');
    await page.waitFor('div#dialogInputTime', { timeout: this._timeout })
    await page.close();
  }

  async _modifyCookies(cookies) {
    // NOTE: The 'session' field in cookie should be set to false
    let modifiedCookies = cookies.slice();
    for (let i = 0; i < modifiedCookies.length; i++) {
      modifiedCookies[i].session = false;
    }
    return modifiedCookies;
  }

  async _setStartTimeToPage(page, timeStr, overwrite) {
    const startTimeSelector = '#startTime';
    return await this._setTimeToPage(page, startTimeSelector, timeStr, overwrite);
  }

  async _setEndTimeToPage(page, timeStr, overwrite) {
    const endTimeSelector = '#endTime';
    return await this._setTimeToPage(page, endTimeSelector, timeStr, overwrite);
  }

  async _setTimeToPage(page, selector, timeStr, overwrite) {
    let current = await page.$eval(selector, e => e.value);
    if (current !== "" && !overwrite) {
      return false;
    }

    await page.evaluate((s, v) => {
      document.querySelector(s).value = v;
    }, selector, timeStr);
    return true;
  }
}

module.exports = TeamSpiriter;
