"use strict";

require("dotenv").config();
const { prompt } = require("prompts");
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

async function getRb() {
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

async function promptInput() {
  const questions = [
    {
      type: "text",
      name: "projekt",
      message: `Ime projekta?`,
    }
  ];

  const onSubmit = (prompt, answer) => {
    console.log(`Thanks I got ${answer} from ${prompt.name}`);
  };
  const onCancel = prompt => {
    // Return true to continue and prevent the prompt loop from aborting. On cancel responses collected so far are returned.
    console.log(`Canceled right at ${prompt.name}`);
    return true;
  };
  const answers = await prompt(questions, { onCancel, onSubmit });
  return answers;
}

(async function() {
  let read, write;

  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Reading google sheets`);
  read = await getRb();

  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Asking questions`);
  let answers = await promptInput();
  console.log(answers);

  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Writing to sheets`);
  // try {
  //   write = await authorize(writeSheets);
  // } catch (err) {
  //   console.log("No error expected here.", err);
  // }
  
  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Job done, exiting`);
  return true;
})();