const { google } = require("googleapis");
const sheets = google.sheets("v4");

const SCOPES = [process.env.SHEET_SCOPES];

async function getAuthToken() {
  const auth = new google.auth.GoogleAuth({
    scopes: SCOPES
  });
  const authToken = await auth.getClient();
  return authToken;
}

async function getSpreadSheet({ spreadsheetId, auth }) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    auth
  });
  return res;
}

async function getSpreadSheetValues({ spreadsheetId, auth, sheetName }) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    auth,
    range: sheetName
  });
  return res;
}

async function addSpreadSheetValues({ spreadsheetId, auth, sheetName, values }) {
  const resource = { values }
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    auth,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    resource
  });
  return res;
}

module.exports = {
  getAuthToken,
  getSpreadSheet,
  getSpreadSheetValues,
  addSpreadSheetValues
};
