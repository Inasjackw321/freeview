# FreeView - Video & Document Sharing Platform

A stunning YouTube-style platform for sharing videos AND documents! Built with a beautiful liquid glass UI, FreeView lets you upload videos, images, PDFs, and various document types with full support for comments, likes, search, and categories.

## Features

### Content Sharing
- **Videos** - Upload and share video files with auto-generated thumbnails
- **Documents** - Share PDFs, Word docs, text files, and more
- **Images** - Upload and display images with full preview
- **Download Support** - Download any uploaded file with one click

### YouTube-Like Interface
- **Top Navigation Bar** - Search, logo, and quick upload access
- **Sidebar Navigation** - Filter by content type, view favorites, browse categories
- **Filter Chips** - Quick filtering for All, Videos, Documents, Images, PDFs
- **Responsive Grid** - Beautiful card-based layout that adapts to any screen

### Social Features
- **Comments** - Add comments to any video or document
- **Likes/Favorites** - Like content and view all your favorites
- **Share** - Native share support or copy link to clipboard
- **Categories** - Organize content by Education, Entertainment, Music, Technology, and more

### Search & Discovery
- **Real-time Search** - Search across titles and descriptions
- **Category Filtering** - Browse by category from the sidebar
- **Type Filtering** - Filter by videos, documents, images, or PDFs
- **Liked Content** - Dedicated view for all your favorited items

### Design & UX
- **Liquid Glass UI** - Stunning glassmorphism design with backdrop blur
- **Smooth Animations** - Floating bubbles, hover effects, transitions
- **Dark Theme** - Beautiful gradient background with glass elements
- **Mobile Responsive** - Works perfectly on desktop, tablet, and mobile

### Technical Features
- **IndexedDB Storage** - All content stored locally in your browser
- **No Backend Required** - Fully static, works with GitHub Pages
- **File Preview** - View videos, images, and PDFs directly in-browser
- **Document Icons** - Smart icon detection for different file types
- **Thumbnail Generation** - Automatic video thumbnail creation

## Supported File Types

### Videos
- MP4, WebM, Ogg, and all browser-supported video formats
- Auto-generates thumbnail from video frame

### Documents
- PDF (with in-browser preview)
- DOC, DOCX (Microsoft Word)
- TXT, RTF (Text files)
- ODT (OpenDocument)

### Images
- JPG, PNG, GIF, WebP, SVG
- All browser-supported image formats

## Live Demo

Visit: [Your GitHub Pages URL]

## Screenshots

- YouTube-style layout with sidebar navigation
- Grid view showing videos and documents together
- Full-screen content viewer with comments
- Upload modal with type selection
- Search and filter capabilities

## How to Use

### Uploading Content

1. Click the **Create** button in the top navigation
2. Select content type: Video, Document, or Image
3. Choose your file
4. Add a title and description
5. Select a category
6. Click Upload!

### Browsing Content

- Use the **sidebar** to filter by type or category
- Use **filter chips** at the top for quick filtering
- Click on any card to view the full content
- Use the **search bar** to find specific content

### Interacting

- **Like** - Click the heart icon to favorite content
- **Comment** - Add comments at the bottom of any content
- **Share** - Use the share button to share with others
- **Download** - Click download to save files locally

## Installation & Deployment

### GitHub Pages Deployment

#### Method 1: GitHub Website

1. Push your code to GitHub
2. Go to repository Settings
3. Navigate to Pages section
4. Select your branch (main/master)
5. Click Save
6. Your site will be live at `https://yourusername.github.io/freeview/`

#### Method 2: Command Line

```bash
git checkout main
git add .
git commit -m "Deploy FreeView"
git push origin main
```

Enable GitHub Pages in your repository settings.

### Local Development

No build process needed! Just open `index.html` in a browser or use a local server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## Architecture

### Database Structure (IndexedDB)

**Content Store**
- Stores all videos, documents, and images
- Indexed by timestamp, type, and category
- Contains file data as base64

**Comments Store**
- Stores all comments
- Indexed by contentId
- Links comments to specific content

**Likes Store**
- Tracks likes and favorites
- One entry per content item
- Stores count and user's liked status

### File Storage

All files are converted to base64 and stored in IndexedDB:
- **Videos**: base64 data + generated thumbnail
- **Images**: base64 data (thumbnail is the image itself)
- **PDFs**: base64 data (viewable in iframe)
- **Documents**: base64 data (downloadable)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Great support |
| Safari | ✅ Full | Works perfectly |
| Edge | ✅ Full | Chromium-based |
| Opera | ✅ Full | Chromium-based |

**Requirements**: Modern browser with IndexedDB support

## Storage Limitations

IndexedDB storage varies by browser:

- **Chrome**: ~60% of available disk space
- **Firefox**: ~50% of available disk space
- **Safari**: ~1GB per origin
- **Edge**: ~60% of available disk space

**Tips**:
- Compress videos before upload for better performance
- Large files (>50MB) may cause slowdowns
- Browser may reject files that are too large
- Consider file size limits for optimal experience

## Customization

### Changing Colors

Edit CSS variables in `styles.css`:

```css
:root {
    --primary-color: #667eea;      /* Main purple */
    --secondary-color: #764ba2;    /* Dark purple */
    --accent-color: #f093fb;       /* Pink accent */
}
```

### Adding File Types

Update `updateFileAccept()` in `app.js`:

```javascript
const accepts = {
    video: 'video/*',
    document: '.pdf,.doc,.docx,.txt,.rtf,.odt',
    image: 'image/*',
    // Add your custom types here
};
```

### Adding Categories

Edit the HTML in `index.html` sidebar section:

```html
<a href="#" class="sidebar-item" data-category="yourcategory">
    <i class="fas fa-icon"></i>
    <span>Your Category</span>
</a>
```

And update the select dropdown in the upload form.

## API Reference

### IndexedDB Functions

```javascript
// Add content
await addContent(contentData)

// Get all content
const items = await getAllContent()

// Get specific content
const item = await getContent(id)

// Add comment
await addComment(commentData)

// Get comments
const comments = await getComments(contentId)

// Toggle like
const likes = await toggleLike(contentId)

// Get likes
const likes = await getLikes(contentId)
```

## Performance Tips

1. **Optimize videos** - Compress before uploading
2. **Resize images** - Use appropriate dimensions
3. **Clear old data** - Periodically clean up unused content
4. **Limit upload size** - Keep files under 25MB for best performance
5. **Use appropriate formats** - MP4 for video, JPG for images, PDF for documents

## Roadmap

Future features planned:

- [ ] User authentication and profiles
- [ ] Video playlists
- [ ] Advanced search filters
- [ ] Bulk upload
- [ ] Export/import functionality
- [ ] Video compression before upload
- [ ] Thumbnail customization
- [ ] Content sorting options
- [ ] View count tracking
- [ ] Recent uploads section
- [ ] Trending content algorithm

## Troubleshooting

### Content not uploading?
- Check file size (must be reasonable for browser storage)
- Ensure file format is supported
- Check browser console for errors
- Try refreshing the page

### Videos not playing?
- Ensure video codec is browser-supported
- Try converting to MP4 format
- Check if browser supports the video type

### Data disappearing?
- Avoid private/incognito mode (no persistent storage)
- Check if IndexedDB is enabled
- Ensure browser storage isn't full
- Don't clear browser data

### GitHub Pages not working?
- Verify GitHub Pages is enabled in settings
- Check that branch is correctly selected
- Wait a few minutes after enabling
- Ensure all file paths are relative

## Contributing

Contributions welcome! Here's how:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Notes

- All content is stored locally in the user's browser
- No data is sent to any server
- Each user has their own isolated database
- Private mode will not persist data
- Clearing browser data will delete all content

## License

MIT License - Free to use for personal and commercial projects

## Credits

- **Font Awesome** for beautiful icons
- **IndexedDB** for client-side storage
- **CSS Glassmorphism** design trend
- Built with vanilla JavaScript, HTML, and CSS

## Support

Need help? Found a bug?

- Open an issue on GitHub
- Check existing issues first
- Provide browser and version info
- Include steps to reproduce

---

**Built with 💜 by the FreeView team**

Enjoy your YouTube-style video and document sharing platform!
