import express from "express";
import quotes from "./quotes.json" with { type: "json" };

export const app = express();

app.get("/quotes", (_req, res) => {
  res.json(quotes);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = 3000;
  app.listen(port);
}
