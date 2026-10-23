import { readdir, readFile } from "node:fs/promises";
import type { DocumentInput, FaqInput } from "../utils/type.js";
import { PDFParse } from "pdf-parse";
import { ingestDocuments, ingestFaqs } from "./ingest.js";

// TODO: move under indexing job api when ready
(async function main() {
  const faqs = JSON.parse(
    await readFile("datasource/faq-scholarship-cs.json", "utf8"),
  ) as FaqInput[];

  const dir = "datasource/pdf/";
  const files = await readdir(dir);

  let documents: DocumentInput[] = [];
  for (const file of files.filter((file) => file.endsWith(".pdf"))) {
    const data = await readFile(`${dir + file}`);
    const parser = new PDFParse({ data });

    try {
      const info = await parser.getInfo();
      const text = await parser.getText();
      const title = info.info.Title ?? file.replace(/.pdf$/, "");

      documents.push({
        text: text.text,
        url: `file://${title}`,
        title,
      });
    } finally {
      parser.destroy();
    }
  }

  await ingestFaqs(faqs);
  await ingestDocuments(documents);
})();
