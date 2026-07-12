import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  repositoryRoot,
  "cv/Goksel_Eren_Nurcan_CV.html",
);
const outputPath = path.resolve(
  process.argv[2] ??
    path.join(repositoryRoot, "Goksel_Eren_Nurcan_CV_Premium.pdf"),
);
const chrome =
  process.env.CHROME_PATH ??
  ["/usr/local/bin/google-chrome", "/usr/bin/google-chrome", "google-chrome"].find(
    (candidate) => candidate === "google-chrome" || fs.existsSync(candidate),
  );

if (!chrome) {
  throw new Error(
    "Google Chrome was not found. Set CHROME_PATH to a Chrome executable.",
  );
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cv-chrome-"));

try {
  const result = spawnSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-pdf-header-footer",
      "--no-sandbox",
      `--user-data-dir=${profileDirectory}`,
      `--print-to-pdf=${outputPath}`,
      pathToFileURL(sourcePath).href,
    ],
    {
      encoding: "utf8",
      timeout: 30_000,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 || !fs.existsSync(outputPath)) {
    throw new Error(
      `Chrome failed to generate the PDF.\n${result.stderr || result.stdout}`,
    );
  }

  console.log(`Premium CV written to ${outputPath}`);
} finally {
  fs.rmSync(profileDirectory, { force: true, recursive: true });
}
