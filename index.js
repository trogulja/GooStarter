"use strict";

require("dotenv").config();

const {
  getAuthToken,
  getSpreadSheet,
  getSpreadSheetValues
} = require("./googleSheetsService.js");

const spreadsheetId = process.env.SHEET_ID;
const sheetName = process.env.SHEET_RANGE;

function pad(n, width) {
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
}

async function readSheets() {
  const auth = await getAuthToken();
  const res = await getSpreadSheetValues({
    spreadsheetId,
    sheetName,
    auth
  });

  try {
    if (res.data.values.length) {
      // Handle last entry
      let rb = res.data.values[res.data.values.length - 1][0];
      let rbYear = Number(rb.toString().substring(0, 2));
      let rbNums = Number(rb.toString().substring(2));

      let newYear = new Date()
        .getFullYear()
        .toString()
        .substring(2);
      let newRb = newYear + "001"; // default value YYnnn

      if (Number(newYear) === rbYear) newRb = "" + rbYear + pad(rbNums + 1, 3);

      return newRb;
    } else {
      console.log("No data found.");
      return false;
    }
  } catch (err) {
    console.log("The API returned an error:", err);
    return false;
  }
}

readSheets().then(console.log);
