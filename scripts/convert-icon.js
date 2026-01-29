const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertToIcon() {
  const inputPath = path.join(__dirname, '..', 'Fetchy.jpg');
  const buildDir = path.join(__dirname, '..', 'build');

  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  try {
    console.log('Reading image:', inputPath);

    // Create multiple sizes for the icon
    const sizes = [16, 32, 48, 64, 128, 256];

    for (const size of sizes) {
      const outputPath = path.join(buildDir, `icon-${size}.png`);
      await sharp(inputPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Created: ${outputPath}`);
    }

    // Create main icon.png at 256x256
    const iconPath = path.join(buildDir, 'icon.png');
    await sharp(inputPath)
      .resize(256, 256)
      .png()
      .toFile(iconPath);
    console.log(`Created main icon: ${iconPath}`);

    console.log('Icon conversion complete!');
  } catch (error) {
    console.error('Error converting icon:', error);
    process.exit(1);
  }
}

convertToIcon();

