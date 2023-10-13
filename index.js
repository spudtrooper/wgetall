#!/usr/bin/env node

import { program } from "commander";

import download from "./download.js";

program
  .version("0.0.1")
  .description("The getall CLI");

program
  .command("download [replacements...]", { isDefault: true })
  .description("dummy command")
  .option("-u, --url_template <URL>", "URL template with plaseholders")
  .option("-d, --outdir <dir>", "Directory to write to, otherwise we print to STDOUT")
  .option("-e, --extension <extension>", "Extension to use for writing files", "html")
  .option("-s, --stealth", "Stealth mode")
  .option("-o, --overwrite", "Overwrite existing files")
  .option("-v, --verbose", "Verbose output")
  .option("-c, --curl_template <file>", "File constaining curl template")
  .option("-t, --threads <n>", "Number of threads to use", "1")
  .option("--start <start-index>", "Start of replacements (use with --stop", -1)
  .option("--stop <stop-index>", "Stop of replacements (use with --start", -1)
  .action(async (replacements, opts) => await download(replacements, opts));

program.parse(process.argv);
