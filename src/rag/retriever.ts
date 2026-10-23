import type { Pool } from "pg";
import { embedMany } from "./ingest.js";
import { pool } from "../prisma/pool.js";

type RetrievedItem = {
  kind: "faq" | "pdf";
  text: string;
  source: string;
  distance: number;
};

// linear algebra and shit
// distance functions supported by the extension: https://github.com/pgvector/pgvector#querying
// cosine distance of two vectors: https://www.ibm.com/think/topics/cosine-similarity

async function searchFaqByVector(
  pool: Pool,
  embedding: number[],
  topK = 5,
): Promise<RetrievedItem[]> {
  const vector = `[${embedding.join(",")}]`;

  const { rows } = await pool.query<{
    question: string;
    answer: string;
    url: string;
    distance: number;
  }>(
    `
      SELECT question, answer, url,
             embedding <=> $1::vector AS distance
      FROM public."Faq"
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [vector, topK],
  );

  return rows.map((row) => ({
    kind: "faq",
    text: `Question: ${row.question}\nAnswer: ${row.answer}`,
    source: row.url,
    distance: row.distance,
  }));
}

async function searchPdfByVector(
  pool: Pool,
  embedding: number[],
  topK = 5,
): Promise<RetrievedItem[]> {
  const vector = `[${embedding.join(",")}]`;

  const { rows } = await pool.query<{
    title: string;
    text: string;
    docUrl: string;
    distance: number;
  }>(
    `
      SELECT title, text, "docUrl",
             embedding <=> $1::vector AS distance
      FROM public."Chunk"
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `,
    [vector, topK],
  );

  return rows.map((row) => ({
    kind: "pdf",
    text: row.text,
    source: row.docUrl,
    distance: row.distance,
  }));
}

export async function retrieveContext(question: string, topK: number = 5) {
  const [embedding] = await embedMany([question]);

  if (!embedding) {
    throw new Error("Failed to embed question");
  }

  const [faqs, pdfChunks] = await Promise.all([
    searchFaqByVector(pool, embedding, topK),
    searchPdfByVector(pool, embedding, topK),
  ]);

  // combine and rank
  // TODO: the way distance is calculated between faqs and pdf might be too different
  // consider reserve at least one slot from each category and let the llm decides
  return [...faqs, ...pdfChunks]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, topK);
}