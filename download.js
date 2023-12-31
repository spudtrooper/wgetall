import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { join } from "path";
import { existsSync, writeFileSync, readFileSync, readFile, mkdirSync, unlinkSync } from "fs";
import parseCurl from "parse-curl";
import { exec } from "child_process";
import { tmpdir } from "os";
import pLimit from "p-limit";

puppeteer.use(StealthPlugin());

const curlViaPuppeteer = async (curlCommand, log) =>
  curlToPuppeteerInternal(parseCurl(curlCommand), log);

const curlToPuppeteerInternal = async (obj, log) => {
  const {
    method,
    url,
    header: nullableHeader,
    data,
  } = obj;

  const header = nullableHeader || {};

  if (!method) {
    throw new Error("No method found");
  }
  if (!url) {
    throw new Error("No url found");
  }

  log(`downloading ${url} via stealth curl`);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders(header);

  const response = await page.goto(url, { method, body: data });
  const res = await response.text();

  await browser.close();

  return res;
};

const stealthDownload = async (url, log) =>
  curlToPuppeteerInternal({
    method: "GET",
    url,
    data: "",
  }, log);

const simpleDownload = async (url, log) => {
  const res = await fetch(url);
  const text = await res.text();
  return text;
};

const curlExec = async (curlCommand, log) => {
  const { url } = parseCurl(curlCommand);

  log(`downloading ${url} via curl`);

  const tempFilePath = join(tmpdir(), `curl_${Math.random().toString(36).substring(2, 15)}.html`);
  curlCommand += ` -o ${tempFilePath}`;

  return new Promise((resolve, reject) => {
    return exec(curlCommand, { stdio: "ignore" },
      () => readFile(tempFilePath, { encoding: "utf8" },
        (err, stdout) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(stdout);
          try {
            unlinkSync(tempFilePath);
          } catch (e) {
            console.error(e);
          }
        }));
  });
};

const main = async (replacements, opts) => {
  let { url_template,
    outdir,
    stealth,
    overwrite,
    verbose,
    curl_template, threads,
    extension,
    start,
    stop,
    inc: incStr,
    sleep,
  } = opts;

  const isStealth = stealth || false;
  const numThreads = parseInt(threads || 1);
  const curlTemplate = curl_template || "";
  const ext = extension || "html";
  const inc = parseInt(incStr || "1");
  const sleepMillis = parseInt(sleep || "0");

  if (!(curl_template || url_template)) {
    throw new Error("--url_template or --curl_template required");
  }

  if (!replacements.length) {
    start = parseInt(start);
    stop = parseInt(stop);
    if (start >= 0 && stop >= 0) {
      if (stop < start) {
        throw new Error("stop must be greater than start");
      }
      if (inc >= 2) {
        replacements = Array.from({ length: Math.ceil((stop - start + 1) / inc) }, (_, i) => i * inc + start);
      } else {
        replacements = Array(stop - start + 1).fill().map((_, i) => i + start);
      }
    }
  }

  if (!replacements.length) {
    throw new Error("no replacements provided");
  }

  let curlCommandTemplate;
  if (curlTemplate) {
    curlCommandTemplate = readFileSync(curlTemplate, "utf8");
  }

  const downloadFn = async (r, log) => {
    if (curlTemplate) {
      const curlCommand = curlCommandTemplate.replace("{}", r);
      return isStealth
        ? curlViaPuppeteer(curlCommand, log)
        : curlExec(curlCommand, log);
    } else {
      const url = url_template.replace("{}", r);
      return isStealth
        ? stealthDownload(url, log)
        : simpleDownload(url, log);
    }
  };

  const getUrl = (r) => {
    if (curlTemplate) {
      const curlCommand = curlCommandTemplate.replace("{}", r);
      const {
        url,
      } = parseCurl(curlCommand);
      return url;
    }
    const url = url_template.replace("{}", r);
    return url;
  };

  let done = 0;
  const processReplacement = async (r, prefixFn) => {
    const log = (msg) => console.log(`${prefixFn()} ${msg}`);
    const f = () => join(outdir, r + "." + ext);
    if (outdir && !overwrite && existsSync(f())) {
      if (verbose) {
        const url = getUrl(r);
        log(`skipping ${url} because ${f()} exists`);
      }
      return;
    }

    const res = await downloadFn(r, log);
    done++;
    if (outdir) {
      if (!existsSync(outdir)) {
        mkdirSync(outdir, { recursive: true });
      }
      writeFileSync(f(), res);
      log(`wrote ${f()}`);
    } else {
      log(res);
    }

    if (sleepMillis > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepMillis));
    }

    return res;
  };

  const limit = pLimit(numThreads);
  await Promise.all(replacements.map((r, i) => limit(() =>
    processReplacement(r, () => `[${i + 1}/${replacements.length}: "${r}" ${done} done]`)
  )));
};

export default main;
