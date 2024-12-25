require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const mime = require('mime-types');
const { 
  S3Client, 
  PutObjectCommand,
  NetworkingError,
  RequestTimeout
} = require('@aws-sdk/client-s3');

const httpHandler = new NodeHttpHandler({
    maxSockets: 2500, 
    socketAcquisitionWarningTimeout: 300000,
    connectionTimeout: 600000,
    keepAlive: true,
    
    // Optional: Advanced socket pool management
    socketOptions: {
      keepAlive: true,
      noDelay: true, // Disable Nagle's algorithm for faster small packet transmission
      timeout: 600000
    }
  });

// Configure AWS SDK with your credentials and region
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_SECRET,
    },
    requestHandler: httpHandler,
    maxAttempts: 3
  });

const uploadFolder = './s3/uploads';

// Function to detect MIME type
const getContentType = (filePath) => {
  return mime.lookup(filePath) || 'application/octet-stream';
};

// Function to upload a file to S3 with enhanced retry logic
const uploadFileToS3 = async (filePath, retries = 3) => {
  const fileName = path.basename(filePath);
  
  const uploadAttempt = async (attempt) => {
    try {
      // Use streams instead of readFileSync for better memory management
      const fileStream = fs.createReadStream(filePath);
      
      // Get file stats for size and content type
      const stats = fs.statSync(filePath);
      
      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `uploads/${fileName}`,
        Body: fileStream,
        ContentType: getContentType(filePath),
        ContentLength: stats.size
      };

      // Upload to S3
      const command = new PutObjectCommand(params);
      const data = await s3Client.send(command);
      
      console.log(`Successfully uploaded ${fileName} to S3`);
      return data;
    } catch (err) {
      // Specific error handling
    //   if (typeof err === 'object' && err instanceof NetworkingError || err instanceof RequestTimeout) {
    //     if (attempt < retries) {
    //       const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    //       console.log(`Networking error for ${fileName}. Retrying in ${delay/1000} seconds...`);
          
    //       await new Promise(resolve => setTimeout(resolve, delay));
    //       return uploadAttempt(attempt + 1);
    //     }
    //   }
      
      // Log detailed error information
      console.error(`Error uploading file ${fileName} after ${attempt} attempts:`, {
        message: err.message,
        name: err.name,
        code: err.code,
        requestId: err.$metadata?.requestId
      });
      
      throw err;
    }
  };

  return uploadAttempt(1);
};

// Async function to process all files
async function uploadAllFiles() {
  try {
    // Resolve full path to handle different working directories
    const fullUploadPath = path.resolve(uploadFolder);
    
    // Validate upload folder exists
    if (!fs.existsSync(fullUploadPath)) {
      console.error(`Upload folder does not exist: ${fullUploadPath}`);
      return;
    }

    // Read all files in the upload folder
    const files = fs.readdirSync(fullUploadPath);
    
    // Filter for image files
    const imageFiles = files.filter(file => {
      const filePath = path.join(fullUploadPath, file);
      const isFile = fs.statSync(filePath).isFile();
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file);
      return isFile && isImage;
    });

    console.log(`Found ${imageFiles.length} image files to upload`);

    // Upload files with concurrency limit
    const uploadPromises = imageFiles.map(async (file) => {
      const filePath = path.join(fullUploadPath, file);
      try {
        return await uploadFileToS3(filePath);
      } catch (uploadError) {
        console.error(`Failed to upload ${file}:`, uploadError);
        return null;
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);
    
    // Count successful uploads
    const successfulUploads = results.filter(
      result => result.status === 'fulfilled' && result.value !== null
    ).length;

    console.log(`Successfully uploaded ${successfulUploads} out of ${imageFiles.length} files to S3`);
  } catch (err) {
    console.error('Critical error in upload process:', err);
  }
}

// Run the upload process
uploadAllFiles();

module.exports = { uploadFileToS3, uploadAllFiles };