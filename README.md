# Agent POC — Plan and Issues

### Project structure

```
.
├── Dockerfile
├── README.md
├── compose.yaml
├── db
│   └── init.sql
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── src
│   ├── chat
│   │   ├── app.ts
│   │   ├── routes.ts
│   │   └── session.ts
│   ├── config.ts
│   ├── db
│   │   ├── pool.ts
│   │   └── queries.ts
│   ├── graph
│   │   ├── dialogs
│   │   │   ├── checkStatus.ts
│   │   │   └── reportIssue.ts
│   │   ├── graph.ts
│   │   ├── nodes
│   │   │   ├── fallback.ts
│   │   │   ├── guardrail.ts
│   │   │   ├── overrideDetector.ts
│   │   │   └── retrieve.ts
│   │   ├── routing.ts
│   │   └── state.ts
│   ├── index.ts
│   ├── mocks
│   │   ├── statusService.ts
│   │   └── ticketService.ts
│   └── rag
│       ├── answer.ts
│       ├── ingest.ts
│       └── retriever.ts
└── tsconfig.json
```

### DB setup
PostGreSQL with vector extension + Prisma v8 + DBeaver

On initial setup, need to create the DB + tables. Workflow for prisma 8 has changed and need to create a 'contract' first prior to doing any migrations:

Initial setup (https://www.prisma.io/docs/orm/extensions/using-extensions?utm_source=chatgpt.com#5-apply-and-query):
- run db:generate:contract first to generate the contract
- run db:generate:plan to generate the initial migration
- run `npx prisma db init` to create the database, subsequent migration can use db:apply:migration

Confirm the scripts' outputs and tables exist in DBeaver

## 1. Objective

Build a TypeScript assistant with LangGraph and LangChain. It supports three things:

1. **Info Q&A**: answer from public agency FAQ/help pages, with citations.
2. **Report an issue**: a multi-turn dialog that collects details, asks for confirmation, then creates a mock ticket.
3. **Check status**: a dialog that extracts a case reference and queries a mock status API.

## 2. Core concepts

| Concept | What it means in the POC |
|---|---|
| Retrieve before routing | Retrieval runs first. The supervisor then decides with the evidence in front of it. |
| Supervisor with tool calling | An LLM picks one tool: `return_faq`, `answer_with_citations`, `start_dialog`, `fallback`, `escalate`. |
| Two knowledge types | Curated FAQ pairs are returned as written. Page chunks are used to generate an answer with citations. |
| Sticky dialogs | A pre-check router keeps the user in the active dialog. If the dialog can't handle a message, control returns to retrieval. |
| Guardrail + override at START | Run both in parallel. A jailbreak attempt ends the turn. "Cancel" or "talk to a human" can interrupt any dialog. The guardrail fails closed: if it's unavailable, the turn ends with a friendly error. |
| Fallback counter → escalation | The 3rd fallback in a session hands over to a (mock) human agent. |
| Chat layer separate from AI layer | Express/session code stays separate from the graph module. |

## 3. Tech stack

TypeScript, Node.js, Express, LangGraph, LangChain, OpenAI (chat + `text-embedding-3-small`), PostgreSQL + pgvector (Docker), Vitest, and a CLI or minimal web page.

## 4. Target graph

```text
START ─┬─ guardrail ──────────┐
       └─ override_detector ──┴─> precheck_router
                                    ├─ guardrail block ──> guardrail_response ──> END
                                    ├─ guardrail unavailable (timeout / error) ──> guardrail_error ──> END
                                    ├─ activeDialog ──> dialog (report | status)
                                    │                    ├─ handled ──> END
                                    │                    └─ no_match ──> retrieve
                                    └─ otherwise ──> retrieve
retrieve = rewrite_query → vector search (faq + chunks) → threshold → rerank
retrieve ──> supervisor
supervisor ──> return_faq | answer_with_citations | start_dialog | fallback | escalate ──> END
fallback ──> END (count < 3) | escalate (count ≥ 3)
```

### State

```ts
{
  sessionId: string;
  messages: BaseMessage[];
  rewrittenQuery?: string;
  retrieved: { id: string; source: "faq" | "chunk"; text: string; url: string; score: number }[];
  activeDialog?: "report" | "status";
  slots: Record<string, string>;
  awaitingConfirmation: boolean;
  fallbackCount: number;
  override?: "cancel" | "human";
  guardrail?: { verdict: "pass" | "flag" | "block" | "unavailable"; categories: string[] };
  answer?: { text: string; citations: string[]; type: string };
}
```

## 5. Milestones 

| m | Focus |
|---|---|
| 1 | Setup, state, guardrail, override detector, pre-check router, supervisor skeleton |
| 2 | Ingestion and retrieval (FAQ + chunks), cited answers |
| 3 | Report dialog (slot filling, confirmation, mock ticket) |
| 4 | Status dialog, fallback counter, escalation, switching topics mid-dialog |
| 5 | End-to-end tests, docs, buffer |

## 6. Acceptance criteria

- Retrieval runs before the supervisor, and the supervisor picks a tool using the evidence.
- FAQ matches are returned verbatim; generated answers carry valid citations.
- Low or missing evidence leads to fallback; the 3rd fallback escalates.
- An active dialog stays active across turns; off-topic messages are answered without losing dialog state.
- A ticket is created only after explicit confirmation.
- Status checks handle valid, invalid, unknown and error cases.
- Jailbreak attempts are blocked; cancel and human overrides work from any state.
- If the guardrail is unavailable, the user gets a friendly error within 6 s and nothing else runs.
- Logs contain routing decisions and reason codes, and no personal information.
- Setup is reproducible from the README.

## 7. Out of scope

Authentication, real agency integrations, streaming/SSE, multi-agent setups, live chat, production deployment, advanced retrieval (hybrid BM25, HyDE, fine-tuned rerankers).

