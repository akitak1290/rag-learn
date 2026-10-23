import "temporal-polyfill/full/global";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { client as EmbeddingClient } from "../domains/llm.js";
import { createHash } from "node:crypto";
import { db } from "../prisma/db.js";
import { logger } from "../utils/logger.js";
import { readFile, readdir } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

// #region VAR + TYPE
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 64;

type FaqInput = {
  question: string;
  answer: string;
  url: string;
};

type DocumentInput = {
  title: string;
  url: string;
  text: string;
};

// #endregion

// #region HELPER
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
});

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function faqSourceKey(faq: FaqInput): string {
  return hash(`${faq.url}\n${faq.question.trim().toLowerCase()}`);
}
// #endregion

/**
 *
 * @param texts chunked text
 * @returns embedding
 */
async function embedMany(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    // the api returns embedding + index
    // preserve the order of original text by sorting
    const response = await EmbeddingClient.embeddings.create({
      model: MODEL,
      input: batch,
    });
    // preserve the input order.
    const ordered = [...response.data].sort((a, b) => a.index - b.index);

    vectors.push(...ordered.map((item) => item.embedding));
  }

  return vectors;
}

async function ingestFaqs(faqs: FaqInput[]) {
  logger.info("Processing FAQs");

  const pending: Array<{
    faq: FaqInput;
    sourceKey: string;
    contentHash: string;
    existing: Awaited<ReturnType<typeof db.orm.public.Faq.where>> extends never
      ? never
      : any;
  }> = [];

  for (const faq of faqs) {
    const sourceKey = faqSourceKey(faq);
    const contentHash = hash(`${faq.question}\n${faq.answer}`);
    const existing = await db.orm.public.Faq.where({ sourceKey }).first();

    if (existing?.contentHash === contentHash) continue;

    pending.push({ faq, sourceKey, contentHash, existing });
  }

  const embeddings = await embedMany(pending.map(({ faq }) => faq.question));

  for (let i = 0; i < pending.length; i++) {
    const { faq, sourceKey, contentHash, existing } = pending[i]!;

    const fields = {
      question: faq.question,
      answer: faq.answer,
      url: faq.url,
      sourceKey,
      contentHash,
      embedding: embeddings[i]!,
    };

    logger.info(
      {
        function: "ingestFaqs",
        faqs: fields,
        existing,
      },
      "Adding new Faq records",
    );

    if (existing) {
      await db.orm.public.Faq.where({ sourceKey }).update(fields);
    } else {
      await db.orm.public.Faq.create(fields);
    }
  }

  logger.info(
    { function: "ingestFaqs" },
    `FAQs inserted/updated: ${pending.length}`,
  );
}

async function ingestDocuments(documents: DocumentInput[]) {
  logger.info("ingestDocuments");
  let written = 0;

  for (const document of documents) {
    logger.info(
      { documentTitle: document.title, documentUrl: document.url },
      "Processing  document",
    );
    const chunks = await splitter.splitText(document.text);

    const pending: Array<{
      idx: number;
      text: string;
      contentHash: string;
      existing: any;
    }> = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const text = chunks[idx] ?? "";
      const contentHash = hash(`${document.title}\n${text}`);

      const existing = await db.orm.public.Chunk.where({
        docUrl: document.url,
        idx,
      }).first();

      if (existing?.contentHash === contentHash) continue;

      pending.push({ idx, text, contentHash, existing });
    }

    const embeddings = await embedMany(pending.map(({ text }) => text));

    for (let i = 0; i < pending.length; i++) {
      const { idx, text, contentHash, existing } = pending[i]!;

      const fields = {
        docUrl: document.url,
        title: document.title,
        idx,
        text,
        contentHash,
        embedding: embeddings[i]!,
      };

      if (existing) {
        await db.orm.public.Chunk.where({ docUrl: document.url, idx }).update(
          fields,
        );
      } else {
        await db.orm.public.Chunk.create(fields);
      }

      written++;
    }
  }

  logger.info(
    { function: ingestDocuments },
    `Chunks inserted/updated: ${written}`,
  );
}

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
