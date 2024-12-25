require("dotenv").config();

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Set up AWS SDK
AWS.config.update({ region: process.env.AWS_REGION, });
const s3 = new AWS.S3();

// Path to the file you want to upload
const filePath = path.join(__dirname, 'Womens-Role-in-Indian-Ancestry_-Celebrating-Contributions-across-TimeBlog-75-Blogimage1.png');
const fileStream = fs.createReadStream(filePath);

// S3 upload parameters
const uploadParams = {
  Bucket: process.env.AWS_BUCKET,
  Key: 'Womens-Role-in-Indian-Ancestry_-Celebrating-Contributions-across-TimeBlog-75-Blogimage1.png', // You can change the key to whatever you prefer
  Body: fileStream,
  ContentType: 'image/png', // Make sure to set the correct MIME type
  ACL: 'public-read', // Set the permissions as needed
};

// Upload the file to S3
s3.upload(uploadParams, (err, data) => {
  if (err) {
    console.log('Error uploading file:', err);
  } else {
    console.log('File uploaded successfully:', data.Location);
  }
});
