# wgetall

Downloads a sequence of urls or commands given a url template or curl template and sequence of replacements.

## Example

To download the following URls with concurrency of 5 saving the outputs to `data/1.html`, `data/2.html`, ..., `data/100.html`:

- `https://www.imdb.com/list/ls050522997/_ajax?st_dt=&mode=detail&page=1&sort=list_order,asc`
- `https://www.imdb.com/list/ls050522997/_ajax?st_dt=&mode=detail&page=2&sort=list_order,asc`
- ...
- `https://www.imdb.com/list/ls050522997/_ajax?st_dt=&mode=detail&page=100&sort=list_order,asc`

```bash
scripts/run.sh --url_template 'https://www.imdb.com/list/ls050522997/_ajax?st_dt=&mode=detail&page={}&sort=list_order,asc' --t 5 -o data `seq 1 100`
```

## Usage

- You can specify either `--url_template <string>` or `--curl_template <file>`
- You can specify `--stealth` to use puppeteer stealth mode for either a URL or curl
