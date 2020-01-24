"use strict";

require('dotenv').config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);
const { prompt } = require("prompts");

// If modifying these scopes, delete token.json.
const SCOPES = [process.env.SHEET_SCOPES];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(__dirname, process.env.SHEET_TOKEN);

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {function} callback The callback to call with the authorized client.
 */
async function authorize(callback) {
  let credentials;

  try {
    credentials = await readFile(path.join(__dirname, process.env.SHEET_CREDENTIALS));
    credentials = JSON.parse(credentials);
  } catch (err) {
    return console.log("Error loading client secret file:", err);
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  let token;
  try {
    token = await readFile(TOKEN_PATH);
  } catch (err) {
    return getNewToken(oAuth2Client, callback);
  }
  await oAuth2Client.setCredentials(JSON.parse(token));
  return await callback(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err)
        return console.error(
          "Error while trying to retrieve access token",
          err
        );
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/18lrw3KkIJm9fSDKO7lVDeMxR97nweIMo64fokexJO3A/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function readSheets(auth) {
  const sheets = google.sheets({ version: "v4", auth });
  let sheetData = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: process.env.SHEET_RANGE
    });
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

async function writeSheets(auth) {
  const sheets = google.sheets({ version: "v4", auth })

  let writeWhat = [['20.1.2020.']]; // depending on readSheets return
  let resource = {values: writeWhat};
  // console.log(JSON.stringify(writeTest, null, 2));

  try {
    let writeTest = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: process.env.SHEET_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "OVERWRITE",
      resource
    })
  
    // writeTest.status == 200, writeTest.statusText == "OK"
    console.log(writeTest.status, writeTest.statusText)
    return true
  } catch (err) {
    console.log("The API returned an error:", err);
    return false
  }
}

// https://www.npmjs.com/package/prompts
async function promptInput() {
  const questions = [
    {
      type: "text",
      name: "twitter",
      message: `What's your twitter handle?`,
      initial: `terkelg`,
      format: v => `@${v}`
    },
    {
      type: "number",
      name: "age",
      message: "How old are you?",
      validate: value => (value < 18 ? `Sorry, you have to be 18` : true)
    },
    {
      type: "password",
      name: "secret",
      message: "Tell me a secret"
    },
    {
      type: "confirm",
      name: "confirmed",
      message: "Can you confirm?"
    },
    {
      type: prev => prev && "toggle",
      name: "confirmtoggle",
      message: "Can you confirm again?",
      active: "yes",
      inactive: "no"
    },
    {
      type: "list",
      name: "keywords",
      message: "Enter keywords"
    },
    {
      type: "select",
      name: "color",
      message: "Pick a color",
      choices: [
        {
          title: "Red",
          description: "This option has a description.",
          value: "#ff0000"
        },
        { title: "Green", value: "#00ff00" },
        { title: "Yellow", value: "#ffff00", disabled: true },
        { title: "Blue", value: "#0000ff" }
      ]
    },
    {
      type: "multiselect",
      name: "multicolor",
      message: "Pick colors",
      hint: false,
      choices: [
        {
          title: "Red",
          description: "This option has a description.",
          value: "#ff0000"
        },
        { title: "Green", value: "#00ff00" },
        { title: "Yellow", value: "#ffff00", disabled: true },
        { title: "Blue", value: "#0000ff" }
      ]
    },
    {
      type: "autocomplete",
      name: "actor",
      message: "Pick your favorite actor",
      initial: 1,
      limit: 3,
      suggest: (input, choices) =>
        choices.filter(i =>
          i.title.toLowerCase().includes(input.toLowerCase())
        ),
      choices: [
        { title: "Cage" },
        { title: "Clooney", value: "silver-fox" },
        { title: "Gyllenhaal" },
        { title: "Gibson" },
        { title: "Grant", description: "This option has a description." },
        { title: "Hanks" },
        { title: "Downey Jr." }
      ],
      fallback: {
        title: `This is the fallback. Its value is 'fallback'`,
        value: "fallback"
      }
    },
    {
      type: "date",
      name: "birthday",
      message: `What's your birthday?`,
      validate: date =>
        date > Date.now() ? `Your birth day can't be in the future` : true
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
  console.log(`[${new Date().toTimeString().split(" ")[0]}] Reading google sheets`);

  try {
    read = await authorize(readSheets);
  } catch (err) {
    console.log("No error expected here.", err);
  }

  console.log(`[${new Date().toTimeString().split(" ")[0]}] Asking questions`);
  
  let answers = await promptInput();

  console.log(`[${new Date().toTimeString().split(" ")[0]}] Writing to sheets`);
  
  try {
    write = await authorize(writeSheets);
  } catch (err) {
    console.log("No error expected here.", err);
  }
  
  console.log(`[${new Date().toTimeString().split(" ")[0]}] Job done, exiting`);

  console.log(read, write, answers);
  return true;
})();
