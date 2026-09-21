const fs = require('fs');
const path = require('path');

console.log(`Checking AJV installation...`);
  
  const ajvPath = path.join('node_modules', 'ajv');
  const ajvPackageJsonPath = path.join(ajvPath, 'package.json');

  try {
    if (fs.existsSync(ajvPackageJsonPath)) {
      const ajvPackage = require(path.resolve(ajvPackageJsonPath));
      console.log(`AJV version found in root node_modules: ${ajvPackage.version}`);
      
      const distPath = path.join(ajvPath, 'dist');
      const libPath = path.join(ajvPath, 'lib');
      
      if (fs.existsSync(distPath)) {
        console.log('AJV dist folder found (v8+ structure).');
      } else if (fs.existsSync(libPath)) {
        console.log('AJV lib folder found (v6 structure).');
      } else {
        console.warn('WARNING: Neither dist nor lib folder found in AJV package.');
      }
    } else {
      console.warn('WARNING: AJV package.json not found in root node_modules.');
    }
    
    // Check ajv-keywords
    const ajvKeywordsPath = path.join('node_modules', 'ajv-keywords', 'package.json');
    if (fs.existsSync(ajvKeywordsPath)) {
        const keywordsPkg = require(path.resolve(ajvKeywordsPath));
        console.log(`ajv-keywords version: ${keywordsPkg.version}`);
    } else {
        console.warn('WARNING: ajv-keywords package.json not found.');
    }

    console.log('Check script finished. Proceeding to build...');
    // Always exit 0 to allow build to attempt
    process.exit(0);

  } catch (error) {
    console.error('Error checking AJV:', error);
    // Don't block build on check error
    process.exit(0);
  }
