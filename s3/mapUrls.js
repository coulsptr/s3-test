const fs = require('fs/promises');

async function mapUrls() {
    try {
        // Read the files
        const fileContent = await fs.readFile("files.json", "utf8");
        const blogContent = await fs.readFile("blogs.json", "utf8");
        
        // Parse JSON files
        const data = JSON.parse(fileContent);
        const blogs = JSON.parse(blogContent);
        
        // Create a mapping of original filenames to new URLs
        const urlMap = new Map(
            data.map(item => [item.name, item.path])
        );
        
        // Function to replace URLs
        const replaceUrl = (originalUrl) => {
            // Extract the filename from the original URL
            const match = originalUrl.match(/\/([^/]+\.(webp|png|jpg|jpeg))$/i);
            if (match) {
                const filename = match[1];
                // Check if we have a replacement URL
                const newUrl = urlMap.get(filename);
                return newUrl || originalUrl;
            }
            return originalUrl;
        };

        // Process blog content to replace URLs
        const processedBlogs = blogs.map(blog => {
            if (blog.content) {
                // Replace URLs in content using regex
                blog.content = blog.content.replace(
                    /https?:\/\/[^\s]+\.(webp|png|jpg|jpeg)/gi, 
                    replaceUrl
                );
            }
            return blog;
        });

        // Write the processed blogs back to a file
        await fs.writeFile("processed_blogs.json", JSON.stringify(processedBlogs, null, 2), "utf8");
        
        console.log("URL mapping complete. Processed blogs saved to processed_blogs.json");
        
        return processedBlogs;
    } catch (error) {
        console.error("Error in URL mapping:", error);
        throw error;
    }
}

// Export the function for potential use in other scripts
module.exports = mapUrls;

// If you want to run it directly
if (require.main === module) {
    mapUrls().catch(console.error);
}