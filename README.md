# FreeView - Video Sharing Platform

A beautiful, modern video sharing platform with a stunning liquid glass UI design. Upload, share, comment, and like videos - all running entirely in your browser!

## Features

- **Video Upload & Sharing** - Upload videos and share them with others
- **Comments System** - Add comments to any video
- **Likes & Favorites** - Like your favorite videos
- **Liquid Glass UI** - Beautiful glassmorphism design with smooth animations
- **Client-Side Storage** - All data stored locally using IndexedDB
- **Fully Static** - Works perfectly with GitHub Pages
- **Responsive Design** - Works on desktop, tablet, and mobile

## Live Demo

Visit the live site: [Your GitHub Pages URL]

## Technologies Used

- **HTML5** - Structure and video support
- **CSS3** - Liquid glass styling with advanced animations
- **Vanilla JavaScript** - Core functionality
- **IndexedDB** - Browser-based database for storing videos, comments, and likes
- **Font Awesome** - Beautiful icons

## How It Works

FreeView is a fully client-side application that doesn't require any backend server. All data is stored in your browser's IndexedDB:

- Videos are converted to base64 and stored locally
- Comments and likes are tracked per video
- Everything persists between sessions
- Each user has their own local database

## Usage

### Uploading Videos

1. Click the "Upload Video" button
2. Select a video file from your device
3. Add a title and description
4. Click "Upload"
5. Your video will be processed and added to the gallery

### Watching Videos

1. Click on any video card in the gallery
2. The video will open in a detailed view
3. Use the controls to play, pause, and adjust volume

### Interacting

- **Like** - Click the heart icon to add videos to your favorites
- **Comment** - Type a comment and press Enter or click the send button
- **Share** - Click the share button to share via native share or copy the link

## Deployment to GitHub Pages

### Option 1: Using GitHub Website

1. Go to your repository on GitHub
2. Click on "Settings"
3. Scroll to "Pages" section
4. Under "Source", select the branch (usually `main` or `master`)
5. Click "Save"
6. Your site will be live at `https://yourusername.github.io/freeview/`

### Option 2: Using GitHub Actions

This repository can be configured with GitHub Actions for automatic deployment. The site will update automatically whenever you push changes.

### Option 3: Manual Git Commands

```bash
# Ensure you're on the main branch
git checkout main

# Add all files
git add .

# Commit your changes
git commit -m "Deploy FreeView to GitHub Pages"

# Push to GitHub
git push origin main
```

## Local Development

Simply open `index.html` in a modern web browser. No build process or server required!

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a simple HTTP server (recommended)
python -m http.server 8000
# or
npx http-server
```

Then visit `http://localhost:8000` in your browser.

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Opera: ✅ Full support

**Note:** IndexedDB is supported in all modern browsers. For older browsers, you may need polyfills.

## Storage Limitations

- IndexedDB storage depends on browser and available disk space
- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space
- Safari: ~1GB per origin

**Tip:** For larger videos, consider compressing them before upload. The browser may reject very large files.

## Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
}
```

### Modifying Animations

All animations are defined in `styles.css` using CSS keyframes. Adjust timing and effects as needed.

## Features Roadmap

- [ ] User authentication
- [ ] Video categories/tags
- [ ] Search functionality
- [ ] Video playback speed control
- [ ] Dark/light theme toggle
- [ ] Video compression before upload
- [ ] Export/import data

## Troubleshooting

### Videos not uploading?
- Check file size (browsers have limits)
- Ensure you're using a supported video format (MP4, WebM, etc.)
- Check browser console for errors

### Data not persisting?
- Make sure you're not in private/incognito mode
- Check if IndexedDB is enabled in your browser
- Verify browser storage isn't full

### Site not loading on GitHub Pages?
- Ensure all file paths are relative (not absolute)
- Check that GitHub Pages is enabled in repository settings
- Wait a few minutes after enabling - deployment takes time

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

Created with ❤️ using modern web technologies.

Icons by [Font Awesome](https://fontawesome.com/)

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Enjoy sharing your videos with FreeView!** 🎥✨
