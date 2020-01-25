"use strict";

require("dotenv").config();
const { prompt } = require("prompts");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const open = require("open");
const {
  getAuthToken,
  addSpreadSheetValues,
  getSpreadSheetValues
} = require("./googleSheetsService.js");

const spreadsheetId = process.env.SHEET_ID;
const sheetName = process.env.SHEET_RANGE;

function pad(n, width) {
  n = n + "";
  return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
}

function formatDate(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [day, month, year].join(".") + ".";
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

async function writeSheets(values) {
  const auth = await getAuthToken();

  await addSpreadSheetValues({
    spreadsheetId,
    sheetName,
    auth,
    values
  });
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
    // console.log(`Canceled right at ${prompt.name}`);
    console.log('Zahtjev otkazan.')
    return true;
  };
  // const answers = await prompt(questions, { onCancel, onSubmit });
  const answers = await prompt(questions);
  return answers;
}

(async function() {
  let rb, write;

  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Reading google sheets`);
  rb = await getRb();

  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Asking questions`);
  let answers = await promptInput();
  
  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Writing to sheets`);
  if (answers.projekt) {
    // Write to google sheets
    let datum = formatDate(new Date());
    let projekt = answers.projekt;
    let folderName = rb + '-' + datum.substring(3, 5) + '-' + datum.substring(0, 2) + ' ' + projekt;
    let values = [[rb, datum, projekt, folderName]]
    write = await writeSheets(values);

    // Create folders
    let folderPath = process.env.FOLDER_PATH + folderName;

    await fs.promises.mkdir(path.join(folderPath, '01 RAW', 'Capture'), { recursive: true })
    await fs.promises.mkdir(path.join(folderPath, '01 RAW', 'Output'), { recursive: true })
    await fs.promises.mkdir(path.join(folderPath, '01 RAW', 'Selects'), { recursive: true })
    await fs.promises.mkdir(path.join(folderPath, '01 RAW', 'Trash'), { recursive: true })
    await fs.promises.mkdir(path.join(folderPath, '02 Radni PSD'), { recursive: true })
    await fs.promises.mkdir(path.join(folderPath, '03 Isporuka', folderName), { recursive: true })

    fs.copyFileSync(path.join(__dirname + 'template.cosessiondb'), path.join(folderPath, '01 RAW', folderName + '.cosessiondb'))

    let db = new sqlite3.Database(path.join(folderPath, '01 RAW', folderName + '.cosessiondb'))

    db.serialize(function() {
      let stmt = db.prepare("UPDATE ZCOLLECTION SET ZCAPTURENAMINGNAME=(?) WHERE ZNAME='root'");
      stmt.run(folderName);
      stmt.finalize();
    });
    
    db.close();
  }
  
  // console.log(`[${new Date().toTimeString().split(" ")[0]}] Job done, exiting`);
  return true;
})();