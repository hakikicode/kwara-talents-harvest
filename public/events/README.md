# Grand Finale Contestant Images

## Uploading Images

Place your 20 contestant images in this folder with the following naming convention:

### Image Naming Pattern
- `contestant-01.jpg`
- `contestant-02.jpg`
- `contestant-03.jpg`
- ... continuing to ...
- `contestant-20.jpg`

## Image Guidelines

✅ **Format**: JPG, PNG, or WebP
✅ **Dimensions**: 400×500px (portrait) recommended
✅ **File Size**: < 500KB each for fast loading
✅ **Aspect Ratio**: Portrait orientation works best

## Example Structure

```
events/
├── contestant-01.jpg   (John Doe - Singer)
├── contestant-02.jpg   (Jane Smith - Dancer)
├── contestant-03.jpg   (Mike Johnson - Comedian)
├── contestant-04.jpg   ...
└── contestant-20.jpg   ...
```

## Quality Tips

1. **Clear Photos**: Use well-lit, clear headshots or full-body portraits
2. **Consistent Style**: Keep a consistent look across all images
3. **Fast Loading**: Optimize file sizes using image compression tools:
   - TinyPNG (https://tinypng.com)
   - ImageOptim (https://imageoptim.com)
   - Or use ImageMagick: `convert input.jpg -quality 85 output.jpg`

## Deployment

Once images are added to this folder:
1. Commit to Git: `git add events/`
2. Push to GitHub: `git push`
3. Images will be accessible at: `https://raw.githubusercontent.com/YOUR_REPO/main/public/events/contestant-01.jpg`

## Troubleshooting

**Images not showing on event.html?**
- Verify filenames are exactly: `contestant-01.jpg` through `contestant-20.jpg`
- Check image files exist in this folder
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for 404 errors

**Images too slow to load?**
- Reduce file size using image compression
- Consider using WebP format for smaller files
- Maximum recommended size: 500KB per image

---

Ready to upload your images! 🎭
