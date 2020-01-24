"use strict";

require("dotenv").config();

const {
  getAuthToken,
  getSpreadSheet,
  getSpreadSheetValues
} = require("./googleSheetsService.js");

const spreadsheetId = process.env.SHEET_ID;
const sheetName = process.env.SHEET_RANGE;

async function readSheets() {
  const auth = await getAuthToken();
  const res = await getSpreadSheetValues({
    spreadsheetId,
    sheetName,
    auth
  });

  let sheetData = [];

  try {
    if (res.data.values.length) {
      // Handle last entry
      sheetData.push(res.data.values[res.data.values.length - 1]);
    } else {
      console.log("No data found.");
    }
  } catch (err) {
    console.log("The API returned an error:", err);
  }
  return sheetData;
}

readSheets().then(console.log);
