const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const url = require("url");

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function extractYearMonth(imageUrl) {
  const parsedUrl = new url.URL(imageUrl);
  const pathParts = parsedUrl.pathname.split('/');
  
  // Try to find year and month in the URL path
  const yearMonthMatch = pathParts.find(part => /^\d{4}$/.test(part) && pathParts[pathParts.indexOf(part) + 1]?.match(/^\d{2}$/));
  
  if (yearMonthMatch) {
    const yearIndex = pathParts.indexOf(yearMonthMatch);
    return {
      year: pathParts[yearIndex],
      month: pathParts[yearIndex + 1]
    };
  }
  
  // Fallback to current date if no year/month found
  const currentDate = new Date();
  return {
    year: currentDate.getFullYear().toString(),
    month: (currentDate.getMonth() + 1).toString().padStart(2, '0')
  };
}

async function fetchFiles() {
  try {
    // Read the test.json file
    const fileData = await fs.readFile("./s3/test.json", "utf-8");
    const urls = JSON.parse(fileData);
    
    // Ensure the uploads folder exists
    const uploadsDir = path.join(__dirname, "uploads");
    await ensureDirectoryExists(uploadsDir);

    for (const imageUrl of urls) {
      try {
        // Fetch the file using axios
        const response = await axios({
          method: "get",
          url: imageUrl,
          responseType: "arraybuffer",
        });

        // Extract year and month
        const { year, month } = await extractYearMonth(imageUrl);
        
        // Create year/month directory
        const yearMonthDir = path.join(uploadsDir, year, month);
        await ensureDirectoryExists(yearMonthDir);

        // Get the filename from the URL
        const fileName = path.basename(new URL(imageUrl).pathname);
        
        // Construct the full file path
        const filePath = path.join(yearMonthDir, fileName);
        
        // Save the file
        await fs.writeFile(filePath, response.data);
        console.log(`Downloaded and saved: ${path.relative(uploadsDir, filePath)}`);
      } catch (error) {
        console.error(`Failed to download ${imageUrl}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the function
fetchFiles();