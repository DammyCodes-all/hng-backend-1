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

app.get("/strings", (req, res) => {
  const {
    is_palindrome,
    min_length,
    max_length,
    word_count,
    contains_character,
  } = req.query;

  const palindromeFilter =
    is_palindrome === undefined
      ? undefined
      : is_palindrome === "true"
      ? true
      : is_palindrome === "false"
      ? false
      : null;

  if (palindromeFilter === null) {
    return res
      .status(400)
      .json({ error: "is_palindrome must be true or false" });
  }

  const minLengthFilter =
    min_length !== undefined ? Number(min_length) : undefined;
  if (minLengthFilter !== undefined && Number.isNaN(minLengthFilter)) {
    return res.status(400).json({ error: "min_length must be a number" });
  }

  const maxLengthFilter =
    max_length !== undefined ? Number(max_length) : undefined;
  if (maxLengthFilter !== undefined && Number.isNaN(maxLengthFilter)) {
    return res.status(400).json({ error: "max_length must be a number" });
  }

  const wordCountFilter =
    word_count !== undefined ? Number(word_count) : undefined;
  if (wordCountFilter !== undefined && Number.isNaN(wordCountFilter)) {
    return res.status(400).json({ error: "word_count must be a number" });
  }

  const containsCharFilter =
    contains_character !== undefined
      ? contains_character.toLowerCase()
      : undefined;
  if (containsCharFilter !== undefined && containsCharFilter.length === 0) {
    return res
      .status(400)
      .json({ error: "contains_character cannot be empty" });
  }

  db.all(`SELECT id, value, created_at FROM strings`, (err, rows = []) => {
    if (err) {
      console.error("Error fetching strings", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    const filtered = rows
      .map((row) => {
        const trimmed = row.value.trim();
        const wordCount = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

        return {
          id: row.id,
          value: row.value,
          properties: {
            length: row.value.length,
            is_palindrome: isPalindrome(row.value),
            unique_characters: getUniqueCharsCount(row.value),
            word_count: wordCount,
            sha256_hash: row.id,
            character_frequency_map: Object.fromEntries(
              generateCharFreqMap(row.value)
            ),
          },
          created_at: row.created_at,
        };
      })
      .filter((entry) => {
        if (
          palindromeFilter !== undefined &&
          entry.properties.is_palindrome !== palindromeFilter
        ) {
          return false;
        }
        if (
          minLengthFilter !== undefined &&
          entry.properties.length < minLengthFilter
        ) {
          return false;
        }
        if (
          maxLengthFilter !== undefined &&
          entry.properties.length > maxLengthFilter
        ) {
          return false;
        }
        if (
          wordCountFilter !== undefined &&
          entry.properties.word_count !== wordCountFilter
        ) {
          return false;
        }
        if (
          containsCharFilter !== undefined &&
          !entry.value.toLowerCase().includes(containsCharFilter)
        ) {
          return false;
        }
        return true;
      });
    const responseData = {
      data: [...filtered],
      count: filtered.length,
      filters_applied: {
        is_palindrome: palindromeFilter,
        min_length: minLengthFilter,
        max_length: maxLengthFilter,
        word_count: wordCountFilter,
        contains_character: containsCharFilter,
      },
    };
    return res.json(responseData);
  });
});

app.delete("/strings/:value", async (req, res) => {
  const { value } = req.params;

  db.run(`DELETE FROM strings WHERE value = ?`, [value], function (err) {
    if (err) {
      console.error("Error deleting string", err);
      return res.status().json({ error: "Internal server error" });
    }
    return res.status(204).send();
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
