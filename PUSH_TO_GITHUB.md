# Instructions to Push to GitHub

## Step 1: Create Repository on GitHub
1. Go to https://github.com/new
2. Choose a repository name (e.g., "click-cuisine")
3. **DO NOT** check "Initialize with README"
4. Click "Create repository"

## Step 2: Push Your Code
After creating the repository, run these commands (replace YOUR_USERNAME and YOUR_REPO_NAME):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Enable GitHub Pages (Optional)
If you want to host the site on GitHub Pages:
1. Go to your repository settings
2. Navigate to "Pages" section
3. Select "main" branch as source
4. Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Files Structure
- `index.html` - Main Click Cuisine website
- `showcase.html` - Portfolio/showcase page (accessible at `/showcase.html`)
