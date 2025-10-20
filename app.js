import express from "express";
import sqlite3 from "sqlite3";
import {
  getStringByValue,
  sha256Hash,
  addNewString,
  isPalindrome,
  generateCharFreqMap,
  getUniqueCharsCount,
} from "./utils/utils.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8000;

export const db = new sqlite3.Database("./db/database.db", (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.exec(`
      CREATE TABLE IF NOT EXISTS strings (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the HNG Backend API");
});
app.post("/strings", async (req, res) => {
  try {
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: "Value is required" });
    }
    if (typeof value !== "string") {
      return res.status(422).json({ error: "Value must be a string" });
    }
    const [stringObj, error] = await getStringByValue(value);
    if (stringObj) {
      return res.status(409).json({ error: "String already exists!" });
    }
    const hashedValue = sha256Hash(value);
    const [success, insertError] = await addNewString(hashedValue, value);
    if (insertError) {
      return res.status(500).json({ error: "Internal server error" });
    }
    const responseData = {
      id: hashedValue,
      value,
      properties: {
        length: value.length,
        is_palindrome: isPalindrome(value),
        unique_characters: getUniqueCharsCount(value),
        word_count: value.trim() === "" ? 0 : value.trim().split(/\s+/).length,
        sha256_hash: hashedValue,
        character_frequency_map: Object.fromEntries(generateCharFreqMap(value)),
      },
      created_at: new Date().toISOString(),
    };
    return res.status(201).json(responseData);
  } catch (err) {
    console.error("Error processing /strings request", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/strings/:value", async (req, res) => {
  const { value } = req.params;
  try {
    const [stringObj, error] = await getStringByValue(value);
    if (error) {
      throw error;
    }
    if (!stringObj) {
      return res.status(404).json({ error: "String not found" });
    }
    const responseObj = {
      id: stringObj?.id,
      value: stringObj?.value,
      properties: {
        length: value.length,
        is_palindrome: isPalindrome(value),
        unique_characters: getUniqueCharsCount(value),
        word_count: value.trim() === "" ? 0 : value.trim().split(/\s+/).length,
        sha256_hash: stringObj?.id,
        character_frequency_map: Object.fromEntries(generateCharFreqMap(value)),
      },
      created_at: stringObj?.created_at,
    };
    return res.status(200).json(responseObj);
  } catch (error) {
    console.error("Error processing /strings/:value request", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
