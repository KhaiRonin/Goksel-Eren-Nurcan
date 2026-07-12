import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, rgb } from "pdf-lib";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const inputPath = process.argv[2];
const outputPath =
  process.argv[3] ??
  path.join(repositoryRoot, "Goksel_Eren_Nurcan_CV_Vienna.pdf");

if (!inputPath) {
  console.error(
    "Usage: npm run update:cv -- <input.pdf> [output.pdf]",
  );
  process.exit(1);
}

const pdfDocument = await PDFDocument.load(fs.readFileSync(inputPath));
pdfDocument.registerFontkit(fontkit);

const [firstPage] = pdfDocument.getPages();
const originalStream = firstPage.node.Contents();

if (originalStream?.constructor.name !== "PDFRawStream") {
  throw new Error("The first page does not contain the expected PDF stream.");
}

let pageContent = zlib
  .inflateSync(originalStream.getContents())
  .toString("latin1");

function removeOriginalTextBlock(pattern, description) {
  const matches = pageContent.match(pattern);

  if (matches?.length !== 1) {
    throw new Error(
      `Expected one ${description} text block, found ${matches?.length ?? 0}.`,
    );
  }

  pageContent = pageContent.replace(pattern, "");
}

removeOriginalTextBlock(
  /BT\s+\/F15 12\.46 Tf\s+1 0 0 -1 436\.95313 24 Tm[\s\S]*?ET/g,
  "location",
);
removeOriginalTextBlock(
  /BT\s+\/F14 12\.46 Tf\s+1 0 0 -1 590\.0625 44 Tm[\s\S]*?ET/g,
  "phone number",
);

const replacementStream = pdfDocument.context.flateStream(pageContent);
firstPage.node.set(
  PDFName.of("Contents"),
  pdfDocument.context.register(replacementStream),
);

const regularFontPath = path.join(
  repositoryRoot,
  "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff",
);
const semiboldFontPath = path.join(
  repositoryRoot,
  "node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff",
);
const regularFont = await pdfDocument.embedFont(
  fs.readFileSync(regularFontPath),
  { subset: true },
);
const semiboldFont = await pdfDocument.embedFont(
  fs.readFileSync(semiboldFontPath),
  { subset: true },
);

const rightEdge = 555.74;
const fontSize = 9.345;
const location = "Vienna, Austria";
const phoneNumber = "+43 677 648 12527";

firstPage.drawText(location, {
  x: rightEdge - regularFont.widthOfTextAtSize(location, fontSize),
  y: 790.17,
  size: fontSize,
  font: regularFont,
  color: rgb(0.3529, 0.3843, 0.4392),
});
firstPage.drawText(phoneNumber, {
  x: rightEdge - semiboldFont.widthOfTextAtSize(phoneNumber, fontSize),
  y: 775.17,
  size: fontSize,
  font: semiboldFont,
  color: rgb(0.1137, 0.3529, 0.5412),
});

pdfDocument.setModificationDate(new Date());
fs.writeFileSync(outputPath, await pdfDocument.save());

console.log(`Updated CV written to ${outputPath}`);
