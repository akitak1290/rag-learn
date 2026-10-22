import { PDFParse } from "pdf-parse";
import { readFile } from "node:fs/promises";

const data = await readFile("./datasource/predeparture-guide-july2020.pdf");
const parser = new PDFParse({ data });

try {
  const info = await parser.getInfo();
  const text = await parser.getText();

  console.log("Metadata:", info.info);
  console.log("Total pages:", text.total);
  console.log("Text:", text.text);
} finally {
  await parser.destroy();
}
