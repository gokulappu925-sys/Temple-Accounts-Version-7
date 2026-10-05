TEMPLE ACCOUNTS VERSION 7 - SQLITE WINDOWS EXE

This project wraps the uploaded Temple_Accounts-7.html in Electron and replaces its IndexedDB data layer with a SQLite database.

Database file:
%APPDATA%\Temple Accounts Version 7 SQLite\temple_accounts.sqlite

Build from Android using GitHub:
1. Create a GitHub repository.
2. Upload the project files and .github/workflows/build-windows.yml.
3. Open Actions.
4. Select "Build Temple Accounts Version 7 SQLite EXE".
5. Tap Run workflow.
6. Wait for Success.
7. Download artifact "Temple-Accounts-Version-7-SQLite-Windows".
8. Extract the ZIP and copy/run the EXE on Windows.

Important:
- The EXE is for Windows, not Android.
- The database is SQLite, stored separately from the EXE.
- Use the app's Backup & Restore features for regular backups.
- The original HTML is preserved as index.html; the main change is the data-storage layer.
