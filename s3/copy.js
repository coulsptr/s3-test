const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

async function ensureUploadsFolder() {
  const uploadsDir = path.join(__dirname, "uploads");
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir);
  }
  return uploadsDir;
}

async function fetchFiles() {
  try {
    // Read the test.json file
    const fileData = await fs.readFile("./test.json", "utf-8");
    const data = JSON.parse(fileData);

    // Ensure the uploads folder exists
    const uploadsDir = await ensureUploadsFolder();

    for (const url of data) {
      try {
        // Fetch the file using axios
        const response = await axios({
          method: "get",
          url,
          responseType: "arraybuffer",
        });

        // Get the filename from the URL
        const fileName = path.basename(new URL(url).pathname);

        // Construct the file path in the uploads folder
        const filePath = path.join(uploadsDir, fileName);

        // Save the file to the uploads folder
        await fs.writeFile(filePath, response.data);

        console.log(`Downloaded and saved: ${fileName}`);
      } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the function
fetchFiles();
