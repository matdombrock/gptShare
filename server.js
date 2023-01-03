const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');
const yargs = require('yargs');

const app = express();

// Parse the command line arguments
const argv = yargs
  .option('dir', {
    alias: 'd',
    type: 'string',
    description: 'The directory to which uploaded files will be saved',
  })
  .option('password', {
    alias: 'p',
    type: 'string',
    description: 'The password required to upload files',
  })
  .option('port', {
    alias: 'P',
    type: 'number',
    description: 'The port on which the server will listen',
  })
  .help()
  .alias('help', 'h').argv;

// Set the default upload directory
const DEFAULT_DIR = argv.dir || './';

// Set the default password
const PASSWORD = argv.password || 'password';

// Parse file uploads
app.post('/upload', (req, res) => {
  // Create a new formidable form
  const form = new formidable.IncomingForm();

  // Set the download directory
  form.uploadDir = DEFAULT_DIR;

  // Parse the incoming request
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    // Check if the password is correct
    if (fields.password !== PASSWORD) {
      res.sendStatus(401);
      return;
    }

    // Save the file to the specified directory
    fs.rename(files.file.path, path.join(form.uploadDir, files.file.name), (err) => {
      if (err) {
        console.error(err);
        res.sendStatus(500);
        return;
      }

      res.sendStatus(200);
    });
  });
});

app.get('/download/:filename', (req, res) => {
  // Get the file name from the request parameters
  const fileName = req.params.filename;

  // Check if the file exists
  if (!fs.existsSync(fileName)) {
    res.sendStatus(404);
    return;
  }

  // Check if the password is correct
  if (req.query.password !== PASSWORD) {
    res.sendStatus(401);
    return;
  }

  // Set the appropriate Content-Type
  res.setHeader('Content-Type', 'application/octet-stream');

  // Set the Content-Disposition to attachment to prompt the user to download the file
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

  // Send the file contents
  fs.createReadStream(fileName).pipe(res);
});

// Serve the web UI
app.get('/', (req, res) => {
  // Read the directory contents
  fs.readdir(DEFAULT_DIR, (err, files) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    // Generate HTML for the file list
    const fileList = files
      .map((file) => `<li><a href="/download/${file}" class="download-link">${file}</a></li>`)
      .join('');

    res.send(`
      <h1>Upload a file</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="password" name="password" placeholder="Password" required>
        <input type="file" name="file" required>
        <button type="submit">Upload</button>
        </form>
        <h1>Download a file</h1>
        <form id="download-form">
        <input type="password" name="password" placeholder="Password" required>
        </form>
        <ul>${fileList}</ul>
        <script>
          // Get the password input
          const passwordInput = document.querySelector('#download-form input[name="password"]');

          // Add an event listener to the click event on the download links
          document.addEventListener('click', (event) => {
            // Check if the target is a download link
            if (!event.target.classList.contains('download-link')) {
              return;
            }

            // Get the password value
            const password = passwordInput.value;

            // Append the password to the download link
            event.target.href += \`?password=\${encodeURIComponent(password)}\`;
          });
        </script>
    `);
  });
});
// Start the server
const port = argv.port || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});