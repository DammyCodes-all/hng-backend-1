import { createHash } from "crypto";
import { db } from "../app.js";
export const generateCharFreqMap = (s) => {
  if (typeof s !== "string") {
    throw new TypeError("Input must be a string");
  }
  const string = s.toLowerCase();
  let charCount = new Map();
  for (const char of string) {
    const prevCount = charCount.get(char);
    if (prevCount) {
      charCount.set(char, prevCount + 1);
    } else {
      charCount.set(char, 1);
    }
  }
  return charCount;
};
export const getUniqueCharsCount = (s) => {
  if (typeof s !== "string") {
    throw new TypeError("Input must be a string");
  }
  const freqMap = generateCharFreqMap(s);
  let uniqueCount = 0;
  for (const [, count] of freqMap) {
    if (count === 1) {
      uniqueCount += count;
    }
  }
  return uniqueCount;
};

export const isPalindrome = (s) => {
  if (typeof s !== "string") {
    throw new TypeError("Input must be a string");
  }
  const normalized = s.toLowerCase();
  let left = 0;
  let right = normalized.length - 1;

  while (left < right) {
    if (normalized[left] !== normalized[right]) {
      return false;
    }
    left += 1;
    right -= 1;
  }
  return true;
};

export const sha256Hash = (s) => {
  if (typeof s !== "string") {
    throw new TypeError("Input must be a string");
  }
  return createHash("sha256").update(s, "utf8").digest("hex");
};

export const getStringByValue = (value) => {
  const selectQuery = `SELECT id FROM strings WHERE value = ? LIMIT 1`;
  return new Promise((resolve) => {
    db.get(selectQuery, [value], (selectErr, existingRow) => {
      if (selectErr) {
        console.error("Error checking string in database", selectErr.message);
        resolve([null, selectErr]);
        return;
      }
      resolve([existingRow ?? null, null]);
    });
  });
};

export const addNewString = (hashedValue, value) => {
  const insertQuery = `INSERT INTO strings (id, value) VALUES (?, ?)`;
  return new Promise((resolve) => {
    db.run(insertQuery, [hashedValue, value], (insertErr) => {
      if (insertErr) {
        console.error("Error inserting string into database", insertErr.message);
        resolve([null, insertErr]);
        return;
      }
      resolve([true, null]);
    });
  });
};
