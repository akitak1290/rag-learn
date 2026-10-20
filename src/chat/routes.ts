import { Router } from "express";
import type { Request, Response } from "express";
import { graph } from "../graph/graph.js";

const router = Router();

router.post("/send-message", async (req: Request, res: Response) => {
  const sessionId = req.headers["session-id"] as string;
  const message = req.body["message"] as string;

  await graph.invoke(
    {
      messages: [message],
    },
    {
      configurable: {
        thread_id: sessionId,
      },
    },
  );

  res.status(200).send(JSON.stringify("hi"));
});

export default router;
